/**
 * Merchant Enrichment Service
 *
 * Enhances merchant data with:
 * - Venue identification from generic names
 * - Gambling keyword detection
 * - False positive filtering
 * - Crowdsourced merchant database
 */

const GAMBLING_MERCHANT_DATABASE = {
  // Online gambling platforms
  'SPORTSBET': { type: 'sports_betting', confidence: 100, displayName: 'Sportsbet' },
  'LADBROKES': { type: 'sports_betting', confidence: 100, displayName: 'Ladbrokes' },
  'TAB': { type: 'sports_betting', confidence: 100, displayName: 'TAB' },
  'POINTSBET': { type: 'sports_betting', confidence: 100, displayName: 'PointsBet' },
  'UNIBET': { type: 'sports_betting', confidence: 100, displayName: 'Unibet' },
  'BETFAIR': { type: 'sports_betting', confidence: 100, displayName: 'Betfair' },
  'BETEASY': { type: 'sports_betting', confidence: 100, displayName: 'BetEasy' },
  'NEDS': { type: 'sports_betting', confidence: 100, displayName: 'Neds' },
  'PALMERBET': { type: 'sports_betting', confidence: 100, displayName: 'PalmerBet' },
  'BETDELUXE': { type: 'sports_betting', confidence: 100, displayName: 'BetDeluxe' },
  'PLAYUP': { type: 'sports_betting', confidence: 100, displayName: 'PlayUp' },
  'BLUEBET': { type: 'sports_betting', confidence: 100, displayName: 'BlueBet' },
  'BETR': { type: 'sports_betting', confidence: 100, displayName: 'Betr' },
  'PICKLEBET': { type: 'sports_betting', confidence: 100, displayName: 'Picklebet' },
  'DABBLE': { type: 'sports_betting', confidence: 100, displayName: 'Dabble' },
  'TOPSPORT': { type: 'sports_betting', confidence: 100, displayName: 'TopSport' },

  // Online casinos/pokies
  'POKERSTARS': { type: 'online_poker', confidence: 100, displayName: 'PokerStars' },
  'PARTYPOKER': { type: 'online_poker', confidence: 100, displayName: 'PartyPoker' },
  'GGPOKER': { type: 'online_poker', confidence: 100, displayName: 'GGPoker' },
  '888POKER': { type: 'online_poker', confidence: 100, displayName: '888poker' },
  'STAKE.COM': { type: 'crypto_casino', confidence: 100, displayName: 'Stake.com' },
  'ROOBET': { type: 'crypto_casino', confidence: 100, displayName: 'Roobet' },
  'DUELBITS': { type: 'crypto_casino', confidence: 100, displayName: 'Duelbits' },
  'ROLLBIT': { type: 'crypto_casino', confidence: 100, displayName: 'Rollbit' },
  'BC.GAME': { type: 'crypto_casino', confidence: 100, displayName: 'BC.Game' },

  // Fantasy sports
  'DRAFTKINGS': { type: 'fantasy_sports', confidence: 100, displayName: 'DraftKings' },
  'FANDUEL': { type: 'fantasy_sports', confidence: 100, displayName: 'FanDuel' },
  'MONEYBALL': { type: 'fantasy_sports', confidence: 100, displayName: 'Moneyball' },
  'DRAFTSTARS': { type: 'fantasy_sports', confidence: 100, displayName: 'DraftStars' },

  // Lotto/lottery
  'LOTT': { type: 'lottery', confidence: 100, displayName: 'The Lott' },
  'TATTS': { type: 'lottery', confidence: 100, displayName: 'Tatts' },
  'NSW LOTTERIES': { type: 'lottery', confidence: 100, displayName: 'NSW Lotteries' },

  // Common venue names (lower confidence, needs context)
  'RSL': { type: 'venue', confidence: 60, displayName: 'RSL Club', requiresContext: true },
  'HOTEL': { type: 'venue', confidence: 50, displayName: 'Hotel/Pub', requiresContext: true },
  'CLUB': { type: 'venue', confidence: 50, displayName: 'Club', requiresContext: true },
  'TAVERN': { type: 'venue', confidence: 50, displayName: 'Tavern', requiresContext: true }
};

// Known false positives to filter out
const FALSE_POSITIVE_PATTERNS = [
  // Food delivery often has "bet" in name
  /menulog/i,
  /ubereats/i,
  /deliveroo/i,
  /doordash/i,

  // Supermarkets
  /woolworths/i,
  /coles/i,
  /aldi/i,
  /iga/i,

  // Common utilities
  /energy/i,
  /electric/i,
  /gas/i,
  /water/i,
  /internet/i,
  /mobile/i,
  /telstra/i,
  /optus/i,
  /vodafone/i,

  // Common stores that might have gambling-like words
  /alphabet/i,
  /abet laminati/i, // flooring company
  /tibet/i
];

class MerchantEnrichment {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.merchantCache = new Map();
  }

  /**
   * Enrich a transaction with merchant data
   */
  async enrichTransaction(transaction) {
    const payeeName = transaction.payee_name || '';
    const description = transaction.description || '';

    // Check cache first
    const cacheKey = `${payeeName}:${description}`.toUpperCase();
    if (this.merchantCache.has(cacheKey)) {
      return this.merchantCache.get(cacheKey);
    }

    const enrichment = {
      originalPayeeName: payeeName,
      originalDescription: description,
      enrichedPayeeName: payeeName,
      merchantType: null,
      isGambling: false,
      confidence: 0,
      category: null,
      tags: [],
      metadata: {}
    };

    // Check for false positives first
    if (this._isFalsePositive(payeeName, description)) {
      enrichment.isGambling = false;
      enrichment.confidence = 100;
      enrichment.category = 'legitimate';
      this.merchantCache.set(cacheKey, enrichment);
      return enrichment;
    }

    // Check against known gambling merchants
    const merchantMatch = this._matchKnownMerchant(payeeName, description);
    if (merchantMatch) {
      enrichment.enrichedPayeeName = merchantMatch.displayName;
      enrichment.merchantType = merchantMatch.type;
      enrichment.isGambling = true;
      enrichment.confidence = merchantMatch.confidence;
      enrichment.category = 'gambling';
      enrichment.tags.push(merchantMatch.type);
    }

    // Check crowdsourced database
    const crowdsourcedMatch = await this._checkCrowdsourcedDatabase(payeeName);
    if (crowdsourcedMatch) {
      enrichment.enrichedPayeeName = crowdsourcedMatch.displayName || payeeName;
      enrichment.merchantType = crowdsourcedMatch.type;
      enrichment.isGambling = crowdsourcedMatch.isGambling;
      enrichment.confidence = Math.max(enrichment.confidence, crowdsourcedMatch.confidence);
      enrichment.category = crowdsourcedMatch.category;
      enrichment.tags.push(...(crowdsourcedMatch.tags || []));
      enrichment.metadata.crowdsourced = true;
    }

    // Venue identification (for generic names like "GRAND HOTEL")
    if (!enrichment.isGambling || enrichment.confidence < 80) {
      const venueEnrichment = this._identifyVenue(payeeName, description, transaction);
      if (venueEnrichment) {
        enrichment.merchantType = venueEnrichment.type;
        enrichment.isGambling = venueEnrichment.isGambling;
        enrichment.confidence = Math.max(enrichment.confidence, venueEnrichment.confidence);
        enrichment.tags.push(...venueEnrichment.tags);
        enrichment.metadata.venueDetails = venueEnrichment.details;
      }
    }

    // Cache the result
    this.merchantCache.set(cacheKey, enrichment);

    return enrichment;
  }

  /**
   * Check if transaction is a false positive
   */
  _isFalsePositive(payeeName, description) {
    const text = `${payeeName} ${description}`;

    for (const pattern of FALSE_POSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match against known gambling merchants
   */
  _matchKnownMerchant(payeeName, description) {
    const text = `${payeeName} ${description}`.toUpperCase();

    for (const [merchantKey, merchantData] of Object.entries(GAMBLING_MERCHANT_DATABASE)) {
      if (text.includes(merchantKey)) {
        // If merchant requires context, do additional checks
        if (merchantData.requiresContext) {
          // Check if there are other indicators
          if (this._hasGamblingContext(text)) {
            return merchantData;
          }
          continue;
        }

        return merchantData;
      }
    }

    return null;
  }

  /**
   * Check if text has additional gambling context
   */
  _hasGamblingContext(text) {
    const gamblingContextWords = [
      'gaming', 'pokies', 'slots', 'bar', 'sports bar',
      'entertainment', 'gaming lounge'
    ];

    for (const word of gamblingContextWords) {
      if (text.includes(word.toUpperCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check crowdsourced merchant database
   */
  async _checkCrowdsourcedDatabase(payeeName) {
    try {
      // First check if we have a merchant_enrichment table
      const { data: merchantData, error } = await this.supabase
        .from('merchant_enrichment')
        .select('*')
        .ilike('merchant_name', payeeName)
        .single();

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          return null;
        }
        throw error;
      }

      return merchantData;
    } catch (error) {
      // Silently fail if table doesn't exist
      return null;
    }
  }

  /**
   * Identify venue from generic name
   */
  _identifyVenue(payeeName, description, transaction) {
    const text = `${payeeName} ${description}`.toLowerCase();

    // Common venue identifiers
    const venueIndicators = [
      { keywords: ['hotel', 'gaming'], type: 'gaming_venue', confidence: 75 },
      { keywords: ['rsl', 'club'], type: 'gaming_venue', confidence: 70 },
      { keywords: ['tavern', 'pokies'], type: 'gaming_venue', confidence: 80 },
      { keywords: ['pub', 'gaming'], type: 'gaming_venue', confidence: 75 },
      { keywords: ['club', 'pokies'], type: 'gaming_venue', confidence: 80 },
      { keywords: ['sports bar', 'tab'], type: 'gaming_venue', confidence: 85 }
    ];

    for (const indicator of venueIndicators) {
      const matchCount = indicator.keywords.filter(kw => text.includes(kw)).length;

      if (matchCount >= 2) {
        return {
          type: indicator.type,
          isGambling: true,
          confidence: indicator.confidence,
          tags: ['venue', indicator.type],
          details: {
            indicators: indicator.keywords.filter(kw => text.includes(kw))
          }
        };
      }
    }

    // Single venue keyword with specific patterns
    if (text.includes('hotel') && !text.includes('booking')) {
      const amount = Math.abs(parseFloat(transaction.amount));
      // Small amounts at hotels might be gambling
      if (amount < 500) {
        return {
          type: 'possible_gaming_venue',
          isGambling: true,
          confidence: 60,
          tags: ['venue', 'hotel'],
          details: {
            reason: 'Hotel transaction with small amount',
            requiresReview: true
          }
        };
      }
    }

    return null;
  }

  /**
   * Add merchant to crowdsourced database
   */
  async addMerchantToDatabase(merchantData) {
    try {
      const { data, error } = await this.supabase
        .from('merchant_enrichment')
        .upsert({
          merchant_name: merchantData.merchantName,
          display_name: merchantData.displayName,
          type: merchantData.type,
          is_gambling: merchantData.isGambling,
          confidence: merchantData.confidence,
          category: merchantData.category,
          tags: merchantData.tags || [],
          metadata: merchantData.metadata || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'merchant_name'
        })
        .select()
        .single();

      if (error) throw error;

      // Clear cache for this merchant
      this.merchantCache.clear();

      return data;
    } catch (error) {
      console.error('Error adding merchant to database:', error);
      throw error;
    }
  }

  /**
   * Bulk enrich transactions
   */
  async bulkEnrichTransactions(transactions) {
    const enrichedTransactions = [];

    for (const transaction of transactions) {
      try {
        const enrichment = await this.enrichTransaction(transaction);
        enrichedTransactions.push({
          ...transaction,
          enrichment
        });
      } catch (error) {
        console.error(`Error enriching transaction ${transaction.id}:`, error);
        enrichedTransactions.push({
          ...transaction,
          enrichment: {
            originalPayeeName: transaction.payee_name,
            enrichedPayeeName: transaction.payee_name,
            isGambling: false,
            confidence: 0,
            error: error.message
          }
        });
      }
    }

    return enrichedTransactions;
  }

  /**
   * Generate merchant statistics
   */
  async generateMerchantStats() {
    try {
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('payee_name, amount')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (!transactions) return null;

      const merchantStats = {};

      for (const tx of transactions) {
        const payeeName = tx.payee_name || 'Unknown';

        if (!merchantStats[payeeName]) {
          merchantStats[payeeName] = {
            count: 0,
            totalAmount: 0,
            averageAmount: 0,
            transactions: []
          };
        }

        merchantStats[payeeName].count++;
        merchantStats[payeeName].totalAmount += Math.abs(parseFloat(tx.amount));
        merchantStats[payeeName].transactions.push(tx);
      }

      // Calculate averages
      Object.values(merchantStats).forEach(stats => {
        stats.averageAmount = stats.totalAmount / stats.count;
      });

      return merchantStats;
    } catch (error) {
      console.error('Error generating merchant stats:', error);
      throw error;
    }
  }

  /**
   * Suggest whitelisted merchants
   */
  async suggestWhitelist() {
    try {
      const stats = await this.generateMerchantStats();
      if (!stats) return [];

      const suggestions = [];

      for (const [merchantName, merchantData] of Object.entries(stats)) {
        // Frequent, regular amounts = likely legitimate bill
        if (merchantData.count >= 3) {
          const amounts = merchantData.transactions.map(tx => Math.abs(parseFloat(tx.amount)));
          const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
          const coefficientOfVariation = Math.sqrt(variance) / avgAmount;

          // Low variation (< 10%) suggests regular bill
          if (coefficientOfVariation < 0.1) {
            const enrichment = await this.enrichTransaction({
              payee_name: merchantName,
              description: '',
              amount: avgAmount
            });

            if (!enrichment.isGambling || enrichment.confidence < 70) {
              suggestions.push({
                merchantName,
                category: this._suggestCategory(merchantName),
                confidence: 90,
                reason: 'Regular payments with consistent amounts',
                stats: {
                  count: merchantData.count,
                  averageAmount: avgAmount,
                  variation: coefficientOfVariation
                }
              });
            }
          }
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error suggesting whitelist:', error);
      throw error;
    }
  }

  /**
   * Suggest category for merchant
   */
  _suggestCategory(merchantName) {
    const name = merchantName.toLowerCase();

    if (name.includes('energy') || name.includes('electric') || name.includes('gas')) return 'utilities';
    if (name.includes('rent') || name.includes('real estate') || name.includes('property')) return 'rent';
    if (name.includes('internet') || name.includes('mobile') || name.includes('telstra') || name.includes('optus')) return 'utilities';
    if (name.includes('insurance')) return 'insurance';
    if (name.includes('gym') || name.includes('fitness')) return 'health';
    if (name.includes('netflix') || name.includes('spotify') || name.includes('subscription')) return 'subscriptions';
    if (name.includes('woolworths') || name.includes('coles') || name.includes('aldi')) return 'groceries';
    if (name.includes('pet')) return 'pet';

    return 'other';
  }
}

module.exports = MerchantEnrichment;
