/**
 * Up Bank API Wrapper
 * Handles all interactions with Up Bank API
 *
 * API Docs: https://developer.up.com.au/
 */

const fetch = require('node-fetch');

const UP_BANK_BASE_URL = 'https://api.up.com.au/api/v1';

class UpBankAPI {
  constructor(token) {
    if (!token) {
      throw new Error('Up Bank token is required');
    }
    this.token = token;
  }

  /**
   * Make authenticated request to Up Bank API
   */
  async request(endpoint, options = {}) {
    const url = `${UP_BANK_BASE_URL}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Up Bank API Error: ${response.status} - ${error.errors?.[0]?.detail || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Up Bank API request failed:', error);
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccounts() {
    const data = await this.request('/accounts');
    return data.data;
  }

  /**
   * Get transactions with pagination
   * @param {Object} options - Query options
   * @param {string} options.since - ISO 8601 datetime
   * @param {string} options.until - ISO 8601 datetime
   * @param {number} options.pageSize - Number of results per page (max 100)
   * @param {string} options.cursor - Pagination cursor from previous response
   */
  async getTransactions(options = {}) {
    const params = new URLSearchParams();

    if (options.since) params.append('filter[since]', options.since);
    if (options.until) params.append('filter[until]', options.until);
    if (options.pageSize) params.append('page[size]', Math.min(options.pageSize, 100));
    if (options.cursor) params.append('page[after]', options.cursor);

    const endpoint = `/transactions?${params.toString()}`;
    const response = await this.request(endpoint);

    return {
      transactions: response.data,
      nextCursor: response.links?.next ? this.extractCursor(response.links.next) : null,
      hasMore: !!response.links?.next,
    };
  }

  /**
   * Get all transactions within date range
   * Handles pagination automatically
   */
  async getAllTransactions(since, until, progressCallback) {
    let allTransactions = [];
    let cursor = null;
    let page = 0;

    do {
      const response = await this.getTransactions({
        since,
        until,
        pageSize: 100,
        cursor,
      });

      allTransactions = allTransactions.concat(response.transactions);
      cursor = response.nextCursor;
      page++;

      if (progressCallback) {
        progressCallback({
          page,
          totalFetched: allTransactions.length,
          hasMore: response.hasMore,
        });
      }

      // Respect rate limits (300 requests per minute)
      if (response.hasMore) {
        await this.sleep(200); // 200ms between requests = max 300/min
      }

    } while (cursor);

    return allTransactions;
  }

  /**
   * Get recent transactions (last N days)
   */
  async getRecentTransactions(days = 1) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return await this.getAllTransactions(since);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    const data = await this.request(`/transactions/${transactionId}`);
    return data.data;
  }

  /**
   * Extract cursor from pagination URL
   */
  extractCursor(url) {
    const match = url.match(/page\[after\]=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Sleep helper for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      await this.request('/util/ping');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Parse Up Bank transaction to standard format
 */
function parseTransaction(upTransaction) {
  const attributes = upTransaction.attributes;

  return {
    up_transaction_id: upTransaction.id,
    description: attributes.description,
    message: attributes.message,
    raw_text: attributes.rawText,
    amount: parseFloat(attributes.amount.value),
    currency: attributes.amount.currency,
    transaction_type: attributes.amount.valueInBaseUnits < 0 ? 'DEBIT' : 'CREDIT',
    status: attributes.status,
    created_at: attributes.createdAt,
    settled_at: attributes.settledAt,
    category: attributes.category,
    foreign_amount: attributes.foreignAmount ? {
      amount: parseFloat(attributes.foreignAmount.value),
      currency: attributes.foreignAmount.currencyCode,
    } : null,
    round_up: attributes.roundUp ? parseFloat(attributes.roundUp.amount.value) : null,
  };
}

module.exports = {
  UpBankAPI,
  parseTransaction,
};
