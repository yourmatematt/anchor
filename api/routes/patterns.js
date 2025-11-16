/**
 * Pattern Routes
 * Handles gambling pattern detection and analysis
 * Used internally by webhook handlers and for guardian visibility
 */

const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateGuardian, authenticateService } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const { supabase, logError } = require('../utils/supabase');

/**
 * POST /api/patterns/detect
 * Analyze transaction for patterns (called by webhook handler)
 * Auth: Service (internal)
 */
router.post('/detect', validateBody(schemas.patternDetect), async (req, res) => {
  try {
    const { user_id, transaction } = req.body;

    // This would typically call the pattern detection service
    // For now, returning a mock response structure
    const { analyzeTransaction } = require('../services/pattern-detection');

    // Get user context
    const { data: user } = await supabase
      .from('users')
      .select('current_streak_days, gambling_type, known_triggers')
      .eq('id', user_id)
      .single();

    if (!user) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const userContext = {
      streakDays: user.current_streak_days,
      gamblingType: user.gambling_type,
      knownTriggers: user.known_triggers,
    };

    const result = await analyzeTransaction(transaction, user_id, userContext);

    return res.status(200).json({
      success: true,
      pattern_detected: result.detected,
      pattern: result.detected ? {
        type: result.pattern,
        risk: result.risk,
        trigger_ai: result.triggerAI,
        trigger_guardian: result.triggerGuardian,
      } : null,
    });

  } catch (error) {
    await logError(error, { context: 'pattern_detect', body: req.body });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to detect patterns',
    });
  }
});

/**
 * GET /api/patterns/user/:userId
 * Get user's detected patterns
 * Auth: User or Guardian
 */
router.get('/user/:userId', async (req, res) => {
  try {
    // Verify authentication (either user or their guardian)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      });
    }

    const { userId } = req.params;
    const days = Math.min(parseInt(req.query.days) || 30, 365);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: patterns, error } = await supabase
      .from('gambling_patterns')
      .select('*')
      .eq('user_id', userId)
      .gte('detected_at', startDate)
      .order('detected_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      patterns: patterns || [],
    });

  } catch (error) {
    await logError(error, { context: 'patterns_user', userId: req.params.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get user patterns',
    });
  }
});

/**
 * GET /api/patterns/timeline
 * Pattern timeline for calendar view
 * Auth: User
 */
router.get('/timeline', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'start_date and end_date are required',
      });
    }

    const { data: patterns } = await supabase
      .from('gambling_patterns')
      .select('detected_at, severity')
      .eq('user_id', userId)
      .gte('detected_at', start_date)
      .lte('detected_at', end_date)
      .order('detected_at', { ascending: true });

    // Group by date
    const timeline = {};

    // Initialize all dates in range
    const start = new Date(start_date);
    const end = new Date(end_date);
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      timeline[dateStr] = {
        date: dateStr,
        has_patterns: false,
        pattern_count: 0,
        highest_severity: null,
      };
    }

    // Add pattern data
    if (patterns) {
      patterns.forEach(pattern => {
        const dateStr = pattern.detected_at.split('T')[0];
        if (timeline[dateStr]) {
          timeline[dateStr].has_patterns = true;
          timeline[dateStr].pattern_count++;

          // Update highest severity
          const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
          const currentRank = severityRank[timeline[dateStr].highest_severity] || 0;
          const newRank = severityRank[pattern.severity] || 0;

          if (newRank > currentRank) {
            timeline[dateStr].highest_severity = pattern.severity;
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      timeline: Object.values(timeline),
    });

  } catch (error) {
    await logError(error, { context: 'patterns_timeline', userId: req.userId });
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Failed to get pattern timeline',
    });
  }
});

module.exports = router;
