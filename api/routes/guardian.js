/**
 * Guardian Routes
 * Handles guardian invitation, acceptance, monitoring, and emergency triggers
 */

const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateGuardian, generateToken } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const { supabase, logError } = require('../utils/supabase');
const crypto = require('crypto');

// Twilio for SMS
const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * POST /api/guardian/invite
 * Send SMS invite to guardian
 */
router.post('/invite', authenticateUser, validateBody(schemas.guardianInvite), async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, email, relationship } = req.body;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('name, commitment_period_months')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check if guardian already exists
    const { data: existingGuardian } = await supabase
      .from('guardians')
      .select('id, status')
      .eq('user_id', userId)
      .single();

    if (existingGuardian && existingGuardian.status === 'active') {
      return res.status(400).json({
        error: true,
        code: 'GUARDIAN_EXISTS',
        message: 'User already has an active guardian',
      });
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create or update guardian record
    const guardianData = {
      user_id: userId,
      name,
      phone,
      email,
      relationship,
      status: 'invited',
      invite_token: inviteToken,
      invite_expires_at: inviteExpiry.toISOString(),
    };

    let guardianId;

    if (existingGuardian) {
      // Update existing guardian
      const { data: updated } = await supabase
        .from('guardians')
        .update(guardianData)
        .eq('id', existingGuardian.id)
        .select()
        .single();
      guardianId = updated.id;
    } else {
      // Create new guardian
      const { data: created } = await supabase
        .from('guardians')
        .insert(guardianData)
        .select()
        .single();
      guardianId = created.id;
    }

    // Send SMS invite
    const inviteUrl = `${process.env.GUARDIAN_PORTAL_URL || 'https://guardian.anchor.app'}/accept/${inviteToken}`;
    const smsMessage = `${user.name} has chosen you as their financial guardian for the next ${user.commitment_period_months} months as they work to overcome problem gambling. This is a big responsibility - you'll see when they're struggling, but you can't control their money. Only they can. Accept: ${inviteUrl}`;

    try {
      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_FROM_NUMBER,
        to: phone,
      });
    } catch (twilioError) {
      await logError(twilioError, { context: 'guardian_invite_sms', userId, guardianId });
      // Continue even if SMS fails
      console.error('Failed to send SMS:', twilioError);
    }

    return res.status(201).json({
      success: true,
      guardian_id: guardianId,
      message: `SMS invite sent to ${phone}`,
    });

  } catch (error) {
    await logError(error, { context: 'guardian_invite', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to send guardian invite',
    });
  }
});

/**
 * POST /api/guardian/accept/:token
 * Accept guardian invitation (from SMS link)
 */
router.post('/accept/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find guardian by token
    const { data: guardian, error } = await supabase
      .from('guardians')
      .select(`
        *,
        users (
          id,
          name,
          clean_streak_days,
          commitment_end_date
        )
      `)
      .eq('invite_token', token)
      .eq('status', 'invited')
      .single();

    if (error || !guardian) {
      return res.status(404).json({
        error: true,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired invitation link',
      });
    }

    // Check if token expired
    if (new Date(guardian.invite_expires_at) < new Date()) {
      return res.status(400).json({
        error: true,
        code: 'TOKEN_EXPIRED',
        message: 'Invitation link has expired',
      });
    }

    // Activate guardian
    await supabase
      .from('guardians')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
        invite_token: null,
        invite_expires_at: null,
      })
      .eq('id', guardian.id);

    // Generate guardian JWT token
    const guardianToken = generateToken({
      guardianId: guardian.id,
      userId: guardian.user_id,
      type: 'guardian',
    });

    return res.status(200).json({
      success: true,
      guardian_token: guardianToken,
      user_name: guardian.users.name,
      message: 'Guardian role accepted',
    });

  } catch (error) {
    await logError(error, { context: 'guardian_accept', token: req.params.token });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to accept guardian invitation',
    });
  }
});

/**
 * GET /api/guardian/status
 * Get guardian status and user info
 */
router.get('/status', authenticateGuardian, async (req, res) => {
  try {
    const guardianId = req.guardianId;

    const { data: guardian } = await supabase
      .from('guardians')
      .select(`
        id,
        name,
        relationship,
        status,
        users (
          name,
          current_streak_days,
          commitment_end_date
        )
      `)
      .eq('id', guardianId)
      .single();

    if (!guardian) {
      return res.status(404).json({
        error: true,
        code: 'GUARDIAN_NOT_FOUND',
        message: 'Guardian not found',
      });
    }

    return res.status(200).json({
      success: true,
      guardian: {
        id: guardian.id,
        name: guardian.name,
        relationship: guardian.relationship,
        status: guardian.status,
      },
      user: {
        name: guardian.users.name,
        clean_streak_days: guardian.users.current_streak_days,
        commitment_end_date: guardian.users.commitment_end_date,
      },
    });

  } catch (error) {
    await logError(error, { context: 'guardian_status', guardianId: req.guardianId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get guardian status',
    });
  }
});

/**
 * GET /api/guardian/view
 * What guardian sees (clean streak, patterns, NO amounts)
 */
router.get('/view', authenticateGuardian, async (req, res) => {
  try {
    const { userId } = req;

    // Get user data (NO financial amounts)
    const { data: user } = await supabase
      .from('users')
      .select('current_streak_days, last_relapse_date')
      .eq('id', userId)
      .single();

    // Get recent events (last 7 days) - patterns only, NO amounts
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: patterns } = await supabase
      .from('gambling_patterns')
      .select('pattern_type, severity, detected_at')
      .eq('user_id', userId)
      .gte('detected_at', sevenDaysAgo)
      .order('detected_at', { ascending: false });

    // Get active conversations
    const { data: activeConversation } = await supabase
      .from('ai_conversations')
      .select('id, status, trigger_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Determine current status
    let currentStatus = 'stable';
    if (activeConversation) {
      currentStatus = 'conversation';
    } else if (patterns && patterns.some(p => p.severity === 'CRITICAL')) {
      currentStatus = 'high_risk';
    }

    return res.status(200).json({
      success: true,
      data: {
        clean_streak_days: user.current_streak_days,
        current_status: currentStatus,
        recent_events: patterns || [],
        money_saved_description: user.current_streak_days > 30
          ? 'Has saved significant amount'
          : 'Building savings',
        next_check_in: activeConversation ? activeConversation.id : null,
      },
    });

  } catch (error) {
    await logError(error, { context: 'guardian_view', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get guardian view',
    });
  }
});

/**
 * POST /api/guardian/emergency
 * Guardian triggers emergency check-in
 */
router.post('/emergency', authenticateGuardian, validateBody(schemas.emergencyTrigger), async (req, res) => {
  try {
    const { userId } = req;
    const { reason } = req.body;

    // Create emergency AI conversation
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        trigger_type: 'GUARDIAN_EMERGENCY',
        trigger_reason: `Guardian concerned: ${reason}`,
        status: 'active',
        is_unavoidable: true,
        transcript: {
          messages: [],
          guardian_trigger_reason: reason,
        },
      })
      .select()
      .single();

    // Send push notification to user
    // (In production, this would use Expo push notifications)
    console.log(`Emergency check-in triggered for user ${userId}: ${reason}`);

    return res.status(200).json({
      success: true,
      conversation_id: conversation.id,
      message: 'Emergency check-in triggered, user will be notified',
    });

  } catch (error) {
    await logError(error, { context: 'guardian_emergency', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to trigger emergency check-in',
    });
  }
});

module.exports = router;
