/**
 * Pattern Detection Engine for Anchor
 *
 * Analyzes transactions for gambling-related patterns and triggers
 * Critical for intervention system - detects:
 * - Payday loans
 * - Gambling venues
 * - Cash withdrawals
 * - Crypto exchanges
 * - Suspicious transfers
 * - Time-based patterns
 */

// Known payday loan providers (Australia)
const PAYDAY_LOAN_PROVIDERS = [
  'beforepay',
  'mypay',
  'nimble',
  'wage advance',
  'wagepay',
  'zipmoney',
  'zip pay',
  'cash converters',
  'money3',
  'ferratum',
  'wallet wizard',
  'quick cash',
  'instant loan',
  'cash advance',
];

// Known gambling venues and platforms (Australia)
const GAMBLING_KEYWORDS = [
  // Online betting
  'sportsbet',
  'tab.com',
  'ladbrokes',
  'unibet',
  'bet365',
  'pointsbet',
  'neds',
  'betfair',
  'draftkings',
  'fanduel',
  // Casinos
  'crown casino',
  'star casino',
  'treasury casino',
  'casino canberra',
  'adelaide casino',
  'crown perth',
  // Generic gambling terms
  'poker machine',
  'pokie',
  'gaming machine',
  'tabcorp',
  'keno',
  'lotto',
  // Venue types (context-dependent)
  'hotel',
  'club',
  'rsl',
  'leagues club',
  'bowling club',
];

// Crypto exchanges
const CRYPTO_EXCHANGES = [
  'coinspot',
  'binance',
  'coinbase',
  'swyftx',
  'btc markets',
  'independent reserve',
  'kraken',
  'crypto.com',
  'crypto',
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
];

/**
 * Check if description matches payday loan patterns
 */
function detectPaydayLoan(description, amount, transactionType) {
  if (transactionType !== 'CREDIT') return null;

  const descLower = description.toLowerCase();

  // Check against known providers
  for (const provider of PAYDAY_LOAN_PROVIDERS) {
    if (descLower.includes(provider)) {
      return {
        pattern: 'PAYDAY_LOAN',
        risk: 'CRITICAL',
        triggerAI: true,
        triggerGuardian: true,
        resetStreak: true, // Payday loans reset clean streak
        provider: provider,
        amount: Math.abs(amount),
        message: `Payday loan detected from ${provider}. This is a relapse trigger.`,
        aiContext: {
          type: 'payday_loan',
          provider: provider,
          amount: Math.abs(amount),
          questions: [
            "Why did you need a payday loan?",
            "Is this connected to gambling losses?",
            "What's your plan to pay this back?",
          ]
        }
      };
    }
  }

  // Check for generic loan keywords in credits
  const loanKeywords = ['loan', 'advance', 'quick cash', 'instant money'];
  for (const keyword of loanKeywords) {
    if (descLower.includes(keyword)) {
      return {
        pattern: 'SUSPICIOUS_LOAN',
        risk: 'HIGH',
        triggerAI: true,
        triggerGuardian: true,
        resetStreak: false, // Needs AI confirmation first
        amount: Math.abs(amount),
        message: `Suspicious loan-like transaction detected: "${description}"`,
        aiContext: {
          type: 'suspicious_loan',
          description: description,
          amount: Math.abs(amount),
        }
      };
    }
  }

  return null;
}

/**
 * Check if transaction is to gambling venue
 */
function detectGambling(description, amount, timestamp, transactionType) {
  if (transactionType !== 'DEBIT') return null;

  const descLower = description.toLowerCase();
  const hour = new Date(timestamp).getHours();
  const isLateNight = hour >= 22 || hour <= 5;

  // Check against known gambling keywords
  for (const keyword of GAMBLING_KEYWORDS) {
    if (descLower.includes(keyword)) {
      // Venue-type keywords need additional context
      const venueKeywords = ['hotel', 'club', 'rsl'];
      const isVenueKeyword = venueKeywords.some(v => keyword.includes(v));

      // If it's a generic venue keyword, only flag if late night
      if (isVenueKeyword && !isLateNight) {
        continue; // Could be legitimate (lunch at club, etc.)
      }

      return {
        pattern: 'GAMBLING_VENUE',
        risk: 'CRITICAL',
        triggerAI: true,
        triggerGuardian: true,
        resetStreak: true,
        venue: keyword,
        amount: Math.abs(amount),
        isLateNight: isLateNight,
        message: `Gambling venue detected: ${description}${isLateNight ? ' (late night)' : ''}`,
        aiContext: {
          type: 'gambling_venue',
          venue: description,
          amount: Math.abs(amount),
          time: timestamp,
          isLateNight: isLateNight,
          questions: [
            "What happened?",
            "How much did you actually lose?",
            "Are you safe right now?",
          ]
        }
      };
    }
  }

  return null;
}

/**
 * Check for crypto exchange transactions
 */
function detectCrypto(description, amount, transactionType) {
  const descLower = description.toLowerCase();

  for (const exchange of CRYPTO_EXCHANGES) {
    if (descLower.includes(exchange)) {
      return {
        pattern: 'CRYPTO_EXCHANGE',
        risk: 'CRITICAL',
        triggerAI: true,
        triggerGuardian: true,
        resetStreak: true, // Crypto is often gambling-adjacent
        exchange: exchange,
        amount: Math.abs(amount),
        message: `Crypto exchange transaction detected: ${description}`,
        aiContext: {
          type: 'crypto_exchange',
          exchange: description,
          amount: Math.abs(amount),
          questions: [
            "Why are you buying crypto?",
            "Is this for gambling or trading?",
            "How does this help your recovery?",
          ]
        }
      };
    }
  }

  return null;
}

/**
 * Check for suspicious cash withdrawals
 */
function detectCashWithdrawal(description, amount, timestamp) {
  const descLower = description.toLowerCase();
  const isATM = descLower.includes('atm') || descLower.includes('withdrawal');
  const isCashOut = descLower.includes('cash out') || descLower.includes('cashout');
  const absAmount = Math.abs(amount);

  if (isATM || isCashOut) {
    // Only trigger for amounts over $50
    if (absAmount > 50) {
      const hour = new Date(timestamp).getHours();
      const isLateNight = hour >= 22 || hour <= 5;

      return {
        pattern: 'CASH_WITHDRAWAL',
        risk: absAmount > 100 ? 'HIGH' : 'MEDIUM',
        triggerAI: absAmount > 100,
        triggerGuardian: absAmount > 100,
        resetStreak: false, // Needs AI confirmation
        amount: absAmount,
        isLateNight: isLateNight,
        message: `Cash withdrawal: $${absAmount}${isLateNight ? ' (late night)' : ''}`,
        aiContext: {
          type: 'cash_withdrawal',
          amount: absAmount,
          time: timestamp,
          isLateNight: isLateNight,
          questions: [
            "What do you need cash for?",
            "You set up Anchor to avoid cash access. What's changed?",
            "Are you planning to gamble?",
          ]
        }
      };
    }
  }

  return null;
}

/**
 * Check for suspicious transfer patterns
 */
function detectSuspiciousTransfer(description, amount, timestamp, toAccount, userId) {
  const descLower = description.toLowerCase();
  const absAmount = Math.abs(amount);
  const hour = new Date(timestamp).getHours();
  const day = new Date(timestamp).toLocaleDateString('en-US', { weekday: 'long' });

  // Time-based risk factors
  const isLateNight = hour >= 22 || hour <= 5;
  const isTuesday = day === 'Tuesday'; // Known poker night pattern
  const isFriday = day === 'Friday'; // Known pokies night pattern
  const isWeekend = day === 'Saturday' || day === 'Sunday';

  // Amount-based risk factors
  const isRoundNumber = absAmount % 50 === 0; // Round numbers suspicious ($50, $100, $200)
  const isLargeAmount = absAmount > 200;

  // Calculate risk score
  let riskScore = 0;
  const riskFactors = [];

  if (isLateNight) {
    riskScore += 30;
    riskFactors.push('late_night');
  }
  if (isTuesday && hour >= 18) {
    riskScore += 40;
    riskFactors.push('tuesday_evening');
  }
  if ((isFriday || isWeekend) && hour >= 20) {
    riskScore += 25;
    riskFactors.push('weekend_night');
  }
  if (isRoundNumber) {
    riskScore += 15;
    riskFactors.push('round_number');
  }
  if (isLargeAmount) {
    riskScore += 20;
    riskFactors.push('large_amount');
  }

  // Trigger if risk score >= 40
  if (riskScore >= 40) {
    return {
      pattern: 'SUSPICIOUS_TRANSFER',
      risk: riskScore >= 60 ? 'HIGH' : 'MEDIUM',
      triggerAI: riskScore >= 60,
      triggerGuardian: riskScore >= 60,
      resetStreak: false, // Needs AI confirmation
      amount: absAmount,
      riskScore: riskScore,
      riskFactors: riskFactors,
      time: timestamp,
      day: day,
      message: `Suspicious transfer pattern detected: $${absAmount} on ${day} at ${hour}:00`,
      aiContext: {
        type: 'suspicious_transfer',
        amount: absAmount,
        time: timestamp,
        day: day,
        riskFactors: riskFactors,
        questions: [
          `Why are you transferring $${absAmount} ${isTuesday ? 'on Tuesday night' : isLateNight ? 'late at night' : 'right now'}?`,
          "Is this connected to gambling?",
          "Who are you sending this to?",
        ]
      }
    };
  }

  return null;
}

/**
 * Main pattern detection function
 * Analyzes a transaction and returns all detected patterns
 */
async function analyzeTransaction(transaction, userId, userContext = {}) {
  const {
    description,
    amount,
    timestamp,
    transactionType, // CREDIT, DEBIT, TRANSFER
    toAccount,
    fromAccount,
  } = transaction;

  const detectedPatterns = [];

  // Run all detection functions
  const paydayLoan = detectPaydayLoan(description, amount, transactionType);
  if (paydayLoan) detectedPatterns.push(paydayLoan);

  const gambling = detectGambling(description, amount, timestamp, transactionType);
  if (gambling) detectedPatterns.push(gambling);

  const crypto = detectCrypto(description, amount, transactionType);
  if (crypto) detectedPatterns.push(crypto);

  const cashWithdrawal = detectCashWithdrawal(description, amount, timestamp);
  if (cashWithdrawal) detectedPatterns.push(cashWithdrawal);

  const suspiciousTransfer = detectSuspiciousTransfer(
    description,
    amount,
    timestamp,
    toAccount,
    userId
  );
  if (suspiciousTransfer) detectedPatterns.push(suspiciousTransfer);

  // Return highest risk pattern if any detected
  if (detectedPatterns.length === 0) {
    return null;
  }

  // Sort by risk level (CRITICAL > HIGH > MEDIUM)
  const riskOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
  detectedPatterns.sort((a, b) => riskOrder[b.risk] - riskOrder[a.risk]);

  return {
    primaryPattern: detectedPatterns[0],
    allPatterns: detectedPatterns,
    shouldTriggerAI: detectedPatterns.some(p => p.triggerAI),
    shouldTriggerGuardian: detectedPatterns.some(p => p.triggerGuardian),
    shouldResetStreak: detectedPatterns.some(p => p.resetStreak),
  };
}

/**
 * Check multiple transactions for daily patterns
 * (e.g., multiple small withdrawals totaling >$100)
 */
async function analyzeDailyPatterns(transactions, userId) {
  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t =>
    t.timestamp.startsWith(today)
  );

  // Check for multiple small withdrawals
  const withdrawals = todayTransactions.filter(t =>
    (t.description.toLowerCase().includes('atm') ||
     t.description.toLowerCase().includes('withdrawal')) &&
    Math.abs(t.amount) < 100
  );

  if (withdrawals.length >= 3) {
    const total = withdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (total > 100) {
      return {
        pattern: 'MULTIPLE_WITHDRAWALS',
        risk: 'HIGH',
        triggerAI: true,
        triggerGuardian: true,
        count: withdrawals.length,
        totalAmount: total,
        message: `Multiple withdrawals detected: ${withdrawals.length} withdrawals totaling $${total.toFixed(2)}`,
        aiContext: {
          type: 'multiple_withdrawals',
          count: withdrawals.length,
          totalAmount: total,
          questions: [
            `You've withdrawn $${total.toFixed(2)} in ${withdrawals.length} transactions today. What's going on?`,
            "Are you trying to avoid the single withdrawal limit?",
            "Is this for gambling?",
          ]
        }
      };
    }
  }

  return null;
}

module.exports = {
  analyzeTransaction,
  analyzeDailyPatterns,
  PAYDAY_LOAN_PROVIDERS,
  GAMBLING_KEYWORDS,
  CRYPTO_EXCHANGES,
};
