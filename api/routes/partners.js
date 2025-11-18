/**
 * Partner API Routes
 *
 * Vercel serverless function handler for partner-related endpoints.
 * Handles reward claims, partner linking, balance checks, and webhooks.
 *
 * Routes:
 * - GET /api/partners - List available partners
 * - GET /api/partners/:id - Get partner details
 * - POST /api/partners/:id/link - Link user account to partner
 * - GET /api/rewards - Get user's rewards
 * - POST /api/rewards/:id/claim - Claim a reward
 * - POST /api/rewards/check - Check for new rewards
 * - POST /api/webhooks/partners/:partnerId - Partner webhook receiver
 */

const { partnerManager, PARTNER_REGISTRY } = require('../services/partner-manager');
const { rewardDistributor } = require('../services/reward-distributor');

/**
 * Main request handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path, partnerId, rewardId } = parseRequest(req);

    // Route the request
    if (req.method === 'GET' && path === '/partners') {
      return await listPartners(req, res);
    }

    if (req.method === 'GET' && path === '/partners/:id') {
      return await getPartner(req, res, partnerId);
    }

    if (req.method === 'POST' && path === '/partners/:id/link') {
      return await linkPartnerAccount(req, res, partnerId);
    }

    if (req.method === 'GET' && path === '/rewards') {
      return await getUserRewards(req, res);
    }

    if (req.method === 'POST' && path === '/rewards/:id/claim') {
      return await claimReward(req, res, rewardId);
    }

    if (req.method === 'POST' && path === '/rewards/check') {
      return await checkRewards(req, res);
    }

    if (req.method === 'POST' && path === '/webhooks/partners/:id') {
      return await handlePartnerWebhook(req, res, partnerId);
    }

    if (req.method === 'GET' && path === '/partners/:id/balance') {
      return await checkPartnerBalance(req, res, partnerId);
    }

    // Route not found
    return res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${path} not found`
    });

  } catch (error) {
    console.error('Partner API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Parse request to extract path and parameters
 */
function parseRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(p => p);

  // Remove 'api' prefix if present
  if (pathParts[0] === 'api') {
    pathParts.shift();
  }

  let path = '/' + pathParts.join('/');
  let partnerId = null;
  let rewardId = null;

  // Extract IDs from path
  if (pathParts[0] === 'partners' && pathParts[1]) {
    partnerId = pathParts[1];
    path = '/partners/:id' + (pathParts[2] ? `/${pathParts[2]}` : '');
  }

  if (pathParts[0] === 'rewards' && pathParts[1] && pathParts[1] !== 'check') {
    rewardId = pathParts[1];
    path = '/rewards/:id' + (pathParts[2] ? `/${pathParts[2]}` : '');
  }

  if (pathParts[0] === 'webhooks' && pathParts[1] === 'partners' && pathParts[2]) {
    partnerId = pathParts[2];
    path = '/webhooks/partners/:id';
  }

  return { path, partnerId, rewardId };
}

/**
 * List all available partners
 */
async function listPartners(req, res) {
  const partners = Object.entries(PARTNER_REGISTRY).map(([id, config]) => ({
    id,
    name: config.name,
    type: config.type,
    capabilities: config.capabilities
  }));

  return res.status(200).json({
    partners,
    total: partners.length
  });
}

/**
 * Get partner details
 */
async function getPartner(req, res, partnerId) {
  const config = PARTNER_REGISTRY[partnerId];

  if (!config) {
    return res.status(404).json({
      error: 'Partner not found',
      partnerId
    });
  }

  // Get partner status from database
  const partnerData = await partnerManager.getPartnerConfig(partnerId);

  return res.status(200).json({
    id: partnerId,
    name: config.name,
    type: config.type,
    capabilities: config.capabilities,
    status: partnerData?.status || 'inactive',
    available: partnerData?.status === 'active'
  });
}

/**
 * Link user account to partner
 */
async function linkPartnerAccount(req, res, partnerId) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { accountNumber, cardNumber, securityCode, verificationType } = req.body;

  try {
    // Get partner integration
    const integration = await partnerManager.initializeIntegration(partnerId);
    if (!integration) {
      return res.status(400).json({
        error: 'Partner integration not available',
        partnerId
      });
    }

    // Get tokens
    const tokens = await partnerManager.getPartnerTokens(partnerId);
    if (!tokens) {
      return res.status(400).json({
        error: 'Partner not authenticated',
        message: 'Partner OAuth setup required'
      });
    }

    let linkResult;
    const partnerConfig = PARTNER_REGISTRY[partnerId];

    // Link based on partner type
    if (partnerConfig.type === 'utility') {
      linkResult = await integration.linkCustomerAccount(tokens.access_token, partnerId, {
        accountNumber,
        customerName: req.body.customerName,
        verificationMethod: verificationType
      });
    } else if (partnerConfig.type === 'transport') {
      linkResult = await integration.linkCard(tokens.access_token, partnerId, {
        cardNumber,
        securityCode
      });
    } else {
      return res.status(400).json({
        error: 'Partner type does not support account linking',
        partnerType: partnerConfig.type
      });
    }

    // Store link in database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.from('user_partner_accounts').upsert({
      user_id: userId,
      partner_id: partnerId,
      account_type: partnerConfig.type,
      account_number: accountNumber || null,
      card_number: cardNumber || null,
      linked_at: new Date().toISOString(),
      verification_status: linkResult.linked ? 'verified' : 'pending'
    });

    return res.status(200).json({
      success: true,
      partnerId,
      linked: linkResult.linked,
      message: 'Account linked successfully'
    });

  } catch (error) {
    console.error('Account linking error:', error);
    return res.status(500).json({
      error: 'Account linking failed',
      message: error.message
    });
  }
}

/**
 * Get user's rewards
 */
async function getUserRewards(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rewards = await rewardDistributor.getUserRewards(userId);

    return res.status(200).json({
      rewards,
      total: rewards.length
    });

  } catch (error) {
    console.error('Get rewards error:', error);
    return res.status(500).json({
      error: 'Failed to fetch rewards',
      message: error.message
    });
  }
}

/**
 * Claim a reward (for choice rewards)
 */
async function claimReward(req, res, rewardId) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { partnerId } = req.body;

  if (!partnerId) {
    return res.status(400).json({
      error: 'Partner ID required',
      message: 'Please select a partner to receive your reward'
    });
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get reward details
    const { data: reward, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('user_id', userId)
      .single();

    if (error || !reward) {
      return res.status(404).json({
        error: 'Reward not found'
      });
    }

    // Check if reward already claimed
    if (reward.status !== 'pending') {
      return res.status(400).json({
        error: 'Reward already claimed',
        status: reward.status
      });
    }

    // Verify partner is eligible
    if (!reward.eligible_partners.includes(partnerId)) {
      return res.status(400).json({
        error: 'Invalid partner selection',
        eligible: reward.eligible_partners
      });
    }

    // Get milestone info
    const { MILESTONES } = require('../services/reward-distributor');
    const milestone = Object.values(MILESTONES).find(m => m.id === reward.milestone_id);

    if (!milestone) {
      return res.status(400).json({ error: 'Invalid milestone' });
    }

    // Distribute the reward
    const result = await rewardDistributor.distributeReward(
      rewardId,
      userId,
      milestone,
      partnerId
    );

    return res.status(200).json({
      success: true,
      reward: result
    });

  } catch (error) {
    console.error('Claim reward error:', error);
    return res.status(500).json({
      error: 'Failed to claim reward',
      message: error.message
    });
  }
}

/**
 * Check for new rewards
 */
async function checkRewards(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = await rewardDistributor.checkAndDistributeRewards(userId);

    return res.status(200).json({
      checked: true,
      newRewards: results.filter(r => !r.alreadyIssued),
      total: results.length
    });

  } catch (error) {
    console.error('Check rewards error:', error);
    return res.status(500).json({
      error: 'Failed to check rewards',
      message: error.message
    });
  }
}

/**
 * Handle partner webhook
 */
async function handlePartnerWebhook(req, res, partnerId) {
  try {
    // Get signature from headers
    const signature = req.headers['x-webhook-signature'] ||
                     req.headers['x-signature'] ||
                     req.headers['x-hub-signature-256'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Get integration
    const integration = await partnerManager.initializeIntegration(partnerId);
    if (!integration || !integration.validateWebhook) {
      return res.status(400).json({ error: 'Webhook not supported' });
    }

    // Validate signature
    const payload = JSON.stringify(req.body);
    const isValid = integration.validateWebhook(payload, signature, partnerId);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Get event type
    const eventType = req.body.event || req.body.type || req.body.event_type;

    // Handle the webhook
    const result = await integration.handleWebhook(eventType, req.body, partnerId);

    // Log the webhook
    await partnerManager.logPartnerActivity(
      partnerId,
      `webhook_${eventType}`,
      req.body
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error('Webhook handling error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}

/**
 * Check partner balance
 */
async function checkPartnerBalance(req, res, partnerId) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { voucherId, cardNumber, accountNumber } = req.query;

  try {
    const integration = await partnerManager.initializeIntegration(partnerId);
    if (!integration || !integration.checkBalance) {
      return res.status(400).json({ error: 'Balance check not supported' });
    }

    const tokens = await partnerManager.getPartnerTokens(partnerId);
    if (!tokens) {
      return res.status(400).json({ error: 'Partner not authenticated' });
    }

    let balance;
    const partnerConfig = PARTNER_REGISTRY[partnerId];

    if (partnerConfig.type === 'retail') {
      balance = await integration.checkBalance(tokens.access_token, voucherId);
    } else if (partnerConfig.type === 'transport') {
      balance = await integration.checkCardBalance(tokens.access_token, partnerId, cardNumber);
    } else if (partnerConfig.type === 'utility') {
      balance = await integration.checkAccountBalance(tokens.access_token, partnerId, accountNumber);
    }

    return res.status(200).json({
      partnerId,
      balance
    });

  } catch (error) {
    console.error('Balance check error:', error);
    return res.status(500).json({
      error: 'Balance check failed',
      message: error.message
    });
  }
}

/**
 * Extract user ID from request
 * In production, this would validate JWT token or session
 */
function getUserId(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In production, decode and validate JWT
    // For now, we'll use a simple approach
    const token = authHeader.substring(7);
    // TODO: Validate JWT and extract user ID
    return req.headers['x-user-id'] || null;
  }

  return null;
}
