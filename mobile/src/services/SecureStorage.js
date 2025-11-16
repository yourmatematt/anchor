/**
 * Secure Storage Service
 * Encrypted storage for sensitive data using Expo SecureStore
 *
 * SECURITY RULES:
 * - Up Bank token: encrypted, never in logs
 * - User session: encrypted
 * - Guardian info: encrypted
 * - NEVER store: patterns, amounts, transaction details (fetch on demand)
 */

import * as SecureStore from 'expo-secure-store';

// Storage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  UP_BANK_TOKEN: 'up_bank_token',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  GUARDIAN_INFO: 'guardian_info',
  COMMITMENT_END_DATE: 'commitment_end_date',
  ONBOARDING_COMPLETED: 'onboarding_completed',
};

class SecureStorageService {
  /**
   * Set encrypted item in secure store
   */
  async set(key, value) {
    try {
      if (value === null || value === undefined) {
        await this.remove(key);
        return;
      }

      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(key, stringValue);
    } catch (error) {
      console.error(`SecureStorage.set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get encrypted item from secure store
   */
  async get(key) {
    try {
      const value = await SecureStore.getItemAsync(key);

      if (value === null) {
        return null;
      }

      // Try to parse as JSON, return string if fails
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`SecureStorage.get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from secure store
   */
  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`SecureStorage.remove error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data
   * Use with extreme caution
   */
  async clearAll() {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map(key => this.remove(key)));
    } catch (error) {
      console.error('SecureStorage.clearAll error:', error);
      throw error;
    }
  }

  // Convenience methods for common operations

  /**
   * Store user authentication token
   */
  async setUserToken(token) {
    await this.set(STORAGE_KEYS.USER_TOKEN, token);
  }

  /**
   * Get user authentication token
   */
  async getUserToken() {
    return await this.get(STORAGE_KEYS.USER_TOKEN);
  }

  /**
   * Store Up Bank token (encrypted, never logged)
   */
  async setUpBankToken(token) {
    await this.set(STORAGE_KEYS.UP_BANK_TOKEN, token);
  }

  /**
   * Get Up Bank token
   */
  async getUpBankToken() {
    return await this.get(STORAGE_KEYS.UP_BANK_TOKEN);
  }

  /**
   * Store user ID
   */
  async setUserId(userId) {
    await this.set(STORAGE_KEYS.USER_ID, userId);
  }

  /**
   * Get user ID
   */
  async getUserId() {
    return await this.get(STORAGE_KEYS.USER_ID);
  }

  /**
   * Store user data (non-sensitive profile info)
   */
  async setUserData(userData) {
    // Only store safe data, not sensitive financial info
    const safeData = {
      name: userData.name,
      phone: userData.phone,
      commitment_period_months: userData.commitment_period_months,
      commitment_start_date: userData.commitment_start_date,
      commitment_end_date: userData.commitment_end_date,
      gambling_type: userData.gambling_type,
      known_triggers: userData.known_triggers,
    };

    await this.set(STORAGE_KEYS.USER_DATA, safeData);
  }

  /**
   * Get user data
   */
  async getUserData() {
    return await this.get(STORAGE_KEYS.USER_DATA);
  }

  /**
   * Store guardian info
   */
  async setGuardianInfo(guardianInfo) {
    // Only store safe data
    const safeData = {
      name: guardianInfo.name,
      relationship: guardianInfo.relationship,
      status: guardianInfo.status,
    };

    await this.set(STORAGE_KEYS.GUARDIAN_INFO, safeData);
  }

  /**
   * Get guardian info
   */
  async getGuardianInfo() {
    return await this.get(STORAGE_KEYS.GUARDIAN_INFO);
  }

  /**
   * Set commitment end date
   */
  async setCommitmentEndDate(date) {
    await this.set(STORAGE_KEYS.COMMITMENT_END_DATE, date);
  }

  /**
   * Get commitment end date
   */
  async getCommitmentEndDate() {
    return await this.get(STORAGE_KEYS.COMMITMENT_END_DATE);
  }

  /**
   * Check if user is in commitment period
   */
  async isInCommitmentPeriod() {
    const endDate = await this.getCommitmentEndDate();

    if (!endDate) {
      return false;
    }

    return new Date(endDate) > new Date();
  }

  /**
   * Mark onboarding as completed
   */
  async setOnboardingCompleted(completed = true) {
    await this.set(STORAGE_KEYS.ONBOARDING_COMPLETED, completed.toString());
  }

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted() {
    const completed = await this.get(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return completed === 'true';
  }

  /**
   * Logout - clear sensitive session data but keep device-specific settings
   */
  async logout() {
    await this.remove(STORAGE_KEYS.USER_TOKEN);
    await this.remove(STORAGE_KEYS.UP_BANK_TOKEN);
    await this.remove(STORAGE_KEYS.USER_ID);
    await this.remove(STORAGE_KEYS.USER_DATA);
    await this.remove(STORAGE_KEYS.GUARDIAN_INFO);
    await this.remove(STORAGE_KEYS.COMMITMENT_END_DATE);
    // Keep ONBOARDING_COMPLETED to avoid showing onboarding again
  }

  /**
   * Get all storage keys (for debugging - NEVER log values)
   */
  getStorageKeys() {
    return STORAGE_KEYS;
  }
}

// Singleton instance
const SecureStorage = new SecureStorageService();

export default SecureStorage;
export { STORAGE_KEYS };
