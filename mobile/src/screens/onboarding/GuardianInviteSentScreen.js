/**
 * Guardian Invite Sent Screen
 * Shows the SMS that was sent to guardian
 * Waiting state with option to continue or resend
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

export default function GuardianInviteSentScreen({ navigation, route }) {
  const { guardianName, guardianPhone, guardianEmail, relationship, commitmentMonths } = route.params || {};

  const [isWaiting, setIsWaiting] = useState(true);
  const [waitingTime, setWaitingTime] = useState(0);

  useEffect(() => {
    // Simulate waiting time counter
    const interval = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleResend = () => {
    // In production, resend SMS to guardian
    setWaitingTime(0);
  };

  const handleContinue = () => {
    navigation.navigate('AIInterviewIntro', { commitmentMonths });
  };

  const smsMessage = `${guardianName || 'Your friend'} has chosen you as their financial guardian for ${commitmentMonths} months.

You'll receive alerts when they request money or show gambling behavior.

Reply YES to accept, or call them if you have questions.

- Anchor Financial Accountability`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="send" size={64} color={Colors.guardian} />
          <Text style={styles.heading}>INVITE SENT TO {guardianName?.toUpperCase()}</Text>
        </View>

        {/* SMS Preview */}
        <View style={styles.smsCard}>
          <View style={styles.smsHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.smsHeaderText}>SMS Message Sent</Text>
          </View>

          <View style={styles.smsBody}>
            <Text style={styles.smsRecipient}>To: {guardianPhone}</Text>
            <View style={styles.smsDivider} />
            <Text style={styles.smsText}>{smsMessage}</Text>
          </View>
        </View>

        {/* Waiting Indicator */}
        {isWaiting && (
          <View style={styles.waitingCard}>
            <ActivityIndicator size="large" color={Colors.guardian} />
            <Text style={styles.waitingText}>
              Waiting for {guardianName} to accept...
            </Text>
            <Text style={styles.waitingTime}>
              {Math.floor(waitingTime / 60)}:{String(waitingTime % 60).padStart(2, '0')}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.accent} />
          <Text style={styles.infoText}>
            {guardianName} will receive notifications when you:
            {'\n'}• Request money
            {'\n'}• Show gambling patterns
            {'\n'}• Take payday loans
            {'\n'}• Hit milestones
          </Text>
        </View>

        {/* Resend Button */}
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={Colors.accent} />
          <Text style={styles.resendText}>Resend Invite</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue Anyway</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          You can continue setup while waiting for {guardianName} to accept
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heading: {
    ...Typography.h2,
    textAlign: 'center',
    marginTop: Spacing.md,
    color: Colors.guardian,
  },
  smsCard: {
    ...Components.card,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  smsHeaderText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  smsBody: {
    backgroundColor: Colors.backgroundModal,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  smsRecipient: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  smsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  smsText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  waitingCard: {
    ...Components.card,
    backgroundColor: Colors.guardianBackground,
    borderWidth: 1,
    borderColor: Colors.guardian,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  waitingText: {
    ...Typography.h4,
    color: Colors.guardian,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  waitingTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.accentBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginBottom: Spacing.xl,
  },
  infoText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 22,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  resendText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  continueButton: {
    ...Components.buttonSecondary,
    width: '100%',
    marginBottom: Spacing.md,
  },
  continueButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  footerNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
