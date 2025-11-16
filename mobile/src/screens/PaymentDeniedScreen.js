/**
 * Payment Denied Screen
 * Shows why request was denied with direct feedback
 *
 * Cannot dismiss - MUST talk to AI
 * Australian vernacular: "MATE, THIS DOESN'T ADD UP"
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

export default function PaymentDeniedScreen({ navigation, route }) {
  const { reason, amount, requestTime, dayOfWeek } = route.params || {};

  // Generate denial reasons based on patterns
  const denialReasons = generateDenialReasons(reason, amount, requestTime, dayOfWeek);

  const handleTalkToAI = () => {
    navigation.replace('AIConversation', {
      triggerType: 'payment_request',
      triggerData: { reason, amount, requestTime, dayOfWeek },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Denied header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color={Colors.alert} />
          </View>
          <Text style={styles.heading}>NOT APPROVED</Text>
        </View>

        {/* Request details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsAmount}>${amount} request</Text>
          <Text style={styles.detailsTime}>
            {dayOfWeek} {new Date(requestTime).toLocaleTimeString('en-AU', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Main message - direct Australian tone */}
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>MATE, THIS DOESN'T ADD UP</Text>

          <Text style={styles.messageIntro}>
            You said "{reason}" but:
          </Text>

          {/* Denial reasons */}
          <View style={styles.reasonsList}>
            {denialReasons.map((denialReason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonBullet}>•</Text>
                <Text style={styles.reasonText}>{denialReason}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.messageQuestion}>
            Want to tell me what's really going on?
          </Text>
        </View>

        {/* Guardian notification */}
        <View style={styles.guardianCard}>
          <Ionicons name="eye-outline" size={20} color={Colors.guardian} />
          <View style={styles.guardianTextContainer}>
            <Text style={styles.guardianTitle}>Gutsy was notified:</Text>
            <Text style={styles.guardianMessage}>
              "DENIED: Suspicious request"
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer button - Cannot skip */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.talkButton}
          onPress={handleTalkToAI}
          activeOpacity={0.8}
        >
          <Text style={styles.talkButtonText}>Talk to AI Now</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          (No skip option - this is the point)
        </Text>
      </View>
    </SafeAreaView>
  );
}

function generateDenialReasons(reason, amount, time, day) {
  const reasons = [];
  const hour = new Date(time).getHours();

  // Late night
  if (hour >= 22 || hour <= 5) {
    reasons.push(`It's late ${day} (${hour > 12 ? hour - 12 : hour}:${new Date(time).getMinutes()}${hour >= 12 ? 'pm' : 'am'})`);
  }

  // Tuesday pattern
  if (day === 'Tuesday' && amount >= 50) {
    reasons.push("Tuesday night (your poker pattern)");
  }

  // Vague explanation
  if (reason.length < 15) {
    reasons.push("Vague explanation");
  }

  // Significant amount
  if (amount > 100) {
    reasons.push(`$${amount} is a lot at this time`);
  }

  // Default reason if none matched
  if (reasons.length === 0) {
    reasons.push("Timing and pattern don't match your usual legitimate requests");
  }

  // Add clean streak reminder
  reasons.push("You've been clean 47 days");

  return reasons;
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
  iconContainer: {
    marginBottom: Spacing.md,
  },
  heading: {
    ...Typography.h1,
    color: Colors.alert,
  },
  detailsCard: {
    ...Components.card,
    backgroundColor: Colors.alertBackground,
    borderWidth: 1,
    borderColor: Colors.alert,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  detailsAmount: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  detailsTime: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  messageCard: {
    ...Components.card,
    marginBottom: Spacing.xl,
  },
  messageTitle: {
    ...Typography.h2,
    color: Colors.alert,
    marginBottom: Spacing.lg,
  },
  messageIntro: {
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  reasonsList: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasonBullet: {
    ...Typography.body,
    color: Colors.alert,
    marginRight: Spacing.sm,
    width: 20,
  },
  reasonText: {
    ...Typography.body,
    flex: 1,
  },
  messageQuestion: {
    ...Typography.h4,
    marginTop: Spacing.md,
  },
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.guardianBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.guardian,
  },
  guardianTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  guardianTitle: {
    ...Typography.caption,
    color: Colors.guardian,
    marginBottom: Spacing.xs,
  },
  guardianMessage: {
    ...Typography.body,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  talkButton: {
    ...Components.buttonDestructive,
    width: '100%',
    marginBottom: Spacing.md,
  },
  talkButtonText: {
    ...Typography.button,
  },
  footerNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
});
