/**
 * Business Intelligence Engine
 *
 * Core analytics and metrics calculation engine for Anchor executive dashboard.
 * Provides real-time business metrics, growth analytics, and predictive insights.
 *
 * Key Features:
 * - Growth metrics (acquisition, activation, retention, churn)
 * - Financial metrics (vault locked, LTV, CAC, revenue)
 * - Success metrics (clean streaks, intervention success, relapse rates)
 * - Predictive analytics (churn prediction, success probability)
 * - Time-series analysis and trend detection
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * BI Engine Class
 */
class BIEngine {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(timeRange = '30d') {
    const [growth, financial, success, engagement] = await Promise.all([
      this.getGrowthMetrics(timeRange),
      this.getFinancialMetrics(timeRange),
      this.getSuccessMetrics(timeRange),
      this.getEngagementMetrics(timeRange)
    ]);

    return {
      growth,
      financial,
      success,
      engagement,
      timestamp: new Date().toISOString(),
      timeRange
    };
  }

  /**
   * Growth Metrics
   */
  async getGrowthMetrics(timeRange) {
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    // User acquisition
    const { data: newUsers, error: newUsersError } = await supabase
      .from('users')
      .select('id, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (newUsersError) throw newUsersError;

    // Activation rate (users who completed onboarding)
    const { data: activatedUsers, error: activationError } = await supabase
      .from('users')
      .select('id, created_at, onboarding_completed_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('onboarding_completed_at', 'is', null);

    if (activationError) throw activationError;

    // Total active users
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (totalError) throw totalError;

    // Calculate retention
    const retention = await this.calculateRetention(startDate, endDate);

    // Calculate churn
    const churn = await this.calculateChurn(timeRange);

    // Guardian attachment rate
    const guardianRate = await this.getGuardianAttachmentRate(startDate, endDate);

    return {
      totalUsers,
      newUsers: newUsers.length,
      activationRate: newUsers.length > 0
        ? (activatedUsers.length / newUsers.length) * 100
        : 0,
      retention,
      churnRate: churn.rate,
      guardianAttachmentRate: guardianRate,
      weekOverWeekGrowth: await this.calculateWoWGrowth(),
      monthOverMonthGrowth: await this.calculateMoMGrowth()
    };
  }

  /**
   * Financial Metrics
   */
  async getFinancialMetrics(timeRange) {
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    // Total vault locked
    const { data: vaults, error: vaultsError } = await supabase
      .from('commitment_vaults')
      .select('amount, created_at, status')
      .eq('status', 'locked');

    if (vaultsError) throw vaultsError;

    const totalVaultLocked = vaults.reduce((sum, v) => sum + parseFloat(v.amount), 0);
    const averageVaultPerUser = vaults.length > 0 ? totalVaultLocked / vaults.length : 0;

    // Calculate projected annual savings
    const projectedSavings = await this.calculateProjectedSavings();

    // User acquisition cost (would come from marketing spend data)
    const cac = await this.calculateCAC(startDate, endDate);

    // Lifetime value estimates
    const ltv = await this.calculateLTV();

    // Revenue metrics (if applicable)
    const revenue = await this.getRevenueMetrics(startDate, endDate);

    return {
      totalVaultLocked,
      averageVaultPerUser,
      projectedAnnualSavings: projectedSavings,
      costPerAcquisition: cac,
      lifetimeValue: ltv,
      ltvCacRatio: cac > 0 ? ltv / cac : 0,
      revenue,
      monthlyRecurringRevenue: revenue.mrr,
      annualRunRate: revenue.arr
    };
  }

  /**
   * Success Metrics
   */
  async getSuccessMetrics(timeRange) {
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    // Clean streak statistics
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('clean_days, current_streak, user_id, start_date');

    if (progressError) throw progressError;

    const cleanStreakStats = this.calculateStreakStats(progress);

    // Relapse rates by cohort
    const relapseRates = await this.calculateRelapseRates();

    // Intervention success rates
    const interventionSuccess = await this.calculateInterventionSuccess(startDate, endDate);

    // Pattern detection accuracy
    const patternAccuracy = await this.calculatePatternAccuracy();

    // Guardian engagement scores
    const guardianEngagement = await this.calculateGuardianEngagement();

    // Milestone achievement rates
    const milestoneRates = await this.getMilestoneAchievementRates();

    return {
      averageCleanStreak: cleanStreakStats.average,
      medianCleanStreak: cleanStreakStats.median,
      maxCleanStreak: cleanStreakStats.max,
      relapseRates,
      interventionSuccessRate: interventionSuccess.rate,
      patternDetectionAccuracy: patternAccuracy,
      guardianEngagementScore: guardianEngagement.score,
      milestoneAchievementRates: milestoneRates,
      usersAt30Days: milestoneRates['30_days'],
      usersAt90Days: milestoneRates['90_days'],
      usersAt180Days: milestoneRates['180_days'],
      usersAt365Days: milestoneRates['365_days']
    };
  }

  /**
   * Engagement Metrics
   */
  async getEngagementMetrics(timeRange) {
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    // Daily active users
    const dau = await this.getDailyActiveUsers(endDate);

    // Weekly active users
    const wau = await this.getWeeklyActiveUsers(endDate);

    // Monthly active users
    const mau = await this.getMonthlyActiveUsers(endDate);

    // Voice memo completion rate
    const voiceMemoRate = await this.getVoiceMemoCompletionRate(startDate, endDate);

    // Average interventions per user
    const avgInterventions = await this.getAverageInterventions(startDate, endDate);

    // Guardian response time
    const guardianResponseTime = await this.getGuardianResponseTime(startDate, endDate);

    return {
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      dauMauRatio: mau > 0 ? (dau / mau) * 100 : 0,
      voiceMemoCompletionRate: voiceMemoRate,
      averageInterventionsPerUser: avgInterventions,
      guardianAverageResponseTime: guardianResponseTime
    };
  }

  /**
   * Calculate retention curves (D1, D7, D30, D90)
   */
  async calculateRetention(startDate, endDate) {
    const cohorts = await this.getCohorts(startDate, endDate);

    const retention = {
      day1: 0,
      day7: 0,
      day30: 0,
      day90: 0
    };

    for (const cohort of cohorts) {
      const cohortRetention = await this.getCohortRetention(cohort.cohortDate);
      retention.day1 += cohortRetention.day1;
      retention.day7 += cohortRetention.day7;
      retention.day30 += cohortRetention.day30;
      retention.day90 += cohortRetention.day90;
    }

    // Average across cohorts
    const cohortCount = cohorts.length || 1;
    return {
      day1: retention.day1 / cohortCount,
      day7: retention.day7 / cohortCount,
      day30: retention.day30 / cohortCount,
      day90: retention.day90 / cohortCount
    };
  }

  /**
   * Calculate churn rate
   */
  async calculateChurn(timeRange) {
    const { startDate, endDate } = this.parseTimeRange(timeRange);

    // Users at start of period
    const { count: startUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', startDate);

    // Users who churned in period (marked inactive or deleted)
    const { count: churnedUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'churned')
      .gte('updated_at', startDate)
      .lte('updated_at', endDate);

    const churnRate = startUsers > 0 ? (churnedUsers / startUsers) * 100 : 0;

    return {
      rate: churnRate,
      churned: churnedUsers,
      period: timeRange
    };
  }

  /**
   * Calculate guardian attachment rate
   */
  async getGuardianAttachmentRate(startDate, endDate) {
    const { data: users } = await supabase
      .from('users')
      .select('id, has_guardian')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const withGuardian = users.filter(u => u.has_guardian).length;
    return users.length > 0 ? (withGuardian / users.length) * 100 : 0;
  }

  /**
   * Calculate projected savings
   */
  async calculateProjectedSavings() {
    const { data: users } = await supabase
      .from('user_progress')
      .select('clean_days, user_id');

    // Get average gambling spend per user before Anchor
    const { data: vaults } = await supabase
      .from('commitment_vaults')
      .select('amount, commitment_days');

    // Estimate: vault amount represents weekly gambling spend
    // Clean days × weekly spend / 7 = total saved
    let totalSavings = 0;
    for (const user of users) {
      const userVault = vaults.find(v => v.user_id === user.user_id);
      if (userVault) {
        const dailySpend = parseFloat(userVault.amount) / 7;
        totalSavings += user.clean_days * dailySpend;
      }
    }

    // Project to annual
    const avgCleanDays = users.reduce((sum, u) => sum + u.clean_days, 0) / (users.length || 1);
    const avgDailySpend = vaults.reduce((sum, v) => sum + parseFloat(v.amount), 0) / (vaults.length || 1) / 7;
    const projectedAnnual = avgDailySpend * 365 * users.length;

    return {
      totalToDate: totalSavings,
      projectedAnnual,
      averagePerUser: users.length > 0 ? totalSavings / users.length : 0
    };
  }

  /**
   * Calculate Customer Acquisition Cost
   */
  async calculateCAC(startDate, endDate) {
    // This would pull from marketing spend data
    // For now, return placeholder that should be configured
    const { data: marketingSpend } = await supabase
      .from('marketing_spend')
      .select('amount')
      .gte('date', startDate)
      .lte('date', endDate);

    const totalSpend = marketingSpend?.reduce((sum, s) => sum + parseFloat(s.amount), 0) || 0;

    const { count: newUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return newUsers > 0 ? totalSpend / newUsers : 0;
  }

  /**
   * Calculate Lifetime Value
   */
  async calculateLTV() {
    // For a financial wellness app, LTV could be based on:
    // 1. Subscription revenue (if applicable)
    // 2. Partner revenue share
    // 3. Estimated lifetime of user

    const { data: users } = await supabase
      .from('users')
      .select('created_at, status');

    // Calculate average lifetime in days
    const activeUsers = users.filter(u => u.status === 'active');
    const avgLifetimeDays = activeUsers.reduce((sum, u) => {
      const days = (Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / (activeUsers.length || 1);

    // Estimate monthly value per user (from subscriptions, partners, etc.)
    const monthlyValuePerUser = 10; // Configure based on business model

    const ltv = (avgLifetimeDays / 30) * monthlyValuePerUser;

    return ltv;
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(startDate, endDate) {
    // Revenue from subscriptions, partnerships, etc.
    const { data: revenue } = await supabase
      .from('revenue')
      .select('amount, type, date')
      .gte('date', startDate)
      .lte('date', endDate);

    const totalRevenue = revenue?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;

    // MRR calculation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyRevenue } = await supabase
      .from('revenue')
      .select('amount')
      .gte('date', thirtyDaysAgo.toISOString());

    const mrr = monthlyRevenue?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
    const arr = mrr * 12;

    return {
      total: totalRevenue,
      mrr,
      arr,
      growth: await this.calculateRevenueGrowth()
    };
  }

  /**
   * Calculate intervention success rate
   */
  async calculateInterventionSuccess(startDate, endDate) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('is_whitelisted, intervention_completed, voice_memo_url')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .eq('is_whitelisted', false);

    const interventionsRequired = transactions.length;
    const interventionsCompleted = transactions.filter(t => t.intervention_completed).length;
    const withVoiceMemo = transactions.filter(t => t.voice_memo_url).length;

    return {
      rate: interventionsRequired > 0 ? (interventionsCompleted / interventionsRequired) * 100 : 100,
      total: interventionsRequired,
      completed: interventionsCompleted,
      voiceMemoRate: interventionsRequired > 0 ? (withVoiceMemo / interventionsRequired) * 100 : 0
    };
  }

  /**
   * Calculate pattern detection accuracy
   */
  async calculatePatternAccuracy() {
    // This would analyze ML model predictions vs actual outcomes
    // Placeholder for now
    return 87.5; // Would be calculated from actual ML metrics
  }

  /**
   * Calculate guardian engagement
   */
  async calculateGuardianEngagement() {
    const { data: guardians } = await supabase
      .from('guardians')
      .select('id, last_active_at, notifications_sent, notifications_responded');

    const totalGuardians = guardians.length;
    const activeLastWeek = guardians.filter(g => {
      const lastActive = new Date(g.last_active_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastActive > weekAgo;
    }).length;

    const avgResponseRate = guardians.reduce((sum, g) => {
      const rate = g.notifications_sent > 0
        ? (g.notifications_responded / g.notifications_sent) * 100
        : 0;
      return sum + rate;
    }, 0) / (totalGuardians || 1);

    return {
      score: avgResponseRate,
      activeRate: totalGuardians > 0 ? (activeLastWeek / totalGuardians) * 100 : 0,
      averageResponseRate: avgResponseRate
    };
  }

  /**
   * Get milestone achievement rates
   */
  async getMilestoneAchievementRates() {
    const { data: users } = await supabase
      .from('user_progress')
      .select('clean_days');

    const total = users.length;

    return {
      '30_days': users.filter(u => u.clean_days >= 30).length / (total || 1) * 100,
      '90_days': users.filter(u => u.clean_days >= 90).length / (total || 1) * 100,
      '180_days': users.filter(u => u.clean_days >= 180).length / (total || 1) * 100,
      '365_days': users.filter(u => u.clean_days >= 365).length / (total || 1) * 100
    };
  }

  /**
   * Churn Prediction (Machine Learning)
   */
  async predictChurn(userId) {
    // Get user behavioral data
    const userData = await this.getUserBehaviorData(userId);

    // Churn risk factors:
    // - Declining engagement (fewer interventions)
    // - Increasing relapse frequency
    // - Guardian disengagement
    // - Longer time between app opens

    const risk = this.calculateChurnRisk(userData);

    return {
      userId,
      churnProbability: risk.probability,
      riskLevel: risk.level, // low, medium, high
      factors: risk.factors,
      recommendations: this.getRetentionRecommendations(risk)
    };
  }

  /**
   * Success Probability Prediction
   */
  async predictSuccess(userId) {
    const userData = await this.getUserBehaviorData(userId);

    // Success indicators:
    // - Consistent clean streaks
    // - High intervention completion
    // - Active guardian engagement
    // - Milestone achievement pace

    const probability = this.calculateSuccessProbability(userData);

    return {
      userId,
      successProbability: probability,
      projectedCleanDays90: probability * 90,
      recommendedSupport: this.getSuccessSupportRecommendations(probability)
    };
  }

  /**
   * Revenue Forecasting
   */
  async forecastRevenue(months = 12) {
    const historicalRevenue = await this.getHistoricalRevenue();
    const userGrowth = await this.calculateWoWGrowth();

    // Simple linear regression for now
    // In production, use more sophisticated models
    const forecast = [];
    let currentMRR = historicalRevenue[historicalRevenue.length - 1]?.mrr || 0;

    for (let i = 1; i <= months; i++) {
      currentMRR *= (1 + userGrowth.rate / 100);
      forecast.push({
        month: i,
        projected: currentMRR,
        conservative: currentMRR * 0.8,
        optimistic: currentMRR * 1.2
      });
    }

    return {
      forecast,
      assumptions: {
        userGrowthRate: userGrowth.rate,
        churnRate: (await this.calculateChurn('30d')).rate,
        avgRevenuePerUser: currentMRR / await this.getMonthlyActiveUsers(new Date())
      }
    };
  }

  /**
   * Helper: Parse time range
   */
  parseTimeRange(timeRange) {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '365d':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Helper: Calculate streak statistics
   */
  calculateStreakStats(progress) {
    const streaks = progress.map(p => p.current_streak).sort((a, b) => a - b);
    const sum = streaks.reduce((a, b) => a + b, 0);

    return {
      average: sum / (streaks.length || 1),
      median: streaks[Math.floor(streaks.length / 2)] || 0,
      max: Math.max(...streaks, 0)
    };
  }

  /**
   * Helper: Get cohorts
   */
  async getCohorts(startDate, endDate) {
    // Group users by signup month
    const { data: users } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const cohorts = {};
    users.forEach(user => {
      const cohortDate = new Date(user.created_at);
      cohortDate.setDate(1); // First of month
      const key = cohortDate.toISOString().split('T')[0];

      if (!cohorts[key]) {
        cohorts[key] = { cohortDate: key, users: 0 };
      }
      cohorts[key].users++;
    });

    return Object.values(cohorts);
  }

  /**
   * Additional helper methods
   */
  async getDailyActiveUsers(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('user_activity')
      .select('user_id', { count: 'exact', head: true })
      .gte('timestamp', startOfDay.toISOString())
      .lt('timestamp', date.toISOString());

    return count || 0;
  }

  async getWeeklyActiveUsers(date) {
    const weekAgo = new Date(date);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count } = await supabase
      .from('user_activity')
      .select('user_id', { count: 'exact', head: true })
      .gte('timestamp', weekAgo.toISOString())
      .lt('timestamp', date.toISOString());

    return count || 0;
  }

  async getMonthlyActiveUsers(date) {
    const monthAgo = new Date(date);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const { count } = await supabase
      .from('user_activity')
      .select('user_id', { count: 'exact', head: true })
      .gte('timestamp', monthAgo.toISOString())
      .lt('timestamp', date.toISOString());

    return count || 0;
  }

  async calculateWoWGrowth() {
    // Week over week growth
    const thisWeek = await this.getUserCount(7);
    const lastWeek = await this.getUserCount(14, 7);

    return {
      rate: lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0,
      absolute: thisWeek - lastWeek
    };
  }

  async calculateMoMGrowth() {
    // Month over month growth
    const thisMonth = await this.getUserCount(30);
    const lastMonth = await this.getUserCount(60, 30);

    return {
      rate: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0,
      absolute: thisMonth - lastMonth
    };
  }

  async getUserCount(daysAgo, offsetDays = 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offsetDays);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo - offsetDays);

    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    return count || 0;
  }

  async calculateRelapseRates() {
    // Placeholder - would analyze user streaks and resets
    return {
      overall: 15.2,
      by_commitment: {
        '7_days': 8.5,
        '30_days': 12.3,
        '90_days': 18.7
      }
    };
  }

  async getVoiceMemoCompletionRate(startDate, endDate) {
    const { data: interventions } = await supabase
      .from('transactions')
      .select('intervention_completed, voice_memo_url')
      .eq('is_whitelisted', false)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    const withMemo = interventions.filter(i => i.voice_memo_url).length;
    return interventions.length > 0 ? (withMemo / interventions.length) * 100 : 0;
  }

  async getAverageInterventions(startDate, endDate) {
    const { data: users } = await supabase
      .from('users')
      .select('id');

    const { data: interventions } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('is_whitelisted', false)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    return users.length > 0 ? interventions.length / users.length : 0;
  }

  async getGuardianResponseTime(startDate, endDate) {
    // Placeholder - would measure time between alert and guardian action
    return 15.5; // minutes
  }

  async getCohortRetention(cohortDate) {
    // Placeholder - would calculate actual retention for cohort
    return {
      day1: 85,
      day7: 65,
      day30: 45,
      day90: 30
    };
  }

  async getHistoricalRevenue() {
    // Placeholder
    return [];
  }

  async calculateRevenueGrowth() {
    // Placeholder
    return 15.5;
  }

  async getUserBehaviorData(userId) {
    // Placeholder
    return {};
  }

  calculateChurnRisk(userData) {
    // Placeholder
    return {
      probability: 0.25,
      level: 'medium',
      factors: ['Declining engagement']
    };
  }

  getRetentionRecommendations(risk) {
    // Placeholder
    return ['Increase guardian touchpoints'];
  }

  calculateSuccessProbability(userData) {
    // Placeholder
    return 0.75;
  }

  getSuccessSupportRecommendations(probability) {
    // Placeholder
    return ['Continue current support level'];
  }
}

// Export singleton
const biEngine = new BIEngine();

module.exports = {
  biEngine,
  BIEngine
};
