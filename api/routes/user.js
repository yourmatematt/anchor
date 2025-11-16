/**
 * User Routes
 * Handles user onboarding, profile management, and streak tracking
 */

const express = require('express');
const router = express.Router();
const { authenticateUser, generateToken } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const { supabase, logError } = require('../utils/supabase');

/**
 * POST /api/user/onboard
 * Complete user onboarding
 * Auth: None (creates initial token)
 */
router.post('/onboard', validateBody(schemas.onboarding), async (req, res) => {
  try {
    const {
      name,
      phone,
      commitment_period_months,
      gambling_type,
      known_triggers,
      up_bank_token,
    } = req.body;

    // Calculate commitment dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + commitment_period_months);

    // Create user
    const userData = {
      name,
      phone,
      commitment_period_months,
      commitment_start_date: startDate.toISOString(),
      commitment_end_date: endDate.toISOString(),
      gambling_type,
      known_triggers,
      up_bank_token,
      current_streak_days: 0,
      vault_balance: 0,
      daily_allowance_limit: 30.0,
      daily_allowance_used: 0,
      allowance_reset_at: new Date(startDate.setHours(24, 0, 0, 0)).toISOString(),
      total_relapses: 0,
      onboarding_completed: true,
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      type: 'user',
    });

    return res.status(201).json({
      success: true,
      user_id: user.id,
      token,
      message: 'Onboarding complete',
    });

  } catch (error) {
    await logError(error, { context: 'user_onboard', phone: req.body.phone });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to complete onboarding',
    });
  }
});

/**
 * GET /api/user/profile
 * Get user profile and settings
 */
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, commitment_period_months, commitment_start_date, commitment_end_date, gambling_type, known_triggers')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      profile: user,
    });

  } catch (error) {
    await logError(error, { context: 'user_profile', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get user profile',
    });
  }
});

/**
 * GET /api/user/streak
 * Get clean streak details
 */
router.get('/streak', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('current_streak_days, commitment_start_date, last_relapse_date, total_relapses, longest_streak')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      streak: {
        days: user.current_streak_days || 0,
        start_date: user.commitment_start_date,
        last_relapse_date: user.last_relapse_date,
        total_relapses: user.total_relapses || 0,
        longest_streak: user.longest_streak || user.current_streak_days || 0,
      },
    });

  } catch (error) {
    await logError(error, { context: 'user_streak', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get user streak',
    });
  }
});

/**
 * POST /api/user/relapse
 * Record relapse (called by pattern detector)
 * Auth: Service (internal)
 */
router.post('/relapse', validateBody(schemas.relapseRecord), async (req, res) => {
  try {
    const { user_id, pattern_type, transaction_id } = req.body;

    // Get current user data
    const { data: user } = await supabase
      .from('users')
      .select('current_streak_days, longest_streak')
      .eq('id', user_id)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const now = new Date().toISOString();

    // Update longest streak if current is longer
    const updateData = {
      last_relapse_date: now,
      current_streak_days: 0,
      total_relapses: user.total_relapses + 1,
    };

    if (user.current_streak_days > (user.longest_streak || 0)) {
      updateData.longest_streak = user.current_streak_days;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id);

    if (error) {
      throw error;
    }

    // Record relapse event
    await supabase
      .from('relapse_events')
      .insert({
        user_id,
        pattern_type,
        transaction_id,
        previous_streak_days: user.current_streak_days,
      });

    return res.status(200).json({
      success: true,
      new_streak_days: 0,
      total_relapses: user.total_relapses + 1,
    });

  } catch (error) {
    await logError(error, { context: 'user_relapse', userId: req.body.user_id });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to record relapse',
    });
  }
});

module.exports = router;
