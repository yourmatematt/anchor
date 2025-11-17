/**
 * Pattern Learner Service
 *
 * Machine learning-based pattern detection for gambling behavior
 * Learns user-specific patterns to improve intervention effectiveness
 */

const GAMBLING_KEYWORDS = [
  // Online gambling
  'bet', 'pokies', 'slots', 'casino', 'gambling', 'wager', 'punt',
  'sportsbet', 'ladbrokes', 'tab', 'pointsbet', 'unibet', 'draftkings',
  'betfair', 'beteasy', 'neds', 'palmerbet', 'betdeluxe', 'playup',

  // Specific platforms
  'blubet', 'betr', 'picklebet', 'dabble', 'topsport', 'bluebet',

  // Gaming/poker sites
  'pokerstars', 'partypoker', 'ggpoker', '888poker',

  // Crypto gambling
  'stake.com', 'roobet', 'duelbits', 'rollbit', 'bc.game',

  // Fantasy sports
  'draftkings', 'fanduel', 'moneyball', 'draftstars',

  // Lotto/lottery
  'lotto', 'lottery', 'powerball', 'oz lotto', 'tatts'
];

const VENUE_KEYWORDS = [
  'hotel', 'pub', 'club', 'tavern', 'rsl', 'sports bar',
  'gaming', 'entertainment'
];

const PRE_GAMBLING_PATTERNS = [
  'atm', 'cash withdrawal', 'cash out'
];

class PatternLearner {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Analyze transaction to determine if it's gambling-related
   * Returns confidence score 0-100
   */
  async analyzeTransaction(transaction) {
    const analysis = {
      isGambling: false,
      confidence: 0,
      gamblingType: null, // 'online', 'venue', 'sports', 'lottery'
      patterns: [],
      metadata: {}
    };

    const description = transaction.description?.toLowerCase() || '';
    const payeeName = transaction.payee_name?.toLowerCase() || '';
    const amount = Math.abs(parseFloat(transaction.amount));
    const timestamp = new Date(transaction.timestamp);

    // Direct keyword matching
    const keywordMatch = this._checkKeywords(description, payeeName);
    if (keywordMatch.matched) {
      analysis.isGambling = true;
      analysis.confidence = keywordMatch.confidence;
      analysis.gamblingType = keywordMatch.type;
      analysis.patterns.push('keyword_match');
    }

    // Check historical patterns
    const historicalMatch = await this._checkHistoricalPatterns(
      payeeName,
      amount,
      timestamp
    );
    if (historicalMatch.matched) {
      analysis.isGambling = true;
      analysis.confidence = Math.max(analysis.confidence, historicalMatch.confidence);
      analysis.patterns.push(...historicalMatch.patterns);
    }

    // Check sequence patterns (e.g., ATM before gambling)
    const sequenceMatch = await this._checkSequencePatterns(transaction);
    if (sequenceMatch.matched) {
      analysis.confidence = Math.min(100, analysis.confidence + 15);
      analysis.patterns.push(...sequenceMatch.patterns);
      analysis.metadata.preGamblingActivity = sequenceMatch.preActivity;
    }

    // Check temporal patterns
    const temporalMatch = this._checkTemporalPatterns(timestamp);
    if (temporalMatch.matched) {
      analysis.confidence = Math.min(100, analysis.confidence + 10);
      analysis.patterns.push(...temporalMatch.patterns);
      analysis.metadata.temporalPattern = temporalMatch.pattern;
    }

    return analysis;
  }

  /**
   * Check for direct keyword matches
   */
  _checkKeywords(description, payeeName) {
    const text = `${description} ${payeeName}`;

    // Online gambling platforms (highest confidence)
    for (const keyword of GAMBLING_KEYWORDS) {
      if (text.includes(keyword)) {
        return {
          matched: true,
          confidence: 95,
          type: this._determineGamblingType(keyword)
        };
      }
    }

    // Venue keywords (medium confidence)
    let venueMatches = 0;
    for (const keyword of VENUE_KEYWORDS) {
      if (text.includes(keyword)) {
        venueMatches++;
      }
    }

    if (venueMatches >= 2) {
      return {
        matched: true,
        confidence: 70,
        type: 'venue'
      };
    }

    return { matched: false };
  }

  /**
   * Determine gambling type from keyword
   */
  _determineGamblingType(keyword) {
    if (keyword.includes('sport') || keyword.includes('tab')) return 'sports';
    if (keyword.includes('lotto') || keyword.includes('lottery')) return 'lottery';
    if (keyword.includes('poker') || keyword.includes('casino') || keyword.includes('pokies')) return 'online';
    if (keyword.includes('stake') || keyword.includes('roobet')) return 'crypto';
    return 'online';
  }

  /**
   * Check historical patterns for this merchant
   */
  async _checkHistoricalPatterns(payeeName, amount, timestamp) {
    try {
      // Check if this merchant has been flagged before
      const { data: similarTransactions } = await this.supabase
        .from('transactions')
        .select('*')
        .ilike('payee_name', payeeName)
        .limit(10);

      if (!similarTransactions || similarTransactions.length === 0) {
        return { matched: false };
      }

      // Check if previously marked as gambling
      const gamblingCount = similarTransactions.filter(t =>
        t.description?.toLowerCase().includes('gambling') ||
        !t.is_whitelisted
      ).length;

      if (gamblingCount / similarTransactions.length > 0.5) {
        return {
          matched: true,
          confidence: 85,
          patterns: ['historical_pattern', 'repeat_merchant']
        };
      }

      // Check for amount patterns (similar amounts might indicate regular gambling)
      const amounts = similarTransactions.map(t => Math.abs(parseFloat(t.amount)));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;

      // Low variance with similar amounts = likely gambling pattern
      if (variance < avgAmount * 0.3 && similarTransactions.length >= 3) {
        return {
          matched: true,
          confidence: 75,
          patterns: ['amount_pattern', 'repeat_merchant']
        };
      }

      return { matched: false };
    } catch (error) {
      console.error('Error checking historical patterns:', error);
      return { matched: false };
    }
  }

  /**
   * Check for sequence patterns (e.g., ATM withdrawal before gambling)
   */
  async _checkSequencePatterns(transaction) {
    try {
      const timestamp = new Date(transaction.timestamp);
      const twoHoursBefore = new Date(timestamp.getTime() - 2 * 60 * 60 * 1000);

      // Look for ATM withdrawals or cash transactions in previous 2 hours
      const { data: recentTransactions } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', twoHoursBefore.toISOString())
        .lt('timestamp', timestamp.toISOString())
        .order('timestamp', { ascending: false })
        .limit(5);

      if (!recentTransactions || recentTransactions.length === 0) {
        return { matched: false };
      }

      for (const prevTx of recentTransactions) {
        const prevDesc = prevTx.description?.toLowerCase() || '';
        const prevPayee = prevTx.payee_name?.toLowerCase() || '';

        // Check for ATM or cash withdrawal patterns
        for (const pattern of PRE_GAMBLING_PATTERNS) {
          if (prevDesc.includes(pattern) || prevPayee.includes(pattern)) {
            return {
              matched: true,
              patterns: ['sequence_pattern', 'pre_gambling_withdrawal'],
              preActivity: prevTx
            };
          }
        }
      }

      return { matched: false };
    } catch (error) {
      console.error('Error checking sequence patterns:', error);
      return { matched: false };
    }
  }

  /**
   * Check temporal patterns (day/time combinations)
   */
  _checkTemporalPatterns(timestamp) {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const hour = date.getHours();

    // Weekend nights (Friday/Saturday after 6pm)
    if ((dayOfWeek === 5 || dayOfWeek === 6) && hour >= 18) {
      return {
        matched: true,
        patterns: ['temporal_weekend_night'],
        pattern: 'weekend_night'
      };
    }

    // Late night gambling (after 10pm, before 4am)
    if (hour >= 22 || hour < 4) {
      return {
        matched: true,
        patterns: ['temporal_late_night'],
        pattern: 'late_night'
      };
    }

    // Payday pattern (assuming payday is 15th and end of month)
    const dayOfMonth = date.getDate();
    if (dayOfMonth >= 14 && dayOfMonth <= 17) {
      return {
        matched: true,
        patterns: ['temporal_payday'],
        pattern: 'payday'
      };
    }
    if (dayOfMonth >= 28 || dayOfMonth <= 3) {
      return {
        matched: true,
        patterns: ['temporal_payday'],
        pattern: 'payday'
      };
    }

    return { matched: false };
  }

  /**
   * Calculate baseline gambling statistics
   */
  async calculateBaseline(userId, startDate, endDate) {
    try {
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (!transactions || transactions.length === 0) {
        return null;
      }

      const gamblingTransactions = [];

      // Analyze each transaction
      for (const tx of transactions) {
        const analysis = await this.analyzeTransaction(tx);
        if (analysis.isGambling && analysis.confidence >= 70) {
          gamblingTransactions.push({
            ...tx,
            analysis
          });
        }
      }

      return this._calculateStatistics(gamblingTransactions, startDate, endDate);
    } catch (error) {
      console.error('Error calculating baseline:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive statistics
   */
  _calculateStatistics(gamblingTransactions, startDate, endDate) {
    if (gamblingTransactions.length === 0) {
      return {
        totalLost: 0,
        transactionCount: 0,
        averageWeekly: 0,
        averageMonthly: 0,
        worstWeek: null,
        mostCommonType: null,
        primaryTrigger: null,
        patterns: []
      };
    }

    const totalLost = gamblingTransactions.reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
      0
    );

    // Calculate weekly/monthly averages
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const weeks = daysDiff / 7;
    const months = daysDiff / 30;

    const averageWeekly = totalLost / weeks;
    const averageMonthly = totalLost / months;

    // Find worst week
    const weeklyTotals = this._groupByWeek(gamblingTransactions);
    const worstWeek = this._findWorstWeek(weeklyTotals);

    // Identify most common gambling type
    const typeCounts = {};
    gamblingTransactions.forEach(tx => {
      const type = tx.analysis.gamblingType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const mostCommonType = Object.keys(typeCounts).reduce((a, b) =>
      typeCounts[a] > typeCounts[b] ? a : b
    );

    // Identify primary trigger
    const patternCounts = {};
    gamblingTransactions.forEach(tx => {
      tx.analysis.patterns.forEach(pattern => {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      });
    });

    const primaryTrigger = this._identifyPrimaryTrigger(patternCounts);

    // Identify all unique patterns
    const uniquePatterns = [...new Set(
      gamblingTransactions.flatMap(tx => tx.analysis.patterns)
    )];

    return {
      totalLost,
      transactionCount: gamblingTransactions.length,
      averageWeekly,
      averageMonthly,
      worstWeek,
      mostCommonType,
      primaryTrigger,
      patterns: uniquePatterns,
      projectedYearlySavings: averageWeekly * 52
    };
  }

  /**
   * Group transactions by week
   */
  _groupByWeek(transactions) {
    const weeks = {};

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          startDate: weekStart,
          transactions: [],
          total: 0
        };
      }

      weeks[weekKey].transactions.push(tx);
      weeks[weekKey].total += Math.abs(parseFloat(tx.amount));
    });

    return weeks;
  }

  /**
   * Find the worst week
   */
  _findWorstWeek(weeklyTotals) {
    let worstWeek = null;
    let maxAmount = 0;

    Object.entries(weeklyTotals).forEach(([weekKey, weekData]) => {
      if (weekData.total > maxAmount) {
        maxAmount = weekData.total;
        worstWeek = {
          startDate: weekData.startDate,
          amount: weekData.total,
          transactionCount: weekData.transactions.length
        };
      }
    });

    return worstWeek;
  }

  /**
   * Identify primary trigger from pattern counts
   */
  _identifyPrimaryTrigger(patternCounts) {
    const triggerMap = {
      'temporal_payday': 'Payday',
      'temporal_weekend_night': 'Weekend/Social',
      'temporal_late_night': 'Boredom/Late Night',
      'sequence_pattern': 'Planned/Premeditated',
      'pre_gambling_withdrawal': 'Cash Gambling'
    };

    let primaryTrigger = 'Unknown';
    let maxCount = 0;

    Object.entries(patternCounts).forEach(([pattern, count]) => {
      if (triggerMap[pattern] && count > maxCount) {
        maxCount = count;
        primaryTrigger = triggerMap[pattern];
      }
    });

    return primaryTrigger;
  }

  /**
   * Detect escalation patterns
   */
  detectEscalation(transactions) {
    if (transactions.length < 3) return false;

    const amounts = transactions.map(tx => Math.abs(parseFloat(tx.amount)));

    // Check if amounts are generally increasing
    let increasingCount = 0;
    for (let i = 1; i < amounts.length; i++) {
      if (amounts[i] > amounts[i - 1]) {
        increasingCount++;
      }
    }

    return increasingCount / (amounts.length - 1) > 0.6;
  }

  /**
   * Detect binge patterns (multiple transactions in short period)
   */
  detectBinge(transactions, hoursThreshold = 4) {
    const groups = [];
    let currentGroup = [];

    for (let i = 0; i < transactions.length; i++) {
      if (currentGroup.length === 0) {
        currentGroup.push(transactions[i]);
        continue;
      }

      const lastTx = currentGroup[currentGroup.length - 1];
      const timeDiff = new Date(transactions[i].timestamp) - new Date(lastTx.timestamp);
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff <= hoursThreshold) {
        currentGroup.push(transactions[i]);
      } else {
        if (currentGroup.length >= 3) {
          groups.push(currentGroup);
        }
        currentGroup = [transactions[i]];
      }
    }

    if (currentGroup.length >= 3) {
      groups.push(currentGroup);
    }

    return groups;
  }
}

module.exports = PatternLearner;
