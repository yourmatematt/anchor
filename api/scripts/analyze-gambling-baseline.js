#!/usr/bin/env node

/**
 * Analyze Gambling Baseline Script
 *
 * Analyzes imported transaction history to establish gambling baseline
 * Calculates:
 * - Average weekly/monthly gambling losses
 * - Worst week/month
 * - Most common gambling types
 * - Trigger patterns
 * - Total losses over period
 * - Projected savings if stopped
 *
 * Usage:
 *   node analyze-gambling-baseline.js --months=12
 *   node analyze-gambling-baseline.js --start=2023-01-01 --end=2024-01-01
 */

const { createClient } = require('@supabase/supabase-js');
const PatternLearner = require('../services/pattern-learner');
const MerchantEnrichment = require('../services/merchant-enrichment');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

class GamblingBaselineAnalyzer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.patternLearner = new PatternLearner(supabaseClient);
    this.merchantEnrichment = new MerchantEnrichment(supabaseClient);
  }

  /**
   * Main analysis function
   */
  async analyze(options = {}) {
    console.log('📊 Starting gambling baseline analysis...\n');

    const { startDate, endDate } = this._parseOptions(options);

    console.log(`📅 Analysis period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`📆 Duration: ${this._getDurationText(startDate, endDate)}\n`);

    try {
      // Fetch all transactions in period
      const transactions = await this._fetchTransactions(startDate, endDate);
      console.log(`📦 Loaded ${transactions.length} transactions\n`);

      if (transactions.length === 0) {
        console.log('❌ No transactions found in the specified period');
        return null;
      }

      // Identify gambling transactions
      const gamblingTransactions = await this._identifyGamblingTransactions(transactions);
      console.log(`🎰 Identified ${gamblingTransactions.length} gambling transactions\n`);

      if (gamblingTransactions.length === 0) {
        console.log('✅ No gambling transactions found! 🎉');
        return null;
      }

      // Calculate comprehensive baseline
      const baseline = await this._calculateBaseline(gamblingTransactions, startDate, endDate);

      // Print results
      this._printBaseline(baseline);

      // Save baseline to database
      await this._saveBaseline(baseline, startDate, endDate);

      return baseline;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Parse command-line options
   */
  _parseOptions(options) {
    let startDate, endDate;

    if (options.months) {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - parseInt(options.months));
    } else if (options.start && options.end) {
      startDate = new Date(options.start);
      endDate = new Date(options.end);
    } else {
      // Default to 12 months
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 12);
    }

    return { startDate, endDate };
  }

  /**
   * Get human-readable duration
   */
  _getDurationText(startDate, endDate) {
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const weeks = Math.floor(days / 7);

    if (months > 0) return `${months} month(s)`;
    if (weeks > 0) return `${weeks} week(s)`;
    return `${days} day(s)`;
  }

  /**
   * Fetch transactions from database
   */
  async _fetchTransactions(startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Identify gambling transactions using pattern learner
   */
  async _identifyGamblingTransactions(transactions) {
    const gamblingTransactions = [];
    let analyzed = 0;

    for (const tx of transactions) {
      analyzed++;

      if (analyzed % 100 === 0) {
        process.stdout.write(`\r   Analyzing transactions: ${analyzed}/${transactions.length}`);
      }

      // Skip whitelisted transactions
      if (tx.is_whitelisted) continue;

      // Analyze transaction
      const analysis = await this.patternLearner.analyzeTransaction(tx);

      // Include if confidence >= 70%
      if (analysis.isGambling && analysis.confidence >= 70) {
        gamblingTransactions.push({
          ...tx,
          analysis
        });
      }
    }

    console.log(`\r   Analyzing transactions: ${analyzed}/${transactions.length} ✓\n`);

    return gamblingTransactions;
  }

  /**
   * Calculate comprehensive baseline statistics
   */
  async _calculateBaseline(gamblingTransactions, startDate, endDate) {
    console.log('📈 Calculating baseline statistics...\n');

    // Use pattern learner to calculate statistics
    const stats = this.patternLearner._calculateStatistics(
      gamblingTransactions,
      startDate,
      endDate
    );

    // Detect escalation patterns
    const hasEscalation = this.patternLearner.detectEscalation(gamblingTransactions);

    // Detect binge patterns
    const bingeGroups = this.patternLearner.detectBinge(gamblingTransactions);

    // Analyze by gambling type
    const typeBreakdown = this._analyzeByType(gamblingTransactions);

    // Analyze by day of week
    const dayBreakdown = this._analyzeByDayOfWeek(gamblingTransactions);

    // Analyze by time of day
    const timeBreakdown = this._analyzeByTimeOfDay(gamblingTransactions);

    // Find most expensive single transaction
    const largestTransaction = this._findLargestTransaction(gamblingTransactions);

    // Calculate streak patterns
    const streaks = this._analyzeStreaks(gamblingTransactions);

    return {
      ...stats,
      hasEscalation,
      bingeCount: bingeGroups.length,
      typeBreakdown,
      dayBreakdown,
      timeBreakdown,
      largestTransaction,
      streaks,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * Analyze gambling by type
   */
  _analyzeByType(transactions) {
    const breakdown = {};

    transactions.forEach(tx => {
      const type = tx.analysis.gamblingType || 'unknown';

      if (!breakdown[type]) {
        breakdown[type] = {
          count: 0,
          total: 0,
          average: 0
        };
      }

      breakdown[type].count++;
      breakdown[type].total += Math.abs(parseFloat(tx.amount));
    });

    // Calculate averages
    Object.values(breakdown).forEach(data => {
      data.average = data.total / data.count;
    });

    return breakdown;
  }

  /**
   * Analyze by day of week
   */
  _analyzeByDayOfWeek(transactions) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const breakdown = {};

    days.forEach(day => {
      breakdown[day] = { count: 0, total: 0 };
    });

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const dayName = days[date.getDay()];

      breakdown[dayName].count++;
      breakdown[dayName].total += Math.abs(parseFloat(tx.amount));
    });

    return breakdown;
  }

  /**
   * Analyze by time of day
   */
  _analyzeByTimeOfDay(transactions) {
    const periods = {
      'Morning (6am-12pm)': { count: 0, total: 0 },
      'Afternoon (12pm-6pm)': { count: 0, total: 0 },
      'Evening (6pm-10pm)': { count: 0, total: 0 },
      'Late Night (10pm-6am)': { count: 0, total: 0 }
    };

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const hour = date.getHours();

      let period;
      if (hour >= 6 && hour < 12) period = 'Morning (6am-12pm)';
      else if (hour >= 12 && hour < 18) period = 'Afternoon (12pm-6pm)';
      else if (hour >= 18 && hour < 22) period = 'Evening (6pm-10pm)';
      else period = 'Late Night (10pm-6am)';

      periods[period].count++;
      periods[period].total += Math.abs(parseFloat(tx.amount));
    });

    return periods;
  }

  /**
   * Find largest single transaction
   */
  _findLargestTransaction(transactions) {
    let largest = null;
    let maxAmount = 0;

    transactions.forEach(tx => {
      const amount = Math.abs(parseFloat(tx.amount));
      if (amount > maxAmount) {
        maxAmount = amount;
        largest = tx;
      }
    });

    return largest ? {
      amount: maxAmount,
      payeeName: largest.payee_name,
      date: largest.timestamp,
      type: largest.analysis.gamblingType
    } : null;
  }

  /**
   * Analyze gambling-free streaks
   */
  _analyzeStreaks(transactions) {
    if (transactions.length === 0) return null;

    const sortedTx = [...transactions].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    sortedTx.forEach(tx => {
      const txDate = new Date(tx.timestamp);

      if (lastDate) {
        const daysDiff = Math.floor((txDate - lastDate) / (1000 * 60 * 60 * 24));

        if (daysDiff > longestStreak) {
          longestStreak = daysDiff;
        }
      }

      lastDate = txDate;
    });

    // Calculate current streak (days since last gambling)
    const now = new Date();
    const lastGambling = new Date(sortedTx[sortedTx.length - 1].timestamp);
    currentStreak = Math.floor((now - lastGambling) / (1000 * 60 * 60 * 24));

    return {
      longestStreak,
      currentStreak
    };
  }

  /**
   * Print baseline results
   */
  _printBaseline(baseline) {
    console.log('\n' + '='.repeat(70));
    console.log('🎰 GAMBLING BASELINE ANALYSIS RESULTS');
    console.log('='.repeat(70));

    console.log('\n📊 OVERALL STATISTICS:');
    console.log(`   Total gambling transactions:  ${baseline.transactionCount}`);
    console.log(`   Total amount lost:            $${baseline.totalLost.toFixed(2)}`);
    console.log(`   Average weekly loss:          $${baseline.averageWeekly.toFixed(2)}`);
    console.log(`   Average monthly loss:         $${baseline.averageMonthly.toFixed(2)}`);

    if (baseline.worstWeek) {
      console.log(`\n📉 WORST WEEK:`);
      console.log(`   Date:    ${baseline.worstWeek.startDate.toISOString().split('T')[0]}`);
      console.log(`   Amount:  $${baseline.worstWeek.amount.toFixed(2)}`);
      console.log(`   Transactions: ${baseline.worstWeek.transactionCount}`);
    }

    if (baseline.largestTransaction) {
      console.log(`\n💸 LARGEST SINGLE TRANSACTION:`);
      console.log(`   Amount:  $${baseline.largestTransaction.amount.toFixed(2)}`);
      console.log(`   Payee:   ${baseline.largestTransaction.payeeName}`);
      console.log(`   Date:    ${new Date(baseline.largestTransaction.date).toISOString().split('T')[0]}`);
      console.log(`   Type:    ${baseline.largestTransaction.type}`);
    }

    console.log(`\n🎲 GAMBLING TYPE BREAKDOWN:`);
    Object.entries(baseline.typeBreakdown).forEach(([type, data]) => {
      console.log(`   ${type.padEnd(20)} ${data.count} transactions, $${data.total.toFixed(2)} total, $${data.average.toFixed(2)} avg`);
    });

    console.log(`\n📅 DAY OF WEEK BREAKDOWN:`);
    const sortedDays = Object.entries(baseline.dayBreakdown).sort((a, b) => b[1].total - a[1].total);
    sortedDays.forEach(([day, data]) => {
      if (data.count > 0) {
        console.log(`   ${day.padEnd(12)} ${data.count} transactions, $${data.total.toFixed(2)} total`);
      }
    });

    console.log(`\n🕐 TIME OF DAY BREAKDOWN:`);
    Object.entries(baseline.timeBreakdown).forEach(([period, data]) => {
      if (data.count > 0) {
        console.log(`   ${period.padEnd(25)} ${data.count} transactions, $${data.total.toFixed(2)} total`);
      }
    });

    console.log(`\n🎯 PATTERNS IDENTIFIED:`);
    console.log(`   Primary trigger:         ${baseline.primaryTrigger}`);
    console.log(`   Escalation detected:     ${baseline.hasEscalation ? 'YES ⚠️' : 'No'}`);
    console.log(`   Binge episodes:          ${baseline.bingeCount}`);

    if (baseline.streaks) {
      console.log(`\n⏱️  STREAKS:`);
      console.log(`   Longest gambling-free:   ${baseline.streaks.longestStreak} days`);
      console.log(`   Current streak:          ${baseline.streaks.currentStreak} days`);
    }

    console.log(`\n💰 PROJECTED SAVINGS:`);
    console.log(`   If you stopped gambling today:`);
    console.log(`   Per month:   $${(baseline.averageWeekly * 4.33).toFixed(2)}`);
    console.log(`   Per year:    $${baseline.projectedYearlySavings.toFixed(2)}`);
    console.log(`   5 years:     $${(baseline.projectedYearlySavings * 5).toFixed(2)}`);

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Save baseline to database
   */
  async _saveBaseline(baseline, startDate, endDate) {
    try {
      // Create a baseline_analysis table entry
      const { data, error } = await this.supabase
        .from('baseline_analysis')
        .insert({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          total_lost: baseline.totalLost,
          transaction_count: baseline.transactionCount,
          average_weekly: baseline.averageWeekly,
          average_monthly: baseline.averageMonthly,
          most_common_type: baseline.mostCommonType,
          primary_trigger: baseline.primaryTrigger,
          has_escalation: baseline.hasEscalation,
          binge_count: baseline.bingeCount,
          projected_yearly_savings: baseline.projectedYearlySavings,
          analysis_data: baseline,
          created_at: new Date().toISOString()
        });

      if (error) {
        // Table might not exist yet - that's okay
        console.log('⚠️  Note: Could not save baseline to database (table may not exist yet)');
      } else {
        console.log('✅ Baseline saved to database\n');
      }
    } catch (error) {
      console.log('⚠️  Note: Could not save baseline to database:', error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command-line arguments
  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    options[key] = value;
  });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create analyzer and run
  const analyzer = new GamblingBaselineAnalyzer(supabase);

  try {
    await analyzer.analyze(options);
    console.log('✅ Analysis completed successfully!\n');
    console.log('💡 Next step: Run generate-risk-profile.js to create your personalized risk profile\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = GamblingBaselineAnalyzer;
