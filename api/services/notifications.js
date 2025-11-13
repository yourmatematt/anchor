/**
 * Push Notifications Service
 *
 * Handles all push notifications via Expo Push Notification service
 * Critical for the advisory system - notifies users of:
 * - Payment instructions ready
 * - Bill reminders
 * - Irregular deposits detected
 * - Budget surplus opportunities
 * - Debt acceleration opportunities
 * - Manual payment completions
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Send push notification via Expo
 *
 * @param {string} pushToken - User's Expo push token
 * @param {Object} notification - Notification details
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotification(pushToken, notification) {
  if (!pushToken) {
    console.warn('No push token provided, skipping notification');
    return { success: false, reason: 'no_token' };
  }

  try {
    const message = {
      to: pushToken,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 'high',
      badge: notification.badge || 1,
      channelId: notification.channelId || 'default'
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();

    if (result.data?.status === 'error') {
      console.error('Expo push notification error:', result.data);
      return { success: false, error: result.data };
    }

    console.log('Push notification sent:', {
      title: notification.title,
      to: pushToken.substring(0, 20) + '...'
    });

    return { success: true, result };

  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's push token from database
 *
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Push token
 */
async function getUserPushToken(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('push_token')
    .eq('user_id', userId)
    .single();

  if (error || !data?.push_token) {
    return null;
  }

  return data.push_token;
}

/**
 * Send payment instructions notification
 *
 * @param {string} userId - User ID
 * @param {Object} instruction - Payment instruction record
 */
async function notifyPaymentInstructionsReady(userId, instruction) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: 'Payment Approved',
    body: `${instruction.purpose} - $${instruction.approved_amount}. Tap to view instructions.`,
    data: {
      type: 'payment_instructions',
      instruction_id: instruction.id,
      screen: 'PaymentInstructions'
    },
    priority: 'high',
    sound: 'default'
  });
}

/**
 * Send payment completion confirmation
 *
 * @param {string} userId - User ID
 * @param {Object} instruction - Completed instruction record
 */
async function notifyPaymentCompleted(userId, instruction) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: 'Payment Completed',
    body: `${instruction.purpose} - $${instruction.approved_amount} transferred successfully.`,
    data: {
      type: 'payment_completed',
      instruction_id: instruction.id
    },
    priority: 'normal',
    sound: 'default'
  });
}

/**
 * Send bill reminder notification
 *
 * @param {string} userId - User ID
 * @param {Object} bill - Bill details (whitelisted payee)
 * @param {number} daysUntilDue - Days until due
 */
async function notifyBillDue(userId, bill, daysUntilDue) {
  const pushToken = await getUserPushToken(userId);

  const urgency = daysUntilDue === 0 ? 'DUE TODAY' :
                  daysUntilDue === 1 ? 'due tomorrow' :
                  `due in ${daysUntilDue} days`;

  return sendPushNotification(pushToken, {
    title: `Bill ${urgency}`,
    body: `${bill.payee_name}: $${bill.expected_amount}. Tap for payment instructions.`,
    data: {
      type: 'bill_reminder',
      payee_id: bill.id,
      amount: bill.expected_amount,
      due_date: bill.due_day,
      screen: 'BillPayment'
    },
    priority: daysUntilDue <= 1 ? 'high' : 'normal',
    sound: daysUntilDue <= 1 ? 'default' : 'default',
    channelId: 'bills'
  });
}

/**
 * Send irregular deposit alert
 *
 * @param {string} userId - User ID
 * @param {Object} deposit - Irregular deposit record
 */
async function notifyIrregularDeposit(userId, deposit) {
  const pushToken = await getUserPushToken(userId);

  const title = deposit.risk_level === 'high'
    ? '⚠️ PAYDAY LOAN DETECTED'
    : 'Unexpected Deposit';

  const body = deposit.risk_level === 'high'
    ? `$${deposit.amount} from ${deposit.source_description}. We need to talk about this.`
    : `$${deposit.amount} just landed. Where's this from?`;

  return sendPushNotification(pushToken, {
    title,
    body,
    data: {
      type: 'irregular_deposit',
      deposit_id: deposit.id,
      risk_level: deposit.risk_level,
      screen: 'Conversation',
      conversation_type: 'deposit_interrogation'
    },
    priority: 'high',
    sound: 'default',
    channelId: deposit.risk_level === 'high' ? 'alerts' : 'deposits'
  });
}

/**
 * Send budget surplus notification
 *
 * @param {string} userId - User ID
 * @param {Object} surplus - Budget surplus event
 */
async function notifyBudgetSurplus(userId, surplus) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: 'Budget Surplus Detected',
    body: `You saved $${surplus.surplus_amount} on ${surplus.category} this month. Want to send it to debt?`,
    data: {
      type: 'budget_surplus',
      surplus_id: surplus.id,
      amount: surplus.surplus_amount,
      category: surplus.category,
      screen: 'Conversation',
      conversation_type: 'budget_surplus'
    },
    priority: 'normal',
    sound: 'default',
    channelId: 'financial'
  });
}

/**
 * Send debt acceleration opportunity notification
 *
 * @param {string} userId - User ID
 * @param {Object} opportunity - Debt acceleration opportunity
 */
async function notifyDebtAcceleration(userId, opportunity) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: 'Debt Acceleration Opportunity',
    body: `You have $${opportunity.safe_to_send} available. Send it to debt and save ${opportunity.months_saved} months?`,
    data: {
      type: 'debt_acceleration',
      opportunity_id: opportunity.id,
      amount: opportunity.safe_to_send,
      months_saved: opportunity.months_saved,
      screen: 'Conversation',
      conversation_type: 'debt_acceleration'
    },
    priority: 'normal',
    sound: 'default',
    channelId: 'financial'
  });
}

/**
 * Send non-whitelisted transaction alert (intervention)
 *
 * @param {string} userId - User ID
 * @param {Object} transaction - Transaction details
 */
async function notifyNonWhitelistedTransaction(userId, transaction) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: '⚠️ ANCHOR ALERT',
    body: `You just sent $${Math.abs(transaction.attributes.amount.value)} to ${transaction.attributes.description}`,
    data: {
      type: 'intervention',
      transaction_id: transaction.id,
      screen: 'Alert'
    },
    priority: 'high',
    sound: 'default',
    channelId: 'alerts'
  });
}

/**
 * Send daily check-in reminder
 *
 * @param {string} userId - User ID
 * @param {Object} stats - Daily stats (spending, streak, etc)
 */
async function notifyDailyCheckIn(userId, stats) {
  const pushToken = await getUserPushToken(userId);

  const streakEmoji = stats.days_clean > 7 ? '🔥' : '💪';

  return sendPushNotification(pushToken, {
    title: `${streakEmoji} Day ${stats.days_clean} Clean`,
    body: `Yesterday's spending: $${stats.yesterday_spent}. How are you feeling today?`,
    data: {
      type: 'daily_check_in',
      days_clean: stats.days_clean,
      screen: 'Conversation',
      conversation_type: 'check_in'
    },
    priority: 'normal',
    sound: 'default',
    channelId: 'daily'
  });
}

/**
 * Test push notification
 *
 * @param {string} userId - User ID
 */
async function sendTestNotification(userId) {
  const pushToken = await getUserPushToken(userId);

  return sendPushNotification(pushToken, {
    title: 'Anchor Test Notification',
    body: 'If you see this, push notifications are working!',
    data: {
      type: 'test'
    },
    priority: 'normal',
    sound: 'default'
  });
}

module.exports = {
  sendPushNotification,
  getUserPushToken,
  notifyPaymentInstructionsReady,
  notifyPaymentCompleted,
  notifyBillDue,
  notifyIrregularDeposit,
  notifyBudgetSurplus,
  notifyDebtAcceleration,
  notifyNonWhitelistedTransaction,
  notifyDailyCheckIn,
  sendTestNotification
};
