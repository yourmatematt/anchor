/**
 * ML Insights API Routes
 *
 * Endpoints for accessing ML pattern detection, predictions, and insights
 */

const { createClient } = require('@supabase/supabase-js');
const MLPatternEngine = require('../services/ml-pattern-engine');
const PatternEvolution = require('../services/pattern-evolution');
const AnomalyDetector = require('../services/anomaly-detector');
const GamblingClassifier = require('../models/gambling-classifier');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Analyze transaction with ML
 * POST /api/ml-insights/analyze
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "transactionId": "xxx"
 *   }
 */
async function analyzeTransaction(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, transactionId } = req.body;

    if (!userId || !transactionId) {
      return res.status(400).json({ error: 'userId and transactionId are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Analyze with ML
    const mlEngine = new MLPatternEngine(supabase);
    const analysis = await mlEngine.analyzeTransaction(transaction, userId);

    return res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analyze transaction error:', error);
    return res.status(500).json({
      error: 'Failed to analyze transaction',
      message: error.message
    });
  }
}

/**
 * Get user patterns
 * GET /api/ml-insights/patterns?userId=xxx
 */
async function getUserPatterns(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const evolution = new PatternEvolution(supabase);

    const patterns = await evolution.getUserPatterns(userId);
    const statistics = await evolution.getPatternStatistics(userId);

    return res.status(200).json({
      patterns,
      statistics
    });
  } catch (error) {
    console.error('Get patterns error:', error);
    return res.status(500).json({
      error: 'Failed to get patterns',
      message: error.message
    });
  }
}

/**
 * Get pattern evolution
 * GET /api/ml-insights/pattern-evolution?userId=xxx&timeframe=90
 */
async function getPatternEvolution(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, timeframe = 90 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const evolution = new PatternEvolution(supabase);

    const evolutionData = await evolution.getPatternEvolution(userId, parseInt(timeframe));
    const recommendations = await evolution.getPhaseRecommendations(userId);

    return res.status(200).json({
      evolution: evolutionData,
      recommendations
    });
  } catch (error) {
    console.error('Get pattern evolution error:', error);
    return res.status(500).json({
      error: 'Failed to get pattern evolution',
      message: error.message
    });
  }
}

/**
 * Predict next high-risk period
 * GET /api/ml-insights/predict-risk?userId=xxx
 */
async function predictRiskPeriod(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const mlEngine = new MLPatternEngine(supabase);

    const prediction = await mlEngine.predictNextRiskPeriod(userId);

    return res.status(200).json({
      prediction
    });
  } catch (error) {
    console.error('Predict risk error:', error);
    return res.status(500).json({
      error: 'Failed to predict risk',
      message: error.message
    });
  }
}

/**
 * Get anomaly detection results
 * POST /api/ml-insights/detect-anomaly
 *
 * Body:
 *   {
 *     "userId": "xxx",
 *     "transactionId": "xxx"
 *   }
 */
async function detectAnomaly(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, transactionId } = req.body;

    if (!userId || !transactionId) {
      return res.status(400).json({ error: 'userId and transactionId are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Detect anomalies
    const detector = new AnomalyDetector(supabase);
    const result = await detector.detectAnomaly(transaction, userId);

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Detect anomaly error:', error);
    return res.status(500).json({
      error: 'Failed to detect anomaly',
      message: error.message
    });
  }
}

/**
 * Get recovery phase
 * GET /api/ml-insights/recovery-phase?userId=xxx
 */
async function getRecoveryPhase(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const evolution = new PatternEvolution(supabase);

    const phase = await evolution.getCurrentPhase(userId);
    const recommendations = await evolution.getPhaseRecommendations(userId);

    return res.status(200).json({
      phase,
      recommendations
    });
  } catch (error) {
    console.error('Get recovery phase error:', error);
    return res.status(500).json({
      error: 'Failed to get recovery phase',
      message: error.message
    });
  }
}

/**
 * Get pattern strength score
 * GET /api/ml-insights/pattern-strength?userId=xxx
 */
async function getPatternStrength(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const mlEngine = new MLPatternEngine(supabase);

    const strength = await mlEngine.calculatePatternStrength(userId);

    return res.status(200).json({
      userId,
      patternStrength: strength,
      category: this._categorizeStrength(strength)
    });
  } catch (error) {
    console.error('Get pattern strength error:', error);
    return res.status(500).json({
      error: 'Failed to get pattern strength',
      message: error.message
    });
  }
}

/**
 * Get ML model info
 * GET /api/ml-insights/model-info
 */
async function getModelInfo(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const classifier = new GamblingClassifier();
    const info = classifier.getModelInfo();

    return res.status(200).json({
      model: info,
      status: 'operational'
    });
  } catch (error) {
    console.error('Get model info error:', error);
    return res.status(500).json({
      error: 'Failed to get model info',
      message: error.message
    });
  }
}

/**
 * Train model (admin only)
 * POST /api/ml-insights/train
 *
 * Body:
 *   {
 *     "trainingData": [...],
 *     "options": { epochs: 50, batchSize: 32 }
 *   }
 */
async function trainModel(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // TODO: Add authentication check for admin
    const { trainingData, options = {} } = req.body;

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({ error: 'trainingData array is required' });
    }

    const classifier = new GamblingClassifier();
    await classifier.loadModel();

    const history = await classifier.train(trainingData, options);

    await classifier.saveModel();

    return res.status(200).json({
      success: true,
      message: 'Model trained successfully',
      history
    });
  } catch (error) {
    console.error('Train model error:', error);
    return res.status(500).json({
      error: 'Failed to train model',
      message: error.message
    });
  }
}

/**
 * Get comprehensive ML insights for user
 * GET /api/ml-insights/dashboard?userId=xxx
 */
async function getDashboard(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const mlEngine = new MLPatternEngine(supabase);
    const evolution = new PatternEvolution(supabase);

    // Gather all insights
    const [
      patterns,
      patternStrength,
      phase,
      evolutionData,
      riskPrediction,
      recommendations
    ] = await Promise.all([
      evolution.getUserPatterns(userId),
      mlEngine.calculatePatternStrength(userId),
      evolution.getCurrentPhase(userId),
      evolution.getPatternEvolution(userId, 90),
      mlEngine.predictNextRiskPeriod(userId),
      evolution.getPhaseRecommendations(userId)
    ]);

    return res.status(200).json({
      userId,
      patterns: {
        active: patterns,
        strength: patternStrength,
        evolution: evolutionData
      },
      recovery: {
        phase,
        recommendations
      },
      predictions: {
        nextRiskPeriod: riskPrediction
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return res.status(500).json({
      error: 'Failed to get ML insights dashboard',
      message: error.message
    });
  }
}

/**
 * Helper: Categorize pattern strength
 */
function _categorizeStrength(strength) {
  if (strength >= 0.7) return 'strong';
  if (strength >= 0.4) return 'moderate';
  if (strength >= 0.2) return 'weak';
  return 'minimal';
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

    if (path.endsWith('/analyze')) {
      return await analyzeTransaction(req, res);
    } else if (path.endsWith('/patterns')) {
      return await getUserPatterns(req, res);
    } else if (path.endsWith('/pattern-evolution')) {
      return await getPatternEvolution(req, res);
    } else if (path.endsWith('/predict-risk')) {
      return await predictRiskPeriod(req, res);
    } else if (path.endsWith('/detect-anomaly')) {
      return await detectAnomaly(req, res);
    } else if (path.endsWith('/recovery-phase')) {
      return await getRecoveryPhase(req, res);
    } else if (path.endsWith('/pattern-strength')) {
      return await getPatternStrength(req, res);
    } else if (path.endsWith('/model-info')) {
      return await getModelInfo(req, res);
    } else if (path.endsWith('/train')) {
      return await trainModel(req, res);
    } else if (path.endsWith('/dashboard')) {
      return await getDashboard(req, res);
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
module.exports.analyzeTransaction = analyzeTransaction;
module.exports.getUserPatterns = getUserPatterns;
module.exports.getPatternEvolution = getPatternEvolution;
module.exports.predictRiskPeriod = predictRiskPeriod;
module.exports.detectAnomaly = detectAnomaly;
module.exports.getRecoveryPhase = getRecoveryPhase;
module.exports.getPatternStrength = getPatternStrength;
module.exports.getModelInfo = getModelInfo;
module.exports.trainModel = trainModel;
module.exports.getDashboard = getDashboard;
