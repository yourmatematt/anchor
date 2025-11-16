/**
 * Merchant Classifier
 * Identifies gambling, payday loan, and high-risk merchants
 * Built from Australian market research and common patterns
 */

// Online gambling operators (Australian licensed + offshore)
const GAMBLING_ONLINE = [
  // Licensed Australian operators
  'sportsbet', 'tab', 'ladbrokes', 'neds', 'unibet', 'pointsbet', 'bet365',
  'betfair', 'beteasy', 'playup', 'dabble', 'palmerbet', 'bluebet',

  // Major offshore (accessible to Australians)
  'betr', '10bet', '888sport', 'betway', 'betfred',

  // Racing specialists
  'racing.com', 'topsport', 'picklebet',
];

// Physical gambling venues
const GAMBLING_VENUE = [
  // Casinos
  'crown', 'star casino', 'treasury casino', 'skycity', 'jupiters',
  'adelaide casino', 'lasseters',

  // Clubs with pokies
  'rsl', 'rsl club', 'leagues club', 'panthers', 'parramatta leagues',
  'st george leagues', 'mounties', 'twin towns',

  // Hotels with pokies (common names)
  'hotel', 'pub', 'tavern', 'inn',

  // Specific known venues
  'wests newcastle', 'norths leagues', 'souths juniors',
];

// Crypto exchanges (commonly used for gambling)
const CRYPTO_EXCHANGE = [
  // Australian exchanges
  'coinspot', 'coinjar', 'btc markets', 'swyftx', 'digitalx',
  'independent reserve', 'cointree', 'coinloft',

  // International with Australian presence
  'binance', 'coinbase', 'kraken', 'gemini', 'crypto.com',
  'ftx', 'huobi', 'okex', 'kucoin', 'bybit',

  // P2P and other
  'localbitcoins', 'paxful',
];

// Payday loan providers
const PAYDAY_LOAN = [
  // Buy now pay later (can indicate financial stress)
  'afterpay', 'zip', 'zip pay', 'zip money', 'zippay', 'zipco',
  'humm', 'latitude', 'brighte',

  // Wage advance services
  'beforepay', 'mypay', 'mypay now', 'wagepay', 'earlypayday',

  // Traditional payday lenders
  'nimble', 'cash converters', 'money3', 'wallet wizard',
  'cigno', 'fair go finance', 'cash train',

  // Installment lenders
  'certegy', 'openpay', 'payright', 'bundll',
];

// ATM patterns
const ATM_PATTERNS = [
  'atm', 'cash out', 'cashout', 'withdrawal',
  'eftpos cash', 'eftpos ca', // Common ATM prefixes
];

// Common gambling buddy transfer patterns
const HIGH_RISK_TRANSFERS = [
  // Common first names used for gambling buddy transfers
  'dave', 'steve', 'john', 'michael', 'chris', 'paul', 'mark', 'andrew',
  'matt', 'dan', 'james', 'peter', 'tony', 'tom', 'ben', 'sam',
  // Common patterns
  'poker', 'tab', 'punter', 'bet', 'lotto', 'bookie',
];

// Convenience stores (often have pokies access)
const CONVENIENCE_LATE_NIGHT = [
  '7-eleven', '7 eleven', 'night owl', 'caltex', 'bp', 'shell',
];

/**
 * Classify merchant from transaction description
 */
function classifyMerchant(description, rawText) {
  const searchText = `${description} ${rawText || ''}`.toLowerCase();

  const results = [];

  // Check gambling online
  for (const merchant of GAMBLING_ONLINE) {
    if (searchText.includes(merchant)) {
      results.push({
        category: 'GAMBLING_ONLINE',
        merchant,
        confidence: 'HIGH',
      });
    }
  }

  // Check gambling venues
  for (const venue of GAMBLING_VENUE) {
    if (searchText.includes(venue)) {
      results.push({
        category: 'GAMBLING_VENUE',
        merchant: venue,
        confidence: 'HIGH',
      });
    }
  }

  // Check crypto exchanges
  for (const exchange of CRYPTO_EXCHANGE) {
    if (searchText.includes(exchange)) {
      results.push({
        category: 'CRYPTO_EXCHANGE',
        merchant: exchange,
        confidence: 'HIGH',
      });
    }
  }

  // Check payday loans
  for (const lender of PAYDAY_LOAN) {
    if (searchText.includes(lender)) {
      results.push({
        category: 'PAYDAY_LOAN',
        merchant: lender,
        confidence: 'HIGH',
      });
    }
  }

  // Check ATM patterns
  for (const pattern of ATM_PATTERNS) {
    if (searchText.includes(pattern)) {
      results.push({
        category: 'CASH_WITHDRAWAL',
        merchant: 'ATM',
        confidence: 'MEDIUM',
      });
    }
  }

  // Check high-risk transfers
  for (const pattern of HIGH_RISK_TRANSFERS) {
    if (searchText.includes(pattern)) {
      results.push({
        category: 'HIGH_RISK_TRANSFER',
        merchant: pattern,
        confidence: 'LOW', // Lower confidence, needs context
      });
    }
  }

  // Check convenience stores (context dependent)
  for (const store of CONVENIENCE_LATE_NIGHT) {
    if (searchText.includes(store)) {
      results.push({
        category: 'CONVENIENCE_STORE',
        merchant: store,
        confidence: 'LOW',
      });
    }
  }

  // Return highest confidence match
  if (results.length === 0) {
    return null;
  }

  // Sort by confidence
  const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  results.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]);

  return results[0];
}

/**
 * Check if merchant is gambling-related
 */
function isGamblingMerchant(description, rawText) {
  const classification = classifyMerchant(description, rawText);
  return classification && (
    classification.category === 'GAMBLING_ONLINE' ||
    classification.category === 'GAMBLING_VENUE'
  );
}

/**
 * Check if merchant is crypto exchange
 */
function isCryptoExchange(description, rawText) {
  const classification = classifyMerchant(description, rawText);
  return classification && classification.category === 'CRYPTO_EXCHANGE';
}

/**
 * Check if merchant is payday loan
 */
function isPaydayLoan(description, rawText) {
  const classification = classifyMerchant(description, rawText);
  return classification && classification.category === 'PAYDAY_LOAN';
}

/**
 * Check if transaction is ATM/cash withdrawal
 */
function isCashWithdrawal(description, rawText) {
  const classification = classifyMerchant(description, rawText);
  return classification && classification.category === 'CASH_WITHDRAWAL';
}

/**
 * Get risk score for merchant (0-100)
 */
function getMerchantRiskScore(description, rawText) {
  const classification = classifyMerchant(description, rawText);

  if (!classification) {
    return 0;
  }

  const scores = {
    GAMBLING_ONLINE: 100,
    GAMBLING_VENUE: 100,
    PAYDAY_LOAN: 90,
    CRYPTO_EXCHANGE: 75,
    CASH_WITHDRAWAL: 50,
    HIGH_RISK_TRANSFER: 40,
    CONVENIENCE_STORE: 20,
  };

  return scores[classification.category] || 0;
}

/**
 * Add new merchant to database
 * (For admin to expand detection)
 */
function addCustomMerchant(merchantName, category) {
  // In production, this would update a database
  // For now, log for manual addition
  console.log(`Custom merchant suggested: ${merchantName} -> ${category}`);

  // TODO: Store in database for review
  return {
    merchant: merchantName,
    category,
    status: 'pending_review',
  };
}

/**
 * Get all known gambling merchants
 */
function getAllGamblingMerchants() {
  return {
    online: GAMBLING_ONLINE,
    venues: GAMBLING_VENUE,
    crypto: CRYPTO_EXCHANGE,
    payday: PAYDAY_LOAN,
  };
}

module.exports = {
  classifyMerchant,
  isGamblingMerchant,
  isCryptoExchange,
  isPaydayLoan,
  isCashWithdrawal,
  getMerchantRiskScore,
  addCustomMerchant,
  getAllGamblingMerchants,

  // Export for testing/admin
  GAMBLING_ONLINE,
  GAMBLING_VENUE,
  CRYPTO_EXCHANGE,
  PAYDAY_LOAN,
};
