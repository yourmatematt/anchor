/**
 * Send Guardian Invite Endpoint
 *
 * Sends invitation SMS to guardian
 * Called from mobile app after guardian is created
 */

const { createClient } = require('@supabase/supabase-js');
const { sendGuardianInvite } = require('../services/guardian');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guardian_id } = req.body;

    if (!guardian_id) {
      return res.status(400).json({
        error: 'guardian_id is required'
      });
    }

    // Get guardian record
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('*')
      .eq('id', guardian_id)
      .single();

    if (guardianError || !guardian) {
      return res.status(404).json({
        error: 'Guardian not found'
      });
    }

    // Send invitation SMS
    const result = await sendGuardianInvite(guardian);

    if (!result.success) {
      console.error('Failed to send guardian invite:', result);
      return res.status(500).json({
        error: 'Failed to send invitation SMS',
        reason: result.reason || result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      sms_sid: result.sid
    });

  } catch (error) {
    console.error('Send invite error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
