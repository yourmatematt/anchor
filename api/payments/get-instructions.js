/**
 * Get Payment Instructions Endpoint
 *
 * After AI approves a payment request, this endpoint generates
 * step-by-step instructions for the user to complete manually.
 *
 * Since Up Bank API is read-only, we cannot execute payments.
 * Instead, we guide the user through the manual process and track completion.
 */

const { createClient } = require('@supabase/supabase-js');
const {
  generatePaymentInstructions,
  generateTransferInstructions
} = require('../services/payment-instructions');
const {
  notifyPaymentInstructionsReady
} = require('../services/notifications');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Main handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      payment_request_id,
      transfer_type // 'payment' or 'vault_to_allowance'
    } = req.body;

    if (!payment_request_id) {
      return res.status(400).json({
        error: 'payment_request_id is required'
      });
    }

    // Get payment request
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();

    if (prError || !paymentRequest) {
      return res.status(404).json({
        error: 'Payment request not found'
      });
    }

    // Verify it's approved
    if (paymentRequest.decision !== 'approved') {
      return res.status(400).json({
        error: 'Payment request is not approved',
        decision: paymentRequest.decision
      });
    }

    // Check if it's a whitelisted payee (has payment details)
    const { data: payeeDetails } = await supabase
      .from('whitelisted_payees')
      .select('*')
      .eq('user_id', paymentRequest.user_id)
      .ilike('payee_name', paymentRequest.payee_name)
      .single();

    let instructions;

    if (transfer_type === 'vault_to_allowance') {
      // Simple internal transfer (most common case)
      instructions = await generateTransferInstructions(
        paymentRequest.amount,
        paymentRequest.reason_given
      );
    } else {
      // Payment to external payee
      instructions = await generatePaymentInstructions(
        paymentRequest,
        payeeDetails
      );
    }

    // Update payment request to mark instructions sent
    await supabase
      .from('payment_requests')
      .update({
        instructions_sent_at: new Date().toISOString()
      })
      .eq('id', payment_request_id);

    // Send push notification with instructions
    const instructionRecord = {
      id: instructions.instruction_id,
      approved_amount: paymentRequest.amount,
      purpose: paymentRequest.reason_given
    };
    await notifyPaymentInstructionsReady(paymentRequest.user_id, instructionRecord);

    return res.status(200).json({
      approved: true,
      payment_request_id,
      instruction_id: instructions.instruction_id,
      instructions: instructions.instructions,
      timeout_at: instructions.timeout_at,
      tracking: {
        status: 'awaiting_action',
        expected_completion_within_minutes: instructions.expected_completion_within_minutes || 30,
        message: 'Anchor will automatically detect when you complete the payment'
      },
      next_steps: [
        'Follow the instructions in your Up Bank app',
        'Return to Anchor when done',
        'We\'ll confirm the payment automatically'
      ]
    });

  } catch (error) {
    console.error('Get instructions error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
