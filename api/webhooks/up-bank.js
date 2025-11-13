/**
 * Up Bank Webhook Receiver
 *
 * Receives TRANSACTION_CREATED webhook events from Up Bank
 * Validates signature, checks whitelist, logs transaction
 * Detects irregular deposits and triggers AI interrogation
 * Critical component for real-time financial intervention
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { USER_ID } = require('../config/constants');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Validate Up Bank webhook signature
 * Up Bank signs webhooks with HMAC-SHA256
 */
function validateSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Check if payee is on whitelist
 */
async function isWhitelisted(payeeName) {
  if (!payeeName) return false;

  const { data, error } = await supabase
    .from('whitelist')
    .select('*')
    .ilike('payee_name', payeeName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking whitelist:', error);
    return false;
  }

  return !!data;
}

/**
 * Log transaction to database
 */
async function logTransaction(transaction, isWhitelisted) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      transaction_id: transaction.id,
      amount: parseFloat(transaction.attributes.amount.value),
      payee_name: transaction.attributes.description,
      description: transaction.attributes.rawText || transaction.attributes.description,
      is_whitelisted: isWhitelisted,
      timestamp: transaction.attributes.createdAt,
      intervention_completed: isWhitelisted // Whitelisted transactions don't need intervention
    });

  if (error) {
    console.error('Error logging transaction:', error);
    throw error;
  }

  return data;
}

/**
 * Send push notification to mobile app
 * This triggers the Alert Screen on the mobile app
 */
async function sendAlert(transaction) {
  // TODO: Implement push notification via Expo or Firebase
  // For now, the mobile app will poll for non-whitelisted transactions
  console.log('ALERT: Non-whitelisted transaction detected', {
    amount: transaction.attributes.amount.value,
    payee: transaction.attributes.description,
    id: transaction.id
  });

  // In production, this would send an Expo push notification:
  // await fetch('https://exp.host/--/api/v2/push/send', {
  //   method: 'POST',
  //   headers: {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     to: userPushToken,
  //     sound: 'default',
  //     title: '⚠️ ANCHOR ALERT',
  //     body: `You just sent ${transaction.attributes.amount.value} to ${transaction.attributes.description}`,
  //     data: { transactionId: transaction.id },
  //     priority: 'high',
  //     badge: 1
  //   })
  // });
}

/**
 * Check if transaction is a deposit (positive amount)
 */
function isDeposit(transaction) {
  const amount = parseFloat(transaction.attributes.amount.value);
  return amount > 0;
}

/**
 * Check if deposit matches predatory lender patterns
 */
async function isPredatoryLender(description) {
  if (!description) return null;

  const { data, error } = await supabase
    .from('predatory_lenders')
    .select('*');

  if (error) {
    console.error('Error checking predatory lenders:', error);
    return null;
  }

  // Check each lender's patterns
  for (const lender of data) {
    const patterns = lender.detection_patterns || [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(description)) {
        return lender;
      }
    }
  }

  return null;
}

/**
 * Determine deposit type and whether it needs interrogation
 */
async function classifyDeposit(transaction) {
  const amount = parseFloat(transaction.attributes.amount.value);
  const description = transaction.attributes.description;

  // Check if it's from a predatory lender
  const lender = await isPredatoryLender(description);
  if (lender) {
    return {
      type: 'payday_loan',
      needs_interrogation: true,
      risk_level: 'high',
      reason: `Deposit from known predatory lender: ${lender.lender_name}`,
      metadata: { lender_id: lender.id }
    };
  }

  // Check for known income patterns
  const knownIncomePatterns = [
    /salary/i,
    /wages/i,
    /payment from.*pty.*ltd/i,
    /payroll/i,
    /centrelink/i,
    /pension/i,
    /interest/i,
    /dividend/i
  ];

  const isKnownIncome = knownIncomePatterns.some(pattern => pattern.test(description));

  if (isKnownIncome) {
    return {
      type: 'expected_income',
      needs_interrogation: false,
      risk_level: 'low',
      reason: 'Matches known income pattern'
    };
  }

  // Check for small amounts (likely refunds or transfers)
  if (amount < 50) {
    return {
      type: 'small_deposit',
      needs_interrogation: false,
      risk_level: 'low',
      reason: 'Small amount, likely refund or transfer'
    };
  }

  // Everything else is irregular and needs questioning
  return {
    type: 'irregular',
    needs_interrogation: true,
    risk_level: 'medium',
    reason: 'Unexpected deposit source - needs verification'
  };
}

/**
 * Log irregular deposit to database
 */
async function logIrregularDeposit(transaction, classification) {
  const { data, error } = await supabase
    .from('irregular_deposits')
    .insert({
      user_id: USER_ID,
      transaction_id: transaction.id,
      amount: parseFloat(transaction.attributes.amount.value),
      source_description: transaction.attributes.description,
      deposit_type: classification.type,
      interrogation_status: 'pending',
      risk_level: classification.risk_level,
      detected_at: transaction.attributes.createdAt,
      metadata: classification.metadata || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging irregular deposit:', error);
    throw error;
  }

  return data;
}

/**
 * Create intervention for irregular deposit
 * This triggers the AI interrogation conversation
 */
async function createDepositIntervention(transaction, irregularDeposit, classification) {
  const { data, error } = await supabase
    .from('interventions')
    .insert({
      user_id: USER_ID,
      transaction_id: transaction.id,
      trigger_type: 'irregular_deposit',
      trigger_reason: classification.reason,
      severity: classification.risk_level === 'high' ? 'high' : 'medium',
      status: 'pending',
      metadata: {
        deposit_type: classification.type,
        amount: transaction.attributes.amount.value,
        description: transaction.attributes.description,
        irregular_deposit_id: irregularDeposit.id
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating deposit intervention:', error);
    throw error;
  }

  return data;
}

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get signature from headers
    const signature = req.headers['x-up-authenticity-signature'];
    if (!signature) {
      console.error('Missing signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Validate webhook signature
    const payload = JSON.stringify(req.body);
    const isValid = validateSignature(
      payload,
      signature,
      process.env.UP_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook data
    const webhookData = req.body;
    const eventType = webhookData.data.attributes.eventType;

    // We only care about transaction creation events
    if (eventType !== 'TRANSACTION_CREATED') {
      return res.status(200).json({ message: 'Event type ignored' });
    }

    // Extract transaction data
    const transaction = webhookData.data.relationships.transaction.data;

    // Fetch full transaction details if needed
    // (Up Bank webhooks include limited data, may need to fetch full details)
    const transactionId = transaction.id;

    // For MVP, we'll work with the data we have
    // In production, you might want to fetch full transaction details from Up API
    const transactionData = {
      id: transactionId,
      attributes: {
        amount: {
          value: webhookData.data.attributes.amount?.value || '0'
        },
        description: webhookData.data.attributes.description || 'Unknown',
        rawText: webhookData.data.attributes.rawText,
        createdAt: webhookData.data.attributes.createdAt || new Date().toISOString()
      }
    };

    // Check if payee is whitelisted (for outgoing transactions)
    const payeeName = transactionData.attributes.description;
    const whitelisted = await isWhitelisted(payeeName);

    // Log transaction to database
    await logTransaction(transactionData, whitelisted);

    // Check if this is a deposit (incoming money)
    const isIncomingDeposit = isDeposit(transactionData);
    let depositClassification = null;
    let irregularDeposit = null;

    if (isIncomingDeposit) {
      // Classify the deposit
      depositClassification = await classifyDeposit(transactionData);
      console.log('Deposit detected:', {
        amount: transactionData.attributes.amount.value,
        type: depositClassification.type,
        needs_interrogation: depositClassification.needs_interrogation,
        risk_level: depositClassification.risk_level
      });

      // If deposit needs interrogation, log it and create intervention
      if (depositClassification.needs_interrogation) {
        irregularDeposit = await logIrregularDeposit(transactionData, depositClassification);
        await createDepositIntervention(transactionData, irregularDeposit, depositClassification);

        console.log('ALERT: Irregular deposit detected - interrogation required', {
          amount: transactionData.attributes.amount.value,
          description: transactionData.attributes.description,
          type: depositClassification.type,
          risk_level: depositClassification.risk_level
        });
      }
    }

    // If NOT whitelisted (outgoing transaction), trigger alert
    if (!whitelisted && !isIncomingDeposit) {
      await sendAlert(transactionData);
    }

    // Respond with 200 OK (Up Bank requires this)
    return res.status(200).json({
      message: 'Webhook processed',
      whitelisted,
      transactionId,
      isDeposit: isIncomingDeposit,
      depositClassification: depositClassification ? {
        type: depositClassification.type,
        needs_interrogation: depositClassification.needs_interrogation,
        risk_level: depositClassification.risk_level
      } : null
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
