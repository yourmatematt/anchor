/**
 * Up Bank Service
 *
 * Handles all Up Bank API interactions
 * - Account balance fetching
 * - Transaction history
 * - Webhook setup
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;
const UP_TOKEN_KEY = 'up_personal_access_token';

/**
 * Token Management
 */
export const tokenService = {
  // Save Up Bank token securely
  async saveToken(token) {
    await SecureStore.setItemAsync(UP_TOKEN_KEY, token);
  },

  // Get saved token
  async getToken() {
    return await SecureStore.getItemAsync(UP_TOKEN_KEY);
  },

  // Remove token
  async removeToken() {
    await SecureStore.deleteItemAsync(UP_TOKEN_KEY);
  },

  // Check if token exists
  async hasToken() {
    const token = await this.getToken();
    return !!token;
  }
};

/**
 * Account Operations
 */
export const accountService = {
  // Get all accounts and balances
  async getAccounts() {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const response = await fetch(`${API_URL}/api/up/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch accounts');
    }

    return await response.json();
  },

  // Get total balance across all accounts
  async getTotalBalance() {
    const { totalBalance } = await this.getAccounts();
    return totalBalance;
  }
};

/**
 * Transaction Operations
 */
export const transactionService = {
  // Get recent transactions
  async getTransactions(options = {}) {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const params = new URLSearchParams();
    if (options.accountId) params.append('accountId', options.accountId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.since) params.append('since', options.since);
    if (options.until) params.append('until', options.until);

    const url = `${API_URL}/api/up/transactions?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch transactions');
    }

    return await response.json();
  },

  // Get today's transactions
  async getTodayTransactions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    return await this.getTransactions({ since, limit: 50 });
  }
};

/**
 * Webhook Operations
 */
export const webhookService = {
  // List existing webhooks
  async listWebhooks() {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const response = await fetch(`${API_URL}/api/up/webhook-setup`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list webhooks');
    }

    return await response.json();
  },

  // Create new webhook
  async createWebhook(webhookUrl) {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const response = await fetch(`${API_URL}/api/up/webhook-setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhookUrl })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create webhook');
    }

    return await response.json();
  },

  // Delete webhook
  async deleteWebhook(webhookId) {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const response = await fetch(`${API_URL}/api/up/webhook-setup`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhookId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete webhook');
    }

    return await response.json();
  },

  // Ping webhook (test it)
  async pingWebhook(webhookId) {
    const token = await tokenService.getToken();
    if (!token) throw new Error('No Up Bank token found');

    const response = await fetch(`${API_URL}/api/up/webhook-setup?ping=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhookId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to ping webhook');
    }

    return await response.json();
  }
};

export default {
  tokenService,
  accountService,
  transactionService,
  webhookService
};
