/**
 * Payment Request Screen
 * Initial request form for money from Vault
 *
 * User must explain WHY they need it
 * Voice preferred (harder to lie)
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

export default function PaymentRequestScreen({ navigation }) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [useVoice, setUseVoice] = useState(false);

  const canSubmit = reason.trim().length > 0 && amount.trim().length > 0;

  const handleSpeakInstead = () => {
    // In production, trigger voice recording
    setUseVoice(true);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    // In production:
    // 1. Save to payment_requests table
    // 2. Get current time, day of week
    // 3. Navigate to evaluation screen

    navigation.navigate('PaymentEvaluation', {
      reason,
      amount: parseFloat(amount),
      requestTime: new Date().toISOString(),
      dayOfWeek: new Date().toLocaleDateString('en-AU', { weekday: 'long' }),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REQUEST MONEY</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Why do you need it? */}
          <Text style={styles.label}>Why do you need it?</Text>

          {!useVoice ? (
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Work boots for bar job"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              autoFocus
            />
          ) : (
            <View style={styles.voiceRecording}>
              <Text style={styles.voiceText}>Voice recording active</Text>
              <Text style={styles.transcription}>{reason || 'Listening...'}</Text>
            </View>
          )}

          {/* OR separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Speak Instead button */}
          <TouchableOpacity
            style={styles.speakButton}
            onPress={handleSpeakInstead}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={32} color={Colors.accent} />
            <Text style={styles.speakButtonText}>Speak Instead</Text>
          </TouchableOpacity>

          {/* How much? */}
          <Text style={styles.label}>How much?</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="100"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              !canSubmit && styles.disabledButtonText,
            ]}>
              Submit Request
            </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h3,
    letterSpacing: 1,
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
  label: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  textArea: {
    ...Components.textArea,
    marginBottom: Spacing.xl,
  },
  voiceRecording: {
    ...Components.card,
    backgroundColor: Colors.accentBackground,
    borderWidth: 1,
    borderColor: Colors.accent,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  voiceText: {
    ...Typography.caption,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  transcription: {
    ...Typography.body,
    textAlign: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
  },
  speakButton: {
    ...Components.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBackground,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  speakButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  dollarSign: {
    ...Typography.h2,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...Typography.h2,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    ...Components.buttonPrimary,
  },
  submitButtonText: {
    ...Typography.button,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
