/**
 * Transaction Processor for Anchor
 *
 * Handles transaction storage, updates, and queries
 * Manages clean streak tracking and relapse detection
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Store transaction in database with pattern detection results
 */
async function storeTransaction(transaction, patternResult, userId) {
  const {
    transactionId,
    amount,
    description,
    rawText,
    timestamp,
    transactionType,
    isWhitelisted,
  } = transaction;

  const transactionData = {
    user_id: userId,
    transaction_id: transactionId,
    amount: parseFloat(amount),
    description: description,
    raw_text: rawText || description,
    timestamp: timestamp,
    transaction_type: transactionType,
    is_whitelisted: isWhitelisted,
    // Pattern detection results
    pattern_detected: patternResult ? patternResult.primaryPattern.pattern : null,
    risk_level: patternResult ? patternResult.primaryPattern.risk : null,
    intervention_required: patternResult ? patternResult.shouldTriggerAI : false,
    intervention_completed: false, // Will be updated after AI conversation
    guardian_notified: false, // Will be updated after notification sent
    // Metadata
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error storing transaction:', error);
    throw new Error(`Failed to store transaction: ${error.message}`);
  }

  console.log('Transaction stored:', {
    id: transactionId,
    pattern: transactionData.pattern_detected,
    risk: transactionData.risk_level,
  });

  return data;
}

/**
 * Get user's recent transactions
 */
async function getRecentTransactions(userId, limit = 50) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get today's transactions for pattern analysis
 */
async function getTodayTransactions(userId) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', today)
    .lt('timestamp', tomorrow)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching today transactions:', error);
    return [];
  }

  return data || [];
}

/**
 * Update transaction after AI intervention
 */
async function markInterventionComplete(transactionId, aiConversationId, outcome) {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      intervention_completed: true,
      ai_conversation_id: aiConversationId,
      intervention_outcome: outcome, // e.g., 'confirmed_gambling', 'false_alarm', 'needs_follow_up'
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', transactionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating intervention status:', error);
    throw new Error(`Failed to update intervention: ${error.message}`);
  }

  return data;
}

/**
 * Mark guardian as notified for a transaction
 */
async function markGuardianNotified(transactionId) {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      guardian_notified: true,
      guardian_notified_at: new Date().toISOString(),
    })
    .eq('transaction_id', transactionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating guardian notification status:', error);
    throw new Error(`Failed to update guardian status: ${error.message}`);
  }

  return data;
}

/**
 * Get user's clean streak information
 */
async function getCleanStreak(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('last_relapse_date, commitment_start_date, current_streak_days')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching clean streak:', error);
    return { days: 0, startDate: null };
  }

  // Calculate days since last relapse or commitment start
  const startDate = user.last_relapse_date || user.commitment_start_date;
  if (!startDate) {
    return { days: 0, startDate: null };
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    days: daysSince,
    startDate: startDate,
    lastRelapseDate: user.last_relapse_date,
  };
}

/**
 * Reset clean streak (when relapse confirmed)
 */
async function resetCleanStreak(userId, reason, transactionId) {
  const now = new Date().toISOString();

  // Update user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .update({
      last_relapse_date: now,
      current_streak_days: 0,
      total_relapses: supabase.raw('total_relapses + 1'),
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single();

  if (userError) {
    console.error('Error resetting clean streak:', userError);
    throw new Error(`Failed to reset streak: ${userError.message}`);
  }

  // Log the relapse event
  const { error: eventError } = await supabase
    .from('gambling_patterns')
    .insert({
      user_id: userId,
      pattern_type: reason,
      transaction_id: transactionId,
      detected_at: now,
      severity: 'RELAPSE',
      details: { reason: reason },
    });

  if (eventError) {
    console.error('Error logging relapse event:', eventError);
  }

  console.log('Clean streak reset for user:', userId, 'Reason:', reason);

  return {
    previousStreak: userData.current_streak_days,
    totalRelapses: userData.total_relapses,
    relapseDate: now,
  };
}

/**
 * Log gambling pattern detection (for analytics and AI training)
 */
async function logGamblingPattern(userId, pattern, transactionId) {
  const { data, error } = await supabase
    .from('gambling_patterns')
    .insert({
      user_id: userId,
      pattern_type: pattern.pattern,
      transaction_id: transactionId,
      detected_at: new Date().toISOString(),
      severity: pattern.risk,
      confidence_score: pattern.riskScore || null,
      details: {
        amount: pattern.amount,
        venue: pattern.venue || null,
        provider: pattern.provider || null,
        riskFactors: pattern.riskFactors || [],
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging gambling pattern:', error);
    return null;
  }

  return data;
}

/**
 * Get user context for pattern detection
 * (known patterns, triggers, history)
 */
async function getUserContext(userId) {
  // Get user's gambling patterns from AI interview
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('gambling_type, known_triggers, commitment_period_months')
    .eq('id', userId)
    .single();

  if (userError) {
    console.warn('Error fetching user context:', userError);
  }

  // Get recent patterns
  const { data: recentPatterns, error: patternsError } = await supabase
    .from('gambling_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(10);

  if (patternsError) {
    console.warn('Error fetching recent patterns:', patternsError);
  }

  return {
    gamblingType: user?.gambling_type || [],
    knownTriggers: user?.known_triggers || [],
    recentPatterns: recentPatterns || [],
  };
}

/**
 * Check if transaction amount is part of daily withdrawal pattern
 */
async function checkWithdrawalPattern(userId, amount, timestamp) {
  const todayTransactions = await getTodayTransactions(userId);

  const withdrawals = todayTransactions.filter(t =>
    (t.description?.toLowerCase().includes('atm') ||
     t.description?.toLowerCase().includes('withdrawal')) &&
    t.transaction_type === 'DEBIT'
  );

  const totalWithdrawn = withdrawals.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    Math.abs(amount) // Include current transaction
  );

  return {
    count: withdrawals.length + 1,
    totalAmount: totalWithdrawn,
    isSuspicious: withdrawals.length >= 2 && totalWithdrawn > 100,
  };
}

module.exports = {
  storeTransaction,
  getRecentTransactions,
  getTodayTransactions,
  markInterventionComplete,
  markGuardianNotified,
  getCleanStreak,
  resetCleanStreak,
  logGamblingPattern,
  getUserContext,
  checkWithdrawalPattern,
};
