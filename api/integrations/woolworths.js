/**
 * Woolworths Integration
 *
 * Manages voucher distribution and gift card issuance for Woolworths partnership.
 * Supports real-time voucher delivery, balance checking, and reconciliation.
 *
 * API Integration: Woolworths Partner API (OAuth2 + REST)
 */

const crypto = require('crypto');

const WOOLWORTHS_CONFIG = {
  apiBaseUrl: process.env.WOOLWORTHS_API_URL || 'https://api.woolworths.com.au/partner/v1',
  clientId: process.env.WOOLWORTHS_CLIENT_ID,
  clientSecret: process.env.WOOLWORTHS_CLIENT_SECRET,
  redirectUri: process.env.WOOLWORTHS_REDIRECT_URI,
  webhookSecret: process.env.WOOLWORTHS_WEBHOOK_SECRET
};

/**
 * OAuth2 Token Exchange
 */
async function exchangeOAuthToken(authCode, config) {
  const tokenUrl = `${WOOLWORTHS_CONFIG.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${WOOLWORTHS_CONFIG.clientId}:${WOOLWORTHS_CONFIG.clientSecret}`).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: WOOLWORTHS_CONFIG.redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Woolworths OAuth error: ${error.error_description || error.error}`);
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
  const tokenUrl = `${WOOLWORTHS_CONFIG.apiBaseUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${WOOLWORTHS_CONFIG.clientId}:${WOOLWORTHS_CONFIG.clientSecret}`).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Woolworths token refresh error: ${error.error_description || error.error}`);
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

  const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/vouchers/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID() // Prevent duplicate issuance
    },
    body: JSON.stringify({
      recipient: {
        external_id: userId,
        type: 'digital'
      },
      voucher: {
        amount: amount,
        currency: 'AUD',
        type: 'grocery',
        reason: reason || 'milestone_reward'
      },
      delivery: {
        method: 'api',
        notification: false // We'll handle notifications ourselves
      },
      metadata: {
        anchor_user_id: userId,
        milestone: metadata?.milestone,
        issued_at: new Date().toISOString(),
        ...metadata
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Woolworths voucher issuance failed: ${error.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    voucherId: data.voucher_id,
    voucherCode: data.voucher_code,
    barcode: data.barcode,
    amount: data.amount,
    currency: data.currency,
    expiresAt: data.expires_at,
    status: data.status,
    redemptionUrl: data.redemption_url,
    redemptionInstructions: data.instructions
  };
}

/**
 * Issue a gift card
 */
async function issueGiftCard(accessToken, cardData) {
  const { userId, amount, message } = cardData;

  const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/giftcards/issue`, {
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
      card: {
        amount: amount,
        currency: 'AUD',
        design: 'default',
        message: message || 'Congratulations on your progress!'
      },
      delivery: {
        method: 'digital'
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Woolworths gift card issuance failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    cardId: data.card_id,
    cardNumber: data.card_number,
    pin: data.pin,
    amount: data.balance,
    expiresAt: data.expires_at,
    status: data.status
  };
}

/**
 * Check voucher/card balance
 */
async function checkBalance(accessToken, voucherOrCardId) {
  const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/vouchers/${voucherOrCardId}/balance`, {
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
    id: data.id,
    balance: data.balance,
    originalAmount: data.original_amount,
    currency: data.currency,
    status: data.status,
    expiresAt: data.expires_at,
    lastUsed: data.last_used_at
  };
}

/**
 * Get voucher transaction history
 */
async function getVoucherHistory(accessToken, voucherId) {
  const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/vouchers/${voucherId}/transactions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Transaction history failed: ${error.message}`);
  }

  const data = await response.json();
  return data.transactions || [];
}

/**
 * Validate webhook signature
 */
function validateWebhook(payload, signature) {
  const hmac = crypto.createHmac('sha256', WOOLWORTHS_CONFIG.webhookSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Handle webhook events
 * Events: voucher.redeemed, voucher.expired, voucher.cancelled
 */
async function handleWebhook(event, payload) {
  switch (event) {
    case 'voucher.redeemed':
      return handleVoucherRedeemed(payload);

    case 'voucher.expired':
      return handleVoucherExpired(payload);

    case 'voucher.cancelled':
      return handleVoucherCancelled(payload);

    default:
      console.log(`Unknown Woolworths webhook event: ${event}`);
      return { success: true };
  }
}

/**
 * Handle voucher redemption event
 */
async function handleVoucherRedeemed(payload) {
  // Log redemption for analytics and reconciliation
  console.log('Woolworths voucher redeemed:', {
    voucherId: payload.voucher_id,
    amount: payload.amount,
    redeemedAt: payload.redeemed_at,
    store: payload.store_location
  });

  // Update database to reflect redemption
  // This would integrate with your reward tracking system

  return { success: true };
}

/**
 * Handle voucher expiration
 */
async function handleVoucherExpired(payload) {
  console.log('Woolworths voucher expired:', {
    voucherId: payload.voucher_id,
    amount: payload.amount,
    expiredAt: payload.expired_at
  });

  // Could trigger notification to user about missed reward

  return { success: true };
}

/**
 * Handle voucher cancellation
 */
async function handleVoucherCancelled(payload) {
  console.log('Woolworths voucher cancelled:', {
    voucherId: payload.voucher_id,
    reason: payload.reason
  });

  return { success: true };
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/health`, {
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
 * For automated financial reconciliation
 */
async function getReconciliationReport(accessToken, startDate, endDate) {
  const response = await fetch(`${WOOLWORTHS_CONFIG.apiBaseUrl}/reports/reconciliation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate,
      format: 'json'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Reconciliation report failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    period: {
      start: data.period.start,
      end: data.period.end
    },
    summary: {
      totalIssued: data.summary.total_issued,
      totalRedeemed: data.summary.total_redeemed,
      totalExpired: data.summary.total_expired,
      totalValue: data.summary.total_value,
      redeemedValue: data.summary.redeemed_value
    },
    transactions: data.transactions || []
  };
}

module.exports = {
  exchangeOAuthToken,
  refreshOAuthToken,
  issueVoucher,
  issueGiftCard,
  checkBalance,
  getVoucherHistory,
  validateWebhook,
  handleWebhook,
  healthCheck,
  getReconciliationReport
};
