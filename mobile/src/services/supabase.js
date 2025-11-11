/**
 * Supabase Service
 *
 * Handles all database operations for Anchor
 * - Whitelist management
 * - Transaction logging
 * - Voice memo storage
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig.extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Whitelist Operations
 */
export const whitelistService = {
  // Get all whitelisted payees
  async getAll() {
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Add new payee to whitelist
  async add(payeeName, category, notes = '') {
    const { data, error } = await supabase
      .from('whitelist')
      .insert({
        payee_name: payeeName,
        category,
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove payee from whitelist
  async remove(id) {
    const { error } = await supabase
      .from('whitelist')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Check if payee is whitelisted
  async isWhitelisted(payeeName) {
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .ilike('payee_name', payeeName)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
};

/**
 * Transaction Operations
 */
export const transactionService = {
  // Get recent transactions
  async getRecent(limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get non-whitelisted transactions (alerts)
  async getAlerts() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_whitelisted', false)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get pending interventions (no voice memo yet)
  async getPendingInterventions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_whitelisted', false)
      .eq('intervention_completed', false)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update transaction with voice memo
  async updateVoiceMemo(transactionId, voiceMemoUrl, transcript) {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        voice_memo_url: voiceMemoUrl,
        voice_memo_transcript: transcript,
        intervention_completed: true
      })
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get transaction by ID
  async getById(transactionId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Real-time subscriptions
 */
export const realtimeService = {
  // Subscribe to new transactions
  subscribeToTransactions(callback) {
    return supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        callback
      )
      .subscribe();
  },

  // Unsubscribe from channel
  unsubscribe(channel) {
    supabase.removeChannel(channel);
  }
};

export default {
  supabase,
  whitelistService,
  transactionService,
  realtimeService
};
