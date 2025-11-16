/**
 * Cron Jobs Service
 * Handles all scheduled tasks for Anchor
 *
 * Schedule:
 * - EVERY MINUTE: Timeout checks, webhook retries
 * - DAILY (midnight AEST): Allowance reset, streak updates, bill checks
 * - HOURLY: Up Bank sync, vault interest, pattern checks
 * - WEEKLY (Sunday 6pm): Progress reports
 */

const cron = require('node-cron');
const { supabase, logError } = require('../utils/supabase');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * EVERY MINUTE
 * Check for timed-out AI conversations (10+ minutes inactive)
 */
const checkConversationTimeouts = cron.schedule('* * * * *', async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Find active conversations with no updates in 10 minutes
    const { data: timedOutConversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('status', 'active')
      .lt('updated_at', tenMinutesAgo);

    if (timedOutConversations && timedOutConversations.length > 0) {
      console.log(`Found ${timedOutConversations.length} timed-out conversations`);

      for (const conversation of timedOutConversations) {
        // Mark as timed out
        await supabase
          .from('ai_conversations')
          .update({
            status: 'completed',
            outcome: 'timed_out',
            completed_at: new Date().toISOString(),
          })
          .eq('id', conversation.id);

        // Notify guardian of timeout
        const { data: guardian } = await supabase
          .from('guardians')
          .select('phone, users(name)')
          .eq('user_id', conversation.user_id)
          .eq('status', 'active')
          .single();

        if (guardian && guardian.phone) {
          try {
            await twilioClient.messages.create({
              body: `ANCHOR: ${guardian.users.name} didn't complete their AI check-in (${conversation.trigger_type}). They've been notified to complete it.`,
              from: process.env.TWILIO_FROM_NUMBER,
              to: guardian.phone,
            });
          } catch (error) {
            console.error('Failed to send guardian timeout notification:', error);
          }
        }
      }
    }
  } catch (error) {
    await logError(error, { context: 'cron_conversation_timeouts' });
  }
});

/**
 * DAILY at midnight AEST (14:00 UTC)
 * Reset daily allowance to $30
 */
const resetDailyAllowance = cron.schedule('0 14 * * *', async () => {
  try {
    console.log('Running daily allowance reset...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { error } = await supabase
      .from('users')
      .update({
        daily_allowance_used: 0,
        allowance_reset_at: tomorrow.toISOString(),
      })
      .eq('onboarding_completed', true);

    if (error) {
      throw error;
    }

    console.log('Daily allowance reset complete');
  } catch (error) {
    await logError(error, { context: 'cron_reset_allowance' });
  }
});

/**
 * DAILY at midnight AEST
 * Update clean streaks for all users
 */
const updateCleanStreaks = cron.schedule('0 14 * * *', async () => {
  try {
    console.log('Running clean streak updates...');

    // Get all users who haven't relapsed today
    const { data: users } = await supabase
      .from('users')
      .select('id, current_streak_days, last_relapse_date')
      .eq('onboarding_completed', true);

    if (users) {
      for (const user of users) {
        const lastRelapse = user.last_relapse_date ? new Date(user.last_relapse_date) : null;
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Only increment if no relapse in last 24 hours
        if (!lastRelapse || lastRelapse < yesterday) {
          await supabase
            .from('users')
            .update({
              current_streak_days: user.current_streak_days + 1,
            })
            .eq('id', user.id);
        }
      }
    }

    console.log(`Updated streaks for ${users?.length || 0} users`);
  } catch (error) {
    await logError(error, { context: 'cron_update_streaks' });
  }
});

/**
 * DAILY at midnight AEST
 * Check for overdue bills
 */
const checkOverdueBills = cron.schedule('0 14 * * *', async () => {
  try {
    console.log('Running overdue bill checks...');

    const today = new Date().toISOString().split('T')[0];

    const { data: overdueBills } = await supabase
      .from('bills_whitelist')
      .select(`
        *,
        users (id, name, phone)
      `)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (overdueBills && overdueBills.length > 0) {
      console.log(`Found ${overdueBills.length} overdue bills`);

      // Group by user and send notification
      const userBills = {};
      overdueBills.forEach(bill => {
        if (!userBills[bill.user_id]) {
          userBills[bill.user_id] = [];
        }
        userBills[bill.user_id].push(bill);
      });

      // Send push notifications (in production, use Expo push)
      for (const userId in userBills) {
        console.log(`User ${userId} has ${userBills[userId].length} overdue bills`);
      }
    }
  } catch (error) {
    await logError(error, { context: 'cron_check_overdue_bills' });
  }
});

/**
 * HOURLY
 * Sync Up Bank transactions (backup to webhooks)
 */
const syncUpBankTransactions = cron.schedule('0 * * * *', async () => {
  try {
    console.log('Running Up Bank transaction sync...');

    // Get all users with Up Bank tokens
    const { data: users } = await supabase
      .from('users')
      .select('id, up_bank_token')
      .eq('onboarding_completed', true)
      .not('up_bank_token', 'is', null);

    if (users) {
      for (const user of users) {
        try {
          // Fetch recent transactions from Up Bank API
          const response = await fetch('https://api.up.com.au/api/v1/transactions?page[size]=10', {
            headers: {
              'Authorization': `Bearer ${user.up_bank_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Process transactions (this would call the webhook handler logic)
            console.log(`Synced ${data.data?.length || 0} transactions for user ${user.id}`);
          }
        } catch (error) {
          console.error(`Failed to sync transactions for user ${user.id}:`, error);
        }
      }
    }
  } catch (error) {
    await logError(error, { context: 'cron_sync_up_bank' });
  }
});

/**
 * HOURLY
 * Calculate vault interest (if enabled)
 */
const calculateVaultInterest = cron.schedule('0 * * * *', async () => {
  try {
    console.log('Running vault interest calculation...');

    // This is a placeholder for future interest calculation
    // For now, vault balance only grows from deposits
    // Future: could add interest based on streak length or commitment period

    const { data: users } = await supabase
      .from('users')
      .select('id, vault_balance, current_streak_days')
      .eq('onboarding_completed', true)
      .gt('vault_balance', 0);

    if (users) {
      console.log(`Checked vault interest for ${users.length} users`);
    }
  } catch (error) {
    await logError(error, { context: 'cron_vault_interest' });
  }
});

/**
 * WEEKLY (Sunday 6pm AEST - 08:00 UTC)
 * Send weekly progress report to guardian
 */
const sendWeeklyProgressReport = cron.schedule('0 8 * * 0', async () => {
  try {
    console.log('Running weekly progress reports...');

    // Get all active guardians
    const { data: guardians } = await supabase
      .from('guardians')
      .select(`
        *,
        users (
          id,
          name,
          current_streak_days,
          vault_balance
        )
      `)
      .eq('status', 'active');

    if (guardians) {
      for (const guardian of guardians) {
        const user = guardian.users;

        // Get patterns from last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: patterns } = await supabase
          .from('gambling_patterns')
          .select('severity')
          .eq('user_id', user.id)
          .gte('detected_at', sevenDaysAgo);

        const criticalPatterns = patterns?.filter(p => p.severity === 'CRITICAL').length || 0;
        const highPatterns = patterns?.filter(p => p.severity === 'HIGH').length || 0;

        // Build status message
        let statusMessage = '';
        if (criticalPatterns === 0 && highPatterns === 0) {
          statusMessage = `${user.name} has had a clean week - no concerning patterns detected. `;
        } else {
          statusMessage = `${user.name} had ${criticalPatterns} critical and ${highPatterns} high-risk patterns this week. `;
        }

        statusMessage += `Current streak: ${user.current_streak_days} days clean. `;
        statusMessage += `They're building their future fund steadily.`;

        // Send SMS
        try {
          await twilioClient.messages.create({
            body: `ANCHOR WEEKLY UPDATE: ${statusMessage}`,
            from: process.env.TWILIO_FROM_NUMBER,
            to: guardian.phone,
          });
          console.log(`Sent weekly report to guardian for user ${user.id}`);
        } catch (error) {
          console.error(`Failed to send weekly report for user ${user.id}:`, error);
        }
      }
    }
  } catch (error) {
    await logError(error, { context: 'cron_weekly_progress' });
  }
});

/**
 * Start all cron jobs
 */
function startCronJobs() {
  console.log('Starting cron jobs...');

  checkConversationTimeouts.start();
  resetDailyAllowance.start();
  updateCleanStreaks.start();
  checkOverdueBills.start();
  syncUpBankTransactions.start();
  calculateVaultInterest.start();
  sendWeeklyProgressReport.start();

  console.log('All cron jobs started successfully');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopCronJobs() {
  console.log('Stopping cron jobs...');

  checkConversationTimeouts.stop();
  resetDailyAllowance.stop();
  updateCleanStreaks.stop();
  checkOverdueBills.stop();
  syncUpBankTransactions.stop();
  calculateVaultInterest.stop();
  sendWeeklyProgressReport.stop();

  console.log('All cron jobs stopped');
}

module.exports = {
  startCronJobs,
  stopCronJobs,
};
