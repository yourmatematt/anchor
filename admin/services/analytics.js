/**
 * Analytics Service
 * Database queries for internal admin dashboard
 * All metrics are aggregated and anonymized where appropriate
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key for admin access
);

/**
 * SYSTEM HEALTH METRICS
 */

export async function getActiveUsersCount() {
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('onboarding_completed', true)
    .gte('commitment_end_date', now);

  if (error) throw error;
  return count || 0;
}

export async function getTotalVaultBalance() {
  const { data, error } = await supabase
    .from('users')
    .select('vault_balance')
    .eq('onboarding_completed', true);

  if (error) throw error;

  const total = data.reduce((sum, user) => sum + parseFloat(user.vault_balance || 0), 0);
  return total;
}

export async function getDailyAllowanceDisbursed() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('users')
    .select('daily_allowance_limit, daily_allowance_used')
    .eq('onboarding_completed', true);

  if (error) throw error;

  const disbursed = data.reduce((sum, user) => sum + parseFloat(user.daily_allowance_used || 0), 0);
  return disbursed;
}

export async function getActiveConversationsCount() {
  const { count, error } = await supabase
    .from('ai_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) throw error;
  return count || 0;
}

/**
 * SUCCESS METRICS
 */

export async function getAverageCleanStreak() {
  const { data, error } = await supabase
    .from('users')
    .select('current_streak_days')
    .eq('onboarding_completed', true);

  if (error) throw error;

  if (data.length === 0) return 0;

  const total = data.reduce((sum, user) => sum + (user.current_streak_days || 0), 0);
  return Math.round(total / data.length);
}

export async function getLongestCurrentStreak() {
  const { data, error } = await supabase
    .from('users')
    .select('current_streak_days, name')
    .eq('onboarding_completed', true)
    .order('current_streak_days', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function getTotalRelapsesThisWeek() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('relapse_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  if (error) throw error;
  return count || 0;
}

export async function getTotalMoneySaved() {
  const { data, error } = await supabase
    .from('users')
    .select('vault_balance')
    .eq('onboarding_completed', true);

  if (error) throw error;

  const total = data.reduce((sum, user) => sum + parseFloat(user.vault_balance || 0), 0);
  return total;
}

/**
 * INTERVENTION EFFECTIVENESS
 */

export async function getConversationsTriggeredToday() {
  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('ai_conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  if (error) throw error;
  return count || 0;
}

export async function getPaymentApprovalRate() {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('status');

  if (error) throw error;

  if (data.length === 0) return 0;

  const approved = data.filter(req => req.status === 'approved').length;
  return Math.round((approved / data.length) * 100);
}

export async function getPatternDetectionAccuracy() {
  // This would require manual verification data
  // For now, return a placeholder
  return 85; // TODO: Implement verification tracking
}

export async function getGuardianResponseRate() {
  const { data: guardians, error } = await supabase
    .from('guardians')
    .select('id, last_viewed_at')
    .eq('status', 'active');

  if (error) throw error;

  if (guardians.length === 0) return 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeLastWeek = guardians.filter(g =>
    g.last_viewed_at && new Date(g.last_viewed_at) > weekAgo
  ).length;

  return Math.round((activeLastWeek / guardians.length) * 100);
}

/**
 * RISK INDICATORS
 */

export async function getHighRiskUsers() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Users with 3+ critical patterns in last week
  const { data, error } = await supabase
    .from('gambling_patterns')
    .select('user_id, users(name, current_streak_days)')
    .eq('severity', 'CRITICAL')
    .gte('detected_at', weekAgo);

  if (error) throw error;

  // Group by user and count
  const userCounts = {};
  data.forEach(pattern => {
    if (!userCounts[pattern.user_id]) {
      userCounts[pattern.user_id] = {
        user_id: pattern.user_id,
        name: pattern.users.name,
        streak: pattern.users.current_streak_days,
        trigger_count: 0,
      };
    }
    userCounts[pattern.user_id].trigger_count++;
  });

  // Filter to users with 3+ triggers
  return Object.values(userCounts).filter(user => user.trigger_count >= 3);
}

export async function getPaydayLoanTrend() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('gambling_patterns')
    .select('detected_at')
    .eq('pattern_type', 'PAYDAY_LOAN')
    .gte('detected_at', thirtyDaysAgo)
    .order('detected_at', { ascending: true });

  if (error) throw error;

  // Group by week
  const weeks = {};
  data.forEach(pattern => {
    const date = new Date(pattern.detected_at);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];

    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });

  return Object.entries(weeks).map(([date, count]) => ({ date, count }));
}

/**
 * USER MANAGEMENT
 */

export async function searchUsers(query) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      phone,
      current_streak_days,
      vault_balance,
      commitment_end_date,
      guardians(name, status)
    `)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .eq('onboarding_completed', true)
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getUserDetails(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      guardians(*),
      gambling_patterns(
        pattern_type,
        severity,
        detected_at
      ),
      ai_conversations(
        trigger_type,
        status,
        outcome,
        created_at
      ),
      payment_requests(
        amount,
        reason,
        status,
        requested_at
      )
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * PATTERN ANALYSIS
 */

export async function getPatternFrequency() {
  const { data, error } = await supabase
    .from('gambling_patterns')
    .select('pattern_type');

  if (error) throw error;

  const counts = {};
  data.forEach(pattern => {
    counts[pattern.pattern_type] = (counts[pattern.pattern_type] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPatternTimeOfDayHeatmap() {
  const { data, error } = await supabase
    .from('gambling_patterns')
    .select('detected_at, severity');

  if (error) throw error;

  // Create 24-hour heatmap
  const heatmap = Array(24).fill(0);

  data.forEach(pattern => {
    const hour = new Date(pattern.detected_at).getHours();
    heatmap[hour]++;
  });

  return heatmap.map((count, hour) => ({ hour, count }));
}

/**
 * INTERVENTION ANALYTICS
 */

export async function getConversationDurationStats() {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('created_at, completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null);

  if (error) throw error;

  const durations = data.map(conv => {
    const start = new Date(conv.created_at);
    const end = new Date(conv.completed_at);
    return (end - start) / 1000 / 60; // minutes
  });

  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  return {
    average: Math.round(avg),
    min: Math.round(Math.min(...durations)),
    max: Math.round(Math.max(...durations)),
  };
}

export async function getConversationOutcomes() {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('outcome')
    .eq('status', 'completed');

  if (error) throw error;

  const outcomes = {};
  data.forEach(conv => {
    outcomes[conv.outcome] = (outcomes[conv.outcome] || 0) + 1;
  });

  return outcomes;
}

/**
 * SYSTEM MONITORING
 */

export async function getWebhookSuccessRate() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('webhook_logs')
    .select('status')
    .gte('created_at', oneDayAgo);

  if (error) return 100; // Table might not exist yet

  if (data.length === 0) return 100;

  const successful = data.filter(log => log.status === 'success').length;
  return Math.round((successful / data.length) * 100);
}

export async function getRecentErrors() {
  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data;
}

/**
 * EXPORT FUNCTIONS
 */

export async function exportUserReport(userId) {
  const user = await getUserDetails(userId);

  return {
    user: {
      name: user.name,
      phone: user.phone,
      streak: user.current_streak_days,
      vault: user.vault_balance,
      commitment_end: user.commitment_end_date,
    },
    patterns: user.gambling_patterns,
    conversations: user.ai_conversations,
    payment_requests: user.payment_requests,
  };
}

export async function exportSystemReport(startDate, endDate) {
  // Aggregate all metrics for date range
  const report = {
    period: { start: startDate, end: endDate },
    users: {
      total_active: await getActiveUsersCount(),
      average_streak: await getAverageCleanStreak(),
    },
    patterns: await getPatternFrequency(),
    interventions: await getConversationOutcomes(),
    financial: {
      total_vault: await getTotalVaultBalance(),
      money_saved: await getTotalMoneySaved(),
    },
  };

  return report;
}
