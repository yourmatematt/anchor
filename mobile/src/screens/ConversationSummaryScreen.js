/**
 * Conversation Summary Screen
 *
 * Shows post-conversation outcome:
 * - Decision (approved/denied/needs_follow_up)
 * - AI's reasoning (factual, not judgemental)
 * - Guardian notification status
 * - Next steps
 * - Access to full transcript
 *
 * NO "Great job!" or celebration - just facts
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

const OUTCOME_CONFIGS = {
  approved: {
    icon: 'checkmark-circle',
    iconColor: Colors.success,
    bgColor: Colors.successBackground,
    borderColor: Colors.success,
    title: 'REQUEST APPROVED',
  },
  denied: {
    icon: 'close-circle',
    iconColor: Colors.alert,
    bgColor: Colors.alertBackground,
    borderColor: Colors.alert,
    title: 'REQUEST DENIED',
  },
  needs_follow_up: {
    icon: 'time',
    iconColor: Colors.warning,
    bgColor: Colors.warningBackground,
    borderColor: Colors.warning,
    title: 'NEEDS FOLLOW-UP',
  },
  conversation_complete: {
    icon: 'chatbubbles',
    iconColor: Colors.accent,
    bgColor: Colors.accentBackground,
    borderColor: Colors.accent,
    title: 'CONVERSATION COMPLETE',
  },
};

export default function ConversationSummaryScreen({ route, navigation }) {
  const {
    outcome = 'conversation_complete',
    requestAmount,
    requestReason,
    aiReasoning,
    conversationDuration,
    guardianNotified = true,
    guardianName = 'Gutsy',
    nextSteps = [],
    conversationId,
  } = route.params || {};

  const config = OUTCOME_CONFIGS[outcome] || OUTCOME_CONFIGS.conversation_complete;

  const handleViewTranscript = () => {
    // Navigate to transcript view
    console.log('View transcript:', conversationId);
  };

  const handleDone = () => {
    // Return to home
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Outcome Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={80} color={config.iconColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: config.iconColor }]}>
          {config.title}
        </Text>

        {/* Request Details (if applicable) */}
        {requestAmount && requestReason && (
          <View style={[styles.requestCard, { borderColor: config.borderColor }]}>
            <Text style={styles.requestAmount}>${requestAmount}</Text>
            <Text style={styles.requestReason}>"{requestReason}"</Text>
          </View>
        )}

        {/* AI Reasoning */}
        <View style={styles.reasoningCard}>
          <Text style={styles.reasoningTitle}>What AI Decided:</Text>
          <Text style={styles.reasoningText}>
            {aiReasoning || 'Conversation completed. No immediate action required.'}
          </Text>
        </View>

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>Next Steps:</Text>
            {nextSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Conversation Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              Duration: {conversationDuration || '2m 15s'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name={guardianNotified ? 'eye' : 'eye-off'}
              size={20}
              color={guardianNotified ? Colors.guardian : Colors.textTertiary}
            />
            <Text style={styles.detailText}>
              {guardianNotified
                ? `${guardianName} has been notified`
                : 'Guardian notification pending'
              }
            </Text>
          </View>
        </View>

        {/* View Transcript Button */}
        <TouchableOpacity
          style={styles.transcriptButton}
          onPress={handleViewTranscript}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={24} color={Colors.accent} />
          <Text style={styles.transcriptButtonText}>View Full Transcript</Text>
        </TouchableOpacity>

        {/* Factual Footer (NO celebration) */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Conversation logged.{'\n'}
            {guardianNotified ? `${guardianName} notified.` : 'Notification pending.'}
          </Text>
        </View>
      </ScrollView>

      {/* Done Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: config.iconColor }]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Back to Home</Text>
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
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  requestCard: {
    ...Components.card,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  requestAmount: {
    ...Typography.numberMedium,
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  requestReason: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reasoningCard: {
    ...Components.card,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  reasoningTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  reasoningText: {
    ...Typography.body,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  nextStepsCard: {
    ...Components.card,
    width: '100%',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.accentBackground,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  nextStepsTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
    color: Colors.accent,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    ...Typography.body,
    fontWeight: 'bold',
    marginRight: Spacing.sm,
    width: 24,
  },
  stepText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 22,
  },
  detailsCard: {
    ...Components.card,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },
  transcriptButton: {
    ...Components.card,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    backgroundColor: Colors.accentBackground,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  transcriptButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    ...Typography.button,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
