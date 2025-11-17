#!/usr/bin/env node

/**
 * Import Up Bank History Script
 *
 * Imports up to 2 years of Up Bank transaction history
 * Processes in batches to avoid timeouts
 * Identifies gambling transactions and patterns
 *
 * Usage:
 *   node import-up-bank-history.js --token=<UP_TOKEN> --years=2
 *   node import-up-bank-history.js --token=<UP_TOKEN> --start=2022-01-01 --end=2024-01-01
 */

const { createClient } = require('@supabase/supabase-js');
const PatternLearner = require('../services/pattern-learner');
const MerchantEnrichment = require('../services/merchant-enrichment');

// Configuration
const BATCH_SIZE = 100;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UP_API_BASE = 'https://api.up.com.au/api/v1';

class UpBankHistoryImporter {
  constructor(upToken, supabaseClient) {
    this.upToken = upToken;
    this.supabase = supabaseClient;
    this.patternLearner = new PatternLearner(supabaseClient);
    this.merchantEnrichment = new MerchantEnrichment(supabaseClient);
    this.stats = {
      totalTransactions: 0,
      gamblingTransactions: 0,
      duplicatesSkipped: 0,
      errors: 0,
      batches: 0
    };
  }

  /**
   * Main import function
   */
  async import(options = {}) {
    console.log('🚀 Starting Up Bank history import...\n');

    const { startDate, endDate } = this._parseOptions(options);

    console.log(`📅 Import range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`📦 Batch size: ${BATCH_SIZE}\n`);

    try {
      // Get all accounts
      const accounts = await this._fetchAccounts();
      console.log(`💰 Found ${accounts.length} account(s)\n`);

      // Import transactions for each account
      for (const account of accounts) {
        await this._importAccountTransactions(account, startDate, endDate);
      }

      // Print final statistics
      this._printStats();

      return this.stats;
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  /**
   * Parse command-line options
   */
  _parseOptions(options) {
    let startDate, endDate;

    if (options.years) {
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - parseInt(options.years));
    } else if (options.start && options.end) {
      startDate = new Date(options.start);
      endDate = new Date(options.end);
    } else {
      // Default to 2 years
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);
    }

    return { startDate, endDate };
  }

  /**
   * Fetch all Up Bank accounts
   */
  async _fetchAccounts() {
    try {
      const response = await fetch(`${UP_API_BASE}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.upToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Import transactions for a specific account
   */
  async _importAccountTransactions(account, startDate, endDate) {
    console.log(`\n📊 Processing account: ${account.attributes.displayName}`);
    console.log(`   Balance: $${account.attributes.balance.value}`);

    let nextPageUrl = `${UP_API_BASE}/accounts/${account.id}/transactions?page[size]=${BATCH_SIZE}&filter[since]=${startDate.toISOString()}&filter[until]=${endDate.toISOString()}`;
    let pageCount = 0;

    while (nextPageUrl) {
      pageCount++;
      console.log(`\n   📄 Processing page ${pageCount}...`);

      const { transactions, next } = await this._fetchTransactionPage(nextPageUrl);

      if (transactions.length === 0) {
        console.log('   ✓ No more transactions');
        break;
      }

      await this._processBatch(transactions);

      nextPageUrl = next;

      // Add a small delay to avoid rate limiting
      if (nextPageUrl) {
        await this._sleep(500);
      }
    }

    console.log(`   ✅ Completed account: ${account.attributes.displayName}`);
  }

  /**
   * Fetch a page of transactions
   */
  async _fetchTransactionPage(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.upToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        transactions: data.data || [],
        next: data.links?.next || null
      };
    } catch (error) {
      console.error('Error fetching transaction page:', error);
      this.stats.errors++;
      return { transactions: [], next: null };
    }
  }

  /**
   * Process a batch of transactions
   */
  async _processBatch(transactions) {
    const processedTransactions = [];

    for (const tx of transactions) {
      try {
        const processed = await this._processTransaction(tx);
        if (processed) {
          processedTransactions.push(processed);
        }
      } catch (error) {
        console.error(`   ⚠️  Error processing transaction ${tx.id}:`, error.message);
        this.stats.errors++;
      }
    }

    // Bulk insert processed transactions
    if (processedTransactions.length > 0) {
      await this._bulkInsertTransactions(processedTransactions);
    }

    this.stats.batches++;
  }

  /**
   * Process a single transaction
   */
  async _processTransaction(tx) {
    this.stats.totalTransactions++;

    const attributes = tx.attributes;
    const amount = parseFloat(attributes.amount.value);

    // Skip HELD or SETTLED status with zero amount
    if (amount === 0) {
      return null;
    }

    // Check if transaction already exists
    const exists = await this._transactionExists(tx.id);
    if (exists) {
      this.stats.duplicatesSkipped++;
      return null;
    }

    // Build basic transaction object
    const transaction = {
      transaction_id: tx.id,
      amount: amount,
      payee_name: attributes.description,
      description: attributes.rawText || attributes.description,
      timestamp: attributes.createdAt,
      created_at: new Date().toISOString()
    };

    // Enrich merchant data
    const enrichment = await this.merchantEnrichment.enrichTransaction(transaction);

    // Update payee name if enriched
    if (enrichment.enrichedPayeeName) {
      transaction.payee_name = enrichment.enrichedPayeeName;
    }

    // Check whitelist
    const isWhitelisted = await this._checkWhitelist(transaction.payee_name);
    transaction.is_whitelisted = isWhitelisted;

    // Analyze for gambling patterns if not whitelisted
    if (!isWhitelisted) {
      const analysis = await this.patternLearner.analyzeTransaction(transaction);

      if (analysis.isGambling && analysis.confidence >= 70) {
        this.stats.gamblingTransactions++;

        // Add metadata to description
        transaction.description = `${transaction.description} [GAMBLING: ${analysis.gamblingType}, Confidence: ${analysis.confidence}%]`;

        // Log gambling transaction
        console.log(`   🎰 Gambling detected: ${transaction.payee_name} - $${Math.abs(amount).toFixed(2)} (${analysis.confidence}%)`);
      }
    }

    return transaction;
  }

  /**
   * Check if transaction already exists
   */
  async _transactionExists(transactionId) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .single();

      return !!data;
    } catch (error) {
      // Transaction doesn't exist
      return false;
    }
  }

  /**
   * Check if payee is whitelisted
   */
  async _checkWhitelist(payeeName) {
    try {
      const { data, error } = await this.supabase
        .from('whitelist')
        .select('id')
        .ilike('payee_name', payeeName)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Bulk insert transactions
   */
  async _bulkInsertTransactions(transactions) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .insert(transactions);

      if (error) {
        console.error('   ❌ Bulk insert error:', error);
        this.stats.errors += transactions.length;
      } else {
        console.log(`   ✓ Inserted ${transactions.length} transactions`);
      }
    } catch (error) {
      console.error('   ❌ Bulk insert failed:', error);
      this.stats.errors += transactions.length;
    }
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print final statistics
   */
  _printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total transactions processed:  ${this.stats.totalTransactions}`);
    console.log(`Gambling transactions found:   ${this.stats.gamblingTransactions} (${((this.stats.gamblingTransactions / this.stats.totalTransactions) * 100).toFixed(1)}%)`);
    console.log(`Duplicates skipped:            ${this.stats.duplicatesSkipped}`);
    console.log(`Batches processed:             ${this.stats.batches}`);
    console.log(`Errors encountered:            ${this.stats.errors}`);
    console.log('='.repeat(60) + '\n');

    if (this.stats.gamblingTransactions > 0) {
      console.log('💡 Next steps:');
      console.log('   1. Run analyze-gambling-baseline.js to calculate statistics');
      console.log('   2. Run generate-risk-profile.js to create your risk profile');
      console.log('   3. Review alerts in the mobile app\n');
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

  // Validate required options
  if (!options.token) {
    console.error('❌ Error: Up Bank token is required');
    console.log('\nUsage:');
    console.log('  node import-up-bank-history.js --token=<UP_TOKEN> --years=2');
    console.log('  node import-up-bank-history.js --token=<UP_TOKEN> --start=2022-01-01 --end=2024-01-01');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create importer and run
  const importer = new UpBankHistoryImporter(options.token, supabase);

  try {
    await importer.import(options);
    console.log('✅ Import completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UpBankHistoryImporter;
