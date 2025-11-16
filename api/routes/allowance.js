/**
 * Allowance Routes
 * Handles daily allowance tracking and usage
 * Resets to $30 daily at midnight AEST
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase, logError } = require('../utils/supabase');

/**
 * GET /api/allowance/balance
 * Get current daily allowance remaining
 */
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user } = await supabase
      .from('users')
      .select('daily_allowance_limit, daily_allowance_used, allowance_reset_at')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const dailyLimit = parseFloat(user.daily_allowance_limit) || 30.0;
    const usedToday = parseFloat(user.daily_allowance_used) || 0;
    const balance = Math.max(0, dailyLimit - usedToday);

    // Calculate next reset time (midnight AEST)
    const now = new Date();
    const resetTime = new Date(user.allowance_reset_at || now);

    // If reset time is in the past, it should have been reset by cron
    if (resetTime < now) {
      // Reset should have happened - set to next midnight
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      resetTime.setTime(tomorrow.getTime());
    }

    return res.status(200).json({
      success: true,
      balance: parseFloat(balance.toFixed(2)),
      daily_limit: dailyLimit,
      used_today: usedToday,
      resets_at: resetTime.toISOString(),
    });

  } catch (error) {
    await logError(error, { context: 'allowance_balance', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get allowance balance',
    });
  }
});

/**
 * GET /api/allowance/history
 * Get allowance usage history (7/30 days)
 */
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const days = Math.min(parseInt(req.query.days) || 7, 90);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get approved payment requests (these use allowance)
    const { data: payments } = await supabase
      .from('payment_requests')
      .select('amount, requested_at')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('requested_at', startDate.toISOString())
      .order('requested_at', { ascending: true });

    // Group by date
    const dailyUsage = {};
    const dailyLimit = 30.0; // Default

    // Initialize all days with zero usage
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyUsage[dateStr] = {
        date: dateStr,
        used: 0,
        limit: dailyLimit,
        percentage: 0,
      };
    }

    // Add actual usage
    if (payments) {
      payments.forEach(payment => {
        const dateStr = payment.requested_at.split('T')[0];
        if (dailyUsage[dateStr]) {
          dailyUsage[dateStr].used += parseFloat(payment.amount);
        }
      });
    }

    // Calculate percentages
    Object.values(dailyUsage).forEach(day => {
      day.used = parseFloat(day.used.toFixed(2));
      day.percentage = parseFloat(((day.used / day.limit) * 100).toFixed(1));
    });

    const history = Object.values(dailyUsage).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    return res.status(200).json({
      success: true,
      history,
    });

  } catch (error) {
    await logError(error, { context: 'allowance_history', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get allowance history',
    });
  }
});

module.exports = router;
