/**
 * Guardian Notification Service
 *
 * Sends notifications to guardians (accountability partners) via SMS and email.
 * Guardians receive alerts about:
 * - Payment requests
 * - Gambling triggers
 * - Payday loans
 * - Relapse events
 * - Clean milestones
 */

const { createClient } = require('@supabase/supabase-js');
const { USER_ID } = require('../config/constants');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get active guardian for user
 */
async function getActiveGuardian(userId) {
  const { data, error } = await supabase
    .from('guardians')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .single();

  if (error || !data) {
    console.log('No active guardian found for user:', userId);
    return null;
  }

  // Check if commitment period is still valid
  const endDate = new Date(data.commitment_end_date);
  if (endDate < new Date()) {
    console.log('Guardian commitment period has ended');
    return null;
  }

  return data;
}

/**
 * Check if guardian should be notified for this event type
 */
function shouldNotify(guardian, eventType) {
  const preferences = {
    payment_request: guardian.notify_on_payment_requests,
    payment_approved: guardian.notify_on_payment_requests,
    payment_denied: guardian.notify_on_declined_requests,
    gambling_trigger: guardian.notify_on_gambling_triggers,
    payday_loan: guardian.notify_on_payday_loans,
    relapse: guardian.notify_on_relapse,
    clean_milestone: guardian.notify_on_clean_milestones,
    irregular_deposit: guardian.notify_on_payday_loans
  };

  return preferences[eventType] !== false;
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(phoneNumber, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('[Guardian SMS] Twilio not configured, skipping SMS');
    return { success: false, reason: 'twilio_not_configured' };
  }

  try {
    // Twilio API endpoint
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: from,
        Body: message
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[Guardian SMS] Sent successfully:', result.sid);
      return { success: true, sid: result.sid, status: result.status };
    } else {
      console.error('[Guardian SMS] Failed:', result);
      return { success: false, error: result };
    }

  } catch (error) {
    console.error('[Guardian SMS] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Email via Resend
 */
async function sendEmail(toEmail, subject, body) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Guardian Email] Resend not configured, skipping email');
    return { success: false, reason: 'resend_not_configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Anchor <notifications@anchor.app>',
        to: toEmail,
        subject: subject,
        text: body,
        html: `<pre>${body}</pre>` // Simple HTML version
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[Guardian Email] Sent successfully:', result.id);
      return { success: true, id: result.id };
    } else {
      console.error('[Guardian Email] Failed:', result);
      return { success: false, error: result };
    }

  } catch (error) {
    console.error('[Guardian Email] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format message for event type
 */
function formatMessage(eventType, eventData) {
  const time = new Date().toLocaleString('en-AU', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  switch (eventType) {
    case 'payment_request':
      return {
        title: 'Payment Request',
        sms: `[Anchor] Matt requested $${eventData.amount} for "${eventData.reason}". AI is evaluating. ${time}`,
        email: `Matt has submitted a payment request.

Amount: $${eventData.amount}
Reason: ${eventData.reason}
Time: ${time}

The AI is evaluating this request based on his spending patterns and triggers.
You'll receive another notification with the decision.

- Anchor`
      };

    case 'payment_approved':
      return {
        title: 'Payment Approved',
        sms: `[Anchor] Payment APPROVED: $${eventData.amount} for ${eventData.reason}. Classification: ${eventData.classification}. ${time}`,
        email: `A payment request has been approved.

Amount: $${eventData.amount}
Purpose: ${eventData.reason}
Classification: ${eventData.classification}
Time: ${time}

Matt has been sent instructions to complete the transfer manually in his Up Bank app.

- Anchor`
      };

    case 'payment_denied':
      return {
        title: 'Payment DENIED',
        sms: `[Anchor] Payment DENIED: $${eventData.amount}. Reason: ${eventData.denial_reason}. ${time}`,
        email: `A payment request has been DENIED.

Amount: $${eventData.amount}
Requested for: ${eventData.reason}
Denial reason: ${eventData.denial_reason}
Time: ${time}

${eventData.conversation_summary || 'The AI determined this request was high-risk.'}

- Anchor`
      };

    case 'gambling_trigger':
      return {
        title: '🚨 Gambling Trigger Detected',
        sms: `[Anchor] 🚨 GAMBLING TRIGGER: Matt tried $${eventData.amount} to ${eventData.payee} at ${time}. ${eventData.blocked ? 'BLOCKED' : 'Intervention in progress'}.`,
        email: `🚨 GAMBLING TRIGGER DETECTED

Matt attempted a transaction that matches his gambling patterns:

Amount: $${eventData.amount}
Merchant: ${eventData.payee}
Time: ${time}
Pattern: ${eventData.pattern_matched}

${eventData.blocked ?
  'Transaction was blocked due to insufficient funds in Allowance.' :
  'AI intervention conversation has been triggered.'}

- Anchor`
      };

    case 'payday_loan':
      return {
        title: '⚠️ PAYDAY LOAN DETECTED',
        sms: `[Anchor] ⚠️ PAYDAY LOAN: $${eventData.amount} from ${eventData.lender} at ${time}. Clean streak RESET. He's being interrogated.`,
        email: `⚠️ PAYDAY LOAN DETECTED

A deposit from a known predatory lender was detected:

Amount: $${eventData.amount}
Lender: ${eventData.lender}
Estimated repayment: $${eventData.estimated_repayment || 'Unknown'}
Interest rate: ${eventData.apr || '300-400%'} APR
Time: ${time}

Matt's clean streak has been reset.
The AI is interrogating him about this deposit.

This is a critical warning sign.

- Anchor`
      };

    case 'irregular_deposit':
      return {
        title: 'Irregular Deposit Detected',
        sms: `[Anchor] Irregular deposit: $${eventData.amount} from ${eventData.source}. Risk: ${eventData.risk_level}. Interrogation started. ${time}`,
        email: `An unexpected deposit has been detected:

Amount: $${eventData.amount}
Source: ${eventData.source}
Risk Level: ${eventData.risk_level}
Time: ${time}

The AI is questioning Matt about the source of this money to ensure it's legitimate income and not a loan or gambling windfall.

- Anchor`
      };

    case 'relapse':
      return {
        title: '❌ Relapse Event',
        sms: `[Anchor] ❌ RELAPSE: Matt's ${eventData.days_clean}-day clean streak ended. Trigger: ${eventData.trigger}. He needs support.`,
        email: `❌ RELAPSE EVENT

Matt's clean streak has ended after ${eventData.days_clean} days.

Trigger: ${eventData.trigger}
Time: ${time}
Last conversation: ${eventData.last_conversation_summary || 'Not available'}

This is a critical moment. He may need additional support.

- Anchor`
      };

    case 'clean_milestone':
      return {
        title: `✅ ${eventData.days} Days Clean`,
        sms: `[Anchor] ✅ ${eventData.days} DAYS CLEAN! Matt hit a milestone. Total saved: $${eventData.total_saved}. Keep supporting him.`,
        email: `✅ CLEAN MILESTONE: ${eventData.days} DAYS

Matt has reached ${eventData.days} days without gambling!

Total saved: $${eventData.total_saved}
Debt paid down: $${eventData.debt_paid || 0}
Vault balance: $${eventData.vault_balance || 0}

This is a significant achievement. Your support is helping him stay accountable.

- Anchor`
      };

    case 'payment_completed':
      return {
        title: 'Payment Completed',
        sms: `[Anchor] Payment completed: $${eventData.amount} for ${eventData.purpose}. ${time}`,
        email: `Matt completed a payment:

Amount: $${eventData.amount}
Purpose: ${eventData.purpose}
Time: ${time}

The transfer was detected in his Up Bank account and marked as complete.

- Anchor`
      };

    default:
      return {
        title: 'Anchor Notification',
        sms: `[Anchor] ${eventData.message || 'Activity detected'}. ${time}`,
        email: eventData.message || 'Activity detected in Matt\'s account.'
      };
  }
}

/**
 * Log guardian notification
 */
async function logNotification(guardianId, userId, eventType, eventData, smsResult, emailResult) {
  const { error } = await supabase
    .from('guardian_notifications')
    .insert({
      guardian_id: guardianId,
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      message_title: formatMessage(eventType, eventData).title,
      message_body: formatMessage(eventType, eventData).sms,
      sent_via_sms: !!smsResult.success,
      sent_via_email: !!emailResult.success,
      sms_sent_at: smsResult.success ? new Date().toISOString() : null,
      email_sent_at: emailResult.success ? new Date().toISOString() : null,
      sms_status: smsResult.success ? 'sent' : 'failed',
      email_status: emailResult.success ? 'sent' : 'failed'
    });

  if (error) {
    console.error('Error logging guardian notification:', error);
  }
}

/**
 * Main notification function
 *
 * @param {string} userId - User ID
 * @param {Object} event - Event details
 * @param {string} event.type - Event type
 * @param {Object} event.data - Event data
 */
async function notifyGuardian(userId, event) {
  const guardian = await getActiveGuardian(userId);
  if (!guardian) {
    console.log('[Guardian] No active guardian for user:', userId);
    return { success: false, reason: 'no_active_guardian' };
  }

  // Check notification preferences
  if (!shouldNotify(guardian, event.type)) {
    console.log('[Guardian] Notification disabled for event type:', event.type);
    return { success: false, reason: 'notification_disabled' };
  }

  const message = formatMessage(event.type, event.data);

  let smsResult = { success: false };
  let emailResult = { success: false };

  // Send SMS if phone number provided
  if (guardian.guardian_phone) {
    smsResult = await sendSMS(guardian.guardian_phone, message.sms);
  }

  // Send email if email provided
  if (guardian.guardian_email) {
    emailResult = await sendEmail(
      guardian.guardian_email,
      message.title,
      message.email
    );
  }

  // Log the notification attempt
  await logNotification(
    guardian.id,
    userId,
    event.type,
    event.data,
    smsResult,
    emailResult
  );

  console.log('[Guardian] Notification sent:', {
    type: event.type,
    sms: smsResult.success,
    email: emailResult.success
  });

  return {
    success: smsResult.success || emailResult.success,
    sms: smsResult.success,
    email: emailResult.success
  };
}

/**
 * Send guardian invite
 */
async function sendGuardianInvite(guardian) {
  const inviteMessage = `Hi ${guardian.guardian_name},

Matt has chosen you as his financial guardian for the next 12 months through Anchor, a gambling accountability app.

You'll receive occasional SMS/email alerts when:
• He requests to spend money
• Risky spending patterns are detected
• Milestones are reached (30/60/90 days clean)

You won't need to do anything except be aware. The AI handles the interventions.

Your commitment: ${new Date(guardian.commitment_start_date).toLocaleDateString()} - ${new Date(guardian.commitment_end_date).toLocaleDateString()}

Reply YES to accept this role, or call Matt to discuss.

- Anchor`;

  const smsResult = await sendSMS(guardian.guardian_phone, inviteMessage);

  if (guardian.guardian_email) {
    await sendEmail(
      guardian.guardian_email,
      'Financial Guardian Invitation from Matt',
      inviteMessage
    );
  }

  // Update guardian record
  await supabase
    .from('guardians')
    .update({
      invite_sent_at: new Date().toISOString()
    })
    .eq('id', guardian.id);

  return smsResult;
}

module.exports = {
  getActiveGuardian,
  notifyGuardian,
  sendGuardianInvite,
  formatMessage
};
