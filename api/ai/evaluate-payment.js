/**
 * Payment Evaluation Endpoint
 *
 * Evaluates payment requests against user profile, patterns, and triggers
 * Returns approve/deny/requires_conversation decision
 */

const { createClient } = require('@supabase/supabase-js');
const { evaluatePaymentRequest } = require('../services/claude');
const { notifyGuardian } = require('../services/guardian');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Main handler for payment evaluation
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      amount,
      payee_name,
      reason,
      timestamp
    } = req.body;

    // Validate required fields
    if (!user_id || !amount || !payee_name) {
      return res.status(400).json({
        error: 'user_id, amount, and payee_name are required'
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        error: 'User profile not found. Please complete onboarding first.'
      });
    }

    // Check whitelist first
    const { data: whitelisted, error: whitelistError } = await supabase
      .from('whitelist')
      .select('*')
      .ilike('payee_name', payee_name)
      .single();

    if (whitelisted) {
      // Whitelisted payees are automatically approved
      return res.status(200).json({
        decision: 'approved',
        reason: 'Payee is on whitelist',
        requires_conversation: false,
        risk_score: 0
      });
    }

    // Prepare payment request data
    const paymentRequest = {
      amount: parseFloat(amount),
      payee_name,
      reason: reason || 'No reason provided',
      timestamp: timestamp || new Date().toISOString()
    };

    // Evaluate with AI
    const evaluation = await evaluatePaymentRequest({
      userProfile,
      paymentRequest
    });

    // Log payment request to database
    const { data: loggedRequest, error: logError } = await supabase
      .from('payment_requests')
      .insert({
        user_id,
        amount: paymentRequest.amount,
        payee_name: paymentRequest.payee_name,
        reason_given: paymentRequest.reason,
        ai_evaluation: evaluation,
        decision: evaluation.decision.toLowerCase(),
        decision_reason: evaluation.reason,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging payment request:', logError);
    }

    // Notify guardian that payment request was submitted
    await notifyGuardian(user_id, {
      type: 'payment_request',
      data: {
        amount: paymentRequest.amount,
        reason: paymentRequest.reason,
        payee: paymentRequest.payee_name,
        risk_score: evaluation.risk_score
      }
    });

    // Create intervention record if denied or requires conversation
    if (evaluation.decision !== 'APPROVED') {
      await supabase
        .from('interventions')
        .insert({
          user_id,
          trigger_type: 'payment_request',
          trigger_details: {
            payment_request_id: loggedRequest?.id,
            amount: paymentRequest.amount,
            payee_name: paymentRequest.payee_name,
            reason: paymentRequest.reason
          },
          intervention_method: 'payment_request_screen',
          outcome: evaluation.decision === 'DENIED' ? 'prevented' : 'requires_conversation',
          created_at: new Date().toISOString()
        });
    }

    // Return evaluation result
    return res.status(200).json({
      payment_request_id: loggedRequest?.id,
      decision: evaluation.decision.toLowerCase(),
      reason: evaluation.reason,
      risk_score: evaluation.risk_score,
      requires_conversation: evaluation.decision === 'CONVERSATION_REQUIRED',
      conversation_starter: evaluation.conversation_starter || null
    });

  } catch (error) {
    console.error('Payment evaluation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
