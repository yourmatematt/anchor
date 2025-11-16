/**
 * Payment Approved Screen
 * Shows manual transfer instructions (no automatic execution)
 *
 * Step-by-step instructions for moving money from Vault
 * User must confirm when done
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

export default function PaymentApprovedScreen({ navigation, route }) {
  const { reason, amount } = route.params || {};

  const handleDone = () => {
    // In production:
    // 1. Update payment_request with completed_at timestamp
    // 2. Log completion
    // 3. Return to home

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
        {/* Success header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.heading}>APPROVED</Text>
        </View>

        {/* Request details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsReason}>{reason}</Text>
          <Text style={styles.detailsAmount}>${amount.toFixed(2)}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>HERE'S WHAT TO DO:</Text>

          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Open Up Bank app</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Go to Vault Saver</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepText}>
                  Transfer ${amount.toFixed(2)} to Allowance Saver
                </Text>
                <Text style={styles.stepNote}>(or Transaction Account if needed immediately)</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Wait for transfer to complete</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.stepText}>Make your purchase</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>6</Text>
              </View>
              <Text style={styles.stepText}>Come back when done</Text>
            </View>
          </View>
        </View>

        {/* Guardian notification */}
        <View style={styles.guardianCard}>
          <Ionicons name="eye-outline" size={20} color={Colors.guardian} />
          <View style={styles.guardianTextContainer}>
            <Text style={styles.guardianTitle}>Gutsy was notified:</Text>
            <Text style={styles.guardianMessage}>
              "Approved: {reason} ${amount.toFixed(2)}"
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>I've Done This</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  heading: {
    ...Typography.h1,
    color: Colors.success,
  },
  detailsCard: {
    ...Components.card,
    backgroundColor: Colors.successBackground,
    borderWidth: 1,
    borderColor: Colors.success,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  detailsReason: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  detailsAmount: {
    ...Typography.numberMedium,
    color: Colors.success,
  },
  instructionsCard: {
    ...Components.card,
    marginBottom: Spacing.xl,
  },
  instructionsTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
  },
  stepsList: {
    gap: Spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    ...Typography.body,
    flex: 1,
  },
  stepNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  },
  doneButton: {
    ...Components.buttonSuccess,
  },
  doneButtonText: {
    ...Typography.button,
  },
});
