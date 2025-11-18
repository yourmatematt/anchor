/**
 * Cohort Analyzer
 *
 * Advanced cohort analysis engine for tracking user behavior patterns,
 * retention curves, and success metrics across different user segments.
 *
 * Cohort Dimensions:
 * - Sign-up month/week
 * - Risk level
 * - Gambling type
 * - Commitment period
 * - Guardian status
 * - Geographic location
 * - Acquisition channel
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Cohort Dimensions
 */
const COHORT_DIMENSIONS = {
  SIGNUP_MONTH: 'signup_month',
  SIGNUP_WEEK: 'signup_week',
  RISK_LEVEL: 'risk_level',
  GAMBLING_TYPE: 'gambling_type',
  COMMITMENT_PERIOD: 'commitment_period',
  GUARDIAN_STATUS: 'guardian_status',
  GEOGRAPHY: 'geography',
  CHANNEL: 'acquisition_channel'
};

/**
 * Cohort Analyzer Class
 */
class CohortAnalyzer {
  /**
   * Get comprehensive cohort analysis
   */
  async analyzeCohorts(dimension = COHORT_DIMENSIONS.SIGNUP_MONTH, options = {}) {
    const cohorts = await this.getCohortsByDimension(dimension, options);
    const analysis = [];

    for (const cohort of cohorts) {
      const cohortData = await this.analyzeCohort(cohort, dimension);
      analysis.push(cohortData);
    }

    return {
      dimension,
      cohorts: analysis,
      summary: this.summarizeCohorts(analysis),
      insights: this.generateInsights(analysis)
    };
  }

  /**
   * Get cohorts by dimension
   */
  async getCohortsByDimension(dimension, options = {}) {
    const { startDate, endDate, limit } = options;

    let query = supabase
      .from('users')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Group users by dimension
    const cohorts = this.groupByDimension(users, dimension);

    return cohorts;
  }

  /**
   * Group users by dimension
   */
  groupByDimension(users, dimension) {
    const cohorts = {};

    users.forEach(user => {
      let cohortKey;

      switch (dimension) {
        case COHORT_DIMENSIONS.SIGNUP_MONTH:
          cohortKey = new Date(user.created_at).toISOString().substring(0, 7); // YYYY-MM
          break;

        case COHORT_DIMENSIONS.SIGNUP_WEEK:
          const date = new Date(user.created_at);
          const week = this.getWeekNumber(date);
          cohortKey = `${date.getFullYear()}-W${week}`;
          break;

        case COHORT_DIMENSIONS.RISK_LEVEL:
          cohortKey = user.risk_level || 'unknown';
          break;

        case COHORT_DIMENSIONS.GAMBLING_TYPE:
          cohortKey = user.gambling_type || 'unknown';
          break;

        case COHORT_DIMENSIONS.COMMITMENT_PERIOD:
          cohortKey = user.commitment_days ? `${user.commitment_days}_days` : 'none';
          break;

        case COHORT_DIMENSIONS.GUARDIAN_STATUS:
          cohortKey = user.has_guardian ? 'with_guardian' : 'no_guardian';
          break;

        case COHORT_DIMENSIONS.GEOGRAPHY:
          cohortKey = user.location || 'unknown';
          break;

        case COHORT_DIMENSIONS.CHANNEL:
          cohortKey = user.acquisition_channel || 'organic';
          break;

        default:
          cohortKey = 'default';
      }

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          cohortId: cohortKey,
          dimension,
          users: []
        };
      }

      cohorts[cohortKey].users.push(user);
    });

    return Object.values(cohorts);
  }

  /**
   * Analyze a single cohort
   */
  async analyzeCohort(cohort, dimension) {
    const userIds = cohort.users.map(u => u.id);
    const cohortSize = userIds.length;

    // Get retention curve
    const retention = await this.getCohortRetentionCurve(cohort);

    // Get success metrics
    const success = await this.getCohortSuccessMetrics(cohort);

    // Get financial metrics
    const financial = await this.getCohortFinancialMetrics(cohort);

    // Get engagement metrics
    const engagement = await this.getCohortEngagementMetrics(cohort);

    return {
      cohortId: cohort.cohortId,
      dimension,
      size: cohortSize,
      retention,
      success,
      financial,
      engagement,
      startDate: this.getCohortStartDate(cohort),
      age: this.getCohortAge(cohort)
    };
  }

  /**
   * Calculate retention curve for cohort
   */
  async getCohortRetentionCurve(cohort) {
    const userIds = cohort.users.map(u => u.id);
    const cohortStart = new Date(Math.min(...cohort.users.map(u => new Date(u.created_at))));

    // Define retention periods (in days)
    const periods = [1, 7, 14, 30, 60, 90, 180, 365];
    const retention = {};

    for (const period of periods) {
      const periodDate = new Date(cohortStart);
      periodDate.setDate(periodDate.getDate() + period);

      // Count users active on that day
      const { data: activeUsers } = await supabase
        .from('user_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('timestamp', periodDate.toISOString())
        .lte('timestamp', new Date(periodDate.getTime() + 24 * 60 * 60 * 1000).toISOString());

      const uniqueActiveUsers = [...new Set(activeUsers?.map(a => a.user_id) || [])];
      retention[`day${period}`] = (uniqueActiveUsers.length / cohort.users.length) * 100;
    }

    return retention;
  }

  /**
   * Get success metrics for cohort
   */
  async getCohortSuccessMetrics(cohort) {
    const userIds = cohort.users.map(u => u.id);

    // Get progress data
    const { data: progress } = await supabase
      .from('user_progress')
      .select('clean_days, current_streak')
      .in('user_id', userIds);

    // Calculate averages
    const avgCleanDays = progress.reduce((sum, p) => sum + p.clean_days, 0) / (progress.length || 1);
    const avgStreak = progress.reduce((sum, p) => sum + p.current_streak, 0) / (progress.length || 1);

    // Milestone achievement rates
    const milestones = {
      day30: progress.filter(p => p.clean_days >= 30).length / cohort.users.length * 100,
      day90: progress.filter(p => p.clean_days >= 90).length / cohort.users.length * 100,
      day180: progress.filter(p => p.clean_days >= 180).length / cohort.users.length * 100,
      day365: progress.filter(p => p.clean_days >= 365).length / cohort.users.length * 100
    };

    // Intervention success rate
    const { data: interventions } = await supabase
      .from('transactions')
      .select('intervention_completed')
      .in('user_id', userIds)
      .eq('is_whitelisted', false);

    const interventionSuccessRate = interventions.length > 0
      ? interventions.filter(i => i.intervention_completed).length / interventions.length * 100
      : 0;

    return {
      averageCleanDays: avgCleanDays,
      averageCurrentStreak: avgStreak,
      milestoneAchievement: milestones,
      interventionSuccessRate,
      usersAtRisk: progress.filter(p => p.current_streak < 3).length
    };
  }

  /**
   * Get financial metrics for cohort
   */
  async getCohortFinancialMetrics(cohort) {
    const userIds = cohort.users.map(u => u.id);

    // Get vault data
    const { data: vaults } = await supabase
      .from('commitment_vaults')
      .select('amount, status')
      .in('user_id', userIds);

    const totalLocked = vaults
      .filter(v => v.status === 'locked')
      .reduce((sum, v) => sum + parseFloat(v.amount), 0);

    const avgVaultSize = vaults.length > 0 ? totalLocked / vaults.length : 0;

    // Calculate estimated savings
    const { data: progress } = await supabase
      .from('user_progress')
      .select('clean_days, user_id')
      .in('user_id', userIds);

    const estimatedSavings = progress.reduce((sum, p) => {
      const userVault = vaults.find(v => v.user_id === p.user_id);
      if (userVault) {
        const dailyGambling = parseFloat(userVault.amount) / 7;
        return sum + (p.clean_days * dailyGambling);
      }
      return sum;
    }, 0);

    return {
      totalVaultLocked: totalLocked,
      averageVaultSize: avgVaultSize,
      estimatedSavings,
      averageSavingsPerUser: estimatedSavings / cohort.users.length,
      vaultAttachmentRate: vaults.length / cohort.users.length * 100
    };
  }

  /**
   * Get engagement metrics for cohort
   */
  async getCohortEngagementMetrics(cohort) {
    const userIds = cohort.users.map(u => u.id);

    // Guardian attachment rate
    const withGuardian = cohort.users.filter(u => u.has_guardian).length;
    const guardianRate = (withGuardian / cohort.users.length) * 100;

    // Average interventions per user
    const { data: interventions } = await supabase
      .from('transactions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_whitelisted', false);

    const avgInterventions = interventions.length / cohort.users.length;

    // Voice memo completion
    const { data: transactions } = await supabase
      .from('transactions')
      .select('voice_memo_url')
      .in('user_id', userIds)
      .eq('is_whitelisted', false);

    const voiceMemoRate = transactions.length > 0
      ? transactions.filter(t => t.voice_memo_url).length / transactions.length * 100
      : 0;

    // App opens (would come from activity tracking)
    const avgAppOpensPerWeek = 12.5; // Placeholder

    return {
      guardianAttachmentRate: guardianRate,
      averageInterventionsPerUser: avgInterventions,
      voiceMemoCompletionRate: voiceMemoRate,
      averageAppOpensPerWeek: avgAppOpensPerWeek
    };
  }

  /**
   * Compare cohorts
   */
  async compareCohorts(cohortIds, dimension) {
    const comparisons = [];

    for (const cohortId of cohortIds) {
      const cohort = await this.getCohortById(cohortId, dimension);
      const analysis = await this.analyzeCohort(cohort, dimension);
      comparisons.push(analysis);
    }

    return {
      cohorts: comparisons,
      comparison: this.generateComparison(comparisons),
      winner: this.identifyBestCohort(comparisons)
    };
  }

  /**
   * Cohort trend analysis
   */
  async analyzeTrends(dimension, months = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const cohorts = await this.getCohortsByDimension(dimension, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const analyses = [];
    for (const cohort of cohorts) {
      const analysis = await this.analyzeCohort(cohort, dimension);
      analyses.push(analysis);
    }

    // Sort by cohort start date
    analyses.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return {
      dimension,
      period: `${months} months`,
      cohorts: analyses,
      trends: this.calculateTrends(analyses)
    };
  }

  /**
   * Risk cohort analysis
   */
  async analyzeRiskCohorts() {
    const riskLevels = ['low', 'medium', 'high'];
    const analysis = [];

    for (const risk of riskLevels) {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('risk_level', risk);

      if (users.length > 0) {
        const cohort = {
          cohortId: risk,
          dimension: COHORT_DIMENSIONS.RISK_LEVEL,
          users
        };

        const cohortAnalysis = await this.analyzeCohort(cohort, COHORT_DIMENSIONS.RISK_LEVEL);
        analysis.push(cohortAnalysis);
      }
    }

    return {
      riskCohorts: analysis,
      insights: this.generateRiskInsights(analysis)
    };
  }

  /**
   * Geographic cohort analysis
   */
  async analyzeGeographicCohorts() {
    const { data: users } = await supabase
      .from('users')
      .select('*');

    const cohorts = this.groupByDimension(users, COHORT_DIMENSIONS.GEOGRAPHY);
    const analysis = [];

    for (const cohort of cohorts) {
      const cohortAnalysis = await this.analyzeCohort(cohort, COHORT_DIMENSIONS.GEOGRAPHY);
      analysis.push(cohortAnalysis);
    }

    // Sort by size
    analysis.sort((a, b) => b.size - a.size);

    return {
      geographicCohorts: analysis,
      topLocations: analysis.slice(0, 10),
      insights: this.generateGeographicInsights(analysis)
    };
  }

  /**
   * Channel cohort analysis
   */
  async analyzeChannelCohorts() {
    const { data: users } = await supabase
      .from('users')
      .select('*');

    const cohorts = this.groupByDimension(users, COHORT_DIMENSIONS.CHANNEL);
    const analysis = [];

    for (const cohort of cohorts) {
      const cohortAnalysis = await this.analyzeCohort(cohort, COHORT_DIMENSIONS.CHANNEL);

      // Add CAC data if available
      cohortAnalysis.costPerAcquisition = await this.getCohortCAC(cohort);
      cohortAnalysis.roi = this.calculateCohortROI(cohortAnalysis);

      analysis.push(cohortAnalysis);
    }

    // Sort by ROI
    analysis.sort((a, b) => b.roi - a.roi);

    return {
      channelCohorts: analysis,
      bestChannels: analysis.slice(0, 5),
      insights: this.generateChannelInsights(analysis)
    };
  }

  /**
   * Helper: Summarize cohorts
   */
  summarizeCohorts(analyses) {
    const totalUsers = analyses.reduce((sum, a) => sum + a.size, 0);
    const avgRetentionDay30 = analyses.reduce((sum, a) => sum + (a.retention.day30 || 0), 0) / analyses.length;
    const avgCleanDays = analyses.reduce((sum, a) => sum + a.success.averageCleanDays, 0) / analyses.length;

    return {
      totalCohorts: analyses.length,
      totalUsers,
      averageRetentionDay30: avgRetentionDay30,
      averageCleanDays: avgCleanDays,
      strongestCohort: this.identifyBestCohort(analyses),
      weakestCohort: this.identifyWeakestCohort(analyses)
    };
  }

  /**
   * Helper: Generate insights
   */
  generateInsights(analyses) {
    const insights = [];

    // Identify trends
    const retentionTrend = this.analyzeRetentionTrend(analyses);
    if (retentionTrend.direction === 'up') {
      insights.push({
        type: 'positive',
        message: `Retention is improving: ${retentionTrend.change.toFixed(1)}% increase`
      });
    }

    // Identify outliers
    const avgCleanDays = analyses.reduce((sum, a) => sum + a.success.averageCleanDays, 0) / analyses.length;
    const outliers = analyses.filter(a => a.success.averageCleanDays > avgCleanDays * 1.5);

    if (outliers.length > 0) {
      insights.push({
        type: 'insight',
        message: `${outliers.length} cohort(s) performing significantly above average`
      });
    }

    return insights;
  }

  /**
   * Helper: Generate comparison
   */
  generateComparison(analyses) {
    return {
      retention: analyses.map(a => ({
        cohortId: a.cohortId,
        day30: a.retention.day30
      })),
      success: analyses.map(a => ({
        cohortId: a.cohortId,
        cleanDays: a.success.averageCleanDays
      })),
      financial: analyses.map(a => ({
        cohortId: a.cohortId,
        savings: a.financial.averageSavingsPerUser
      }))
    };
  }

  /**
   * Helper: Identify best cohort
   */
  identifyBestCohort(analyses) {
    // Composite score based on retention, success, and engagement
    let best = null;
    let bestScore = 0;

    for (const analysis of analyses) {
      const score =
        (analysis.retention.day30 || 0) * 0.4 +
        (analysis.success.averageCleanDays / 365 * 100) * 0.4 +
        (analysis.engagement.guardianAttachmentRate || 0) * 0.2;

      if (score > bestScore) {
        bestScore = score;
        best = analysis.cohortId;
      }
    }

    return best;
  }

  /**
   * Helper: Identify weakest cohort
   */
  identifyWeakestCohort(analyses) {
    let worst = null;
    let worstScore = Infinity;

    for (const analysis of analyses) {
      const score =
        (analysis.retention.day30 || 0) * 0.4 +
        (analysis.success.averageCleanDays / 365 * 100) * 0.4 +
        (analysis.engagement.guardianAttachmentRate || 0) * 0.2;

      if (score < worstScore) {
        worstScore = score;
        worst = analysis.cohortId;
      }
    }

    return worst;
  }

  /**
   * Helper: Calculate trends
   */
  calculateTrends(analyses) {
    // Compare first half to second half
    const midpoint = Math.floor(analyses.length / 2);
    const firstHalf = analyses.slice(0, midpoint);
    const secondHalf = analyses.slice(midpoint);

    const avgRetentionFirst = firstHalf.reduce((sum, a) => sum + (a.retention.day30 || 0), 0) / firstHalf.length;
    const avgRetentionSecond = secondHalf.reduce((sum, a) => sum + (a.retention.day30 || 0), 0) / secondHalf.length;

    return {
      retentionTrend: avgRetentionSecond > avgRetentionFirst ? 'improving' : 'declining',
      retentionChange: avgRetentionSecond - avgRetentionFirst
    };
  }

  /**
   * Helper methods
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  getCohortStartDate(cohort) {
    if (cohort.users.length === 0) return null;
    return new Date(Math.min(...cohort.users.map(u => new Date(u.created_at)))).toISOString();
  }

  getCohortAge(cohort) {
    const start = new Date(this.getCohortStartDate(cohort));
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24)); // days
  }

  async getCohortById(cohortId, dimension) {
    // Placeholder - would fetch specific cohort
    return { cohortId, dimension, users: [] };
  }

  analyzeRetentionTrend(analyses) {
    if (analyses.length < 2) return { direction: 'stable', change: 0 };

    const first = analyses[0].retention.day30 || 0;
    const last = analyses[analyses.length - 1].retention.day30 || 0;

    return {
      direction: last > first ? 'up' : 'down',
      change: last - first
    };
  }

  generateRiskInsights(analyses) {
    return [
      { type: 'info', message: 'Risk cohort analysis complete' }
    ];
  }

  generateGeographicInsights(analyses) {
    return [
      { type: 'info', message: 'Geographic analysis complete' }
    ];
  }

  generateChannelInsights(analyses) {
    return [
      { type: 'info', message: 'Channel analysis complete' }
    ];
  }

  async getCohortCAC(cohort) {
    // Placeholder
    return 25.00;
  }

  calculateCohortROI(analysis) {
    // Placeholder
    return 2.5;
  }
}

// Export singleton
const cohortAnalyzer = new CohortAnalyzer();

module.exports = {
  cohortAnalyzer,
  CohortAnalyzer,
  COHORT_DIMENSIONS
};
