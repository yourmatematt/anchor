/**
 * Coles Integration
 *
 * Manages voucher distribution and gift card issuance for Coles partnership.
 * Supports real-time voucher delivery, balance checking, and Flybuys integration.
 *
 * API Integration: Coles Partner API (OAuth2 + REST)
 */

const crypto = require('crypto');

const COLES_CONFIG = {
  apiBaseUrl: process.env.COLES_API_URL || 'https://api.coles.com.au/partners/v1',
  clientId: process.env.COLES_CLIENT_ID,
  clientSecret: process.env.COLES_CLIENT_SECRET,
  redirectUri: process.env.COLES_REDIRECT_URI,
  webhookSecret: process.env.COLES_WEBHOOK_SECRET
};

/**
 * OAuth2 Token Exchange
 */
async function exchangeOAuthToken(authCode, config) {
  const tokenUrl = `${COLES_CONFIG.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${COLES_CONFIG.clientId}:${COLES_CONFIG.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: COLES_CONFIG.redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Coles OAuth error: ${error.error_description || error.error}`);
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
async function refreshOAuthToken(refreshToken) {
  const tokenUrl = `${COLES_CONFIG.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${COLES_CONFIG.clientId}:${COLES_CONFIG.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Coles token refresh error: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
}

/**
 * Issue a voucher to a user
 */
async function issueVoucher(accessToken, voucherData) {
  const { userId, amount, reason, metadata } = voucherData;

  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/vouchers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Request-ID': crypto.randomUUID()
    },
    body: JSON.stringify({
      external_customer_id: userId,
      voucher_details: {
        value: amount,
        currency: 'AUD',
        type: 'grocery_discount',
        category: 'general'
      },
      issuance: {
        reason: reason || 'milestone_achievement',
        reference: metadata?.milestone || 'anchor_reward'
      },
      delivery: {
        channel: 'digital',
        send_notification: false // Anchor handles notifications
      },
      metadata: {
        source: 'anchor',
        user_id: userId,
        milestone: metadata?.milestone,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Coles voucher issuance failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    voucherId: data.voucher_id,
    voucherCode: data.code,
    barcode: data.barcode_data,
    barcodeFormat: data.barcode_format, // Usually 'EAN13'
    amount: data.value,
    currency: data.currency,
    expiresAt: data.expiry_date,
    status: data.status,
    redemptionUrl: data.redemption_url,
    redemptionInstructions: data.terms_and_conditions,
    flybuysEligible: data.flybuys_eligible || false
  };
}

/**
 * Issue a gift card (Coles Mastercard)
 */
async function issueGiftCard(accessToken, cardData) {
  const { userId, amount, message } = cardData;

  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/giftcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Request-ID': crypto.randomUUID()
    },
    body: JSON.stringify({
      external_customer_id: userId,
      card_type: 'coles_mastercard',
      load_amount: amount,
      currency: 'AUD',
      personalization: {
        message: message || 'Well done on your progress with Anchor!',
        design_code: 'ANCHOR_DEFAULT'
      },
      delivery: {
        type: 'virtual'
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Coles gift card issuance failed: ${error.error?.message}`);
  }

  const data = await response.json();

  return {
    cardId: data.card_id,
    cardNumber: data.masked_card_number, // Last 4 digits only for security
    amount: data.balance,
    expiresAt: data.expiry_date,
    status: data.status,
    activationRequired: data.activation_required || false,
    activationUrl: data.activation_url
  };
}

/**
 * Check voucher/card balance
 */
async function checkBalance(accessToken, voucherOrCardId) {
  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/vouchers/${voucherOrCardId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Voucher not found');
    }
    const error = await response.json();
    throw new Error(`Balance check failed: ${error.error?.message}`);
  }

  const data = await response.json();

  return {
    id: data.voucher_id,
    balance: data.remaining_value,
    originalAmount: data.original_value,
    currency: data.currency,
    status: data.status,
    expiresAt: data.expiry_date,
    lastUsed: data.last_transaction_date,
    redemptionCount: data.redemption_count || 0
  };
}

/**
 * Get voucher transaction history
 */
async function getVoucherHistory(accessToken, voucherId) {
  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/vouchers/${voucherId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Transaction history failed: ${error.error?.message}`);
  }

  const data = await response.json();

  return (data.transactions || []).map(tx => ({
    transactionId: tx.transaction_id,
    amount: tx.amount,
    remainingBalance: tx.remaining_balance,
    timestamp: tx.timestamp,
    store: tx.store_location,
    type: tx.transaction_type
  }));
}

/**
 * Link Flybuys account (optional integration)
 */
async function linkFlybuysAccount(accessToken, userId, flybuysNumber) {
  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/flybuys/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      external_customer_id: userId,
      flybuys_number: flybuysNumber
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Flybuys linking failed: ${error.error?.message}`);
  }

  const data = await response.json();

  return {
    linked: data.status === 'linked',
    flybuysNumber: data.masked_number,
    pointsBalance: data.points_balance
  };
}

/**
 * Validate webhook signature
 */
function validateWebhook(payload, signature) {
  const hmac = crypto.createHmac('sha256', COLES_CONFIG.webhookSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Handle webhook events
 * Events: voucher.redeemed, voucher.expired, voucher.partially_redeemed
 */
async function handleWebhook(event, payload) {
  switch (event) {
    case 'voucher.redeemed':
      return handleVoucherRedeemed(payload);

    case 'voucher.partially_redeemed':
      return handleVoucherPartiallyRedeemed(payload);

    case 'voucher.expired':
      return handleVoucherExpired(payload);

    case 'voucher.cancelled':
      return handleVoucherCancelled(payload);

    default:
      console.log(`Unknown Coles webhook event: ${event}`);
      return { success: true };
  }
}

/**
 * Handle voucher redemption event
 */
async function handleVoucherRedeemed(payload) {
  console.log('Coles voucher redeemed:', {
    voucherId: payload.voucher_id,
    amount: payload.redeemed_amount,
    redeemedAt: payload.timestamp,
    store: payload.store_code,
    transaction: payload.transaction_id
  });

  return { success: true };
}

/**
 * Handle partial redemption
 */
async function handleVoucherPartiallyRedeemed(payload) {
  console.log('Coles voucher partially redeemed:', {
    voucherId: payload.voucher_id,
    amountUsed: payload.amount_used,
    remainingBalance: payload.remaining_balance
  });

  return { success: true };
}

/**
 * Handle voucher expiration
 */
async function handleVoucherExpired(payload) {
  console.log('Coles voucher expired:', {
    voucherId: payload.voucher_id,
    unusedAmount: payload.remaining_value,
    expiredAt: payload.expiry_date
  });

  return { success: true };
}

/**
 * Handle voucher cancellation
 */
async function handleVoucherCancelled(payload) {
  console.log('Coles voucher cancelled:', {
    voucherId: payload.voucher_id,
    reason: payload.cancellation_reason
  });

  return { success: true };
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/status`, {
      method: 'GET',
      timeout: 5000
    });

    return {
      healthy: response.ok,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get reconciliation report
 */
async function getReconciliationReport(accessToken, startDate, endDate) {
  const response = await fetch(`${COLES_CONFIG.apiBaseUrl}/reports/settlement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      period_start: startDate,
      period_end: endDate,
      include_details: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Reconciliation report failed: ${error.error?.message}`);
  }

  const data = await response.json();

  return {
    period: {
      start: data.period.start_date,
      end: data.period.end_date
    },
    summary: {
      totalIssued: data.totals.vouchers_issued,
      totalRedeemed: data.totals.vouchers_redeemed,
      totalExpired: data.totals.vouchers_expired,
      totalValue: data.totals.issued_value,
      redeemedValue: data.totals.redeemed_value,
      liabilityValue: data.totals.outstanding_liability
    },
    transactions: data.details || []
  };
}

module.exports = {
  exchangeOAuthToken,
  refreshOAuthToken,
  issueVoucher,
  issueGiftCard,
  checkBalance,
  getVoucherHistory,
  linkFlybuysAccount,
  validateWebhook,
  handleWebhook,
  healthCheck,
  getReconciliationReport
};
