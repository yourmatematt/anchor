/**
 * Payment Instructions Service
 *
 * Since Up Bank API is read-only and cannot execute payments,
 * this service generates step-by-step instructions for users
 * to complete payments manually in the Up Bank app.
 */

const { createClient } = require('@supabase/supabase-js');
const { USER_ID } = require('../config/constants');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate payment instructions for approved payment request
 *
 * @param {Object} paymentRequest - Approved payment request
 * @param {Object} payeeDetails - Whitelisted payee with BSB/account info
 * @returns {Promise<Object>} Instructions and tracking record
 */
async function generatePaymentInstructions(paymentRequest, payeeDetails) {
  const instructions = [];
  const timeout = new Date();
  timeout.setMinutes(timeout.getMinutes() + 30); // 30 min timeout

  // Determine transfer type based on payee details
  if (payeeDetails) {
    // Payment to whitelisted payee (external transfer or BPAY)
    instructions.push({
      step: 1,
      action: 'Open Up Bank app',
      description: 'Launch the Up Bank mobile application'
    });

    if (payeeDetails.payment_method === 'bpay') {
      // BPAY payment
      instructions.push({
        step: 2,
        action: 'Navigate to BPAY',
        description: 'Tap Payments → BPAY'
      });

      instructions.push({
        step: 3,
        action: 'Enter BPAY details',
        description: `Biller Code: ${payeeDetails.bpay_biller_code}\nRef: ${payeeDetails.bpay_reference}\nAmount: $${paymentRequest.amount}`
      });

      instructions.push({
        step: 4,
        action: 'Select account',
        description: 'Pay from: Transaction Account or Vault'
      });

      instructions.push({
        step: 5,
        action: 'Confirm payment',
        description: `Review and confirm payment to ${payeeDetails.payee_name}`
      });

    } else {
      // Bank transfer
      instructions.push({
        step: 2,
        action: 'Navigate to Pay Anyone',
        description: 'Tap Payments → Pay Anyone'
      });

      instructions.push({
        step: 3,
        action: 'Enter account details',
        description: `BSB: ${payeeDetails.bsb}\nAccount: ${payeeDetails.account_number}\nName: ${payeeDetails.account_name || payeeDetails.payee_name}`
      });

      instructions.push({
        step: 4,
        action: 'Enter amount and reference',
        description: `Amount: $${paymentRequest.amount}\nRef: ${payeeDetails.payment_reference || paymentRequest.reason_given}`
      });

      instructions.push({
        step: 5,
        action: 'Select account',
        description: 'Pay from: Transaction Account or Vault (check your balance first)'
      });

      instructions.push({
        step: 6,
        action: 'Confirm payment',
        description: `Review and confirm payment to ${payeeDetails.payee_name}`
      });
    }

  } else {
    // One-off payment (no whitelisted payee)
    instructions.push({
      step: 1,
      action: 'Open Up Bank app',
      description: 'Launch the Up Bank mobile application'
    });

    instructions.push({
      step: 2,
      action: 'Check available balance',
      description: 'Make sure you have enough in Allowance or need to transfer from Vault'
    });

    instructions.push({
      step: 3,
      action: 'If needed: Transfer from Vault',
      description: `Transfer $${paymentRequest.amount} from Vault to Allowance or Transaction Account`
    });

    instructions.push({
      step: 4,
      action: 'Complete your payment',
      description: `Pay $${paymentRequest.amount} to ${paymentRequest.payee_name}\nReason: ${paymentRequest.reason_given}`
    });
  }

  instructions.push({
    step: instructions.length + 1,
    action: 'Return to Anchor',
    description: 'Anchor will automatically detect the payment when it completes'
  });

  // Create tracking record
  const { data: instructionRecord, error } = await supabase
    .from('manual_payment_instructions')
    .insert({
      user_id: USER_ID,
      payment_request_id: paymentRequest.id,
      approved_amount: paymentRequest.amount,
      purpose: paymentRequest.reason_given,
      instructions: instructions,
      expected_transfer_from: determineExpectedSource(paymentRequest.amount),
      expected_transfer_to: payeeDetails ? 'external' : 'Transaction Account',
      expected_amount: paymentRequest.amount,
      expected_payee: paymentRequest.payee_name,
      timeout_at: timeout.toISOString(),
      status: 'awaiting_action'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment instruction record:', error);
    throw error;
  }

  return {
    instruction_id: instructionRecord.id,
    instructions,
    timeout_at: timeout,
    expected_completion_within_minutes: 30
  };
}

/**
 * Generate instructions for internal transfer (Vault → Allowance)
 *
 * @param {number} amount - Amount to transfer
 * @param {string} reason - Reason for transfer
 * @returns {Promise<Object>} Instructions and tracking record
 */
async function generateTransferInstructions(amount, reason = 'Approved spending') {
  const instructions = [
    {
      step: 1,
      action: 'Open Up Bank app',
      description: 'Launch the Up Bank mobile application'
    },
    {
      step: 2,
      action: 'Navigate to Vault',
      description: 'Tap Savers → Vault'
    },
    {
      step: 3,
      action: 'Transfer to Allowance',
      description: `Tap Transfer → Transfer to another Saver\nSelect: Allowance\nAmount: $${amount}`
    },
    {
      step: 4,
      action: 'Confirm transfer',
      description: `Review and confirm transfer\nReason: ${reason}`
    },
    {
      step: 5,
      action: 'Complete your purchase',
      description: 'Your card is linked to Allowance - the money is now available'
    }
  ];

  const timeout = new Date();
  timeout.setMinutes(timeout.getMinutes() + 30);

  const { data: instructionRecord, error } = await supabase
    .from('manual_payment_instructions')
    .insert({
      user_id: USER_ID,
      payment_request_id: null,
      approved_amount: amount,
      purpose: reason,
      instructions,
      expected_transfer_from: 'Vault',
      expected_transfer_to: 'Allowance',
      expected_amount: amount,
      timeout_at: timeout.toISOString(),
      status: 'awaiting_action'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating transfer instruction record:', error);
    throw error;
  }

  return {
    instruction_id: instructionRecord.id,
    instructions,
    timeout_at: timeout,
    expected_completion_within_minutes: 30
  };
}

/**
 * Generate instructions for bill payment
 *
 * @param {Object} payee - Whitelisted payee (bill)
 * @param {number} amount - Amount to pay
 * @returns {Promise<Object>} Instructions
 */
async function generateBillPaymentInstructions(payee, amount) {
  const instructions = [];

  instructions.push({
    step: 1,
    action: 'Check Vault balance',
    description: 'Make sure you have enough in Vault to cover this bill'
  });

  instructions.push({
    step: 2,
    action: 'Transfer to Transaction Account',
    description: `Transfer $${amount} from Vault to Transaction Account`
  });

  instructions.push({
    step: 3,
    action: 'Open Up Bank app',
    description: 'Navigate to Payments'
  });

  if (payee.payment_method === 'bpay') {
    instructions.push({
      step: 4,
      action: 'Pay via BPAY',
      description: `Biller: ${payee.bpay_biller_code}\nRef: ${payee.bpay_reference}\nAmount: $${amount}`
    });
  } else {
    instructions.push({
      step: 4,
      action: 'Pay Anyone',
      description: `BSB: ${payee.bsb}\nAccount: ${payee.account_number}\nName: ${payee.account_name}\nRef: ${payee.payment_reference}\nAmount: $${amount}`
    });
  }

  const timeout = new Date();
  timeout.setHours(timeout.getHours() + 24); // 24 hour timeout for bills

  const { data: instructionRecord, error } = await supabase
    .from('manual_payment_instructions')
    .insert({
      user_id: USER_ID,
      payment_request_id: null,
      approved_amount: amount,
      purpose: `Bill payment: ${payee.payee_name}`,
      instructions,
      expected_transfer_from: 'Vault',
      expected_transfer_to: 'external',
      expected_amount: amount,
      expected_payee: payee.payee_name,
      timeout_at: timeout.toISOString(),
      status: 'awaiting_action'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bill payment instruction record:', error);
    throw error;
  }

  return {
    instruction_id: instructionRecord.id,
    instructions,
    timeout_at: timeout,
    expected_completion_within_hours: 24
  };
}

/**
 * Generate instructions for debt acceleration payment
 *
 * @param {Object} payee - Debt payee (e.g., Easygo)
 * @param {number} amount - Extra payment amount
 * @param {Object} context - Additional context (months saved, new balance)
 * @returns {Promise<Object>} Instructions
 */
async function generateDebtAccelerationInstructions(payee, amount, context = {}) {
  const instructions = [
    {
      step: 1,
      action: 'Open Up Bank app',
      description: 'Launch Up Bank'
    },
    {
      step: 2,
      action: 'Transfer from Vault',
      description: `Transfer $${amount} from Vault to Transaction Account`
    },
    {
      step: 3,
      action: 'Pay to loan account',
      description: `BSB: ${payee.bsb}\nAccount: ${payee.account_number}\nName: ${payee.account_name}\nRef: ${payee.payment_reference || 'Extra Payment'}\nAmount: $${amount}`
    },
    {
      step: 4,
      action: 'Debt impact',
      description: context.months_saved
        ? `This will save you ${context.months_saved} months of payments!\nNew balance: $${context.new_balance}`
        : 'This extra payment will reduce your debt faster'
    }
  ];

  const timeout = new Date();
  timeout.setHours(timeout.getHours() + 48); // 48 hour timeout for debt payments

  const { data: instructionRecord, error } = await supabase
    .from('manual_payment_instructions')
    .insert({
      user_id: USER_ID,
      payment_request_id: null,
      approved_amount: amount,
      purpose: `Debt acceleration: ${payee.payee_name}`,
      instructions,
      expected_transfer_from: 'Vault',
      expected_transfer_to: 'external',
      expected_amount: amount,
      expected_payee: payee.payee_name,
      timeout_at: timeout.toISOString(),
      status: 'awaiting_action'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating debt acceleration instruction record:', error);
    throw error;
  }

  return {
    instruction_id: instructionRecord.id,
    instructions,
    timeout_at: timeout,
    expected_completion_within_hours: 48
  };
}

/**
 * Determine expected source account based on amount
 */
function determineExpectedSource(amount) {
  // If small amount, probably from Allowance
  if (amount <= 30) {
    return 'Allowance';
  }
  // Larger amounts require Vault transfer
  return 'Vault';
}

/**
 * Mark payment instruction as completed
 *
 * @param {string} instructionId - Instruction UUID
 * @param {string} transactionId - Up Bank transaction ID that completed it
 */
async function markInstructionCompleted(instructionId, transactionId) {
  const { error } = await supabase
    .from('manual_payment_instructions')
    .update({
      completed_at: new Date().toISOString(),
      completed_transaction_id: transactionId,
      status: 'completed'
    })
    .eq('id', instructionId);

  if (error) {
    console.error('Error marking instruction as completed:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Mark payment instruction as timed out
 *
 * @param {string} instructionId - Instruction UUID
 */
async function markInstructionTimedOut(instructionId) {
  const { error } = await supabase
    .from('manual_payment_instructions')
    .update({
      status: 'timeout'
    })
    .eq('id', instructionId);

  if (error) {
    console.error('Error marking instruction as timed out:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Check for timed out instructions (called by cron)
 */
async function checkTimedOutInstructions() {
  const { data: timedOut, error } = await supabase
    .from('manual_payment_instructions')
    .select('*')
    .eq('status', 'awaiting_action')
    .lt('timeout_at', new Date().toISOString());

  if (error) {
    console.error('Error checking timed out instructions:', error);
    return [];
  }

  // Mark each as timed out
  for (const instruction of timedOut) {
    await markInstructionTimedOut(instruction.id);
  }

  return timedOut;
}

module.exports = {
  generatePaymentInstructions,
  generateTransferInstructions,
  generateBillPaymentInstructions,
  generateDebtAccelerationInstructions,
  markInstructionCompleted,
  markInstructionTimedOut,
  checkTimedOutInstructions
};
