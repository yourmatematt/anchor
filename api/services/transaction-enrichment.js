/**
 * Transaction Enrichment Service
 * Enhances transaction data with risk signals and pattern detection
 */

const merchantClassifier = require('./merchant-classifier');

/**
 * Enrich transaction with additional metadata
 */
function enrichTransaction(transaction, userContext = {}) {
  const enriched = { ...transaction };

  // Merchant classification
  const merchantClass = merchantClassifier.classifyMerchant(
    transaction.description,
    transaction.raw_text
  );

  enriched.merchant_classification = merchantClass;
  enriched.merchant_risk_score = merchantClassifier.getMerchantRiskScore(
    transaction.description,
    transaction.raw_text
  );

  // Round number detection (common in gambling)
  enriched.is_round_number = isRoundNumber(Math.abs(transaction.amount));

  // Time-based risk scoring
  const transactionTime = new Date(transaction.created_at);
  enriched.time_risk_score = getTimeRiskScore(transactionTime, userContext);

  // Day of week risk (based on user's known triggers)
  enriched.day_of_week = transactionTime.toLocaleDateString('en-AU', { weekday: 'long' });
  enriched.is_trigger_day = userContext.knownTriggers?.days?.includes(enriched.day_of_week);

  // Pattern flags
  enriched.pattern_flags = detectPatternFlags(transaction, merchantClass, transactionTime);

  // Overall risk assessment
  enriched.overall_risk_score = calculateOverallRiskScore(enriched, userContext);

  // Risk level categorization
  enriched.risk_level = getRiskLevel(enriched.overall_risk_score);

  return enriched;
}

/**
 * Check if amount is a round number
 */
function isRoundNumber(amount) {
  const absAmount = Math.abs(amount);

  // Check for common round numbers
  const roundNumbers = [10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 1000];

  return roundNumbers.includes(absAmount) || absAmount % 100 === 0;
}

/**
 * Calculate time-based risk score (0-100)
 */
function getTimeRiskScore(transactionTime, userContext) {
  let score = 0;

  const hour = transactionTime.getHours();
  const day = transactionTime.getDay(); // 0 = Sunday

  // Late night (10pm-4am) - high risk
  if (hour >= 22 || hour < 4) {
    score += 40;
  }

  // Evening (6pm-10pm) - medium risk
  else if (hour >= 18) {
    score += 25;
  }

  // Weekend - higher risk
  if (day === 0 || day === 6) {
    score += 15;
  }

  // Payday periods (if we have user's payday)
  if (userContext.paydayDates) {
    const dayOfMonth = transactionTime.getDate();
    if (userContext.paydayDates.includes(dayOfMonth)) {
      score += 20;
    }
  }

  // Known trigger times (user-specific)
  if (userContext.knownTriggers?.times) {
    const timeStr = `${hour}:00`;
    if (userContext.knownTriggers.times.includes(timeStr)) {
      score += 30;
    }
  }

  return Math.min(score, 100);
}

/**
 * Detect pattern flags
 */
function detectPatternFlags(transaction, merchantClass, transactionTime) {
  const flags = [];

  const amount = Math.abs(transaction.amount);
  const description = transaction.description.toLowerCase();

  // Gambling flags
  if (merchantClass?.category === 'GAMBLING_ONLINE') {
    flags.push('GAMBLING_ONLINE');
  }

  if (merchantClass?.category === 'GAMBLING_VENUE') {
    flags.push('GAMBLING_VENUE');
  }

  // Crypto flags (often used for offshore gambling)
  if (merchantClass?.category === 'CRYPTO_EXCHANGE') {
    flags.push('CRYPTO_EXCHANGE');

    // Large crypto purchase = possible gambling prep
    if (amount > 100) {
      flags.push('LARGE_CRYPTO_PURCHASE');
    }
  }

  // Payday loan flags
  if (merchantClass?.category === 'PAYDAY_LOAN') {
    flags.push('PAYDAY_LOAN');
  }

  // Cash withdrawal flags
  if (merchantClass?.category === 'CASH_WITHDRAWAL') {
    flags.push('CASH_WITHDRAWAL');

    // Large cash withdrawal
    if (amount > 100) {
      flags.push('LARGE_CASH_WITHDRAWAL');
    }

    // Late night cash withdrawal
    const hour = transactionTime.getHours();
    if (hour >= 22 || hour < 6) {
      flags.push('LATE_NIGHT_CASH');
    }
  }

  // High-risk transfer flags
  if (merchantClass?.category === 'HIGH_RISK_TRANSFER') {
    flags.push('HIGH_RISK_TRANSFER');
  }

  // Round number flags
  if (isRoundNumber(amount)) {
    flags.push('ROUND_NUMBER');

    // Common gambling amounts
    if ([50, 100, 200, 500].includes(amount)) {
      flags.push('COMMON_GAMBLING_AMOUNT');
    }
  }

  // Rapid sequential transactions (if we had previous transaction data)
  // This would require passing transaction history
  // flags.push('RAPID_SEQUENTIAL');

  return flags;
}

/**
 * Calculate overall risk score (0-100)
 */
function calculateOverallRiskScore(enrichedTransaction, userContext) {
  let score = 0;

  // Merchant risk score (weighted 50%)
  score += enrichedTransaction.merchant_risk_score * 0.5;

  // Time risk score (weighted 20%)
  score += enrichedTransaction.time_risk_score * 0.2;

  // Pattern flags (weighted 30%)
  const patternFlags = enrichedTransaction.pattern_flags || [];

  const flagWeights = {
    GAMBLING_ONLINE: 30,
    GAMBLING_VENUE: 30,
    PAYDAY_LOAN: 25,
    LARGE_CRYPTO_PURCHASE: 20,
    LARGE_CASH_WITHDRAWAL: 15,
    LATE_NIGHT_CASH: 15,
    HIGH_RISK_TRANSFER: 10,
    COMMON_GAMBLING_AMOUNT: 10,
    ROUND_NUMBER: 5,
  };

  let flagScore = 0;
  patternFlags.forEach(flag => {
    flagScore += flagWeights[flag] || 0;
  });

  // Add flag score (capped at 30 points)
  score += Math.min(flagScore, 30);

  // User context modifiers
  if (userContext.currentStreak > 30) {
    // Long streak = lower base risk
    score *= 0.9;
  } else if (userContext.currentStreak === 0) {
    // Just relapsed = higher vigilance
    score *= 1.2;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'MINIMAL';
}

/**
 * Batch enrich multiple transactions
 */
function enrichTransactions(transactions, userContext) {
  return transactions.map(transaction => enrichTransaction(transaction, userContext));
}

/**
 * Analyze transaction for immediate intervention needs
 */
function requiresImmediateIntervention(enrichedTransaction) {
  // Critical merchant types always trigger
  if (enrichedTransaction.merchant_classification?.category === 'GAMBLING_ONLINE' ||
      enrichedTransaction.merchant_classification?.category === 'GAMBLING_VENUE') {
    return true;
  }

  // Payday loans always trigger
  if (enrichedTransaction.merchant_classification?.category === 'PAYDAY_LOAN') {
    return true;
  }

  // Critical risk score triggers
  if (enrichedTransaction.overall_risk_score >= 80) {
    return true;
  }

  // Multiple high-risk flags
  const highRiskFlags = ['GAMBLING_ONLINE', 'GAMBLING_VENUE', 'PAYDAY_LOAN', 'LARGE_CRYPTO_PURCHASE'];
  const hasHighRiskFlag = enrichedTransaction.pattern_flags?.some(flag =>
    highRiskFlags.includes(flag)
  );

  return hasHighRiskFlag;
}

/**
 * Generate transaction summary for AI conversation
 */
function generateTransactionSummary(enrichedTransaction) {
  const summary = {
    description: enrichedTransaction.description,
    amount: Math.abs(enrichedTransaction.amount),
    time: new Date(enrichedTransaction.created_at).toLocaleString('en-AU'),
    risk_level: enrichedTransaction.risk_level,
    flags: enrichedTransaction.pattern_flags,
  };

  // Add merchant category if detected
  if (enrichedTransaction.merchant_classification) {
    summary.merchant_category = enrichedTransaction.merchant_classification.category;
    summary.merchant_name = enrichedTransaction.merchant_classification.merchant;
  }

  return summary;
}

module.exports = {
  enrichTransaction,
  enrichTransactions,
  requiresImmediateIntervention,
  generateTransactionSummary,
  isRoundNumber,
  getTimeRiskScore,
  calculateOverallRiskScore,
  getRiskLevel,
};
