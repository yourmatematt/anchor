/**
 * Create Guardian Endpoint
 *
 * Creates a new guardian record in the database
 * Called from mobile app GuardianSetupScreen
 */

const { createClient } = require('@supabase/supabase-js');

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
    const {
      user_id,
      guardian_name,
      guardian_phone,
      guardian_email,
      relationship,
      notify_on_payment_requests,
      notify_on_declined_requests,
      notify_on_gambling_triggers,
      notify_on_payday_loans,
      notify_on_relapse,
      notify_on_clean_milestones,
      commitment_start_date,
      commitment_end_date
    } = req.body;

    // Validate required fields
    if (!user_id || !guardian_name || !guardian_phone) {
      return res.status(400).json({
        error: 'user_id, guardian_name, and guardian_phone are required'
      });
    }

    // Check if user already has an active guardian
    const { data: existingGuardian } = await supabase
      .from('guardians')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true)
      .single();

    if (existingGuardian) {
      return res.status(400).json({
        error: 'User already has an active guardian',
        existing_guardian: existingGuardian.guardian_name
      });
    }

    // Create guardian record
    const { data: guardian, error: createError } = await supabase
      .from('guardians')
      .insert({
        user_id,
        guardian_name: guardian_name.trim(),
        guardian_phone: guardian_phone.trim(),
        guardian_email: guardian_email ? guardian_email.trim() : null,
        relationship: relationship || 'friend',
        notify_on_payment_requests: notify_on_payment_requests !== false,
        notify_on_declined_requests: notify_on_declined_requests !== false,
        notify_on_gambling_triggers: notify_on_gambling_triggers !== false,
        notify_on_payday_loans: notify_on_payday_loans !== false,
        notify_on_relapse: notify_on_relapse !== false,
        notify_on_clean_milestones: notify_on_clean_milestones !== false,
        active: true,
        commitment_start_date: commitment_start_date || new Date().toISOString().split('T')[0],
        commitment_end_date: commitment_end_date ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invite_status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating guardian:', createError);
      return res.status(500).json({
        error: 'Failed to create guardian',
        message: createError.message
      });
    }

    return res.status(201).json({
      success: true,
      guardian
    });

  } catch (error) {
    console.error('Create guardian error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
