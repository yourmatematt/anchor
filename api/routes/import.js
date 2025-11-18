/**
 * Import API Routes
 *
 * Serverless functions for importing and analyzing transaction history
 * - Start Up Bank history import
 * - Check import status
 * - Analyze baseline
 * - Generate risk profile
 * - Get import statistics
 */

const { createClient } = require('@supabase/supabase-js');
const UpBankHistoryImporter = require('../scripts/import-up-bank-history');
const GamblingBaselineAnalyzer = require('../scripts/analyze-gambling-baseline');
const RiskProfileGenerator = require('../scripts/generate-risk-profile');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Start Up Bank history import
 * POST /api/import/up-bank
 *
 * Body:
 *   {
 *     "upToken": "up:yeah:...",
 *     "years": 2 (optional),
 *     "startDate": "2022-01-01" (optional),
 *     "endDate": "2024-01-01" (optional)
 *   }
 */
async function startUpBankImport(req, res) {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { upToken, years, startDate, endDate } = req.body;

    if (!upToken) {
      return res.status(400).json({ error: 'Up Bank token is required' });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create importer
    const importer = new UpBankHistoryImporter(upToken, supabase);

    // Start import (this will run async)
    const options = {};
    if (years) options.years = years;
    if (startDate) options.start = startDate;
    if (endDate) options.end = endDate;

    // Run import
    const stats = await importer.import(options);

    return res.status(200).json({
      success: true,
      message: 'Import completed',
      stats
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({
      error: 'Import failed',
      message: error.message
    });
  }
}

/**
 * Get import statistics
 * GET /api/import/stats
 */
async function getImportStats(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get transaction counts
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount, is_whitelisted, timestamp', { count: 'exact' });

    if (txError) throw txError;

    // Calculate statistics
    const totalTransactions = transactions?.length || 0;
    const gamblingTransactions = transactions?.filter(tx => !tx.is_whitelisted).length || 0;
    const totalAmount = transactions?.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0) || 0;

    // Get date range
    let oldestDate = null;
    let newestDate = null;

    if (transactions && transactions.length > 0) {
      const dates = transactions.map(tx => new Date(tx.timestamp));
      oldestDate = new Date(Math.min(...dates));
      newestDate = new Date(Math.max(...dates));
    }

    return res.status(200).json({
      totalTransactions,
      gamblingTransactions,
      totalAmount,
      oldestDate: oldestDate?.toISOString(),
      newestDate: newestDate?.toISOString(),
      gamblingPercentage: totalTransactions > 0 ? (gamblingTransactions / totalTransactions * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
}

/**
 * Analyze gambling baseline
 * POST /api/import/analyze-baseline
 *
 * Body:
 *   {
 *     "months": 12 (optional),
 *     "startDate": "2023-01-01" (optional),
 *     "endDate": "2024-01-01" (optional)
 *   }
 */
async function analyzeBaseline(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { months, startDate, endDate } = req.body || {};

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const analyzer = new GamblingBaselineAnalyzer(supabase);

    const options = {};
    if (months) options.months = months;
    if (startDate) options.start = startDate;
    if (endDate) options.end = endDate;

    const baseline = await analyzer.analyze(options);

    if (!baseline) {
      return res.status(404).json({
        error: 'No transactions found',
        message: 'No transactions found in the specified period'
      });
    }

    return res.status(200).json({
      success: true,
      baseline
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
}

/**
 * Generate risk profile
 * POST /api/import/generate-risk-profile
 *
 * Body:
 *   {
 *     "months": 12 (optional)
 *   }
 */
async function generateRiskProfile(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { months } = req.body || {};

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const generator = new RiskProfileGenerator(supabase);

    const options = {};
    if (months) options.months = months;

    const profile = await generator.generate(options);

    if (!profile) {
      return res.status(404).json({
        error: 'No baseline data found',
        message: 'Please analyze baseline first'
      });
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Profile generation error:', error);
    return res.status(500).json({
      error: 'Profile generation failed',
      message: error.message
    });
  }
}

/**
 * Get latest baseline analysis
 * GET /api/import/baseline
 */
async function getBaseline(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('baseline_analysis')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'No baseline found',
        message: 'Please analyze baseline first'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Get baseline error:', error);
    return res.status(500).json({
      error: 'Failed to get baseline',
      message: error.message
    });
  }
}

/**
 * Get latest risk profile
 * GET /api/import/risk-profile
 */
async function getRiskProfile(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('risk_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'No risk profile found',
        message: 'Please generate risk profile first'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Get risk profile error:', error);
    return res.status(500).json({
      error: 'Failed to get risk profile',
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
    // Route to appropriate handler based on path
    const path = req.url.split('?')[0];

    if (path.endsWith('/up-bank')) {
      return await startUpBankImport(req, res);
    } else if (path.endsWith('/stats')) {
      return await getImportStats(req, res);
    } else if (path.endsWith('/analyze-baseline')) {
      return await analyzeBaseline(req, res);
    } else if (path.endsWith('/generate-risk-profile')) {
      return await generateRiskProfile(req, res);
    } else if (path.endsWith('/baseline')) {
      return await getBaseline(req, res);
    } else if (path.endsWith('/risk-profile')) {
      return await getRiskProfile(req, res);
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
module.exports.startUpBankImport = startUpBankImport;
module.exports.getImportStats = getImportStats;
module.exports.analyzeBaseline = analyzeBaseline;
module.exports.generateRiskProfile = generateRiskProfile;
module.exports.getBaseline = getBaseline;
module.exports.getRiskProfile = getRiskProfile;
