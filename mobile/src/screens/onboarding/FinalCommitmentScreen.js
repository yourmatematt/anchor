/**
 * Final Commitment Screen
 * Last chance to back out before lock-in
 * Shows complete summary of commitment
 * NO UNDO after this point
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

export default function FinalCommitmentScreen({ navigation, route }) {
  const {
    commitmentMonths,
    interviewAnswers,
    upBankToken,
    accounts,
    whitelist,
  } = route.params || {};

  const [agreedToCommitment, setAgreedToCommitment] = useState(false);

  const calculateEndDate = () => {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (commitmentMonths || 12));
    return end.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleNotReady = () => {
    Alert.alert(
      'Not Ready?',
      'You can go back and review your setup, or come back later when you\'re ready to commit.',
      [
        { text: 'Review Setup', onPress: () => navigation.goBack() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleStartAnchor = async () => {
    if (!agreedToCommitment) return;

    // In production:
    // 1. Save user to Supabase users table
    // 2. Set clean_streak_start_date to today
    // 3. Set commitment dates
    // 4. Create guardian record
    // 5. Save whitelist
    // 6. Mark onboarding_completed = true
    // 7. Navigate to home screen

    // For now, simulate save
    Alert.alert(
      'LOCKED IN',
      `You're now committed for ${commitmentMonths} months. No turning back.`,
      [
        {
          text: 'Let\'s Do This',
          onPress: () => {
            // Navigate to main app
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const guardianName = 'Gutsy'; // From earlier in flow
  const guardianPhone = '0412 XXX XXX';
  const dailyAllowance = 30;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>LAST CHANCE TO BACK OUT</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Commitment:</Text>
            <Text style={styles.summaryValue}>
              {commitmentMonths} months (until {calculateEndDate()})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Guardian:</Text>
            <Text style={styles.summaryValue}>
              {guardianName} ({guardianPhone})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily allowance:</Text>
            <Text style={styles.summaryValue}>${dailyAllowance}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Whitelisted bills:</Text>
            <Text style={styles.summaryValue}>{whitelist?.length || 0} items</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Up Bank:</Text>
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>
        </View>

        {/* Warning Message */}
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Once you tap 'Start', you're locked in.{'\n\n'}
            No undo. No escape. This is it.
          </Text>
        </View>

        {/* Commitment Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreedToCommitment(!agreedToCommitment)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            agreedToCommitment && styles.checkboxChecked
          ]}>
            {agreedToCommitment && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I'm giving Anchor control of my money because I can't trust myself
          </Text>
        </TouchableOpacity>

        {/* What This Means */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What this means:</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Every transaction is monitored
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Gambling = immediate intervention
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Money requests = AI interrogation
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Guardian knows everything
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                No cancel option for {commitmentMonths} months
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            !agreedToCommitment && styles.disabledButton
          ]}
          onPress={handleStartAnchor}
          disabled={!agreedToCommitment}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.startButtonText,
            !agreedToCommitment && styles.disabledButtonText
          ]}>
            START ANCHOR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notReadyButton}
          onPress={handleNotReady}
          activeOpacity={0.8}
        >
          <Text style={styles.notReadyButtonText}>Not Ready</Text>
        </TouchableOpacity>
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
  heading: {
    ...Typography.h1,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    color: Colors.alert,
  },
  summaryCard: {
    ...Components.card,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  connectedText: {
    ...Typography.caption,
    color: Colors.success,
  },
  warningCard: {
    ...Components.cardAlert,
    marginBottom: Spacing.xl,
  },
  warningText: {
    ...Typography.h3,
    textAlign: 'center',
    lineHeight: 28,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 6,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.alert,
    borderColor: Colors.alert,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...Typography.body,
    flex: 1,
    lineHeight: 24,
  },
  infoCard: {
    ...Components.card,
    backgroundColor: Colors.backgroundModal,
  },
  infoTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  infoList: {
    gap: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBullet: {
    ...Typography.body,
    color: Colors.accent,
    marginRight: Spacing.sm,
    width: 20,
  },
  infoText: {
    ...Typography.body,
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    ...Components.buttonDestructive,
    paddingVertical: 20,
    marginBottom: Spacing.md,
  },
  startButtonText: {
    ...Typography.button,
    fontSize: 20,
    fontWeight: 'bold',
  },
  notReadyButton: {
    ...Components.buttonSecondary,
  },
  notReadyButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
