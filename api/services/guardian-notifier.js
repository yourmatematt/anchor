/**
 * Guardian Notifier Service for Anchor
 *
 * Sends SMS notifications to guardians when interventions are triggered
 * Uses Twilio or AWS SNS for SMS delivery
 * Maintains notification history and rate limiting
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Send SMS via Twilio
 */
async function sendSMSViaTwilio(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('SMS sent via Twilio:', result.sid);
      return { success: true, sid: result.sid };
    } else {
      console.error('Twilio error:', result);
      return { success: false, error: result.message };
    }

  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS via AWS SNS (alternative to Twilio)
 */
async function sendSMSViaSNS(to, message) {
  // Note: This requires AWS SDK to be installed
  // npm install @aws-sdk/client-sns

  // Placeholder for AWS SNS implementation
  console.log('AWS SNS SMS (not implemented):', { to, message });

  // In production, implement with:
  // const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
  // const client = new SNSClient({ region: process.env.AWS_REGION });
  // const command = new PublishCommand({ PhoneNumber: to, Message: message });
  // await client.send(command);

  return null;
}

/**
 * Get guardian information for a user
 */
async function getGuardian(userId) {
  const { data, error } = await supabase
    .from('guardians')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    console.error('Error fetching guardian:', error);
    return null;
  }

  return data;
}

/**
 * Get user's clean streak for notification
 */
async function getCleanStreakDays(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('last_relapse_date, commitment_start_date')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return 0;
  }

  const startDate = user.last_relapse_date || user.commitment_start_date;
  if (!startDate) {
    return 0;
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysSince);
}

/**
 * Build SMS message content based on pattern
 */
function buildSMSMessage(userName, guardianName, pattern, streakDays, amount) {
  const patternMessages = {
    PAYDAY_LOAN: `ANCHOR ALERT: ${userName} triggered PAYDAY LOAN detection. Day ${streakDays} clean. Amount: $${amount}. They're in a forced AI conversation now.`,

    GAMBLING_VENUE: `ANCHOR ALERT: ${userName} detected at gambling venue${pattern.venue ? ' (' + pattern.venue + ')' : ''}. Day ${streakDays} clean. Amount: $${amount}. Intervention triggered.`,

    CRYPTO_EXCHANGE: `ANCHOR ALERT: ${userName} made crypto transaction. Day ${streakDays} clean. Amount: $${amount}. Checking if gambling-related.`,

    CASH_WITHDRAWAL: `ANCHOR ALERT: ${userName} withdrew cash ($${amount})${pattern.isLateNight ? ' LATE NIGHT' : ''}. Day ${streakDays} clean. Red flag - they set up Anchor to avoid cash.`,

    SUSPICIOUS_TRANSFER: `ANCHOR ALERT: ${userName} suspicious transfer detected. Day ${streakDays} clean. $${amount} ${pattern.day ? 'on ' + pattern.day : ''}${pattern.isLateNight ? ' late night' : ''}. AI investigating.`,

    MULTIPLE_WITHDRAWALS: `ANCHOR ALERT: ${userName} made ${pattern.count} withdrawals today totaling $${pattern.totalAmount}. Day ${streakDays} clean. Pattern detected.`,

    SUSPICIOUS_LOAN: `ANCHOR ALERT: ${userName} suspicious loan transaction detected. Day ${streakDays} clean. Amount: $${amount}. Verifying with AI.`,
  };

  return patternMessages[pattern.pattern] ||
    `ANCHOR ALERT: ${userName} triggered ${pattern.pattern}. Day ${streakDays} clean. Amount: $${amount}.`;
}

/**
 * Check rate limiting for guardian notifications
 * Prevents spam (max 1 notification per 5 minutes per guardian)
 */
async function checkRateLimit(guardianId) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('guardian_notifications')
    .select('id')
    .eq('guardian_id', guardianId)
    .gte('sent_at', fiveMinutesAgo)
    .limit(1);

  if (error) {
    console.warn('Error checking rate limit:', error);
    return true; // Allow on error
  }

  // If we found a notification in the last 5 minutes, rate limit
  return (data?.length || 0) === 0;
}

/**
 * Log notification in database
 */
async function logNotification(guardianId, userId, pattern, message, success, metadata = {}) {
  const { data, error } = await supabase
    .from('guardian_notifications')
    .insert({
      guardian_id: guardianId,
      user_id: userId,
      notification_type: pattern.pattern,
      message: message,
      sent_at: new Date().toISOString(),
      delivery_status: success ? 'delivered' : 'failed',
      metadata: metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging notification:', error);
    return null;
  }

  return data;
}

/**
 * Main function to notify guardian
 */
async function notifyGuardian(userId, pattern, transactionId) {
  try {
    // 1. Get guardian information
    const guardian = await getGuardian(userId);
    if (!guardian) {
      console.warn('No guardian found for user:', userId);
      return { success: false, reason: 'no_guardian' };
    }

    // 2. Check rate limiting
    const canSend = await checkRateLimit(guardian.id);
    if (!canSend) {
      console.log('Rate limit exceeded for guardian:', guardian.id);
      return { success: false, reason: 'rate_limited' };
    }

    // 3. Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { success: false, reason: 'user_not_found' };
    }

    // 4. Get clean streak
    const streakDays = await getCleanStreakDays(userId);

    // 5. Build SMS message
    const message = buildSMSMessage(
      user.name,
      guardian.name,
      pattern,
      streakDays,
      pattern.amount
    );

    // 6. Send SMS
    const smsResult = await sendSMSViaTwilio(guardian.phone, message);

    // 7. Log notification
    await logNotification(
      guardian.id,
      userId,
      pattern,
      message,
      smsResult?.success || false,
      {
        transactionId: transactionId,
        pattern: pattern.pattern,
        risk: pattern.risk,
        amount: pattern.amount,
        streakDays: streakDays,
      }
    );

    console.log('Guardian notified:', {
      guardianId: guardian.id,
      guardianName: guardian.name,
      pattern: pattern.pattern,
      success: smsResult?.success || false,
    });

    return {
      success: smsResult?.success || false,
      guardianId: guardian.id,
      guardianName: guardian.name,
      message: message,
    };

  } catch (error) {
    console.error('Error notifying guardian:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send conversation summary to guardian
 * Called after AI conversation completes
 */
async function sendConversationSummary(userId, conversationId, outcome) {
  try {
    const guardian = await getGuardian(userId);
    if (!guardian) {
      return { success: false, reason: 'no_guardian' };
    }

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    const outcomeMessages = {
      confirmed_gambling: `${user?.name || 'User'} confirmed gambling relapse in AI conversation. Clean streak reset. They need support.`,
      false_alarm: `${user?.name || 'User'} AI conversation complete: False alarm. Transaction was legitimate.`,
      needs_follow_up: `${user?.name || 'User'} AI conversation flagged for follow-up. Check in with them.`,
      concerning: `${user?.name || 'User'} AI conversation raised concerns. Consider reaching out.`,
    };

    const message = outcomeMessages[outcome] ||
      `${user?.name || 'User'} completed AI intervention conversation.`;

    const smsResult = await sendSMSViaTwilio(guardian.phone, message);

    await logNotification(
      guardian.id,
      userId,
      { pattern: 'CONVERSATION_SUMMARY' },
      message,
      smsResult?.success || false,
      { conversationId: conversationId, outcome: outcome }
    );

    return {
      success: smsResult?.success || false,
      message: message,
    };

  } catch (error) {
    console.error('Error sending conversation summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send test notification to guardian (for setup verification)
 */
async function sendTestNotification(userId) {
  const guardian = await getGuardian(userId);
  if (!guardian) {
    return { error: 'No guardian found' };
  }

  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();

  const message = `ANCHOR TEST: This is a test notification for ${user?.name || 'user'}. Guardian notifications are working! - Anchor Team`;

  const result = await sendSMSViaTwilio(guardian.phone, message);

  await logNotification(
    guardian.id,
    userId,
    { pattern: 'TEST' },
    message,
    result?.success || false
  );

  return result;
}

module.exports = {
  notifyGuardian,
  sendConversationSummary,
  sendTestNotification,
  getGuardian,
};
