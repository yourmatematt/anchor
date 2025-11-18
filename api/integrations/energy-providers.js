/**
 * Energy Providers Integration
 *
 * Multi-provider integration for energy bill credits.
 * Supports: Energy Australia, AGL, Origin Energy
 *
 * Capabilities:
 * - Apply bill credits
 * - Check account balance
 * - Get billing history
 * - Webhook notifications for billing events
 */

const crypto = require('crypto');

/**
 * Provider Configurations
 */
const PROVIDERS = {
  energy_australia: {
    name: 'Energy Australia',
    apiBaseUrl: process.env.ENERGY_AUSTRALIA_API_URL || 'https://api.energyaustralia.com.au/v2',
    clientId: process.env.ENERGY_AUSTRALIA_CLIENT_ID,
    clientSecret: process.env.ENERGY_AUSTRALIA_CLIENT_SECRET,
    webhookSecret: process.env.ENERGY_AUSTRALIA_WEBHOOK_SECRET
  },
  agl: {
    name: 'AGL',
    apiBaseUrl: process.env.AGL_API_URL || 'https://api.agl.com.au/partner/v1',
    clientId: process.env.AGL_CLIENT_ID,
    clientSecret: process.env.AGL_CLIENT_SECRET,
    webhookSecret: process.env.AGL_WEBHOOK_SECRET
  },
  origin: {
    name: 'Origin Energy',
    apiBaseUrl: process.env.ORIGIN_API_URL || 'https://api.originenergy.com.au/partners/v1',
    clientId: process.env.ORIGIN_CLIENT_ID,
    clientSecret: process.env.ORIGIN_CLIENT_SECRET,
    webhookSecret: process.env.ORIGIN_WEBHOOK_SECRET
  }
};

/**
 * Get provider configuration
 */
function getProviderConfig(provider) {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown energy provider: ${provider}`);
  }
  return config;
}

/**
 * OAuth2 Token Exchange (Generic for all providers)
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
 * Apply bill credit to customer account
 */
async function applyBillCredit(accessToken, provider, creditData) {
  const providerConfig = getProviderConfig(provider);
  const { accountNumber, amount, reason, metadata } = creditData;

  const response = await fetch(`${providerConfig.apiBaseUrl}/accounts/${accountNumber}/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      credit_amount: amount,
      currency: 'AUD',
      credit_type: 'partner_reward',
      reason: reason || 'milestone_achievement',
      description: `Anchor reward: ${metadata?.milestone || 'achievement'}`,
      effective_date: new Date().toISOString().split('T')[0],
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
    throw new Error(`${providerConfig.name} bill credit failed: ${error.message || error.error}`);
  }

  const data = await response.json();

  return {
    creditId: data.credit_id,
    accountNumber: data.account_number,
    amount: data.credit_amount,
    appliedDate: data.applied_date,
    status: data.status,
    description: data.description,
    expiryDate: data.expiry_date || null
  };
}

/**
 * Check account balance
 */
async function checkAccountBalance(accessToken, provider, accountNumber) {
  const providerConfig = getProviderConfig(provider);

  const response = await fetch(`${providerConfig.apiBaseUrl}/accounts/${accountNumber}/balance`, {
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
    accountNumber: data.account_number,
    currentBalance: data.current_balance,
    availableCredit: data.available_credit,
    nextBillDate: data.next_bill_date,
    nextBillAmount: data.estimated_next_bill,
    currency: data.currency || 'AUD',
    status: data.account_status
  };
}

/**
 * Get billing history
 */
async function getBillingHistory(accessToken, provider, accountNumber, options = {}) {
  const providerConfig = getProviderConfig(provider);
  const { startDate, endDate, limit = 12 } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString()
  });

  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);

  const response = await fetch(
    `${providerConfig.apiBaseUrl}/accounts/${accountNumber}/bills?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Billing history failed: ${error.message}`);
  }

  const data = await response.json();

  return (data.bills || []).map(bill => ({
    billId: bill.bill_id,
    billDate: bill.bill_date,
    dueDate: bill.due_date,
    amount: bill.amount,
    paidAmount: bill.paid_amount || 0,
    status: bill.status,
    creditsApplied: bill.credits_applied || 0,
    downloadUrl: bill.pdf_url
  }));
}

/**
 * Get credit history for an account
 */
async function getCreditHistory(accessToken, provider, accountNumber) {
  const providerConfig = getProviderConfig(provider);

  const response = await fetch(`${providerConfig.apiBaseUrl}/accounts/${accountNumber}/credits/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Credit history failed: ${error.message}`);
  }

  const data = await response.json();

  return (data.credits || []).map(credit => ({
    creditId: credit.credit_id,
    amount: credit.amount,
    appliedDate: credit.applied_date,
    description: credit.description,
    source: credit.source,
    status: credit.status
  }));
}

/**
 * Link customer account (for account verification)
 */
async function linkCustomerAccount(accessToken, provider, linkData) {
  const providerConfig = getProviderConfig(provider);
  const { accountNumber, customerName, verificationMethod } = linkData;

  const response = await fetch(`${providerConfig.apiBaseUrl}/accounts/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      account_number: accountNumber,
      customer_name: customerName,
      verification_method: verificationMethod || 'last_bill_amount'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Account linking failed: ${error.message}`);
  }

  const data = await response.json();

  return {
    linked: data.status === 'verified',
    accountNumber: data.account_number,
    verificationStatus: data.verification_status,
    verificationToken: data.verification_token
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
 * Events: bill.generated, bill.overdue, credit.applied, payment.received
 */
async function handleWebhook(event, payload, provider) {
  const providerConfig = getProviderConfig(provider);

  switch (event) {
    case 'bill.generated':
      return handleBillGenerated(payload, provider);

    case 'bill.overdue':
      return handleBillOverdue(payload, provider);

    case 'credit.applied':
      return handleCreditApplied(payload, provider);

    case 'payment.received':
      return handlePaymentReceived(payload, provider);

    default:
      console.log(`Unknown ${providerConfig.name} webhook event: ${event}`);
      return { success: true };
  }
}

/**
 * Handle bill generated event
 */
async function handleBillGenerated(payload, provider) {
  console.log(`${getProviderConfig(provider).name} bill generated:`, {
    accountNumber: payload.account_number,
    billAmount: payload.bill_amount,
    dueDate: payload.due_date
  });

  // Could trigger notification to user about upcoming bill

  return { success: true };
}

/**
 * Handle overdue bill event
 */
async function handleBillOverdue(payload, provider) {
  console.log(`${getProviderConfig(provider).name} bill overdue:`, {
    accountNumber: payload.account_number,
    overdueAmount: payload.overdue_amount,
    daysPastDue: payload.days_past_due
  });

  // Could trigger support intervention or payment assistance

  return { success: true };
}

/**
 * Handle credit applied event
 */
async function handleCreditApplied(payload, provider) {
  console.log(`${getProviderConfig(provider).name} credit applied:`, {
    accountNumber: payload.account_number,
    creditAmount: payload.credit_amount,
    newBalance: payload.new_balance
  });

  return { success: true };
}

/**
 * Handle payment received event
 */
async function handlePaymentReceived(payload, provider) {
  console.log(`${getProviderConfig(provider).name} payment received:`, {
    accountNumber: payload.account_number,
    paymentAmount: payload.payment_amount,
    newBalance: payload.new_balance
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

  const response = await fetch(`${providerConfig.apiBaseUrl}/reports/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate,
      credit_type: 'partner_reward'
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
      totalCreditsApplied: data.summary.total_credits,
      totalValue: data.summary.total_value,
      accountsAffected: data.summary.unique_accounts,
      averageCreditAmount: data.summary.average_credit
    },
    credits: data.details || []
  };
}

module.exports = {
  getProviderConfig,
  exchangeOAuthToken,
  refreshOAuthToken,
  applyBillCredit,
  checkAccountBalance,
  getBillingHistory,
  getCreditHistory,
  linkCustomerAccount,
  validateWebhook,
  handleWebhook,
  healthCheck,
  getReconciliationReport
};
