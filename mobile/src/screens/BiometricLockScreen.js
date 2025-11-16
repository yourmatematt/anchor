/**
 * Biometric Lock Screen
 * Full-screen lock that requires Face ID/Touch ID/PIN to unlock
 * Cannot be bypassed during commitment period
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BiometricAuth from '../services/BiometricAuth';
import { Colors } from '../theme';

export default function BiometricLockScreen({ onUnlock }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Get biometric type available
    BiometricAuth.getBiometricType().then(type => {
      setBiometricType(type);
    });

    // Auto-trigger authentication on mount
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError('');

    try {
      const success = await BiometricAuth.authenticate('Unlock Anchor');

      if (success) {
        // Authentication successful
        onUnlock();
      } else {
        // Authentication failed or cancelled
        setError('Authentication failed. Try again.');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setError('Authentication error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getIcon = () => {
    if (biometricType === 'Face ID') {
      return 'scan';
    } else if (biometricType === 'Touch ID') {
      return 'finger-print';
    }
    return 'lock-closed';
  };

  const getMessage = () => {
    if (biometricType === 'Face ID') {
      return 'Unlock with Face ID';
    } else if (biometricType === 'Touch ID') {
      return 'Unlock with Touch ID';
    }
    return 'Unlock with PIN';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Logo/Icon */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>⚓</Text>
        <Text style={styles.appName}>ANCHOR</Text>
      </View>

      {/* Biometric Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={80} color={Colors.white} />
      </View>

      {/* Message */}
      <Text style={styles.message}>{getMessage()}</Text>

      {/* Error message */}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {/* Authenticate button */}
      {isAuthenticating ? (
        <ActivityIndicator size="large" color={Colors.white} style={styles.loading} />
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={handleAuthenticate}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      )}

      {/* Security notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Biometric authentication is required during your commitment period. This keeps your money safe from you.
        </Text>
      </View>

      {/* Crisis Resources (always accessible) */}
      <View style={styles.crisis}>
        <Text style={styles.crisisTitle}>In Crisis?</Text>
        <TouchableOpacity
          style={styles.crisisButton}
          onPress={() => {
            // Open phone dialer without unlocking app
            const DeepLinking = require('../services/DeepLinking').default;
            DeepLinking.callPhoneNumber('1800858858');
          }}
        >
          <Text style={styles.crisisButtonText}>
            📞 Gambling Help: 1800 858 858
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.crisisButton}
          onPress={() => {
            const DeepLinking = require('../services/DeepLinking').default;
            DeepLinking.callPhoneNumber('131114');
          }}
        >
          <Text style={styles.crisisButtonText}>
            📞 Lifeline: 13 11 14
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 4,
  },
  iconContainer: {
    marginBottom: 40,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 30,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: Colors.alert,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
  },
  loading: {
    marginBottom: 40,
  },
  notice: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 40,
    maxWidth: 320,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  crisis: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  crisisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  crisisButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  crisisButtonText: {
    fontSize: 14,
    color: Colors.white,
    textDecorationLine: 'underline',
  },
});
