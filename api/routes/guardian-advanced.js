/**
 * Guardian Advanced API Routes
 *
 * Advanced endpoints for guardian features:
 * - Analytics dashboard data
 * - Intervention history
 * - Quick messages
 * - Risk alerts
 * - Group insights
 * - Crisis protocol
 */

const { createClient } = require('@supabase/supabase-js');
const GuardianInsights = require('../services/guardian-insights');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get guardian analytics
 * GET /api/guardian-advanced/analytics?userId=xxx&timeframe=30
 */
async function getAnalytics(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, timeframe = 30 } = req.query;
    const guardianId = req.headers['x-guardian-id']; // TODO: Implement proper auth

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const insights = new GuardianInsights(supabase);

    const analytics = await insights.getAnalytics(userId, guardianId, parseInt(timeframe));

    return res.status(200).json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
}

/**
 * Get intervention history
 * GET /api/guardian-advanced/interventions?userId=xxx&limit=20
 */
async function getInterventions(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const insights = new GuardianInsights(supabase);

    const interventions = await insights.getInterventionHistory(userId, parseInt(limit));

    return res.status(200).json({
      interventions,
      total: interventions.length
    });
  } catch (error) {
    console.error('Interventions error:', error);
    return res.status(500).json({
      error: 'Failed to get interventions',
      message: error.message
    });
  }
}

/**
 * Get quick support messages
 * GET /api/guardian-advanced/quick-messages?context=general
 */
async function getQuickMessages(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { context = 'general' } = req.query;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const insights = new GuardianInsights(supabase);

    const messages = insights.getQuickMessages(context);

    return res.status(200).json({
      context,
      messages
    });
  } catch (error) {
    console.error('Quick messages error:', error);
    return res.status(500).json({
      error: 'Failed to get quick messages',
      message: error.message
    });
  }
}

/**
 * Check crisis protocol
 * GET /api/guardian-advanced/crisis-check?userId=xxx
 */
async function checkCrisisProtocol(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const insights = new GuardianInsights(supabase);

    const crisisCheck = await insights.shouldActivateCrisisProtocol(userId);

    return res.status(200).json(crisisCheck);
  } catch (error) {
    console.error('Crisis check error:', error);
    return res.status(500).json({
      error: 'Failed to check crisis protocol',
      message: error.message
    });
  }
}

/**
 * Get group insights (anonymized)
 * GET /api/guardian-advanced/group-insights
 */
async function getGroupInsights(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const insights = new GuardianInsights(supabase);

    const groupData = await insights.getGroupInsights();

    return res.status(200).json(groupData);
  } catch (error) {
    console.error('Group insights error:', error);
    return res.status(500).json({
      error: 'Failed to get group insights',
      message: error.message
    });
  }
}

/**
 * Schedule check-in (create reminder)
 * POST /api/guardian-advanced/schedule-checkin
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "scheduledTime": "2024-01-15T18:00:00Z",
 *     "message": "Evening check-in",
 *     "type": "routine|high-risk|payday|milestone"
 *   }
 */
async function scheduleCheckIn(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, scheduledTime, message, type = 'routine' } = req.body;
    const guardianId = req.headers['x-guardian-id'];

    if (!userId || !scheduledTime) {
      return res.status(400).json({ error: 'userId and scheduledTime are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create check-in reminder
    const { data, error } = await supabase
      .from('guardian_checkins')
      .insert({
        user_id: userId,
        guardian_id: guardianId,
        scheduled_time: scheduledTime,
        message: message,
        type: type,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      checkIn: data
    });
  } catch (error) {
    console.error('Schedule check-in error:', error);
    return res.status(500).json({
      error: 'Failed to schedule check-in',
      message: error.message
    });
  }
}

/**
 * Send quick message
 * POST /api/guardian-advanced/send-message
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "message": "Thinking of you",
 *     "context": "general|high-risk|milestone"
 *   }
 */
async function sendMessage(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, message, context = 'general' } = req.body;
    const guardianId = req.headers['x-guardian-id'];

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Store message
    const { data, error } = await supabase
      .from('guardian_messages')
      .insert({
        user_id: userId,
        guardian_id: guardianId,
        message: message,
        context: context,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send push notification to user

    return res.status(200).json({
      success: true,
      messageSent: true
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
}

/**
 * Get upcoming check-ins
 * GET /api/guardian-advanced/checkins?userId=xxx
 */
async function getCheckIns(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: checkIns, error } = await supabase
      .from('guardian_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      checkIns: checkIns || []
    });
  } catch (error) {
    console.error('Get check-ins error:', error);
    return res.status(500).json({
      error: 'Failed to get check-ins',
      message: error.message
    });
  }
}

/**
 * Main handler for Vercel serverless function
 */
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Guardian-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.url.split('?')[0];

    if (path.endsWith('/analytics')) {
      return await getAnalytics(req, res);
    } else if (path.endsWith('/interventions')) {
      return await getInterventions(req, res);
    } else if (path.endsWith('/quick-messages')) {
      return await getQuickMessages(req, res);
    } else if (path.endsWith('/crisis-check')) {
      return await checkCrisisProtocol(req, res);
    } else if (path.endsWith('/group-insights')) {
      return await getGroupInsights(req, res);
    } else if (path.endsWith('/schedule-checkin')) {
      return await scheduleCheckIn(req, res);
    } else if (path.endsWith('/send-message')) {
      return await sendMessage(req, res);
    } else if (path.endsWith('/checkins')) {
      return await getCheckIns(req, res);
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export individual functions for testing
module.exports.getAnalytics = getAnalytics;
module.exports.getInterventions = getInterventions;
module.exports.getQuickMessages = getQuickMessages;
module.exports.checkCrisisProtocol = checkCrisisProtocol;
module.exports.getGroupInsights = getGroupInsights;
module.exports.scheduleCheckIn = scheduleCheckIn;
module.exports.sendMessage = sendMessage;
module.exports.getCheckIns = getCheckIns;
