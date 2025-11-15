/**
 * Twilio SMS Webhook
 *
 * Handles incoming SMS replies from guardians
 * Used to track guardian invitation acceptance
 * When guardian replies "YES" to invite, updates invite_status to 'accepted'
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Main webhook handler for Twilio SMS
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Twilio sends webhook data as form-urlencoded
    const { From, Body, MessageSid } = req.body;

    if (!From || !Body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[Twilio SMS] Received SMS:', {
      from: From,
      body: Body,
      sid: MessageSid
    });

    // Normalize phone number (remove +61 or 0 prefix)
    const normalizedPhone = normalizePhoneNumber(From);

    // Look up guardian by phone number
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('*')
      .eq('active', true)
      .or(`guardian_phone.eq.${From},guardian_phone.eq.${normalizedPhone}`)
      .single();

    if (guardianError || !guardian) {
      console.log('[Twilio SMS] No guardian found for phone:', From);

      // Send a polite response
      return sendTwiMLResponse(res, "Sorry, I don't recognize this number. Please contact Matt if you need help.");
    }

    // Parse message body
    const messageBody = Body.trim().toLowerCase();

    // Check for acceptance (YES, Y, ACCEPT, SURE, OK)
    const acceptanceKeywords = ['yes', 'y', 'accept', 'sure', 'ok', 'yeah', 'yep'];
    const isAcceptance = acceptanceKeywords.some(keyword => messageBody === keyword || messageBody.startsWith(keyword));

    // Check for decline (NO, N, DECLINE, NOPE)
    const declineKeywords = ['no', 'n', 'decline', 'nope', 'nah'];
    const isDecline = declineKeywords.some(keyword => messageBody === keyword || messageBody.startsWith(keyword));

    if (isAcceptance) {
      // Update guardian status to accepted
      const { error: updateError } = await supabase
        .from('guardians')
        .update({
          invite_status: 'accepted',
          invite_accepted_at: new Date().toISOString()
        })
        .eq('id', guardian.id);

      if (updateError) {
        console.error('[Twilio SMS] Error updating guardian status:', updateError);
        return sendTwiMLResponse(res, "Thanks! There was an error updating your status. Please contact Matt.");
      }

      console.log('[Twilio SMS] Guardian accepted invite:', guardian.guardian_name);

      // Send confirmation response
      return sendTwiMLResponse(
        res,
        `Thanks ${guardian.guardian_name}! You're now Matt's financial guardian. You'll receive notifications about his spending and recovery progress.`
      );

    } else if (isDecline) {
      // Update guardian status to declined
      const { error: updateError } = await supabase
        .from('guardians')
        .update({
          invite_status: 'declined',
          active: false
        })
        .eq('id', guardian.id);

      if (updateError) {
        console.error('[Twilio SMS] Error updating guardian status:', updateError);
        return sendTwiMLResponse(res, "Understood. Please contact Matt to discuss.");
      }

      console.log('[Twilio SMS] Guardian declined invite:', guardian.guardian_name);

      // Send confirmation response
      return sendTwiMLResponse(
        res,
        "Understood. We've let Matt know. Please reach out to him directly to discuss."
      );

    } else if (messageBody.includes('help') || messageBody.includes('?')) {
      // Help response
      return sendTwiMLResponse(
        res,
        "This is Anchor, Matt's gambling accountability system. Reply YES to accept being his guardian, or NO to decline. Contact Matt for more info."
      );

    } else {
      // Unrecognized response
      return sendTwiMLResponse(
        res,
        `Got your message: "${Body}". Reply YES to accept or NO to decline. Reply HELP for more info.`
      );
    }

  } catch (error) {
    console.error('[Twilio SMS] Webhook error:', error);

    // Send error response to user
    return sendTwiMLResponse(
      res,
      "Sorry, there was an error processing your message. Please try again or contact Matt directly."
    );
  }
}

/**
 * Normalize phone number for matching
 * Handles various Australian phone number formats
 */
function normalizePhoneNumber(phone) {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 61, remove it (country code)
  if (cleaned.startsWith('61')) {
    cleaned = '0' + cleaned.substring(2);
  }

  // If doesn't start with 0, add it
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  return '+61' + cleaned.substring(1);
}

/**
 * Send TwiML response to Twilio
 * Twilio expects XML response to send SMS back
 */
function sendTwiMLResponse(res, message) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
