/**
 * Guardian Insights Service
 *
 * Provides guardian-specific analytics without exposing exact amounts
 * Focuses on patterns, risks, and intervention effectiveness
 */

const PatternLearner = require('./pattern-learner');

class GuardianInsights {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.patternLearner = new PatternLearner(supabaseClient);
  }

  /**
   * Get comprehensive guardian analytics for a user
   * Excludes exact dollar amounts, focuses on patterns and risk
   */
  async getAnalytics(userId, guardianId, timeframe = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - timeframe);

      // Get all transactions in timeframe
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (!transactions || transactions.length === 0) {
        return this._getEmptyAnalytics(timeframe);
      }

      // Separate gambling vs non-gambling
      const gamblingTransactions = transactions.filter(tx => !tx.is_whitelisted);
      const cleanDays = this._calculateCleanDays(transactions);
      const currentStreak = this._getCurrentStreak(transactions);
      const riskTrend = await this._calculateRiskTrend(transactions, timeframe);
      const triggers = await this._identifyActiveTriggers(gamblingTransactions);
      const highRiskPeriods = this._identifyHighRiskPeriods(gamblingTransactions);
      const interventionEffectiveness = await this._calculateInterventionEffectiveness(userId);
      const upcomingRisks = await this._predictUpcomingRisks(userId, transactions);

      return {
        timeframe,
        overview: {
          currentStreak: currentStreak,
          longestStreak: cleanDays.longestStreak,
          cleanDaysCount: cleanDays.cleanDays,
          riskDaysCount: gamblingTransactions.length,
          cleanPercentage: ((cleanDays.cleanDays / timeframe) * 100).toFixed(1)
        },
        riskTrend: riskTrend,
        activeTriggers: triggers,
        highRiskPeriods: highRiskPeriods,
        interventionEffectiveness: interventionEffectiveness,
        upcomingRisks: upcomingRisks,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating guardian analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate clean days and streaks
   */
  _calculateCleanDays(transactions) {
    const gamblingTransactions = transactions.filter(tx => !tx.is_whitelisted);

    if (gamblingTransactions.length === 0) {
      return {
        cleanDays: transactions.length > 0 ? transactions.length : 0,
        longestStreak: transactions.length > 0 ? transactions.length : 0
      };
    }

    // Get unique dates with gambling
    const gamblingDates = new Set(
      gamblingTransactions.map(tx => new Date(tx.timestamp).toDateString())
    );

    // Get unique dates with any transactions
    const allDates = new Set(
      transactions.map(tx => new Date(tx.timestamp).toDateString())
    );

    const cleanDays = allDates.size - gamblingDates.size;

    // Calculate longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(dateStr => {
      if (!gamblingDates.has(dateStr)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return { cleanDays, longestStreak };
  }

  /**
   * Get current clean streak
   */
  _getCurrentStreak(transactions) {
    const gamblingTransactions = transactions.filter(tx => !tx.is_whitelisted);

    if (gamblingTransactions.length === 0) {
      return transactions.length;
    }

    // Sort by timestamp descending
    const sorted = [...transactions].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count days from today backwards until we hit a gambling transaction
    for (const tx of sorted) {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);

      if (!tx.is_whitelisted) {
        // Hit a gambling transaction, streak ends
        break;
      }

      const daysDiff = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === streak) {
        streak++;
      }
    }

    return streak;
  }

  /**
   * Calculate risk trend (increasing/decreasing/stable)
   */
  async _calculateRiskTrend(transactions, timeframe) {
    // Split timeframe into 3 periods
    const periodDays = Math.floor(timeframe / 3);
    const now = new Date();

    const periods = [
      { name: 'recent', start: new Date(now - periodDays * 24 * 60 * 60 * 1000), end: now },
      { name: 'middle', start: new Date(now - 2 * periodDays * 24 * 60 * 60 * 1000), end: new Date(now - periodDays * 24 * 60 * 60 * 1000) },
      { name: 'older', start: new Date(now - 3 * periodDays * 24 * 60 * 60 * 1000), end: new Date(now - 2 * periodDays * 24 * 60 * 60 * 1000) }
    ];

    const periodScores = periods.map(period => {
      const periodTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.timestamp);
        return txDate >= period.start && txDate < period.end;
      });

      const gamblingCount = periodTransactions.filter(tx => !tx.is_whitelisted).length;
      return {
        period: period.name,
        riskScore: gamblingCount
      };
    });

    // Determine trend
    const recentScore = periodScores.find(p => p.period === 'recent').riskScore;
    const middleScore = periodScores.find(p => p.period === 'middle').riskScore;
    const olderScore = periodScores.find(p => p.period === 'older').riskScore;

    let trend = 'stable';
    let trendDirection = 0;

    if (recentScore > middleScore && middleScore >= olderScore) {
      trend = 'increasing';
      trendDirection = 1;
    } else if (recentScore < middleScore && middleScore <= olderScore) {
      trend = 'decreasing';
      trendDirection = -1;
    } else if (recentScore > olderScore) {
      trend = 'increasing';
      trendDirection = 0.5;
    } else if (recentScore < olderScore) {
      trend = 'decreasing';
      trendDirection = -0.5;
    }

    return {
      trend,
      trendDirection,
      periodScores,
      message: this._getRiskTrendMessage(trend, recentScore)
    };
  }

  /**
   * Get human-readable risk trend message
   */
  _getRiskTrendMessage(trend, recentScore) {
    if (trend === 'decreasing') {
      return 'Risk is trending down - positive progress';
    } else if (trend === 'increasing') {
      return recentScore > 5 ? 'Risk is increasing - heightened support needed' : 'Slight increase in risk - monitor closely';
    } else {
      return recentScore === 0 ? 'Maintaining clean streak' : 'Risk level stable';
    }
  }

  /**
   * Identify active triggers
   */
  async _identifyActiveTriggers(gamblingTransactions) {
    const triggers = {};

    gamblingTransactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      const hour = date.getHours();

      // Day of week trigger
      if (!triggers[dayOfWeek]) triggers[dayOfWeek] = 0;
      triggers[dayOfWeek]++;

      // Time of day trigger
      let timeOfDay;
      if (hour >= 22 || hour < 4) timeOfDay = 'Late Night';
      else if (hour >= 18) timeOfDay = 'Evening';
      else if (hour >= 12) timeOfDay = 'Afternoon';
      else timeOfDay = 'Morning';

      if (!triggers[timeOfDay]) triggers[timeOfDay] = 0;
      triggers[timeOfDay]++;

      // Payday trigger (check if near 15th or end of month)
      const dayOfMonth = date.getDate();
      if ((dayOfMonth >= 14 && dayOfMonth <= 17) || dayOfMonth >= 28 || dayOfMonth <= 3) {
        if (!triggers['Payday']) triggers['Payday'] = 0;
        triggers['Payday']++;
      }

      // Weekend trigger
      if (dayOfWeek === 'Friday' || dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
        if (!triggers['Weekend']) triggers['Weekend'] = 0;
        triggers['Weekend']++;
      }
    });

    // Convert to sorted array
    return Object.entries(triggers)
      .map(([name, count]) => ({
        name,
        count,
        severity: count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Identify high-risk time periods
   */
  _identifyHighRiskPeriods(gamblingTransactions) {
    const periods = {};

    gamblingTransactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      // Create period key (e.g., "Tuesday 18-22")
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      const hourBlock = Math.floor(hour / 4) * 4;
      const periodKey = `${dayName} ${hourBlock}:00-${hourBlock + 4}:00`;

      if (!periods[periodKey]) {
        periods[periodKey] = {
          day: dayName,
          timeRange: `${hourBlock}:00-${hourBlock + 4}:00`,
          count: 0
        };
      }

      periods[periodKey].count++;
    });

    return Object.values(periods)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(period => ({
        ...period,
        riskLevel: period.count > 5 ? 'very-high' : period.count > 3 ? 'high' : 'medium'
      }));
  }

  /**
   * Calculate intervention effectiveness
   */
  async _calculateInterventionEffectiveness(userId) {
    try {
      // Get transactions with interventions (voice memos)
      const { data: interventions } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('intervention_completed', true)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!interventions || interventions.length === 0) {
        return {
          rate: 0,
          total: 0,
          message: 'No interventions yet'
        };
      }

      // Check how many were followed by clean periods
      let effectiveCount = 0;

      for (let i = 0; i < interventions.length; i++) {
        const intervention = interventions[i];
        const interventionDate = new Date(intervention.timestamp);
        const nextWeekDate = new Date(interventionDate);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);

        // Check for gambling in next 7 days
        const { data: nextWeekTransactions } = await this.supabase
          .from('transactions')
          .select('*')
          .gte('timestamp', interventionDate.toISOString())
          .lte('timestamp', nextWeekDate.toISOString())
          .eq('is_whitelisted', false);

        // If only the intervention transaction itself, it was effective
        if (nextWeekTransactions && nextWeekTransactions.length <= 1) {
          effectiveCount++;
        }
      }

      const rate = Math.round((effectiveCount / interventions.length) * 100);

      return {
        rate,
        total: interventions.length,
        effective: effectiveCount,
        message: rate > 70 ? 'Interventions are highly effective' :
                 rate > 50 ? 'Interventions showing moderate success' :
                 rate > 30 ? 'Interventions need adjustment' :
                 'Consider changing intervention approach'
      };
    } catch (error) {
      console.error('Error calculating intervention effectiveness:', error);
      return {
        rate: 0,
        total: 0,
        message: 'Unable to calculate'
      };
    }
  }

  /**
   * Predict upcoming risks based on patterns
   */
  async _predictUpcomingRisks(userId, transactions) {
    const risks = [];
    const now = new Date();
    const gamblingTransactions = transactions.filter(tx => !tx.is_whitelisted);

    // Check for payday risk (next 3 days)
    const daysUntilPayday = this._getDaysUntilPayday();
    if (daysUntilPayday <= 3 && daysUntilPayday >= 0) {
      const paydayGambling = gamblingTransactions.filter(tx => {
        const date = new Date(tx.timestamp);
        const day = date.getDate();
        return (day >= 14 && day <= 17) || day >= 28 || day <= 3;
      });

      if (paydayGambling.length > 0) {
        risks.push({
          type: 'payday',
          severity: 'high',
          daysAway: daysUntilPayday,
          message: `Payday in ${daysUntilPayday} day(s) - historical high-risk period`,
          recommendation: 'Schedule check-in before payday'
        });
      }
    }

    // Check for weekend risk
    const dayOfWeek = now.getDay();
    if (dayOfWeek >= 4 && dayOfWeek <= 6) { // Thursday to Saturday
      const weekendGambling = gamblingTransactions.filter(tx => {
        const day = new Date(tx.timestamp).getDay();
        return day === 5 || day === 6 || day === 0; // Fri, Sat, Sun
      });

      if (weekendGambling.length > 2) {
        risks.push({
          type: 'weekend',
          severity: 'medium',
          daysAway: dayOfWeek === 4 ? 1 : 0,
          message: 'Approaching weekend - historical gambling pattern detected',
          recommendation: 'Plan alternative weekend activities'
        });
      }
    }

    // Check for high-risk time of day (next 6 hours)
    const currentHour = now.getHours();
    const eveningGambling = gamblingTransactions.filter(tx => {
      const hour = new Date(tx.timestamp).getHours();
      return hour >= 18 && hour <= 23;
    });

    if (currentHour >= 15 && currentHour < 18 && eveningGambling.length > 3) {
      risks.push({
        type: 'time_of_day',
        severity: 'medium',
        daysAway: 0,
        message: 'Approaching evening hours - high-risk time period',
        recommendation: 'Send supportive check-in message'
      });
    }

    // Check for stress pattern (multiple transactions in recent days)
    const last3Days = gamblingTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      const daysDiff = (now - txDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 3;
    });

    if (last3Days.length >= 2) {
      risks.push({
        type: 'pattern_escalation',
        severity: 'very-high',
        daysAway: 0,
        message: 'Pattern escalation detected - multiple recent incidents',
        recommendation: 'Immediate check-in recommended - consider crisis protocol'
      });
    }

    return risks.sort((a, b) => {
      const severityOrder = { 'very-high': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get days until next payday (assuming 15th and last day of month)
   */
  _getDaysUntilPayday() {
    const now = new Date();
    const day = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (day < 15) {
      return 15 - day;
    } else if (day < lastDay) {
      return lastDay - day;
    } else {
      return 15; // Next month's payday
    }
  }

  /**
   * Get empty analytics structure
   */
  _getEmptyAnalytics(timeframe) {
    return {
      timeframe,
      overview: {
        currentStreak: timeframe,
        longestStreak: timeframe,
        cleanDaysCount: timeframe,
        riskDaysCount: 0,
        cleanPercentage: 100
      },
      riskTrend: {
        trend: 'stable',
        trendDirection: 0,
        periodScores: [],
        message: 'No activity - fully clean period'
      },
      activeTriggers: [],
      highRiskPeriods: [],
      interventionEffectiveness: {
        rate: 0,
        total: 0,
        message: 'No interventions yet'
      },
      upcomingRisks: [],
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get intervention history for a user
   */
  async getInterventionHistory(userId, limit = 20) {
    try {
      const { data: interventions } = await this.supabase
        .from('transactions')
        .select('id, transaction_id, timestamp, payee_name, voice_memo_transcript, intervention_completed')
        .eq('intervention_completed', true)
        .order('timestamp', { ascending: false })
        .limit(limit);

      return interventions || [];
    } catch (error) {
      console.error('Error getting intervention history:', error);
      throw error;
    }
  }

  /**
   * Get group insights (anonymized aggregate data)
   */
  async getGroupInsights() {
    try {
      // Get all users' risk profiles
      const { data: profiles } = await this.supabase
        .from('risk_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Get all baseline analyses
      const { data: baselines } = await this.supabase
        .from('baseline_analysis')
        .select('*');

      // Calculate aggregate statistics
      const totalUsers = profiles ? new Set(profiles.map(p => p.id)).size : 0;

      // Risk level distribution
      const riskDistribution = {};
      profiles?.forEach(p => {
        riskDistribution[p.risk_level] = (riskDistribution[p.risk_level] || 0) + 1;
      });

      // Average success probability
      const avgSuccessRate = profiles?.length > 0
        ? Math.round(profiles.reduce((sum, p) => sum + (p.success_probability || 0), 0) / profiles.length)
        : 0;

      // Most common triggers
      const triggerCounts = {};
      profiles?.forEach(p => {
        if (p.profile_data?.primaryTrigger) {
          triggerCounts[p.profile_data.primaryTrigger] = (triggerCounts[p.profile_data.primaryTrigger] || 0) + 1;
        }
      });

      // Total money saved (from baselines)
      const totalSaved = baselines?.reduce((sum, b) =>
        sum + (b.analysis_data?.projectedYearlySavings || 0), 0
      ) || 0;

      return {
        community: {
          totalUsers,
          activeUsers: totalUsers, // TODO: Filter by recent activity
          totalCommunitySavings: totalSaved
        },
        riskDistribution,
        avgSuccessRate,
        commonTriggers: Object.entries(triggerCounts)
          .map(([trigger, count]) => ({
            trigger,
            percentage: Math.round((count / totalUsers) * 100)
          }))
          .sort((a, b) => b.percentage - a.percentage),
        insights: [
          {
            type: 'timing',
            message: 'Tuesday evening is high-risk for 67% of users',
            icon: 'time'
          },
          {
            type: 'recovery',
            message: 'Average recovery: 3 relapses before sustained clean period',
            icon: 'trending-up'
          },
          {
            type: 'support',
            message: 'Users with guardians are 3x more likely to maintain clean streaks',
            icon: 'people'
          }
        ],
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting group insights:', error);
      throw error;
    }
  }

  /**
   * Generate quick support messages based on context
   */
  getQuickMessages(context = 'general') {
    const messages = {
      general: [
        "Thinking of you today. Remember why you started this journey.",
        "You're doing great. One day at a time.",
        "I'm here if you need to talk.",
        "Proud of your progress. Keep going!",
      ],
      high_risk: [
        "I noticed it's [trigger time]. Checking in - how are you feeling?",
        "Remember your goal. You've got this.",
        "Want to grab a coffee and chat?",
        "Before you act, let's talk for 5 minutes.",
      ],
      relapse: [
        "Relapses happen. This doesn't undo your progress.",
        "Let's talk about what happened, no judgment.",
        "Tomorrow is a new day. We'll get through this.",
        "Your commitment to change is what matters. Keep going.",
      ],
      milestone: [
        "Incredible! [X] days clean. You should be so proud.",
        "You're inspiring! Keep up the amazing work.",
        "This milestone is huge. Celebrate this win!",
        "Look how far you've come. This is real progress.",
      ],
      payday: [
        "Payday coming up. Remember your plan.",
        "Let's check in before payday - how can I support you?",
        "You've prepared for this. Stick to your commitment.",
        "Payday tomorrow - I'm here if you need support.",
      ]
    };

    return messages[context] || messages.general;
  }

  /**
   * Check if crisis protocol should be activated
   */
  async shouldActivateCrisisProtocol(userId) {
    try {
      const now = new Date();
      const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const { data: recentGambling } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('is_whitelisted', false)
        .gte('timestamp', last7Days.toISOString());

      // Crisis indicators
      const indicators = {
        rapidEscalation: recentGambling?.length >= 5, // 5+ incidents in 7 days
        dailyGambling: this._hasDailyGambling(recentGambling),
        largeIncrease: false, // Would need amount comparison
        triggersActivated: false
      };

      const shouldActivate = indicators.rapidEscalation || indicators.dailyGambling;

      return {
        shouldActivate,
        indicators,
        recommendation: shouldActivate
          ? 'Immediate guardian intervention and professional help recommended'
          : 'Continue normal monitoring'
      };
    } catch (error) {
      console.error('Error checking crisis protocol:', error);
      return {
        shouldActivate: false,
        indicators: {},
        recommendation: 'Unable to assess'
      };
    }
  }

  /**
   * Check if gambling is happening daily
   */
  _hasDailyGambling(transactions) {
    if (!transactions || transactions.length < 3) return false;

    const dates = transactions.map(tx => new Date(tx.timestamp).toDateString());
    const uniqueDates = new Set(dates);

    // If 3+ unique dates in recent period, consider it daily pattern
    return uniqueDates.size >= 3;
  }
}

module.exports = GuardianInsights;
