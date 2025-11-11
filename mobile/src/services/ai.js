/**
 * AI Service
 *
 * Handles all AI-related operations for Anchor
 * - Onboarding conversations
 * - Payment request evaluation
 * - General conversations (interventions, check-ins)
 * - User profile management
 */

import Constants from 'expo-constants';

// Get API base URL from environment
const API_BASE_URL = Constants.expoConfig.extra.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * Onboarding Operations
 */
export const onboardingService = {
  /**
   * Start onboarding with transaction history analysis
   */
  async start(userId, transactionHistory) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          transaction_history: transactionHistory,
          stage: 'analyze_transactions'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start onboarding');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting onboarding:', error);
      throw error;
    }
  },

  /**
   * Continue onboarding conversation
   */
  async continueConversation(userId, conversationId, userMessage) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          user_message: userMessage,
          stage: 'ask_questions'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to continue onboarding');
      }

      return await response.json();
    } catch (error) {
      console.error('Error continuing onboarding:', error);
      throw error;
    }
  }
};

/**
 * Payment Request Operations
 */
export const paymentRequestService = {
  /**
   * Evaluate a payment request
   */
  async evaluate(userId, amount, payeeName, reason) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/evaluate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount,
          payee_name: payeeName,
          reason,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate payment request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error evaluating payment:', error);
      throw error;
    }
  }
};

/**
 * Conversation Operations
 */
export const conversationService = {
  /**
   * Start or continue a conversation
   */
  async sendMessage(userId, userMessage, options = {}) {
    const {
      conversationId = null,
      conversationType = 'intervention',
      context = {}
    } = options;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          user_message: userMessage,
          conversation_type: conversationType,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Start intervention conversation
   */
  async startIntervention(userId, transactionId, transaction) {
    try {
      const response = await conversationService.sendMessage(
        userId,
        `I just spent $${Math.abs(transaction.amount)} at ${transaction.payee_name}`,
        {
          conversationType: 'intervention',
          context: {
            transaction_id: transactionId,
            transaction
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error starting intervention:', error);
      throw error;
    }
  },

  /**
   * Continue payment request conversation
   */
  async continuePaymentConversation(userId, conversationId, paymentRequestId, userMessage) {
    try {
      const response = await conversationService.sendMessage(
        userId,
        userMessage,
        {
          conversationId,
          conversationType: 'payment_request',
          context: {
            payment_request_id: paymentRequestId
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error continuing payment conversation:', error);
      throw error;
    }
  }
};

/**
 * Daily Check-in Operations
 */
export const checkInService = {
  /**
   * Get daily check-in message
   */
  async getCheckIn(userId, timeOfDay = 'morning') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/daily-check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          time_of_day: timeOfDay
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get check-in');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting check-in:', error);
      throw error;
    }
  }
};

/**
 * Profile Operations
 */
export const profileService = {
  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      // This would call Supabase directly since it's a simple read
      const { supabase } = require('./supabase');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  },

  /**
   * Get clean streak
   */
  async getCleanStreak(userId) {
    try {
      const { supabase } = require('./supabase');

      const { data, error } = await supabase
        .from('user_clean_streak')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting clean streak:', error);
      throw error;
    }
  },

  /**
   * Update profile configuration (vault/allowance accounts)
   */
  async updateAccounts(userId, vaultAccountId, allowanceAccountId) {
    try {
      const { supabase } = require('./supabase');

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          vault_account_id: vaultAccountId,
          allowance_account_id: allowanceAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating accounts:', error);
      throw error;
    }
  }
};

export default {
  onboardingService,
  paymentRequestService,
  conversationService,
  checkInService,
  profileService
};
