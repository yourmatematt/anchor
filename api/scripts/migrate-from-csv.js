#!/usr/bin/env node

/**
 * CSV Migration Script
 *
 * Imports transaction history from CSV files (for banks other than Up)
 * Supports standard formats from:
 * - Commonwealth Bank
 * - ANZ
 * - Westpac
 * - NAB
 * - Generic CSV format
 *
 * Usage:
 *   node migrate-from-csv.js --file=transactions.csv --bank=commbank
 *   node migrate-from-csv.js --file=transactions.csv --format=generic
 */

const { createClient } = require('@supabase/supabase-js');
const PatternLearner = require('../services/pattern-learner');
const MerchantEnrichment = require('../services/merchant-enrichment');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// CSV format definitions for different banks
const BANK_FORMATS = {
  commbank: {
    name: 'Commonwealth Bank',
    delimiter: ',',
    hasHeader: true,
    columns: {
      date: 0,
      amount: 1,
      description: 2,
      balance: 3
    },
    dateFormat: 'DD/MM/YYYY'
  },
  anz: {
    name: 'ANZ',
    delimiter: ',',
    hasHeader: true,
    columns: {
      date: 1,
      amount: 2,
      description: 3,
      balance: 4
    },
    dateFormat: 'DD/MM/YYYY'
  },
  westpac: {
    name: 'Westpac',
    delimiter: ',',
    hasHeader: true,
    columns: {
      date: 0,
      amount: 1,
      description: 2,
      type: 3
    },
    dateFormat: 'DD/MM/YYYY'
  },
  nab: {
    name: 'NAB',
    delimiter: ',',
    hasHeader: true,
    columns: {
      date: 0,
      amount: 1,
      description: 3,
      category: 4
    },
    dateFormat: 'DD Mon YYYY'
  },
  generic: {
    name: 'Generic',
    delimiter: ',',
    hasHeader: true,
    columns: {
      date: 0,
      amount: 1,
      description: 2
    },
    dateFormat: 'YYYY-MM-DD'
  }
};

class CSVMigrator {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.patternLearner = new PatternLearner(supabaseClient);
    this.merchantEnrichment = new MerchantEnrichment(supabaseClient);
    this.stats = {
      totalRows: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      gamblingFound: 0
    };
  }

  /**
   * Main migration function
   */
  async migrate(filePath, bankFormat) {
    console.log(`📄 Starting CSV migration from ${bankFormat.name}...\n`);

    try {
      // Read and parse CSV file
      const rows = await this._readCSV(filePath, bankFormat);
      console.log(`📦 Loaded ${rows.length} rows from CSV\n`);

      this.stats.totalRows = rows.length;

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        if ((i + 1) % 50 === 0) {
          process.stdout.write(`\r   Processing: ${i + 1}/${rows.length}`);
        }

        try {
          await this._processRow(rows[i], bankFormat);
        } catch (error) {
          console.error(`\n   ⚠️  Error processing row ${i + 1}:`, error.message);
          this.stats.errors++;
        }
      }

      console.log(`\r   Processing: ${rows.length}/${rows.length} ✓\n`);

      // Print statistics
      this._printStats();

      return this.stats;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Read and parse CSV file
   */
  async _readCSV(filePath, bankFormat) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      // Skip header if present
      const startIndex = bankFormat.hasHeader ? 1 : 0;

      return lines.slice(startIndex).map(line => {
        // Simple CSV parsing (handles quoted fields)
        const fields = this._parseCSVLine(line, bankFormat.delimiter);
        return fields;
      });
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw error;
    }
  }

  /**
   * Parse a CSV line (handles quoted fields)
   */
  _parseCSVLine(line, delimiter) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    fields.push(currentField.trim());

    return fields;
  }

  /**
   * Process a single CSV row
   */
  async _processRow(fields, bankFormat) {
    const cols = bankFormat.columns;

    // Extract fields
    const dateStr = fields[cols.date];
    const amountStr = fields[cols.amount];
    const description = fields[cols.description] || '';

    // Parse date
    const timestamp = this._parseDate(dateStr, bankFormat.dateFormat);
    if (!timestamp) {
      this.stats.skipped++;
      return;
    }

    // Parse amount
    const amount = this._parseAmount(amountStr);
    if (amount === null || amount === 0) {
      this.stats.skipped++;
      return;
    }

    // Generate transaction ID from hash of date + amount + description
    const transactionId = this._generateTransactionId(timestamp, amount, description);

    // Check if already exists
    const exists = await this._transactionExists(transactionId);
    if (exists) {
      this.stats.skipped++;
      return;
    }

    // Create transaction object
    const transaction = {
      transaction_id: transactionId,
      amount: amount,
      payee_name: this._extractPayeeName(description),
      description: description,
      timestamp: timestamp.toISOString(),
      created_at: new Date().toISOString()
    };

    // Enrich merchant data
    const enrichment = await this.merchantEnrichment.enrichTransaction(transaction);
    if (enrichment.enrichedPayeeName) {
      transaction.payee_name = enrichment.enrichedPayeeName;
    }

    // Check whitelist
    const isWhitelisted = await this._checkWhitelist(transaction.payee_name);
    transaction.is_whitelisted = isWhitelisted;

    // Analyze for gambling if not whitelisted
    if (!isWhitelisted) {
      const analysis = await this.patternLearner.analyzeTransaction(transaction);

      if (analysis.isGambling && analysis.confidence >= 70) {
        this.stats.gamblingFound++;
        transaction.description = `${transaction.description} [GAMBLING: ${analysis.gamblingType}]`;
      }
    }

    // Insert transaction
    await this._insertTransaction(transaction);
    this.stats.imported++;
  }

  /**
   * Parse date string to Date object
   */
  _parseDate(dateStr, format) {
    try {
      // Remove any extra whitespace
      dateStr = dateStr.trim();

      if (format === 'DD/MM/YYYY') {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      } else if (format === 'DD Mon YYYY') {
        // e.g., "15 Jan 2024"
        const parts = dateStr.split(' ');
        const day = parseInt(parts[0]);
        const monthMap = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      } else if (format === 'YYYY-MM-DD') {
        return new Date(dateStr);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse amount string to number
   */
  _parseAmount(amountStr) {
    try {
      // Remove currency symbols and whitespace
      amountStr = amountStr.replace(/[$,\s]/g, '');

      // Handle negative amounts in parentheses: (100.00)
      if (amountStr.startsWith('(') && amountStr.endsWith(')')) {
        amountStr = '-' + amountStr.slice(1, -1);
      }

      const amount = parseFloat(amountStr);
      return isNaN(amount) ? null : amount;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract payee name from description
   */
  _extractPayeeName(description) {
    // Try to extract merchant name from common patterns
    description = description.trim();

    // Remove common prefixes
    const prefixes = [
      'EFTPOS ',
      'VISA PURCHASE ',
      'PURCHASE ',
      'DEBIT ',
      'CREDIT ',
      'ATM WITHDRAWAL ',
      'TRANSFER TO ',
      'TRANSFER FROM ',
      'DIRECT DEBIT ',
      'BPAY ',
      'PAYPAL '
    ];

    for (const prefix of prefixes) {
      if (description.toUpperCase().startsWith(prefix.toUpperCase())) {
        description = description.substring(prefix.length);
        break;
      }
    }

    // Take first part before date/time or reference numbers
    const parts = description.split(/\d{2}\/\d{2}|\d{2}:\d{2}|CARD \d+|VALUE DATE/);
    let payeeName = parts[0].trim();

    // Remove trailing reference numbers
    payeeName = payeeName.replace(/\s+\d+$/, '');

    return payeeName || description;
  }

  /**
   * Generate transaction ID from transaction details
   */
  _generateTransactionId(timestamp, amount, description) {
    const crypto = require('crypto');
    const data = `${timestamp.toISOString()}-${amount}-${description}`;
    return 'csv-' + crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Check if transaction already exists
   */
  async _transactionExists(transactionId) {
    try {
      const { data } = await this.supabase
        .from('transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if payee is whitelisted
   */
  async _checkWhitelist(payeeName) {
    try {
      const { data } = await this.supabase
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
   * Insert transaction into database
   */
  async _insertTransaction(transaction) {
    try {
      const { error } = await this.supabase
        .from('transactions')
        .insert(transaction);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Print statistics
   */
  _printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 CSV MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total rows:                ${this.stats.totalRows}`);
    console.log(`Successfully imported:     ${this.stats.imported}`);
    console.log(`Skipped (duplicates/invalid): ${this.stats.skipped}`);
    console.log(`Gambling transactions found:  ${this.stats.gamblingFound}`);
    console.log(`Errors:                    ${this.stats.errors}`);
    console.log('='.repeat(60) + '\n');

    if (this.stats.imported > 0) {
      console.log('💡 Next steps:');
      console.log('   1. Run analyze-gambling-baseline.js to analyze patterns');
      console.log('   2. Review alerts in the mobile app\n');
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
  if (!options.file) {
    console.error('❌ Error: CSV file path is required');
    console.log('\nUsage:');
    console.log('  node migrate-from-csv.js --file=transactions.csv --bank=commbank');
    console.log('  node migrate-from-csv.js --file=transactions.csv --format=generic');
    console.log('\nSupported banks:');
    console.log('  - commbank (Commonwealth Bank)');
    console.log('  - anz (ANZ)');
    console.log('  - westpac (Westpac)');
    console.log('  - nab (NAB)');
    console.log('  - generic (Generic CSV format)');
    process.exit(1);
  }

  // Determine bank format
  const bankKey = options.bank || options.format || 'generic';
  const bankFormat = BANK_FORMATS[bankKey];

  if (!bankFormat) {
    console.error(`❌ Error: Unknown bank format '${bankKey}'`);
    console.log('Supported formats:', Object.keys(BANK_FORMATS).join(', '));
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(options.file)) {
    console.error(`❌ Error: File not found: ${options.file}`);
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create migrator and run
  const migrator = new CSVMigrator(supabase);

  try {
    await migrator.migrate(options.file, bankFormat);
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CSVMigrator;
