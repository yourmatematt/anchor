/**
 * Anomaly Detector Service
 *
 * Detects unusual behaviors and transactions that deviate from user's normal patterns:
 * - Out-of-pattern transactions
 * - Unusual amounts
 * - Unexpected times/locations
 * - Behavioral changes
 * - Suspicious sequences
 *
 * Uses statistical methods and ML to identify anomalies that may indicate:
 * - New gambling patterns
 * - Escalating behavior
 * - Account compromise
 * - Life changes affecting risk
 */

class AnomalyDetector {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;

    // Anomaly thresholds
    this.thresholds = {
      amountZScore: 3.0,        // 3 standard deviations
      frequencyZScore: 2.5,     // 2.5 standard deviations
      timeDeviation: 4,         // 4 hours from normal
      sequenceAnomaly: 0.7,     // 70% confidence
      behaviorChange: 0.6       // 60% change threshold
    };

    // Anomaly types
    this.anomalyTypes = {
      AMOUNT: 'unusual_amount',
      FREQUENCY: 'unusual_frequency',
      TIME: 'unusual_time',
      MERCHANT: 'unusual_merchant',
      SEQUENCE: 'unusual_sequence',
      BEHAVIOR_CHANGE: 'behavior_change',
      ESCALATION: 'escalation',
      NEW_PATTERN: 'new_pattern'
    };
  }

  /**
   * Detect anomalies in transaction
   */
  async detectAnomaly(transaction, userId) {
    try {
      // Get user's baseline behavior
      const baseline = await this._getBaseline(userId);

      if (!baseline || baseline.transactionCount < 20) {
        // Not enough data for anomaly detection
        return {
          isAnomaly: false,
          reason: 'insufficient_data',
          confidence: 0
        };
      }

      // Run anomaly checks
      const anomalies = [];

      // 1. Amount anomaly
      const amountAnomaly = this._detectAmountAnomaly(transaction, baseline);
      if (amountAnomaly.isAnomaly) {
        anomalies.push(amountAnomaly);
      }

      // 2. Frequency anomaly
      const frequencyAnomaly = await this._detectFrequencyAnomaly(transaction, userId, baseline);
      if (frequencyAnomaly.isAnomaly) {
        anomalies.push(frequencyAnomaly);
      }

      // 3. Time anomaly
      const timeAnomaly = this._detectTimeAnomaly(transaction, baseline);
      if (timeAnomaly.isAnomaly) {
        anomalies.push(timeAnomaly);
      }

      // 4. Merchant anomaly
      const merchantAnomaly = await this._detectMerchantAnomaly(transaction, userId);
      if (merchantAnomaly.isAnomaly) {
        anomalies.push(merchantAnomaly);
      }

      // 5. Sequence anomaly
      const sequenceAnomaly = await this._detectSequenceAnomaly(transaction, userId);
      if (sequenceAnomaly.isAnomaly) {
        anomalies.push(sequenceAnomaly);
      }

      // 6. Behavior change detection
      const behaviorChange = await this._detectBehaviorChange(transaction, userId, baseline);
      if (behaviorChange.isAnomaly) {
        anomalies.push(behaviorChange);
      }

      // Aggregate results
      const isAnomaly = anomalies.length > 0;
      const severity = this._calculateSeverity(anomalies);
      const confidence = this._calculateConfidence(anomalies);

      if (isAnomaly) {
        // Log anomaly
        await this._logAnomaly(userId, transaction.id, {
          anomalies,
          severity,
          confidence
        });
      }

      return {
        isAnomaly,
        severity,
        confidence,
        anomalies,
        recommendations: this._getAnomalyRecommendations(anomalies, severity)
      };
    } catch (error) {
      console.error('Error detecting anomaly:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  /**
   * Detect amount anomaly
   */
  _detectAmountAnomaly(transaction, baseline) {
    const amount = Math.abs(transaction.amount.value);

    // Calculate z-score
    const zScore = (amount - baseline.averageAmount) / baseline.stdDevAmount;

    const isAnomaly = Math.abs(zScore) > this.thresholds.amountZScore;

    return {
      type: this.anomalyTypes.AMOUNT,
      isAnomaly,
      severity: this._getAmountSeverity(Math.abs(zScore)),
      details: {
        amount,
        average: baseline.averageAmount,
        stdDev: baseline.stdDevAmount,
        zScore: zScore.toFixed(2),
        percentile: this._calculatePercentile(amount, baseline.allAmounts)
      },
      message: isAnomaly ?
        `Transaction amount ($${amount}) is ${Math.abs(zScore).toFixed(1)} standard deviations from average` :
        null
    };
  }

  /**
   * Detect frequency anomaly
   */
  async _detectFrequencyAnomaly(transaction, userId, baseline) {
    // Get transactions in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { count } = await this.supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo.toISOString());

    const dailyCount = count || 0;

    // Calculate z-score for frequency
    const zScore = (dailyCount - baseline.averageDaily) / baseline.stdDevDaily;

    const isAnomaly = zScore > this.thresholds.frequencyZScore;

    return {
      type: this.anomalyTypes.FREQUENCY,
      isAnomaly,
      severity: isAnomaly ? 'high' : 'low',
      details: {
        transactionsToday: dailyCount,
        averageDaily: baseline.averageDaily,
        zScore: zScore.toFixed(2)
      },
      message: isAnomaly ?
        `Unusual transaction frequency: ${dailyCount} transactions (average: ${baseline.averageDaily})` :
        null
    };
  }

  /**
   * Detect time anomaly
   */
  _detectTimeAnomaly(transaction, baseline) {
    const hour = new Date(transaction.createdAt).getHours();

    // Check if time is outside normal hours
    const normalHours = baseline.commonHours || [];

    if (normalHours.length === 0) {
      return { type: this.anomalyTypes.TIME, isAnomaly: false };
    }

    // Check if current hour is within 2 hours of normal hours
    const isNormalTime = normalHours.some(normalHour =>
      Math.abs(hour - normalHour) <= 2 || Math.abs(hour - normalHour) >= 22 // Account for wrap-around
    );

    const isAnomaly = !isNormalTime;

    return {
      type: this.anomalyTypes.TIME,
      isAnomaly,
      severity: isAnomaly ? 'medium' : 'low',
      details: {
        currentHour: hour,
        normalHours,
        deviation: isNormalTime ? 0 : this._calculateMinHourDeviation(hour, normalHours)
      },
      message: isAnomaly ?
        `Transaction at unusual time (${hour}:00). Normal times: ${normalHours.map(h => h + ':00').join(', ')}` :
        null
    };
  }

  /**
   * Detect merchant anomaly
   */
  async _detectMerchantAnomaly(transaction, userId) {
    const merchantName = transaction.merchant?.name || transaction.description;

    // Check if new merchant
    const { count } = await this.supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('description', `%${merchantName}%`);

    const isNewMerchant = count === 0;

    // Check if merchant category is unusual
    const merchantCategory = this._categorizeMerchant(merchantName);
    const isGamblingRelated = merchantCategory === 'gambling' || merchantCategory === 'unknown_high_risk';

    const isAnomaly = isNewMerchant && isGamblingRelated;

    return {
      type: this.anomalyTypes.MERCHANT,
      isAnomaly,
      severity: isAnomaly ? 'critical' : 'low',
      details: {
        merchantName,
        category: merchantCategory,
        isNew: isNewMerchant,
        isGamblingRelated
      },
      message: isAnomaly ?
        `New gambling-related merchant detected: ${merchantName}` :
        null
    };
  }

  /**
   * Detect sequence anomaly
   */
  async _detectSequenceAnomaly(transaction, userId) {
    // Get last 5 transactions
    const { data: recentTxns } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentTxns || recentTxns.length < 3) {
      return { type: this.anomalyTypes.SEQUENCE, isAnomaly: false };
    }

    // Check for suspicious sequences
    const anomalies = [];

    // Pattern 1: Rapid ATM + Gambling
    const hasRecentATM = recentTxns.some(t =>
      t.description.toLowerCase().includes('atm') &&
      (new Date(transaction.createdAt) - new Date(t.created_at)) < 30 * 60 * 1000 // 30 mins
    );

    const isGambling = this._categorizeMerchant(transaction.description) === 'gambling';

    if (hasRecentATM && isGambling) {
      anomalies.push('atm_before_gambling');
    }

    // Pattern 2: Escalating amounts
    const amounts = recentTxns.map(t => Math.abs(t.amount?.value || 0));
    const isEscalating = this._isEscalating(amounts);

    if (isEscalating) {
      anomalies.push('amount_escalation');
    }

    // Pattern 3: Burst activity
    const last30Mins = recentTxns.filter(t =>
      (new Date(transaction.createdAt) - new Date(t.created_at)) < 30 * 60 * 1000
    );

    if (last30Mins.length >= 4) {
      anomalies.push('transaction_burst');
    }

    const isAnomaly = anomalies.length > 0;

    return {
      type: this.anomalyTypes.SEQUENCE,
      isAnomaly,
      severity: isAnomaly ? 'high' : 'low',
      details: {
        patterns: anomalies,
        recentCount: recentTxns.length
      },
      message: isAnomaly ?
        `Suspicious transaction sequence: ${anomalies.join(', ')}` :
        null
    };
  }

  /**
   * Detect behavior change
   */
  async _detectBehaviorChange(transaction, userId, baseline) {
    // Get recent behavior (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentTxns } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!recentTxns || recentTxns.length < 10) {
      return { type: this.anomalyTypes.BEHAVIOR_CHANGE, isAnomaly: false };
    }

    // Calculate recent statistics
    const recentAmounts = recentTxns.map(t => Math.abs(t.amount?.value || 0));
    const recentAverage = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;

    // Compare to baseline
    const changePercent = Math.abs((recentAverage - baseline.averageAmount) / baseline.averageAmount);

    const isAnomaly = changePercent > this.thresholds.behaviorChange;

    return {
      type: this.anomalyTypes.BEHAVIOR_CHANGE,
      isAnomaly,
      severity: isAnomaly ? 'high' : 'low',
      details: {
        baselineAverage: baseline.averageAmount,
        recentAverage,
        changePercent: (changePercent * 100).toFixed(1) + '%',
        trend: recentAverage > baseline.averageAmount ? 'increasing' : 'decreasing'
      },
      message: isAnomaly ?
        `Significant behavior change detected: ${(changePercent * 100).toFixed(0)}% change in spending` :
        null
    };
  }

  /**
   * Get user baseline behavior
   */
  async _getBaseline(userId) {
    try {
      // Get last 90 days of transactions
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (!transactions || transactions.length < 20) {
        return null;
      }

      // Calculate statistics
      const amounts = transactions.map(t => Math.abs(t.amount?.value || 0));
      const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDevAmount = this._calculateStdDev(amounts);

      // Daily transaction count
      const dayGroups = {};
      transactions.forEach(t => {
        const day = new Date(t.created_at).toDateString();
        dayGroups[day] = (dayGroups[day] || 0) + 1;
      });

      const dailyCounts = Object.values(dayGroups);
      const averageDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
      const stdDevDaily = this._calculateStdDev(dailyCounts);

      // Common transaction hours
      const hourCounts = new Array(24).fill(0);
      transactions.forEach(t => {
        const hour = new Date(t.created_at).getHours();
        hourCounts[hour]++;
      });

      const commonHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(h => h.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(h => h.hour);

      return {
        userId,
        transactionCount: transactions.length,
        averageAmount,
        stdDevAmount,
        allAmounts: amounts,
        averageDaily,
        stdDevDaily,
        commonHours,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting baseline:', error);
      return null;
    }
  }

  /**
   * Calculate anomaly severity
   */
  _calculateSeverity(anomalies) {
    if (anomalies.length === 0) return 'none';

    const severityScores = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      none: 0
    };

    const maxSeverity = Math.max(...anomalies.map(a => severityScores[a.severity] || 0));

    if (maxSeverity >= 4) return 'critical';
    if (maxSeverity >= 3) return 'high';
    if (maxSeverity >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate anomaly confidence
   */
  _calculateConfidence(anomalies) {
    if (anomalies.length === 0) return 0;

    // More anomalies = higher confidence
    const baseConfidence = Math.min(anomalies.length * 0.2, 0.8);

    // Boost confidence if critical anomalies detected
    const hasCritical = anomalies.some(a => a.severity === 'critical');
    const boost = hasCritical ? 0.2 : 0;

    return Math.min(baseConfidence + boost, 1.0);
  }

  /**
   * Get recommendations for detected anomalies
   */
  _getAnomalyRecommendations(anomalies, severity) {
    const recommendations = [];

    if (severity === 'critical') {
      recommendations.push({
        priority: 'critical',
        action: 'immediate_intervention',
        message: 'Critical anomaly detected. Immediate AI intervention required.'
      });
      recommendations.push({
        priority: 'critical',
        action: 'notify_guardian',
        message: 'Alert guardian immediately.'
      });
    } else if (severity === 'high') {
      recommendations.push({
        priority: 'high',
        action: 'flag_transaction',
        message: 'Flag transaction for review.'
      });
      recommendations.push({
        priority: 'high',
        action: 'notify_guardian',
        message: 'Notify guardian of unusual activity.'
      });
    } else if (severity === 'medium') {
      recommendations.push({
        priority: 'medium',
        action: 'monitor_closely',
        message: 'Monitor user behavior closely for next 24 hours.'
      });
    }

    // Specific recommendations based on anomaly types
    const types = anomalies.map(a => a.type);

    if (types.includes(this.anomalyTypes.MERCHANT)) {
      recommendations.push({
        priority: 'high',
        action: 'verify_merchant',
        message: 'Verify new merchant is legitimate, not gambling.'
      });
    }

    if (types.includes(this.anomalyTypes.SEQUENCE)) {
      recommendations.push({
        priority: 'high',
        action: 'check_sequence',
        message: 'Suspicious transaction sequence. Possible loss chasing.'
      });
    }

    if (types.includes(this.anomalyTypes.BEHAVIOR_CHANGE)) {
      recommendations.push({
        priority: 'medium',
        action: 'assess_life_changes',
        message: 'Behavior change detected. Check for life events or stress triggers.'
      });
    }

    return recommendations;
  }

  /**
   * Log anomaly to database
   */
  async _logAnomaly(userId, transactionId, anomalyData) {
    try {
      await this.supabase
        .from('anomaly_log')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          severity: anomalyData.severity,
          confidence: anomalyData.confidence,
          anomalies: anomalyData.anomalies,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging anomaly:', error);
    }
  }

  /**
   * Helper: Calculate standard deviation
   */
  _calculateStdDev(values) {
    if (values.length === 0) return 0;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Helper: Calculate percentile
   */
  _calculatePercentile(value, array) {
    if (array.length === 0) return 50;

    const sorted = [...array].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);

    return ((index + 1) / sorted.length) * 100;
  }

  /**
   * Helper: Get amount severity
   */
  _getAmountSeverity(zScore) {
    if (zScore > 5) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2) return 'medium';
    return 'low';
  }

  /**
   * Helper: Calculate minimum hour deviation
   */
  _calculateMinHourDeviation(hour, normalHours) {
    const deviations = normalHours.map(normalHour => {
      const diff = Math.abs(hour - normalHour);
      return Math.min(diff, 24 - diff); // Account for wrap-around
    });

    return Math.min(...deviations);
  }

  /**
   * Helper: Categorize merchant
   */
  _categorizeMerchant(merchantName) {
    const name = merchantName.toLowerCase();

    if (name.includes('bet') || name.includes('casino') || name.includes('poker')) {
      return 'gambling';
    }
    if (name.includes('atm')) return 'atm';
    if (name.includes('bar') || name.includes('pub')) return 'drinking';

    return 'other';
  }

  /**
   * Helper: Check if amounts are escalating
   */
  _isEscalating(amounts) {
    if (amounts.length < 3) return false;

    let increasingCount = 0;
    for (let i = 1; i < amounts.length; i++) {
      if (amounts[i] > amounts[i - 1]) {
        increasingCount++;
      }
    }

    return increasingCount >= amounts.length - 1;
  }
}

module.exports = AnomalyDetector;
