/**
 * Email Sender Service
 *
 * Wrapper for SendGrid/AWS SES email delivery
 * Handles delivery tracking, bounces, and unsubscribes
 */

/**
 * Send email via configured provider
 */
async function send(options) {
  const { to, subject, html, text, userId, templateId } = options;

  // Validate inputs
  if (!to || !subject || !html) {
    throw new Error('Missing required email fields: to, subject, html');
  }

  // Choose provider based on environment
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid'; // 'sendgrid' or 'ses'

  if (provider === 'sendgrid') {
    return await sendViaSendGrid(options);
  } else if (provider === 'ses') {
    return await sendViaSES(options);
  } else {
    // Development mode - log to console
    return await sendViaConsole(options);
  }
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(options) {
  const { to, subject, html, text, userId, templateId } = options;

  // TODO: Implement SendGrid integration
  /* Example SendGrid code:
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: to,
    from: {
      email: process.env.FROM_EMAIL,
      name: 'Anchor'
    },
    subject: subject,
    text: text,
    html: html,
    customArgs: {
      userId: userId,
      templateId: templateId
    },
    trackingSettings: {
      clickTracking: {
        enable: true
      },
      openTracking: {
        enable: true
      }
    }
  };

  const result = await sgMail.send(msg);

  return {
    status: 'sent',
    messageId: result[0].headers['x-message-id'],
    timestamp: new Date().toISOString(),
    provider: 'sendgrid'
  };
  */

  console.log('SendGrid not configured - using console mode');
  return await sendViaConsole(options);
}

/**
 * Send via AWS SES
 */
async function sendViaSES(options) {
  const { to, subject, html, text, userId, templateId } = options;

  // TODO: Implement AWS SES integration
  /* Example SES code:
  const AWS = require('aws-sdk');
  const ses = new AWS.SES({
    region: process.env.AWS_REGION
  });

  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8'
        },
        Html: {
          Data: html,
          Charset: 'UTF-8'
        }
      }
    },
    Tags: [
      {
        Name: 'userId',
        Value: userId || 'system'
      },
      {
        Name: 'templateId',
        Value: templateId
      }
    ]
  };

  const result = await ses.sendEmail(params).promise();

  return {
    status: 'sent',
    messageId: result.MessageId,
    timestamp: new Date().toISOString(),
    provider: 'ses'
  };
  */

  console.log('AWS SES not configured - using console mode');
  return await sendViaConsole(options);
}

/**
 * Console mode for development
 */
async function sendViaConsole(options) {
  const { to, subject, html, text, userId, templateId } = options;

  console.log('\n=== EMAIL ===');
  console.log('TO:', to);
  console.log('SUBJECT:', subject);
  console.log('USER ID:', userId);
  console.log('TEMPLATE:', templateId);
  console.log('\n--- TEXT ---');
  console.log(text);
  console.log('\n--- HTML (truncated) ---');
  console.log(html.substring(0, 200) + '...');
  console.log('=============\n');

  return {
    status: 'sent',
    messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    provider: 'console'
  };
}

/**
 * Handle webhook from SendGrid
 */
async function handleSendGridWebhook(events, supabaseClient) {
  for (const event of events) {
    const messageId = event.sg_message_id;
    const eventType = event.event;

    // Update communication log
    if (eventType === 'delivered') {
      await supabaseClient
        .from('communications_log')
        .update({
          status: 'delivered',
          delivered_at: new Date(event.timestamp * 1000).toISOString()
        })
        .eq('message_id', messageId);
    } else if (eventType === 'bounce' || eventType === 'dropped') {
      await supabaseClient
        .from('communications_log')
        .update({
          status: 'bounced',
          bounce_reason: event.reason,
          bounced_at: new Date(event.timestamp * 1000).toISOString()
        })
        .eq('message_id', messageId);

      // Flag email as invalid
      await handleBounce(event.email, event.reason, supabaseClient);
    } else if (eventType === 'open') {
      await supabaseClient
        .from('communications_log')
        .update({
          opened_at: new Date(event.timestamp * 1000).toISOString()
        })
        .eq('message_id', messageId);
    } else if (eventType === 'click') {
      await supabaseClient
        .from('communications_log')
        .update({
          clicked_at: new Date(event.timestamp * 1000).toISOString()
        })
        .eq('message_id', messageId);
    }
  }
}

/**
 * Handle email bounce
 */
async function handleBounce(email, reason, supabaseClient) {
  try {
    // Update user record to flag invalid email
    await supabaseClient
      .from('users')
      .update({
        email_invalid: true,
        email_bounce_reason: reason,
        email_bounced_at: new Date().toISOString()
      })
      .eq('email', email);

    console.log(`Email flagged as invalid: ${email} - ${reason}`);
  } catch (error) {
    console.error('Error handling bounce:', error);
  }
}

/**
 * Handle unsubscribe
 */
async function handleUnsubscribe(email, supabaseClient) {
  try {
    // Update notification preferences to disable all optional emails
    await supabaseClient
      .from('users')
      .update({
        notification_preferences: {
          email: {
            daily_checkin: false,
            weekly_reports: false,
            high_risk_warnings: false,
            milestones: false
          }
        }
      })
      .eq('email', email);

    console.log(`User unsubscribed: ${email}`);
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
  }
}

/**
 * Verify email deliverability
 */
async function verifyEmail(email) {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      reason: 'Invalid email format'
    };
  }

  // TODO: Implement more sophisticated validation
  // - DNS MX record lookup
  // - Disposable email detection
  // - Role account detection (e.g., admin@, noreply@)

  return {
    valid: true
  };
}

module.exports = {
  send,
  sendViaSendGrid,
  sendViaSES,
  sendViaConsole,
  handleSendGridWebhook,
  handleBounce,
  handleUnsubscribe,
  verifyEmail
};
