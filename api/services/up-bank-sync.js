/**
 * Up Bank Sync Service
 * Main orchestration for transaction syncing
 * Ensures no transactions are missed even if webhooks fail
 */

const { createClient } = require('@supabase/supabase-js');
const { UpBankAPI, parseTransaction } = require('../utils/up-bank-api');
const { enrichTransaction, requiresImmediateIntervention } = require('./transaction-enrichment');
const { detectGamblingPattern } = require('./pattern-detection');
const { triggerAIConversation } = require('./ai-trigger');
const { notifyGuardian } = require('./guardian-notifier');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sync state tracking
const SYNC_STATE_KEY = 'up_bank_sync_state';

/**
 * Sync transactions for a user
 */
async function syncUserTransactions(userId, upBankToken, options = {}) {
  const {
    since = null, // ISO datetime
    until = null,
    isInitialImport = false,
  } = options;

  console.log(`[Sync] Starting sync for user ${userId}...`);

  try {
    // Initialize Up Bank API
    const upBank = new UpBankAPI(upBankToken);

    // Get sync cursor from database
    const syncState = await getSyncState(userId);
    const sinceCursor = since || syncState?.last_synced_at || getDefaultSince();

    console.log(`[Sync] Fetching transactions since ${sinceCursor}`);

    // Fetch all transactions from Up Bank
    const upTransactions = await upBank.getAllTransactions(
      sinceCursor,
      until,
      (progress) => {
        console.log(`[Sync] Progress: Page ${progress.page}, ${progress.totalFetched} transactions fetched`);
      }
    );

    console.log(`[Sync] Fetched ${upTransactions.length} transactions from Up Bank`);

    if (upTransactions.length === 0) {
      console.log(`[Sync] No new transactions to sync`);
      await updateSyncState(userId, { last_synced_at: new Date().toISOString() });
      return { synced: 0, processed: 0, interventions: 0 };
    }

    // Parse transactions to standard format
    const parsedTransactions = upTransactions.map(parseTransaction);

    // Sort chronologically (oldest first)
    parsedTransactions.sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );

    // Detect missed transactions
    const existingTransactionIds = await getExistingTransactionIds(userId);
    const newTransactions = parsedTransactions.filter(
      t => !existingTransactionIds.has(t.up_transaction_id)
    );

    console.log(`[Sync] ${newTransactions.length} new transactions to process`);

    if (newTransactions.length === 0) {
      await updateSyncState(userId, { last_synced_at: new Date().toISOString() });
      return { synced: 0, processed: 0, interventions: 0 };
    }

    // Get user context for enrichment
    const userContext = await getUserContext(userId);

    // Process each new transaction
    let processedCount = 0;
    let interventionCount = 0;

    for (const transaction of newTransactions) {
      try {
        await processTransaction(userId, transaction, userContext, isInitialImport);
        processedCount++;

        // Check if intervention was triggered
        const enriched = enrichTransaction(transaction, userContext);
        if (requiresImmediateIntervention(enriched)) {
          interventionCount++;
        }

        // Rate limiting between transactions
        await sleep(50);

      } catch (error) {
        console.error(`[Sync] Error processing transaction ${transaction.up_transaction_id}:`, error);
        // Continue processing other transactions
      }
    }

    // Update sync state
    const latestTransaction = newTransactions[newTransactions.length - 1];
    await updateSyncState(userId, {
      last_synced_at: latestTransaction.created_at,
      last_sync_completed_at: new Date().toISOString(),
      total_synced: (syncState?.total_synced || 0) + processedCount,
    });

    console.log(`[Sync] Completed: ${processedCount} transactions processed, ${interventionCount} interventions triggered`);

    return {
      synced: processedCount,
      processed: processedCount,
      interventions: interventionCount,
      oldest: newTransactions[0]?.created_at,
      newest: latestTransaction.created_at,
    };

  } catch (error) {
    console.error(`[Sync] Fatal error during sync for user ${userId}:`, error);

    // Log sync failure
    await logSyncFailure(userId, error.message);

    throw error;
  }
}

/**
 * Process individual transaction
 */
async function processTransaction(userId, transaction, userContext, isInitialImport) {
  // Enrich transaction with risk signals
  const enriched = enrichTransaction(transaction, userContext);

  // Store in database
  const { data: storedTransaction, error: storeError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      up_transaction_id: enriched.up_transaction_id,
      description: enriched.description,
      message: enriched.message,
      raw_text: enriched.raw_text,
      amount: enriched.amount,
      currency: enriched.currency,
      transaction_type: enriched.transaction_type,
      status: enriched.status,
      created_at: enriched.created_at,
      settled_at: enriched.settled_at,
      category: enriched.category,
      merchant_name: enriched.merchant_classification?.merchant,
      merchant_category: enriched.merchant_classification?.category,
      merchant_risk_score: enriched.merchant_risk_score,
      is_round_number: enriched.is_round_number,
      time_risk_score: enriched.time_risk_score,
      day_of_week: enriched.day_of_week,
      is_trigger_day: enriched.is_trigger_day,
      pattern_flags: enriched.pattern_flags,
      overall_risk_score: enriched.overall_risk_score,
      risk_level: enriched.risk_level,
    })
    .select()
    .single();

  if (storeError) {
    // Check if duplicate (unique constraint violation)
    if (storeError.code === '23505') {
      console.log(`[Sync] Transaction ${enriched.up_transaction_id} already exists, skipping`);
      return;
    }
    throw storeError;
  }

  console.log(`[Sync] Stored transaction ${enriched.up_transaction_id} (${enriched.description})`);

  // Skip intervention triggering for initial imports
  if (isInitialImport) {
    return;
  }

  // Detect gambling patterns
  if (enriched.pattern_flags?.length > 0) {
    try {
      const pattern = await detectGamblingPattern(userId, storedTransaction, enriched);

      if (pattern) {
        console.log(`[Sync] Pattern detected: ${pattern.pattern_type}`);
      }
    } catch (error) {
      console.error(`[Sync] Error detecting pattern:`, error);
    }
  }

  // Trigger immediate intervention if needed
  if (requiresImmediateIntervention(enriched)) {
    try {
      console.log(`[Sync] Triggering immediate intervention for ${enriched.description}`);

      // Trigger AI conversation
      const triggerType = enriched.merchant_classification?.category === 'GAMBLING_ONLINE'
        ? 'GAMBLING_ONLINE'
        : enriched.merchant_classification?.category === 'GAMBLING_VENUE'
        ? 'GAMBLING_VENUE'
        : enriched.merchant_classification?.category === 'PAYDAY_LOAN'
        ? 'PAYDAY_LOAN_DETECTED'
        : 'PATTERN_DETECTED';

      await triggerAIConversation(userId, storedTransaction, triggerType);

      // Notify guardian
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      await notifyGuardian(userId, 'HIGH_RISK_TRANSACTION', {
        userName: user?.name,
        transactionDescription: enriched.description,
        amount: Math.abs(enriched.amount),
        merchantCategory: enriched.merchant_classification?.category,
        riskLevel: enriched.risk_level,
      });

    } catch (error) {
      console.error(`[Sync] Error triggering intervention:`, error);
    }
  }
}

/**
 * Sync all active users
 */
async function syncAllUsers(options = {}) {
  console.log(`[Sync] Starting sync for all active users...`);

  // Get all users with Up Bank connected
  const { data: users, error } = await supabase
    .from('users')
    .select('id, up_bank_token')
    .not('up_bank_token', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error(`[Sync] Error fetching users:`, error);
    throw error;
  }

  console.log(`[Sync] Found ${users.length} users to sync`);

  const results = {
    total: users.length,
    success: 0,
    failed: 0,
    totalSynced: 0,
    totalInterventions: 0,
  };

  // Process users sequentially (avoid overwhelming Up Bank API)
  for (const user of users) {
    try {
      const result = await syncUserTransactions(user.id, user.up_bank_token, options);

      results.success++;
      results.totalSynced += result.synced;
      results.totalInterventions += result.interventions;

      // Rate limiting between users
      await sleep(1000);

    } catch (error) {
      console.error(`[Sync] Failed to sync user ${user.id}:`, error);
      results.failed++;
    }
  }

  console.log(`[Sync] Completed sync for all users: ${results.success} success, ${results.failed} failed`);
  console.log(`[Sync] Total: ${results.totalSynced} transactions synced, ${results.totalInterventions} interventions triggered`);

  return results;
}

/**
 * Reconcile transactions (detect any missed)
 */
async function reconcileUserTransactions(userId, upBankToken, daysBack = 30) {
  console.log(`[Sync] Starting reconciliation for user ${userId} (${daysBack} days back)...`);

  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  // Fetch from Up Bank
  const upBank = new UpBankAPI(upBankToken);
  const upTransactions = await upBank.getAllTransactions(since);

  const upTransactionIds = new Set(upTransactions.map(t => t.id));

  // Fetch from our database
  const { data: dbTransactions } = await supabase
    .from('transactions')
    .select('up_transaction_id')
    .eq('user_id', userId)
    .gte('created_at', since);

  const dbTransactionIds = new Set(dbTransactions?.map(t => t.up_transaction_id) || []);

  // Find missing transactions
  const missing = upTransactions.filter(t => !dbTransactionIds.has(t.id));

  console.log(`[Sync] Reconciliation: ${upTransactionIds.size} in Up Bank, ${dbTransactionIds.size} in database, ${missing.length} missing`);

  if (missing.length > 0) {
    console.log(`[Sync] Found ${missing.length} missed transactions, backfilling...`);

    // Get user context
    const userContext = await getUserContext(userId);

    // Process missed transactions
    for (const upTransaction of missing) {
      const parsed = parseTransaction(upTransaction);
      await processTransaction(userId, parsed, userContext, false);
      await sleep(50);
    }

    console.log(`[Sync] Backfilled ${missing.length} missed transactions`);
  }

  return {
    total: upTransactionIds.size,
    inDatabase: dbTransactionIds.size,
    missing: missing.length,
    backfilled: missing.length,
  };
}

/**
 * Get sync state for user
 */
async function getSyncState(userId) {
  const { data } = await supabase
    .from('sync_state')
    .select('*')
    .eq('user_id', userId)
    .eq('service', 'up_bank')
    .single();

  return data;
}

/**
 * Update sync state
 */
async function updateSyncState(userId, updates) {
  const { error } = await supabase
    .from('sync_state')
    .upsert({
      user_id: userId,
      service: 'up_bank',
      ...updates,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`[Sync] Error updating sync state:`, error);
  }
}

/**
 * Log sync failure
 */
async function logSyncFailure(userId, errorMessage) {
  await supabase
    .from('sync_errors')
    .insert({
      user_id: userId,
      service: 'up_bank',
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
}

/**
 * Get existing transaction IDs for user
 */
async function getExistingTransactionIds(userId) {
  const { data } = await supabase
    .from('transactions')
    .select('up_transaction_id')
    .eq('user_id', userId);

  return new Set(data?.map(t => t.up_transaction_id) || []);
}

/**
 * Get user context for enrichment
 */
async function getUserContext(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('current_streak_days, known_triggers')
    .eq('id', userId)
    .single();

  // Get payday info if available
  const { data: paydays } = await supabase
    .from('user_paydays')
    .select('day_of_month')
    .eq('user_id', userId);

  return {
    currentStreak: user?.current_streak_days || 0,
    knownTriggers: user?.known_triggers,
    paydayDates: paydays?.map(p => p.day_of_month) || [],
  };
}

/**
 * Get default since date (24 hours ago)
 */
function getDefaultSince() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`[Sync] Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = {
  syncUserTransactions,
  syncAllUsers,
  reconcileUserTransactions,
  processTransaction,
  getSyncState,
  updateSyncState,
  retryWithBackoff,
};
