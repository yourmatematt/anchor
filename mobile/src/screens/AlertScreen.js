/**
 * Alert Screen
 *
 * CRITICAL INTERVENTION SCREEN
 * - Full-screen takeover when suspicious transaction detected
 * - CANNOT dismiss without talking to AI
 * - Different trigger types: gambling, payday_loan, cash_withdrawal, suspicious_transfer
 * - Guardian notified automatically
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  BackHandler,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

const TRIGGER_CONFIGS = {
  gambling_detection: {
    icon: 'alert-circle',
    iconColor: Colors.alert,
    bgColor: Colors.alertBackground,
    borderColor: Colors.alert,
    title: 'TRANSACTION BLOCKED',
    message: (data) => `This matches your gambling pattern.`,
  },
  payday_loan: {
    icon: 'warning',
    iconColor: Colors.warning,
    bgColor: Colors.warningBackground,
    borderColor: Colors.warning,
    title: 'PAYDAY LOAN DETECTED',
    message: (data) => `Repayment: $${data.repaymentAmount} in ${data.repaymentDays} days\nInterest: $${data.interest} (${data.apr}% APR)\n\nYour clean streak has been reset.`,
  },
  cash_withdrawal: {
    icon: 'cash-outline',
    iconColor: Colors.alert,
    bgColor: Colors.alertBackground,
    borderColor: Colors.alert,
    title: 'CASH WITHDRAWAL',
    message: (data) => `You set this up so you couldn't access cash.\n\nWhat's going on?`,
  },
  suspicious_transfer: {
    icon: 'swap-horizontal',
    iconColor: Colors.warning,
    bgColor: Colors.warningBackground,
    borderColor: Colors.warning,
    title: 'SUSPICIOUS TRANSFER',
    message: (data) => `This is your ${data.pattern} pattern.\n\nLet's talk before this goes further.`,
  },
  non_whitelisted: {
    icon: 'shield-outline',
    iconColor: Colors.warning,
    bgColor: Colors.warningBackground,
    borderColor: Colors.warning,
    title: 'NON-WHITELISTED TRANSACTION',
    message: (data) => `This transaction is not on your whitelist.`,
  },
};

export default function AlertScreen({ route, navigation }) {
  const {
    transaction,
    triggerType = 'non_whitelisted',
    triggerData = {},
  } = route.params || {};

  const [canDismiss, setCanDismiss] = useState(false);

  const config = TRIGGER_CONFIGS[triggerType] || TRIGGER_CONFIGS.non_whitelisted;

  useEffect(() => {
    // Prevent back button from dismissing
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canDismiss) {
        Alert.alert(
          'Finish conversation first',
          'You need to talk to AI about this transaction before you can leave.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canDismiss]);

  const handleTalkToAI = () => {
    navigation.replace('AIConversation', {
      triggerType,
      triggerData: {
        ...triggerData,
        transaction,
      },
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={false}
      visible={true}
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!canDismiss) {
          Alert.alert(
            'Finish conversation first',
            'You need to talk to AI about this transaction before you can leave.'
          );
        }
      }}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.content}>
          {/* Warning Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon} size={80} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: config.iconColor }]}>
            {config.title}
          </Text>

          {/* Transaction Details */}
          <View style={[styles.detailsCard, { borderColor: config.borderColor }]}>
            <Text style={styles.detailsPayee}>
              {transaction?.payee_name || triggerData.source || 'Unknown'}
            </Text>
            <Text style={styles.detailsAmount}>
              ${Math.abs(parseFloat(transaction?.amount || triggerData.amount || 0)).toFixed(2)}
            </Text>
            <Text style={styles.detailsTime}>
              {transaction?.timestamp
                ? new Date(transaction.timestamp).toLocaleString('en-AU', {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : triggerData.time || 'Just now'}
            </Text>
          </View>

          {/* Message */}
          <View style={[styles.messageCard, {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor
          }]}>
            <Text style={styles.messageText}>{config.message(triggerData)}</Text>
          </View>

          {/* Guardian Notice */}
          <View style={styles.guardianNotice}>
            <Ionicons name="eye-outline" size={20} color={Colors.guardian} />
            <Text style={styles.guardianText}>
              {triggerData.guardianName || 'Gutsy'} has been notified.
            </Text>
          </View>
        </View>

        {/* Footer - Talk to AI Button (ONLY button) */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.talkButton, { backgroundColor: config.iconColor }]}
            onPress={handleTalkToAI}
            activeOpacity={0.8}
          >
            <Text style={styles.talkButtonText}>Talk to AI Now</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            (Cannot dismiss - this is the point)
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)', // Dark overlay
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
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
  detailsCard: {
    ...Components.card,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  detailsPayee: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  detailsAmount: {
    ...Typography.numberMedium,
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  detailsTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  messageCard: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  messageText: {
    ...Typography.body,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  guardianNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.guardianBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.guardian,
  },
  guardianText: {
    ...Typography.caption,
    color: Colors.guardian,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  talkButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  talkButtonText: {
    ...Typography.button,
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
});
