/**
 * Reports API Routes
 *
 * Endpoints for generating and accessing reports
 */

const { createClient } = require('@supabase/supabase-js');
const ReportGenerator = require('../services/report-generator');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Generate report
 * POST /api/reports/generate
 */
async function generateReport(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, reportType, options = {} } = req.body;

    if (!userId || !reportType) {
      return res.status(400).json({ error: 'userId and reportType are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const generator = new ReportGenerator(supabase);

    const result = await generator.generateReport(userId, reportType, options);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

/**
 * Generate tax report
 * POST /api/reports/tax
 */
async function generateTaxReport(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, financialYear, options = {} } = req.body;

    if (!userId || !financialYear) {
      return res.status(400).json({ error: 'userId and financialYear are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const generator = new ReportGenerator(supabase);

    const result = await generator.generateTaxReport(userId, financialYear, options);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate tax report error:', error);
    return res.status(500).json({
      error: 'Failed to generate tax report',
      message: error.message
    });
  }
}

/**
 * Generate counselor report
 * POST /api/reports/counselor
 */
async function generateCounselorReport(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, options = {} } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const generator = new ReportGenerator(supabase);

    const result = await generator.generateCounselorReport(userId, options);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate counselor report error:', error);
    return res.status(500).json({
      error: 'Failed to generate counselor report',
      message: error.message
    });
  }
}

/**
 * Generate debt summary
 * POST /api/reports/debt
 */
async function generateDebtSummary(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, options = {} } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const generator = new ReportGenerator(supabase);

    const result = await generator.generateDebtSummary(userId, options);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate debt summary error:', error);
    return res.status(500).json({
      error: 'Failed to generate debt summary',
      message: error.message
    });
  }
}

/**
 * Get user reports
 * GET /api/reports/list?userId=xxx
 */
async function listReports(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return res.status(200).json({
      reports: reports || [],
      total: reports?.length || 0
    });
  } catch (error) {
    console.error('List reports error:', error);
    return res.status(500).json({
      error: 'Failed to list reports',
      message: error.message
    });
  }
}

/**
 * Download report
 * GET /api/reports/download/:reportId
 */
async function downloadReport(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { reportId } = req.query;

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // TODO: Implement actual file download
    // For now, return download URL
    return res.status(200).json({
      reportId: report.id,
      reportType: report.report_type,
      pdfUrl: report.pdf_url,
      generatedAt: report.generated_at,
      expiresAt: report.expires_at
    });
  } catch (error) {
    console.error('Download report error:', error);
    return res.status(500).json({
      error: 'Failed to download report',
      message: error.message
    });
  }
}

/**
 * Delete report
 * DELETE /api/reports/:reportId
 */
async function deleteReport(req, res) {
  try {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { reportId } = req.query;

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return res.status(500).json({
      error: 'Failed to delete report',
      message: error.message
    });
  }
}

/**
 * Get consent status
 * GET /api/reports/consent?userId=xxx
 */
async function getConsentStatus(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: consent, error } = await supabase
      .from('user_consent')
      .select('*')
      .eq('user_id', userId)
      .eq('consent_type', 'report_generation')
      .single();

    return res.status(200).json({
      hasConsent: consent?.consented || false,
      consentDate: consent?.consented_at || null
    });
  } catch (error) {
    console.error('Get consent error:', error);
    return res.status(500).json({
      error: 'Failed to get consent status',
      message: error.message
    });
  }
}

/**
 * Update consent
 * POST /api/reports/consent
 */
async function updateConsent(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, consented } = req.body;

    if (!userId || typeof consented !== 'boolean') {
      return res.status(400).json({ error: 'userId and consented (boolean) are required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('user_consent')
      .upsert({
        user_id: userId,
        consent_type: 'report_generation',
        consented,
        consented_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      consent: data
    });
  } catch (error) {
    console.error('Update consent error:', error);
    return res.status(500).json({
      error: 'Failed to update consent',
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.url.split('?')[0];

    if (path.endsWith('/generate')) {
      return await generateReport(req, res);
    } else if (path.endsWith('/tax')) {
      return await generateTaxReport(req, res);
    } else if (path.endsWith('/counselor')) {
      return await generateCounselorReport(req, res);
    } else if (path.endsWith('/debt')) {
      return await generateDebtSummary(req, res);
    } else if (path.endsWith('/list')) {
      return await listReports(req, res);
    } else if (path.includes('/download')) {
      return await downloadReport(req, res);
    } else if (path.includes('/consent')) {
      if (req.method === 'GET') {
        return await getConsentStatus(req, res);
      } else if (req.method === 'POST') {
        return await updateConsent(req, res);
      }
    } else if (req.method === 'DELETE') {
      return await deleteReport(req, res);
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
module.exports.generateReport = generateReport;
module.exports.generateTaxReport = generateTaxReport;
module.exports.generateCounselorReport = generateCounselorReport;
module.exports.generateDebtSummary = generateDebtSummary;
module.exports.listReports = listReports;
module.exports.downloadReport = downloadReport;
module.exports.deleteReport = deleteReport;
module.exports.getConsentStatus = getConsentStatus;
module.exports.updateConsent = updateConsent;
