/**
 * Sync Scheduler
 * Intelligent scheduling for Up Bank transaction syncing
 * Adapts frequency based on time of day, user risk, and historical patterns
 */

const { syncUserTransactions, syncAllUsers, reconcileUserTransactions } = require('./up-bank-sync');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sync frequencies (in minutes)
const SYNC_FREQUENCIES = {
  RECENT: 5,        // Last 24 hours (every 5 minutes)
  WEEK: 60,         // Last 7 days (hourly)
  MONTH: 1440,      // Full month (daily)
  RECONCILE: 1440,  // Full reconciliation (daily)
};

// High-risk times (more frequent syncing)
const HIGH_RISK_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3]; // 6pm-4am
const HIGH_RISK_DAYS = [5, 6, 0]; // Friday, Saturday, Sunday

/**
 * Run recent sync (every 5 minutes)
 * Fetches last 24 hours of transactions
 */
async function runRecentSync() {
  console.log(`[Scheduler] Running recent sync (last 24 hours)...`);

  try {
    const result = await syncAllUsers({
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    await logSchedulerRun('recent', result);

    return result;
  } catch (error) {
    console.error(`[Scheduler] Recent sync failed:`, error);
    await logSchedulerError('recent', error.message);
    throw error;
  }
}

/**
 * Run weekly sync (every hour)
 * Fetches last 7 days to catch any missed transactions
 */
async function runWeeklySync() {
  console.log(`[Scheduler] Running weekly sync (last 7 days)...`);

  try {
    const result = await syncAllUsers({
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await logSchedulerRun('weekly', result);

    return result;
  } catch (error) {
    console.error(`[Scheduler] Weekly sync failed:`, error);
    await logSchedulerError('weekly', error.message);
    throw error;
  }
}

/**
 * Run monthly sync (daily at 3am)
 * Fetches last 30 days for full reconciliation
 */
async function runMonthlySync() {
  console.log(`[Scheduler] Running monthly sync (last 30 days)...`);

  try {
    const result = await syncAllUsers({
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await logSchedulerRun('monthly', result);

    return result;
  } catch (error) {
    console.error(`[Scheduler] Monthly sync failed:`, error);
    await logSchedulerError('monthly', error.message);
    throw error;
  }
}

/**
 * Run full reconciliation (daily at 3am)
 * Compares database with Up Bank to find missed transactions
 */
async function runReconciliation() {
  console.log(`[Scheduler] Running full reconciliation...`);

  try {
    // Get all active users
    const { data: users } = await supabase
      .from('users')
      .select('id, up_bank_token')
      .not('up_bank_token', 'is', null)
      .eq('is_active', true);

    const results = {
      total: users.length,
      totalMissing: 0,
      totalBackfilled: 0,
    };

    for (const user of users) {
      try {
        const result = await reconcileUserTransactions(user.id, user.up_bank_token, 30);
        results.totalMissing += result.missing;
        results.totalBackfilled += result.backfilled;

        await sleep(1000); // Rate limiting
      } catch (error) {
        console.error(`[Scheduler] Reconciliation failed for user ${user.id}:`, error);
      }
    }

    console.log(`[Scheduler] Reconciliation complete: ${results.totalBackfilled} transactions backfilled`);

    await logSchedulerRun('reconciliation', results);

    return results;
  } catch (error) {
    console.error(`[Scheduler] Reconciliation failed:`, error);
    await logSchedulerError('reconciliation', error.message);
    throw error;
  }
}

/**
 * Run high-risk user sync (more frequent)
 * Syncs users with recent patterns or low streaks
 */
async function runHighRiskSync() {
  console.log(`[Scheduler] Running high-risk user sync...`);

  try {
    // Get high-risk users
    const { data: highRiskUsers } = await supabase
      .from('users')
      .select('id, up_bank_token, current_streak_days')
      .not('up_bank_token', 'is', null)
      .eq('is_active', true)
      .or('current_streak_days.lt.7,has_recent_pattern.eq.true');

    if (!highRiskUsers || highRiskUsers.length === 0) {
      console.log(`[Scheduler] No high-risk users to sync`);
      return { total: 0, synced: 0 };
    }

    console.log(`[Scheduler] Found ${highRiskUsers.length} high-risk users`);

    const results = {
      total: highRiskUsers.length,
      synced: 0,
      interventions: 0,
    };

    for (const user of highRiskUsers) {
      try {
        const result = await syncUserTransactions(user.id, user.up_bank_token, {
          since: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // Last 6 hours
        });

        results.synced += result.synced;
        results.interventions += result.interventions;

        await sleep(500);
      } catch (error) {
        console.error(`[Scheduler] High-risk sync failed for user ${user.id}:`, error);
      }
    }

    await logSchedulerRun('high_risk', results);

    return results;
  } catch (error) {
    console.error(`[Scheduler] High-risk sync failed:`, error);
    await logSchedulerError('high_risk', error.message);
    throw error;
  }
}

/**
 * Run payday sync (more frequent on known payday periods)
 * Syncs users whose payday is today or yesterday
 */
async function runPaydaySync() {
  console.log(`[Scheduler] Running payday sync...`);

  try {
    const today = new Date().getDate();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).getDate();

    // Get users with payday today or yesterday
    const { data: paydayUsers } = await supabase
      .from('user_paydays')
      .select('user_id, users!inner(up_bank_token)')
      .in('day_of_month', [today, yesterday])
      .not('users.up_bank_token', 'is', null);

    if (!paydayUsers || paydayUsers.length === 0) {
      console.log(`[Scheduler] No payday users to sync`);
      return { total: 0, synced: 0 };
    }

    console.log(`[Scheduler] Found ${paydayUsers.length} users in payday period`);

    const results = {
      total: paydayUsers.length,
      synced: 0,
      interventions: 0,
    };

    for (const payday of paydayUsers) {
      try {
        const result = await syncUserTransactions(payday.user_id, payday.users.up_bank_token, {
          since: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Last 48 hours
        });

        results.synced += result.synced;
        results.interventions += result.interventions;

        await sleep(500);
      } catch (error) {
        console.error(`[Scheduler] Payday sync failed for user ${payday.user_id}:`, error);
      }
    }

    await logSchedulerRun('payday', results);

    return results;
  } catch (error) {
    console.error(`[Scheduler] Payday sync failed:`, error);
    await logSchedulerError('payday', error.message);
    throw error;
  }
}

/**
 * Manual sync for specific user
 */
async function runManualSync(userId, daysBack = 7) {
  console.log(`[Scheduler] Running manual sync for user ${userId} (${daysBack} days)...`);

  try {
    // Get user's Up Bank token
    const { data: user } = await supabase
      .from('users')
      .select('up_bank_token')
      .eq('id', userId)
      .single();

    if (!user?.up_bank_token) {
      throw new Error('User does not have Up Bank connected');
    }

    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const result = await syncUserTransactions(userId, user.up_bank_token, { since });

    await logSchedulerRun('manual', {
      userId,
      daysBack,
      ...result,
    });

    return result;
  } catch (error) {
    console.error(`[Scheduler] Manual sync failed for user ${userId}:`, error);
    await logSchedulerError('manual', error.message);
    throw error;
  }
}

/**
 * Determine if current time is high-risk
 */
function isHighRiskTime() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  return HIGH_RISK_HOURS.includes(hour) || HIGH_RISK_DAYS.includes(day);
}

/**
 * Get recommended sync frequency based on current time
 */
function getRecommendedFrequency() {
  if (isHighRiskTime()) {
    return SYNC_FREQUENCIES.RECENT; // Every 5 minutes during high-risk times
  }

  const hour = new Date().getHours();

  // Overnight (4am-8am): Less frequent
  if (hour >= 4 && hour < 8) {
    return SYNC_FREQUENCIES.WEEK; // Every hour
  }

  // Business hours (8am-6pm): Standard frequency
  if (hour >= 8 && hour < 18) {
    return SYNC_FREQUENCIES.RECENT * 2; // Every 10 minutes
  }

  // Default to 5 minutes
  return SYNC_FREQUENCIES.RECENT;
}

/**
 * Log scheduler run
 */
async function logSchedulerRun(syncType, result) {
  await supabase
    .from('scheduler_logs')
    .insert({
      sync_type: syncType,
      result: result,
      created_at: new Date().toISOString(),
    });
}

/**
 * Log scheduler error
 */
async function logSchedulerError(syncType, errorMessage) {
  await supabase
    .from('scheduler_errors')
    .insert({
      sync_type: syncType,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get sync stats for dashboard
 */
async function getSyncStats(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from('scheduler_logs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const { data: errors } = await supabase
    .from('scheduler_errors')
    .select('*')
    .gte('created_at', since);

  const stats = {
    totalRuns: logs?.length || 0,
    totalErrors: errors?.length || 0,
    successRate: logs?.length > 0 ? ((logs.length - (errors?.length || 0)) / logs.length * 100).toFixed(1) : 0,
    recentRuns: logs?.slice(0, 10) || [],
    recentErrors: errors?.slice(0, 10) || [],
  };

  // Aggregate by sync type
  const byType = {};
  logs?.forEach(log => {
    if (!byType[log.sync_type]) {
      byType[log.sync_type] = { count: 0, totalSynced: 0, totalInterventions: 0 };
    }
    byType[log.sync_type].count++;
    byType[log.sync_type].totalSynced += log.result?.totalSynced || 0;
    byType[log.sync_type].totalInterventions += log.result?.totalInterventions || 0;
  });

  stats.byType = byType;

  return stats;
}

module.exports = {
  // Scheduled sync functions
  runRecentSync,
  runWeeklySync,
  runMonthlySync,
  runReconciliation,
  runHighRiskSync,
  runPaydaySync,

  // Manual sync
  runManualSync,

  // Utilities
  isHighRiskTime,
  getRecommendedFrequency,
  getSyncStats,

  // Constants
  SYNC_FREQUENCIES,
  HIGH_RISK_HOURS,
  HIGH_RISK_DAYS,
};
