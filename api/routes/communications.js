/**
 * Communications API Routes
 *
 * Endpoints for managing communications, preferences, and delivery tracking
 */

const { createClient } = require('@supabase/supabase-js');
const CommunicationEngine = require('../services/communication-engine');
const { getPreferences, updatePreferences, unsubscribeAll, resubscribeDefaults, getControllableCategories, getMandatoryCategories } = require('../services/notification-preferences');
const { handleSendGridWebhook } = require('../services/email-sender');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get user notification preferences
 * GET /api/communications/preferences?userId=xxx
 */
async function getNotificationPreferences(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const preferences = await getPreferences(userId, supabase);

    return res.status(200).json({
      preferences,
      controllable: getControllableCategories(),
      mandatory: getMandatoryCategories()
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return res.status(500).json({
      error: 'Failed to get preferences',
      message: error.message
    });
  }
}

/**
 * Update user notification preferences
 * POST /api/communications/preferences
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "preferences": { ... }
 *   }
 */
async function updateNotificationPreferences(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({ error: 'userId and preferences are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const updated = await updatePreferences(userId, preferences, supabase);

    return res.status(200).json({
      success: true,
      preferences: updated
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
}

/**
 * Unsubscribe from all optional notifications
 * POST /api/communications/unsubscribe
 *
 * Body:
 *   {
 *     "userId": "xxx"
 *   }
 */
async function unsubscribeFromAll(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const result = await unsubscribeAll(userId, supabase);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to unsubscribe',
      message: error.message
    });
  }
}

/**
 * Re-subscribe to default notifications
 * POST /api/communications/resubscribe
 *
 * Body:
 *   {
 *     "userId": "xxx"
 *   }
 */
async function resubscribeToDefaults(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const result = await resubscribeDefaults(userId, supabase);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Resubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to resubscribe',
      message: error.message
    });
  }
}

/**
 * Get communication history
 * GET /api/communications/history?userId=xxx&type=sms&limit=50
 */
async function getCommunicationHistory(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, type, limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const commEngine = new CommunicationEngine(supabase);

    const history = await commEngine.getHistory(userId, {
      type,
      limit: parseInt(limit)
    });

    return res.status(200).json({
      history,
      total: history.length
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({
      error: 'Failed to get history',
      message: error.message
    });
  }
}

/**
 * Send test notification
 * POST /api/communications/test
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "type": "sms|email",
 *     "templateId": "DAILY_CHECKIN"
 *   }
 */
async function sendTestNotification(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, type, templateId } = req.body;

    if (!userId || !type || !templateId) {
      return res.status(400).json({ error: 'userId, type, and templateId are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const commEngine = new CommunicationEngine(supabase);

    let result;

    if (type === 'sms') {
      result = await commEngine.sendUserSMS(userId, templateId, {
        cleanStreak: 7,
        savedTotal: '350.00',
        dailyAllowance: 30
      }, { test: true });
    } else if (type === 'email') {
      result = await commEngine.sendUserEmail(userId, templateId, {
        commitmentDays: 30,
        guardianName: 'Test Guardian',
        guardianPhone: '+61400000000',
        dailyAllowance: 30,
        whitelist: ['Optus', 'Starlink', 'Red Energy']
      }, { test: true });
    }

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Send test error:', error);
    return res.status(500).json({
      error: 'Failed to send test',
      message: error.message
    });
  }
}

/**
 * Handle email webhook (SendGrid/SES)
 * POST /api/communications/webhook/email
 */
async function handleEmailWebhook(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const events = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Process webhook events
    await handleSendGridWebhook(events, supabase);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
}

/**
 * Check delivery status
 * GET /api/communications/status?messageId=xxx
 */
async function checkDeliveryStatus(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messageId } = req.query;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const commEngine = new CommunicationEngine(supabase);

    const status = await commEngine.checkDeliveryStatus(messageId);

    return res.status(200).json(status);
  } catch (error) {
    console.error('Check status error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.url.split('?')[0];

    if (path.endsWith('/preferences')) {
      if (req.method === 'GET') {
        return await getNotificationPreferences(req, res);
      } else if (req.method === 'POST') {
        return await updateNotificationPreferences(req, res);
      }
    } else if (path.endsWith('/unsubscribe')) {
      return await unsubscribeFromAll(req, res);
    } else if (path.endsWith('/resubscribe')) {
      return await resubscribeToDefaults(req, res);
    } else if (path.endsWith('/history')) {
      return await getCommunicationHistory(req, res);
    } else if (path.endsWith('/test')) {
      return await sendTestNotification(req, res);
    } else if (path.endsWith('/webhook/email')) {
      return await handleEmailWebhook(req, res);
    } else if (path.endsWith('/status')) {
      return await checkDeliveryStatus(req, res);
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
module.exports.getNotificationPreferences = getNotificationPreferences;
module.exports.updateNotificationPreferences = updateNotificationPreferences;
module.exports.unsubscribeFromAll = unsubscribeFromAll;
module.exports.resubscribeToDefaults = resubscribeToDefaults;
module.exports.getCommunicationHistory = getCommunicationHistory;
module.exports.sendTestNotification = sendTestNotification;
module.exports.handleEmailWebhook = handleEmailWebhook;
module.exports.checkDeliveryStatus = checkDeliveryStatus;
