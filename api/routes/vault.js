/**
 * Vault Routes
 * Handles vault balance, growth tracking, and projections
 * Vault is locked until commitment end date
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase, logError } = require('../utils/supabase');

/**
 * GET /api/vault/balance
 * Get current vault balance and lock info
 */
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user } = await supabase
      .from('users')
      .select('vault_balance, commitment_end_date')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const endDate = new Date(user.commitment_end_date);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      success: true,
      balance: parseFloat(user.vault_balance) || 0,
      locked_until: user.commitment_end_date,
      days_remaining: Math.max(0, daysRemaining),
    });

  } catch (error) {
    await logError(error, { context: 'vault_balance', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get vault balance',
    });
  }
});

/**
 * GET /api/vault/growth
 * Get vault growth since clean date
 */
router.get('/growth', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user } = await supabase
      .from('users')
      .select('vault_balance, current_streak_days, commitment_start_date')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const currentBalance = parseFloat(user.vault_balance) || 0;
    const streakDays = user.current_streak_days || 0;

    // Get total deposits (all vault transactions)
    const { data: transactions } = await supabase
      .from('vault_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'DEPOSIT');

    const totalDeposits = transactions
      ? transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      : 0;

    // Calculate average per day
    const averagePerDay = streakDays > 0 ? currentBalance / streakDays : 0;

    return res.status(200).json({
      success: true,
      growth: {
        start_balance: 0,
        current_balance: currentBalance,
        total_deposits: totalDeposits,
        clean_streak_days: streakDays,
        average_per_day: parseFloat(averagePerDay.toFixed(2)),
      },
    });

  } catch (error) {
    await logError(error, { context: 'vault_growth', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get vault growth',
    });
  }
});

/**
 * GET /api/vault/projections
 * Calculate 6/12/24 month projections based on current savings rate
 */
router.get('/projections', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user } = await supabase
      .from('users')
      .select('vault_balance, current_streak_days')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const currentBalance = parseFloat(user.vault_balance) || 0;
    const streakDays = user.current_streak_days || 0;

    // Calculate daily average
    const dailyAverage = streakDays > 0 ? currentBalance / streakDays : 0;

    // Project future savings
    const projections = {
      '6_months': parseFloat((currentBalance + (dailyAverage * 180)).toFixed(2)),
      '12_months': parseFloat((currentBalance + (dailyAverage * 365)).toFixed(2)),
      '24_months': parseFloat((currentBalance + (dailyAverage * 730)).toFixed(2)),
      assumptions: `Based on current saving rate of $${dailyAverage.toFixed(2)}/day`,
    };

    return res.status(200).json({
      success: true,
      projections,
    });

  } catch (error) {
    await logError(error, { context: 'vault_projections', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to calculate vault projections',
    });
  }
});

module.exports = router;
