/**
 * Bill Reminder Cron Job
 *
 * Runs daily at 9am AEST
 * Checks for upcoming bills and sends reminders
 * Notifies both user and guardian
 */

const { createClient } = require('@supabase/supabase-js');
const { USER_ID } = require('../config/constants');
const { notifyBillDue } = require('../services/notifications');
const { notifyGuardian } = require('../services/guardian');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Check if bill has been paid recently
 */
async function isBillPaid(payeeId, amount) {
  // Get transactions from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('timestamp', sevenDaysAgo.toISOString())
    .eq('is_whitelisted', true);

  if (error || !transactions) {
    return false;
  }

  // Check if any transaction matches the payee and amount
  const { data: payee } = await supabase
    .from('whitelisted_payees')
    .select('payee_name, expected_amount')
    .eq('id', payeeId)
    .single();

  if (!payee) return false;

  // Look for transaction matching payee name and amount (within $5 tolerance)
  const paid = transactions.some(txn => {
    const txnAmount = Math.abs(parseFloat(txn.amount));
    const expectedAmount = parseFloat(amount || payee.expected_amount);
    const amountMatches = Math.abs(txnAmount - expectedAmount) <= 5;
    const payeeMatches = txn.payee_name?.toLowerCase().includes(payee.payee_name.toLowerCase());

    return amountMatches && payeeMatches;
  });

  return paid;
}

/**
 * Check if reminder already sent for this bill
 */
async function reminderAlreadySent(payeeId, dueDate, reminderType) {
  const { data, error } = await supabase
    .from('bill_reminders')
    .select('*')
    .eq('payee_id', payeeId)
    .eq('due_date', dueDate)
    .eq('reminder_type', reminderType)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking reminder:', error);
    return false;
  }

  return !!data;
}

/**
 * Log bill reminder
 */
async function logBillReminder(payeeId, dueDate, amount, reminderType) {
  const { error } = await supabase
    .from('bill_reminders')
    .insert({
      user_id: USER_ID,
      payee_id: payeeId,
      due_date: dueDate,
      amount,
      reminder_sent_at: new Date().toISOString(),
      reminder_type: reminderType,
      status: 'reminded'
    });

  if (error) {
    console.error('Error logging bill reminder:', error);
  }
}

/**
 * Get upcoming bills
 */
async function getUpcomingBills() {
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);

  // Get all whitelisted payees with due_day set
  const { data: payees, error } = await supabase
    .from('whitelisted_payees')
    .select('*')
    .eq('user_id', USER_ID)
    .not('due_day', 'is', null)
    .eq('is_essential', true); // Only remind for essential bills

  if (error || !payees) {
    console.error('Error fetching payees:', error);
    return [];
  }

  const upcomingBills = [];

  for (const payee of payees) {
    // Calculate next due date based on frequency
    const dueDay = parseInt(payee.due_day);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let dueDate = new Date(currentYear, currentMonth, dueDay);

    // If due date has passed this month, use next month
    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, dueDay);
    }

    // Check if bill is due within next 3 days
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      upcomingBills.push({
        ...payee,
        due_date: dueDate.toISOString().split('T')[0],
        days_until_due: daysUntilDue
      });
    }
  }

  return upcomingBills;
}

/**
 * Main cron handler
 */
export default async function handler(req, res) {
  // Verify this is a cron request from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Bill Reminder] Starting daily check...');

    const upcomingBills = await getUpcomingBills();

    console.log(`[Bill Reminder] Found ${upcomingBills.length} upcoming bills`);

    let remindersCountSent = 0;

    for (const bill of upcomingBills) {
      const { id, payee_name, expected_amount, due_date, days_until_due } = bill;

      // Determine reminder type
      let reminderType;
      if (days_until_due === 0) {
        reminderType = 'due_today';
      } else if (days_until_due === 1) {
        reminderType = '1_day';
      } else {
        reminderType = '3_days';
      }

      // Check if already reminded
      if (await reminderAlreadySent(id, due_date, reminderType)) {
        console.log(`[Bill Reminder] Already sent ${reminderType} reminder for ${payee_name}`);
        continue;
      }

      // Check if bill is already paid
      if (await isBillPaid(id, expected_amount)) {
        console.log(`[Bill Reminder] ${payee_name} already paid, skipping reminder`);

        // Mark as paid in reminders table
        await supabase
          .from('bill_reminders')
          .update({ paid: true, paid_at: new Date().toISOString(), status: 'paid' })
          .eq('payee_id', id)
          .eq('due_date', due_date);

        continue;
      }

      // Send reminder to user
      await notifyBillDue(USER_ID, {
        id,
        payee_name,
        expected_amount
      }, days_until_due);

      // Notify guardian
      await notifyGuardian(USER_ID, {
        type: 'payment_request', // Reuse this type for bill reminders
        data: {
          amount: expected_amount,
          reason: `Bill due: ${payee_name}`,
          payee: payee_name,
          due_date
        }
      });

      // Log reminder
      await logBillReminder(id, due_date, expected_amount, reminderType);

      remindersCountSent++;

      console.log(`[Bill Reminder] Sent ${reminderType} reminder for ${payee_name} ($${expected_amount})`);
    }

    console.log(`[Bill Reminder] Complete. Sent ${remindersCountSent} reminders.`);

    return res.status(200).json({
      success: true,
      bills_checked: upcomingBills.length,
      reminders_sent: remindersCountSent
    });

  } catch (error) {
    console.error('[Bill Reminder] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
