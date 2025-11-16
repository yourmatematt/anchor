/**
 * Waitlist Routes
 * Handles waitlist signups, qualification, and auto-responder emails
 */

const express = require('express');
const router = express.Router();
const { validateBody, schemas } = require('../middleware/validation');
const { supabase, logError } = require('../utils/supabase');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * POST /api/waitlist/submit
 * Submit waitlist signup
 * No auth required (public endpoint)
 */
router.post('/submit', validateBody(schemas.waitlistSubmit), async (req, res) => {
  try {
    const {
      email,
      name,
      lost_5k,
      relapsed,
      up_bank,
      guardian,
      ready,
      qualification_tier,
    } = req.body;

    // Check if email already on waitlist
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({
        error: true,
        code: 'ALREADY_ON_WAITLIST',
        message: 'This email is already on the waitlist',
      });
    }

    // Create waitlist entry
    const waitlistData = {
      email: email.toLowerCase(),
      name,
      lost_5k: lost_5k === 'yes',
      relapsed: relapsed === 'yes',
      up_bank_status: up_bank,
      guardian_type: guardian,
      ready: ready === 'yes',
      qualification_tier,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };

    const { data: waitlistEntry, error } = await supabase
      .from('waitlist')
      .insert(waitlistData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send auto-responder email based on tier
    await sendAutoResponder(waitlistEntry);

    // Send notification to team (optional)
    if (qualification_tier === 'priority') {
      await notifyTeam(waitlistEntry);
    }

    return res.status(201).json({
      success: true,
      message: 'Added to waitlist successfully',
      waitlist_id: waitlistEntry.id,
    });

  } catch (error) {
    await logError(error, { context: 'waitlist_submit', email: req.body.email });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to submit waitlist signup',
    });
  }
});

/**
 * Send auto-responder email based on qualification tier
 */
async function sendAutoResponder(entry) {
  // In production, this would use a service like SendGrid, Postmark, or AWS SES
  // For now, we'll just log what would be sent

  const templates = {
    priority: {
      subject: "You're In - Anchor Priority Waitlist",
      body: `Hi ${entry.name},

You're on the priority waitlist for Anchor.

You'll be in the first wave when we launch in approximately 6-8 weeks.

**What Happens Next:**

1. You'll receive early access notification (1 week before public launch)
2. Guardian preparation guide (they need to understand what they're signing up for)
${entry.up_bank_status === 'will_switch' ? '3. Up Bank setup instructions - START THIS NOW\n4. What to expect in your first 30 days' : '3. What to expect in your first 30 days'}

**Start Preparing Now:**

Talk to your guardian. This only works if they understand the commitment:
- They'll see when you're struggling (but not your bank balance)
- They can trigger emergency check-ins
- You can't hide from them

${entry.up_bank_status === 'will_switch' ? 'Switch to Up Bank now. It takes 3-5 business days. You need to be ready when we launch.\n\n' : ''}If you relapse before launch, that's okay. We'll be here when you're ready to try again.

**In Crisis?**
Gambling Help: 1800 858 858 (24/7)
Lifeline: 13 11 14

We'll be in touch soon.

- Matt
Anchor Founder`
    },

    high: {
      subject: "You're On the Anchor Waitlist",
      body: `Hi ${entry.name},

You're on the waitlist for Anchor.

We'll contact you when we're ready to onboard new users.

**In the Meantime:**

1. Talk to your potential guardian - get their honest buy-in
2. ${entry.up_bank_status !== 'yes' ? 'Switch to Up Bank if you haven\'t already\n3. ' : ''}Keep track of how much you're losing - it's fuel for commitment
${entry.up_bank_status !== 'yes' ? '4. ' : '3. '}If you relapse, don't beat yourself up. Use it as proof you need this.

**Anchor Only Works If:**
- You're truly desperate to stop
- You have someone who'll hold you accountable
- You're ready to lose control of your money

If you're in crisis right now, call Gambling Help: 1800 858 858

We'll be in touch.

- Matt
Anchor Founder`
    },

    standard: {
      subject: "Anchor Waitlist Confirmation",
      body: `Hi ${entry.name},

You're on the waitlist for Anchor.

We'll be in touch when we're expanding access.

**Quick Note:**
Anchor works best for people who've:
- Lost significant amounts to gambling ($5k+)
- Relapsed multiple times despite trying to quit
- Hit rock bottom and are desperate for change

If that becomes your situation, we'll be here.

Until then, professional counseling can help:
Gambling Help: 1800 858 858
Free, confidential, 24/7

- Matt
Anchor Founder`
    }
  };

  const template = templates[entry.qualification_tier] || templates.standard;

  console.log('Auto-responder would be sent:');
  console.log(`To: ${entry.email}`);
  console.log(`Subject: ${template.subject}`);
  console.log(`Body:\n${template.body}`);

  // TODO: Integrate with email service (SendGrid, Postmark, etc.)
  // await sendEmail({
  //   to: entry.email,
  //   subject: template.subject,
  //   text: template.body,
  // });
}

/**
 * Notify team of priority signup
 */
async function notifyTeam(entry) {
  // Send SMS to team (optional)
  const teamPhone = process.env.TEAM_NOTIFICATION_PHONE;

  if (!teamPhone) return;

  try {
    await twilioClient.messages.create({
      body: `PRIORITY WAITLIST: ${entry.name} (${entry.email}) - Ready: ${entry.ready ? 'Yes' : 'No'}, Up Bank: ${entry.up_bank_status}`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: teamPhone,
    });
  } catch (error) {
    console.error('Failed to send team notification:', error);
    // Don't fail the request if notification fails
  }
}

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics (internal use only)
 */
router.get('/stats', async (req, res) => {
  try {
    // Simple API key auth for internal stats
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.SERVICE_API_KEY) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
      });
    }

    // Get stats
    const { data: waitlist } = await supabase
      .from('waitlist')
      .select('qualification_tier, up_bank_status, submitted_at');

    if (!waitlist) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          by_tier: {},
          by_bank: {},
          recent_signups: [],
        },
      });
    }

    // Calculate stats
    const stats = {
      total: waitlist.length,
      by_tier: {
        priority: waitlist.filter(w => w.qualification_tier === 'priority').length,
        high: waitlist.filter(w => w.qualification_tier === 'high').length,
        standard: waitlist.filter(w => w.qualification_tier === 'standard').length,
      },
      by_bank: {
        yes: waitlist.filter(w => w.up_bank_status === 'yes').length,
        will_switch: waitlist.filter(w => w.up_bank_status === 'will_switch').length,
        no: waitlist.filter(w => w.up_bank_status === 'no').length,
      },
      recent_signups: waitlist
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
        .slice(0, 10)
        .map(w => ({
          tier: w.qualification_tier,
          bank: w.up_bank_status,
          date: w.submitted_at,
        })),
    };

    return res.json({
      success: true,
      stats,
    });

  } catch (error) {
    await logError(error, { context: 'waitlist_stats' });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get waitlist stats',
    });
  }
});

module.exports = router;
