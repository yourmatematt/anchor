/**
 * Up Bank Connection Screen
 * Connect via Personal Access Token
 * Shows step-by-step instructions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

export default function UpBankConnectionScreen({ navigation, route }) {
  const { commitmentMonths, interviewAnswers } = route.params || {};

  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (token.trim().length === 0) {
      Alert.alert('Token Required', 'Please paste your Up Bank Personal Access Token');
      return;
    }

    setIsConnecting(true);

    // In production:
    // 1. Validate token with Up Bank API
    // 2. Store encrypted token in SecureStore
    // 3. Fetch accounts to verify connection

    // Simulate API call
    setTimeout(() => {
      setIsConnecting(false);

      // Navigate to account verification
      navigation.navigate('AccountVerification', {
        commitmentMonths,
        interviewAnswers,
        upBankToken: token,
      });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.heading}>LINK YOUR UP BANK ACCOUNT</Text>

          {/* Explanation */}
          <Text style={styles.body}>
            I need to see every transaction in real-time.{'\n\n'}
            This is how I stop you before you gamble.
          </Text>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to get your token:</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Open Up app</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Swipe right → Data Sharing</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Generate Personal Access Token</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Copy the token and paste it here</Text>
            </View>
          </View>

          {/* Token Input */}
          <Text style={styles.label}>Personal Access Token</Text>
          <TextInput
            style={styles.tokenInput}
            value={token}
            onChangeText={setToken}
            placeholder="up:yeah:paste_your_token_here"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
          />

          {/* Warning */}
          <View style={styles.warningCard}>
            <Ionicons name="lock-closed" size={20} color={Colors.warning} />
            <Text style={styles.warningText}>
              Your token is encrypted and stored securely.
              It's used only to read your transactions.
              Anchor cannot move money or make payments.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.connectButton,
              (token.length === 0 || isConnecting) && styles.disabledButton,
            ]}
            onPress={handleConnect}
            disabled={token.length === 0 || isConnecting}
            activeOpacity={0.8}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Text style={[
                styles.connectButtonText,
                token.length === 0 && styles.disabledButtonText,
              ]}>
                Connect Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heading: {
    ...Typography.h2,
    marginBottom: Spacing.lg,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  instructionsCard: {
    ...Components.card,
    marginBottom: Spacing.xl,
  },
  instructionsTitle: {
    ...Typography.h4,
    marginBottom: Spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.button,
    fontSize: 16,
  },
  stepText: {
    ...Typography.body,
    flex: 1,
    paddingTop: 4,
  },
  label: {
    ...Typography.h4,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  tokenInput: {
    ...Components.textArea,
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.warningBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  connectButton: {
    ...Components.buttonPrimary,
  },
  connectButtonText: {
    ...Typography.button,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
