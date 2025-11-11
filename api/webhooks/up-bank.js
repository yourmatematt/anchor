/**
 * Up Bank Webhook Receiver
 *
 * Receives TRANSACTION_CREATED webhook events from Up Bank
 * Validates signature, checks whitelist, logs transaction
 * Critical component for real-time financial intervention
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

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

    // Check if payee is whitelisted
    const payeeName = transactionData.attributes.description;
    const whitelisted = await isWhitelisted(payeeName);

    // Log transaction to database
    await logTransaction(transactionData, whitelisted);

    // If NOT whitelisted, trigger alert
    if (!whitelisted) {
      await sendAlert(transactionData);
    }

    // Respond with 200 OK (Up Bank requires this)
    return res.status(200).json({
      message: 'Webhook processed',
      whitelisted,
      transactionId
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
