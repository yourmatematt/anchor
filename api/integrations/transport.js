/**
 * Transport Integration
 *
 * Multi-provider integration for transport credits and fuel vouchers.
 * Supports:
 * - Transport NSW (Opal Card)
 * - Transport Victoria (Myki)
 * - Fuel vouchers (7-Eleven, BP, Shell)
 *
 * Capabilities:
 * - Add transport credits
 * - Check card balance
 * - Get travel history
 * - Issue fuel vouchers
 */

const crypto = require('crypto');

/**
 * Provider Configurations
 */
const PROVIDERS = {
  opal: {
    name: 'Transport NSW (Opal)',
    apiBaseUrl: process.env.OPAL_API_URL || 'https://api.transport.nsw.gov.au/v1',
    clientId: process.env.OPAL_CLIENT_ID,
    clientSecret: process.env.OPAL_CLIENT_SECRET,
    webhookSecret: process.env.OPAL_WEBHOOK_SECRET
  },
  myki: {
    name: 'Transport Victoria (Myki)',
    apiBaseUrl: process.env.MYKI_API_URL || 'https://api.ptv.vic.gov.au/v3',
    clientId: process.env.MYKI_CLIENT_ID,
    clientSecret: process.env.MYKI_CLIENT_SECRET,
    webhookSecret: process.env.MYKI_WEBHOOK_SECRET
  },
  fuel: {
    name: 'Fuel Vouchers',
    apiBaseUrl: process.env.FUEL_VOUCHER_API_URL || 'https://api.fuelvouchers.com.au/v1',
    clientId: process.env.FUEL_VOUCHER_CLIENT_ID,
    clientSecret: process.env.FUEL_VOUCHER_CLIENT_SECRET,
    webhookSecret: process.env.FUEL_VOUCHER_WEBHOOK_SECRET
  }
};

/**
 * Fuel partner networks
 */
const FUEL_NETWORKS = {
  seven_eleven: '7-Eleven',
  bp: 'BP',
  shell: 'Shell',
  caltex: 'Caltex',
  ampol: 'Ampol'
};

/**
 * Get provider configuration
 */
function getProviderConfig(provider) {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown transport provider: ${provider}`);
  }
  return config;
}

/**
 * OAuth2 Token Exchange
 */
async function exchangeOAuthToken(authCode, config, provider) {
  const providerConfig = getProviderConfig(provider);
  const tokenUrl = `${providerConfig.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: config.redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${providerConfig.name} OAuth error: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
}

/**
 * Refresh OAuth Token
 */
async function refreshOAuthToken(refreshToken, provider) {
  const providerConfig = getProviderConfig(provider);
  const tokenUrl = `${providerConfig.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${providerConfig.name} token refresh error: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
}

/**
 * Add credit to transport card (Opal/Myki)
 */
async function addTransportCredit(accessToken, provider, creditData) {
  if (provider === 'fuel') {
    throw new Error('Use issueFuelVoucher for fuel credits');
  }

  const providerConfig = getProviderConfig(provider);
  const { cardNumber, amount, reason, metadata } = creditData;

  const response = await fetch(`${providerConfig.apiBaseUrl}/cards/${cardNumber}/topup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      amount: amount,
      currency: 'AUD',
      top_up_type: 'partner_credit',
      reference: reason || 'anchor_milestone_reward',
      description: `Anchor reward: ${metadata?.milestone || 'achievement'}`,
      metadata: {
        source: 'anchor',
        milestone: metadata?.milestone,
        user_id: metadata?.userId,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${providerConfig.name} credit failed: ${error.message || error.error}`);
  }

  const data = await response.json();

  return {
    transactionId: data.transaction_id,
    cardNumber: data.card_number,
    amount: data.amount,
    newBalance: data.new_balance,
    appliedAt: data.timestamp,
    status: data.status,
    expiryDate: data.expiry_date || null
  };
}

/**
 * Issue fuel voucher
 */
async function issueFuelVoucher(accessToken, voucherData) {
  const providerConfig = getProviderConfig('fuel');
  const { userId, amount, network, metadata } = voucherData;

  // Validate fuel network
  if (network && !FUEL_NETWORKS[network]) {
    throw new Error(`Invalid fuel network: ${network}`);
  }

  const response = await fetch(`${providerConfig.apiBaseUrl}/vouchers/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      recipient: {
        external_id: userId
      },
      voucher: {
        amount: amount,
        currency: 'AUD',
        network: network || 'any', // 'any' allows use at any partner station
        type: 'fuel_discount'
      },
      delivery: {
        method: 'digital',
        format: 'qr_code'
      },
      metadata: {
        source: 'anchor',
        milestone: metadata?.milestone,
        user_id: userId,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Fuel voucher issuance failed: ${error.message || error.error}`);
  }

  const data = await response.json();

  return {
    voucherId: data.voucher_id,
    voucherCode: data.code,
    qrCode: data.qr_code_data,
    barcode: data.barcode,
    amount: data.amount,
    network: data.network,
    networks: data.accepted_networks || Object.keys(FUEL_NETWORKS),
    expiresAt: data.expiry_date,
    status: data.status,
    redemptionInstructions: data.instructions
  };
}

/**
 * Check transport card balance
 */
async function checkCardBalance(accessToken, provider, cardNumber) {
  if (provider === 'fuel') {
    throw new Error('Use checkVoucherBalance for fuel vouchers');
  }

  const providerConfig = getProviderConfig(provider);

  const response = await fetch(`${providerConfig.apiBaseUrl}/cards/${cardNumber}/balance`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Balance check failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    cardNumber: data.card_number,
    cardType: data.card_type,
    balance: data.balance,
    autoTopUpEnabled: data.auto_top_up_enabled || false,
    status: data.status,
    expiryDate: data.expiry_date,
    lastActivity: data.last_activity_date
  };
}

/**
 * Check fuel voucher balance/status
 */
async function checkVoucherBalance(accessToken, voucherId) {
  const providerConfig = getProviderConfig('fuel');

  const response = await fetch(`${providerConfig.apiBaseUrl}/vouchers/${voucherId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Voucher check failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    voucherId: data.voucher_id,
    balance: data.remaining_value,
    originalAmount: data.original_value,
    status: data.status,
    expiresAt: data.expiry_date,
    redeemedAt: data.redeemed_at || null,
    network: data.network
  };
}

/**
 * Get travel history (Opal/Myki)
 */
async function getTravelHistory(accessToken, provider, cardNumber, options = {}) {
  if (provider === 'fuel') {
    throw new Error('Fuel vouchers do not have travel history');
  }

  const providerConfig = getProviderConfig(provider);
  const { startDate, endDate, limit = 50 } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString()
  });

  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);

  const response = await fetch(
    `${providerConfig.apiBaseUrl}/cards/${cardNumber}/trips?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Travel history failed: ${error.message}`);
  }

  const data = await response.json();

  return (data.trips || []).map(trip => ({
    tripId: trip.trip_id,
    date: trip.date,
    origin: trip.origin,
    destination: trip.destination,
    mode: trip.mode, // bus, train, ferry, light_rail
    fare: trip.fare,
    discount: trip.discount_applied,
    tapOn: trip.tap_on_time,
    tapOff: trip.tap_off_time
  }));
}

/**
 * Get top-up history
 */
async function getTopUpHistory(accessToken, provider, cardNumber) {
  if (provider === 'fuel') {
    throw new Error('Use fuel voucher endpoints for fuel history');
  }

  const providerConfig = getProviderConfig(provider);

  const response = await fetch(`${providerConfig.apiBaseUrl}/cards/${cardNumber}/topups`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Top-up history failed: ${error.message}`);
  }

  const data = await response.json();

  return (data.topups || []).map(topup => ({
    transactionId: topup.transaction_id,
    amount: topup.amount,
    date: topup.date,
    method: topup.method,
    source: topup.source,
    status: topup.status
  }));
}

/**
 * Link transport card to user account
 */
async function linkCard(accessToken, provider, linkData) {
  if (provider === 'fuel') {
    throw new Error('Fuel vouchers do not require card linking');
  }

  const providerConfig = getProviderConfig(provider);
  const { cardNumber, securityCode } = linkData;

  const response = await fetch(`${providerConfig.apiBaseUrl}/cards/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      card_number: cardNumber,
      security_code: securityCode
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Card linking failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    linked: data.status === 'linked',
    cardNumber: data.card_number,
    cardType: data.card_type,
    nickname: data.nickname || null
  };
}

/**
 * Validate webhook signature
 */
function validateWebhook(payload, signature, provider) {
  const providerConfig = getProviderConfig(provider);
  const hmac = crypto.createHmac('sha256', providerConfig.webhookSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Handle webhook events
 */
async function handleWebhook(event, payload, provider) {
  const providerConfig = getProviderConfig(provider);

  switch (event) {
    case 'topup.completed':
      return handleTopUpCompleted(payload, provider);

    case 'balance.low':
      return handleLowBalance(payload, provider);

    case 'voucher.redeemed':
      return handleVoucherRedeemed(payload, provider);

    case 'voucher.expired':
      return handleVoucherExpired(payload, provider);

    default:
      console.log(`Unknown ${providerConfig.name} webhook event: ${event}`);
      return { success: true };
  }
}

/**
 * Handle top-up completed event
 */
async function handleTopUpCompleted(payload, provider) {
  console.log(`${getProviderConfig(provider).name} top-up completed:`, {
    cardNumber: payload.card_number,
    amount: payload.amount,
    newBalance: payload.new_balance
  });

  return { success: true };
}

/**
 * Handle low balance warning
 */
async function handleLowBalance(payload, provider) {
  console.log(`${getProviderConfig(provider).name} low balance warning:`, {
    cardNumber: payload.card_number,
    currentBalance: payload.current_balance,
    threshold: payload.threshold
  });

  // Could trigger notification to user

  return { success: true };
}

/**
 * Handle voucher redeemed event
 */
async function handleVoucherRedeemed(payload, provider) {
  console.log(`Fuel voucher redeemed:`, {
    voucherId: payload.voucher_id,
    amount: payload.amount,
    station: payload.station_name,
    location: payload.location
  });

  return { success: true };
}

/**
 * Handle voucher expired event
 */
async function handleVoucherExpired(payload, provider) {
  console.log(`Fuel voucher expired:`, {
    voucherId: payload.voucher_id,
    unusedAmount: payload.remaining_value
  });

  return { success: true };
}

/**
 * Health check
 */
async function healthCheck(provider) {
  const providerConfig = getProviderConfig(provider);

  try {
    const response = await fetch(`${providerConfig.apiBaseUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });

    return {
      healthy: response.ok,
      provider: providerConfig.name,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      provider: providerConfig.name,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get reconciliation report
 */
async function getReconciliationReport(accessToken, provider, startDate, endDate) {
  const providerConfig = getProviderConfig(provider);

  const endpoint = provider === 'fuel' ? '/reports/vouchers' : '/reports/topups';

  const response = await fetch(`${providerConfig.apiBaseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate,
      source_filter: 'partner_credit'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Reconciliation report failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    provider: providerConfig.name,
    period: {
      start: data.period.start_date,
      end: data.period.end_date
    },
    summary: {
      totalCredits: data.summary.total_credits,
      totalValue: data.summary.total_value,
      cardsAffected: data.summary.unique_cards || data.summary.unique_vouchers,
      averageCreditAmount: data.summary.average_credit
    },
    transactions: data.details || []
  };
}

module.exports = {
  getProviderConfig,
  exchangeOAuthToken,
  refreshOAuthToken,
  addTransportCredit,
  issueFuelVoucher,
  checkCardBalance,
  checkVoucherBalance,
  getTravelHistory,
  getTopUpHistory,
  linkCard,
  validateWebhook,
  handleWebhook,
  healthCheck,
  getReconciliationReport,
  FUEL_NETWORKS
};
