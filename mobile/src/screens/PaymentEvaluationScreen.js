/**
 * Payment Evaluation Screen
 * Loading screen while AI evaluates request
 *
 * Shows what's being checked (transparency)
 * Guardian is notified automatically
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components } from '../theme';

export default function PaymentEvaluationScreen({ navigation, route }) {
  const { reason, amount, requestTime, dayOfWeek } = route.params || {};

  const [checksCompleted, setChecksCompleted] = useState({
    timeCheck: false,
    patternCheck: false,
    reasonCheck: false,
  });

  useEffect(() => {
    runEvaluation();
  }, []);

  async function runEvaluation() {
    // Simulate AI evaluation process with delays

    // Check 1: Time of request
    await delay(1000);
    setChecksCompleted(prev => ({ ...prev, timeCheck: true }));

    // Check 2: Pattern history
    await delay(1500);
    setChecksCompleted(prev => ({ ...prev, patternCheck: true }));

    // Check 3: Reason legitimacy
    await delay(2000);
    setChecksCompleted(prev => ({ ...prev, reasonCheck: true }));

    // Wait a bit more for effect
    await delay(500);

    // Determine outcome (mock logic - in production, AI API decides)
    const outcome = evaluateRequest(reason, amount, requestTime, dayOfWeek);

    // Navigate to outcome screen
    if (outcome === 'approved') {
      navigation.replace('PaymentApproved', { reason, amount });
    } else if (outcome === 'denied') {
      navigation.replace('PaymentDenied', { reason, amount, requestTime, dayOfWeek });
    } else {
      navigation.replace('AIConversation', {
        triggerType: 'payment_request',
        triggerData: { reason, amount, requestTime, dayOfWeek },
      });
    }
  }

  function evaluateRequest(reason, amount, time, day) {
    // Mock evaluation logic
    // In production, this calls AI API with full user context

    const hour = new Date(time).getHours();
    const isLateNight = hour >= 22 || hour <= 5;
    const isTuesday = day === 'Tuesday';
    const isVague = reason.length < 15;

    // Suspicious patterns
    if (isLateNight && amount > 40) {
      return 'denied'; // Late night + significant amount
    }

    if (isTuesday && amount >= 50) {
      return 'needs_conversation'; // Tuesday poker pattern
    }

    if (isVague) {
      return 'needs_conversation'; // Vague explanation
    }

    // Seems legitimate
    return 'approved';
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.heading}>EVALUATING YOUR REQUEST</Text>

        {/* Thinking indicator */}
        <View style={styles.thinkingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>

        {/* Checklist */}
        <View style={styles.checklistContainer}>
          <Text style={styles.checklistTitle}>Checking:</Text>

          {/* Time of request */}
          <View style={styles.checkItem}>
            {checksCompleted.timeCheck ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            ) : (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            )}
            <Text style={[
              styles.checkText,
              checksCompleted.timeCheck && styles.checkTextComplete,
            ]}>
              Time of request
            </Text>
          </View>

          {/* Pattern history */}
          <View style={styles.checkItem}>
            {checksCompleted.patternCheck ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            ) : (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            )}
            <Text style={[
              styles.checkText,
              checksCompleted.patternCheck && styles.checkTextComplete,
            ]}>
              Your pattern history
            </Text>
          </View>

          {/* Reason legitimacy */}
          <View style={styles.checkItem}>
            {checksCompleted.reasonCheck ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            ) : (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            )}
            <Text style={[
              styles.checkText,
              checksCompleted.reasonCheck && styles.checkTextComplete,
            ]}>
              Reason legitimacy
            </Text>
          </View>
        </View>

        {/* Guardian notification */}
        <View style={styles.guardianNotice}>
          <Ionicons name="eye-outline" size={20} color={Colors.guardian} />
          <Text style={styles.guardianText}>Gutsy has been notified.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  heading: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  thinkingContainer: {
    marginBottom: Spacing.xxl,
  },
  checklistContainer: {
    width: '100%',
    ...Components.card,
    backgroundColor: Colors.backgroundCard,
  },
  checklistTitle: {
    ...Typography.h4,
    marginBottom: Spacing.lg,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  checkTextComplete: {
    color: Colors.textPrimary,
  },
  guardianNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.guardianBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.guardian,
  },
  guardianText: {
    ...Typography.caption,
    color: Colors.guardian,
    marginLeft: Spacing.sm,
  },
});
