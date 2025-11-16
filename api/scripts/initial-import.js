/**
 * Initial Import Script
 * Import last 90 days of transactions when user first connects Up Bank
 * Analyze patterns, calculate baseline, identify bills
 */

const { createClient } = require('@supabase/supabase-js');
const { UpBankAPI, parseTransaction } = require('../utils/up-bank-api');
const { enrichTransaction } = require('../services/transaction-enrichment');
const { classifyMerchant } = require('../services/merchant-classifier');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import period (90 days)
const IMPORT_DAYS = 90;

/**
 * Run initial import for user
 */
async function runInitialImport(userId, upBankToken) {
  console.log(`[Import] Starting initial import for user ${userId}...`);

  try {
    // Check if already imported
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingTransactions && existingTransactions.length > 0) {
      console.log(`[Import] User ${userId} already has transactions, skipping initial import`);
      return { skipped: true };
    }

    // Initialize Up Bank API
    const upBank = new UpBankAPI(upBankToken);

    // Calculate since date (90 days ago)
    const since = new Date(Date.now() - IMPORT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Import] Fetching transactions since ${since}...`);

    // Fetch all transactions
    const upTransactions = await upBank.getAllTransactions(
      since,
      null,
      (progress) => {
        console.log(`[Import] Progress: Page ${progress.page}, ${progress.totalFetched} transactions fetched`);
      }
    );

    console.log(`[Import] Fetched ${upTransactions.length} transactions`);

    if (upTransactions.length === 0) {
      console.log(`[Import] No transactions to import`);
      return { imported: 0 };
    }

    // Parse transactions
    const parsedTransactions = upTransactions.map(parseTransaction);

    // Sort chronologically (oldest first)
    parsedTransactions.sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );

    // Get user context (minimal for initial import)
    const userContext = {
      currentStreak: 0,
      knownTriggers: null,
      paydayDates: [],
    };

    // Enrich all transactions
    console.log(`[Import] Enriching transactions...`);
    const enrichedTransactions = parsedTransactions.map(t =>
      enrichTransaction(t, userContext)
    );

    // Store in database
    console.log(`[Import] Storing transactions in database...`);

    const transactionsToInsert = enrichedTransactions.map(t => ({
      user_id: userId,
      up_transaction_id: t.up_transaction_id,
      description: t.description,
      message: t.message,
      raw_text: t.raw_text,
      amount: t.amount,
      currency: t.currency,
      transaction_type: t.transaction_type,
      status: t.status,
      created_at: t.created_at,
      settled_at: t.settled_at,
      category: t.category,
      merchant_name: t.merchant_classification?.merchant,
      merchant_category: t.merchant_classification?.category,
      merchant_risk_score: t.merchant_risk_score,
      is_round_number: t.is_round_number,
      time_risk_score: t.time_risk_score,
      day_of_week: t.day_of_week,
      is_trigger_day: t.is_trigger_day,
      pattern_flags: t.pattern_flags,
      overall_risk_score: t.overall_risk_score,
      risk_level: t.risk_level,
    }));

    // Batch insert (Supabase has 1000 row limit)
    const batchSize = 500;
    for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
      const batch = transactionsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('transactions')
        .insert(batch);

      if (error) {
        console.error(`[Import] Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }

      console.log(`[Import] Inserted batch ${i / batchSize + 1} (${batch.length} transactions)`);
    }

    console.log(`[Import] All transactions stored successfully`);

    // Analyze patterns
    console.log(`[Import] Analyzing gambling patterns...`);
    const patternAnalysis = analyzeGamblingPatterns(enrichedTransactions);

    // Calculate baseline
    console.log(`[Import] Calculating baseline gambling spend...`);
    const baseline = calculateBaseline(enrichedTransactions, patternAnalysis);

    // Identify bills
    console.log(`[Import] Identifying recurring bills...`);
    const bills = identifyBills(enrichedTransactions);

    // Generate risk profile
    console.log(`[Import] Generating risk profile...`);
    const riskProfile = generateRiskProfile(enrichedTransactions, patternAnalysis, baseline);

    // Store analysis results
    await storeAnalysisResults(userId, {
      patternAnalysis,
      baseline,
      bills,
      riskProfile,
    });

    // Update sync state
    await supabase
      .from('sync_state')
      .upsert({
        user_id: userId,
        service: 'up_bank',
        last_synced_at: enrichedTransactions[enrichedTransactions.length - 1]?.created_at,
        last_sync_completed_at: new Date().toISOString(),
        total_synced: enrichedTransactions.length,
        updated_at: new Date().toISOString(),
      });

    console.log(`[Import] Initial import complete!`);

    return {
      imported: enrichedTransactions.length,
      patternAnalysis,
      baseline,
      bills: bills.length,
      riskProfile,
    };

  } catch (error) {
    console.error(`[Import] Fatal error during initial import:`, error);
    throw error;
  }
}

/**
 * Analyze gambling patterns in historical data
 */
function analyzeGamblingPatterns(transactions) {
  const gamblingTransactions = transactions.filter(t =>
    t.merchant_category === 'GAMBLING_ONLINE' ||
    t.merchant_category === 'GAMBLING_VENUE'
  );

  const analysis = {
    totalGamblingTransactions: gamblingTransactions.length,
    totalGamblingSpend: 0,
    averageGamblingAmount: 0,
    largestGamblingTransaction: 0,
    gamblingMerchants: new Set(),
    gamblingByMerchant: {},
    gamblingByDayOfWeek: {},
    gamblingByHour: {},
    mostCommonFlags: {},
    highRiskTransactions: 0,
  };

  gamblingTransactions.forEach(t => {
    const amount = Math.abs(t.amount);

    analysis.totalGamblingSpend += amount;
    analysis.largestGamblingTransaction = Math.max(analysis.largestGamblingTransaction, amount);

    // Track merchants
    if (t.merchant_name) {
      analysis.gamblingMerchants.add(t.merchant_name);

      if (!analysis.gamblingByMerchant[t.merchant_name]) {
        analysis.gamblingByMerchant[t.merchant_name] = { count: 0, total: 0 };
      }
      analysis.gamblingByMerchant[t.merchant_name].count++;
      analysis.gamblingByMerchant[t.merchant_name].total += amount;
    }

    // Track day of week
    if (!analysis.gamblingByDayOfWeek[t.day_of_week]) {
      analysis.gamblingByDayOfWeek[t.day_of_week] = { count: 0, total: 0 };
    }
    analysis.gamblingByDayOfWeek[t.day_of_week].count++;
    analysis.gamblingByDayOfWeek[t.day_of_week].total += amount;

    // Track hour
    const hour = new Date(t.created_at).getHours();
    if (!analysis.gamblingByHour[hour]) {
      analysis.gamblingByHour[hour] = { count: 0, total: 0 };
    }
    analysis.gamblingByHour[hour].count++;
    analysis.gamblingByHour[hour].total += amount;

    // Track flags
    t.pattern_flags?.forEach(flag => {
      analysis.mostCommonFlags[flag] = (analysis.mostCommonFlags[flag] || 0) + 1;
    });

    // Count high-risk transactions
    if (t.overall_risk_score >= 80) {
      analysis.highRiskTransactions++;
    }
  });

  if (gamblingTransactions.length > 0) {
    analysis.averageGamblingAmount = analysis.totalGamblingSpend / gamblingTransactions.length;
  }

  analysis.gamblingMerchants = Array.from(analysis.gamblingMerchants);

  return analysis;
}

/**
 * Calculate baseline gambling spend
 */
function calculateBaseline(transactions, patternAnalysis) {
  const daysWithData = IMPORT_DAYS;

  const baseline = {
    dailyAverage: patternAnalysis.totalGamblingSpend / daysWithData,
    weeklyAverage: (patternAnalysis.totalGamblingSpend / daysWithData) * 7,
    monthlyAverage: (patternAnalysis.totalGamblingSpend / daysWithData) * 30,
    totalSpend90Days: patternAnalysis.totalGamblingSpend,
    transactionFrequency: patternAnalysis.totalGamblingTransactions / daysWithData, // per day
  };

  // Identify payday loan usage
  const paydayLoans = transactions.filter(t => t.merchant_category === 'PAYDAY_LOAN');
  baseline.paydayLoanUsage = paydayLoans.length > 0;
  baseline.paydayLoanCount = paydayLoans.length;

  // Identify crypto usage (potential offshore gambling)
  const cryptoTransactions = transactions.filter(t => t.merchant_category === 'CRYPTO_EXCHANGE');
  baseline.cryptoUsage = cryptoTransactions.length > 0;
  baseline.cryptoCount = cryptoTransactions.length;

  // Identify late-night cash withdrawals
  const lateNightCash = transactions.filter(t =>
    t.pattern_flags?.includes('LATE_NIGHT_CASH')
  );
  baseline.lateNightCashWithdrawals = lateNightCash.length;

  return baseline;
}

/**
 * Identify recurring bills for whitelist suggestions
 */
function identifyBills(transactions) {
  const bills = [];

  // Group by merchant
  const byMerchant = {};
  transactions.forEach(t => {
    if (!t.description) return;

    // Skip gambling and high-risk merchants
    if (t.merchant_category === 'GAMBLING_ONLINE' ||
        t.merchant_category === 'GAMBLING_VENUE' ||
        t.merchant_category === 'PAYDAY_LOAN') {
      return;
    }

    const key = t.description.toLowerCase();

    if (!byMerchant[key]) {
      byMerchant[key] = [];
    }

    byMerchant[key].push(t);
  });

  // Find recurring transactions (3+ occurrences)
  Object.entries(byMerchant).forEach(([merchant, txns]) => {
    if (txns.length >= 3) {
      // Check if amounts are similar (within 10%)
      const amounts = txns.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

      if (variance) {
        // Likely a recurring bill
        bills.push({
          merchant: txns[0].description,
          category: txns[0].category,
          averageAmount: avgAmount,
          frequency: txns.length,
          confidence: variance ? 'HIGH' : 'MEDIUM',
        });
      }
    }
  });

  // Sort by frequency
  bills.sort((a, b) => b.frequency - a.frequency);

  return bills;
}

/**
 * Generate risk profile
 */
function generateRiskProfile(transactions, patternAnalysis, baseline) {
  const riskProfile = {
    overallRisk: 'LOW',
    riskFactors: [],
    protectiveFactors: [],
    recommendations: [],
  };

  // Risk factor: High gambling spend
  if (baseline.monthlyAverage > 1000) {
    riskProfile.riskFactors.push('High monthly gambling spend (>${baseline.monthlyAverage.toFixed(0)})');
  }

  // Risk factor: Frequent gambling
  if (baseline.transactionFrequency > 0.5) {
    riskProfile.riskFactors.push(`Frequent gambling (${(baseline.transactionFrequency * 7).toFixed(1)} times per week)`);
  }

  // Risk factor: Payday loan usage
  if (baseline.paydayLoanUsage) {
    riskProfile.riskFactors.push(`Payday loan usage (${baseline.paydayLoanCount} loans in 90 days)`);
  }

  // Risk factor: Crypto usage (potential offshore gambling)
  if (baseline.cryptoUsage && baseline.cryptoCount > 5) {
    riskProfile.riskFactors.push('Frequent crypto purchases (possible offshore gambling)');
  }

  // Risk factor: Late-night cash withdrawals
  if (baseline.lateNightCashWithdrawals > 3) {
    riskProfile.riskFactors.push(`Late-night cash withdrawals (${baseline.lateNightCashWithdrawals} times)`);
  }

  // Risk factor: Multiple gambling merchants
  if (patternAnalysis.gamblingMerchants.length > 3) {
    riskProfile.riskFactors.push(`Multiple gambling platforms (${patternAnalysis.gamblingMerchants.length} different)`);
  }

  // Calculate overall risk
  if (riskProfile.riskFactors.length >= 4) {
    riskProfile.overallRisk = 'CRITICAL';
  } else if (riskProfile.riskFactors.length >= 2) {
    riskProfile.overallRisk = 'HIGH';
  } else if (riskProfile.riskFactors.length >= 1) {
    riskProfile.overallRisk = 'MEDIUM';
  }

  // Recommendations
  if (baseline.monthlyAverage > 500) {
    riskProfile.recommendations.push('Set daily allowance below $50 to break spending pattern');
  }

  if (patternAnalysis.gamblingMerchants.length > 0) {
    riskProfile.recommendations.push('Invite guardian within 24 hours for accountability');
  }

  if (baseline.paydayLoanUsage) {
    riskProfile.recommendations.push('Lock vault for minimum 90 days to rebuild savings');
  }

  return riskProfile;
}

/**
 * Store analysis results
 */
async function storeAnalysisResults(userId, analysis) {
  // Store baseline
  await supabase
    .from('user_baselines')
    .upsert({
      user_id: userId,
      daily_average: analysis.baseline.dailyAverage,
      weekly_average: analysis.baseline.weeklyAverage,
      monthly_average: analysis.baseline.monthlyAverage,
      total_spend_90_days: analysis.baseline.totalSpend90Days,
      transaction_frequency: analysis.baseline.transactionFrequency,
      payday_loan_usage: analysis.baseline.paydayLoanUsage,
      crypto_usage: analysis.baseline.cryptoUsage,
      late_night_cash_count: analysis.baseline.lateNightCashWithdrawals,
      created_at: new Date().toISOString(),
    });

  // Store risk profile
  await supabase
    .from('user_risk_profiles')
    .upsert({
      user_id: userId,
      overall_risk: analysis.riskProfile.overallRisk,
      risk_factors: analysis.riskProfile.riskFactors,
      protective_factors: analysis.riskProfile.protectiveFactors,
      recommendations: analysis.riskProfile.recommendations,
      created_at: new Date().toISOString(),
    });

  // Store bill suggestions
  for (const bill of analysis.bills) {
    await supabase
      .from('bill_suggestions')
      .insert({
        user_id: userId,
        merchant: bill.merchant,
        category: bill.category,
        average_amount: bill.averageAmount,
        frequency: bill.frequency,
        confidence: bill.confidence,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
  }

  // Store pattern analysis
  await supabase
    .from('import_analysis')
    .insert({
      user_id: userId,
      total_gambling_transactions: analysis.patternAnalysis.totalGamblingTransactions,
      total_gambling_spend: analysis.patternAnalysis.totalGamblingSpend,
      gambling_merchants: analysis.patternAnalysis.gamblingMerchants,
      gambling_by_day_of_week: analysis.patternAnalysis.gamblingByDayOfWeek,
      gambling_by_hour: analysis.patternAnalysis.gamblingByHour,
      most_common_flags: analysis.patternAnalysis.mostCommonFlags,
      created_at: new Date().toISOString(),
    });
}

module.exports = {
  runInitialImport,
  analyzeGamblingPatterns,
  calculateBaseline,
  identifyBills,
  generateRiskProfile,
};
