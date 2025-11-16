/**
 * Biometric Authentication Service
 * Face ID / Touch ID for app access
 * Cannot be disabled during commitment period
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const LAST_AUTH_TIME_KEY = 'last_auth_time';
const AUTH_TIMEOUT = 60 * 1000; // 1 minute

class BiometricAuthService {
  constructor() {
    this.appState = AppState.currentState;
    this.lastAuthTime = null;
    this.isAuthenticated = false;
    this.authListeners = [];
  }

  /**
   * Initialize biometric authentication
   * Sets up app state listener for background/foreground
   */
  async initialize() {
    try {
      // Check if device supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        console.warn('Device does not support biometric authentication');
        return false;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        console.warn('No biometrics enrolled on device');
        return false;
      }

      // Get supported types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported biometric types:', types);

      // Set up app state listener
      this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange.bind(this));

      // Load last auth time
      const lastAuthStr = await SecureStore.getItemAsync(LAST_AUTH_TIME_KEY);
      if (lastAuthStr) {
        this.lastAuthTime = parseInt(lastAuthStr, 10);
      }

      return true;
    } catch (error) {
      console.error('Biometric initialization error:', error);
      return false;
    }
  }

  /**
   * Handle app state changes (background/foreground)
   */
  _handleAppStateChange = async (nextAppState) => {
    // Coming back to foreground
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      const requiresAuth = await this.requiresAuthentication();
      if (requiresAuth) {
        this.isAuthenticated = false;
        this._notifyListeners({ locked: true });
      }
    }

    this.appState = nextAppState;
  };

  /**
   * Check if authentication is required
   * Based on time since last auth
   */
  async requiresAuthentication() {
    if (!this.lastAuthTime) {
      return true;
    }

    const now = Date.now();
    const timeSinceAuth = now - this.lastAuthTime;

    // Require re-auth after 1 minute
    return timeSinceAuth > AUTH_TIMEOUT;
  }

  /**
   * Authenticate with biometrics
   * @param {string} reason - Reason for authentication request
   */
  async authenticate(reason = 'Access Anchor') {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow PIN fallback
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        this.isAuthenticated = true;
        this.lastAuthTime = Date.now();
        await SecureStore.setItemAsync(LAST_AUTH_TIME_KEY, this.lastAuthTime.toString());
        this._notifyListeners({ locked: false });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Force re-authentication
   * Used for sensitive operations
   */
  async forceAuthenticate(reason = 'Verify your identity') {
    this.isAuthenticated = false;
    this.lastAuthTime = null;
    return await this.authenticate(reason);
  }

  /**
   * Check if biometric auth is enabled
   */
  async isEnabled() {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  /**
   * Enable biometric authentication
   * (Cannot be disabled during commitment period - checked elsewhere)
   */
  async enable() {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  }

  /**
   * Disable biometric authentication
   * Only allowed if not in commitment period
   */
  async disable(userInCommitment) {
    if (userInCommitment) {
      throw new Error('Cannot disable biometric auth during commitment period');
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
  }

  /**
   * Get biometric type available on device
   */
  async getBiometricType() {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }

    return 'PIN';
  }

  /**
   * Register listener for auth state changes
   */
  addListener(callback) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  _notifyListeners(state) {
    this.authListeners.forEach(callback => callback(state));
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Singleton instance
const BiometricAuth = new BiometricAuthService();

export default BiometricAuth;
