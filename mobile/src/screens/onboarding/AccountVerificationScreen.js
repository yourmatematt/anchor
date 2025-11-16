/**
 * Account Verification Screen
 * Check for required Up Bank Savers
 * Vault Saver and Allowance Saver must exist
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

export default function AccountVerificationScreen({ navigation, route }) {
  const { commitmentMonths, interviewAnswers, upBankToken } = route.params || {};

  const [isChecking, setIsChecking] = useState(true);
  const [accounts, setAccounts] = useState({
    transaction: null,
    vault: null,
    allowance: null,
  });

  useEffect(() => {
    checkAccounts();
  }, []);

  const checkAccounts = async () => {
    setIsChecking(true);

    // In production: call Up Bank API to list accounts
    // Look for accounts with "Vault" and "Allowance" in name

    // Simulate API call
    setTimeout(() => {
      setAccounts({
        transaction: { balance: 25.00, found: true },
        vault: { balance: 793.00, found: true },
        allowance: { balance: 30.00, found: true },
      });
      setIsChecking(false);
    }, 2000);
  };

  const handleContinue = () => {
    navigation.navigate('WhitelistConfiguration', {
      commitmentMonths,
      interviewAnswers,
      upBankToken,
      accounts,
    });
  };

  const allAccountsFound = accounts.transaction?.found && accounts.vault?.found && accounts.allowance?.found;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>
          {isChecking ? 'CHECKING YOUR UP ACCOUNT...' : 'ACCOUNT VERIFICATION'}
        </Text>

        {isChecking ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Verifying accounts...</Text>
          </View>
        ) : (
          <>
            {/* Transaction Account */}
            <View style={[
              styles.accountCard,
              accounts.transaction?.found && styles.accountCardSuccess
            ]}>
              <View style={styles.accountHeader}>
                <Ionicons
                  name={accounts.transaction?.found ? 'checkmark-circle' : 'close-circle'}
                  size={32}
                  color={accounts.transaction?.found ? Colors.success : Colors.alert}
                />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Transaction Account</Text>
                  {accounts.transaction?.found && (
                    <Text style={styles.accountBalance}>
                      ${accounts.transaction.balance.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
              {accounts.transaction?.found && (
                <Text style={styles.accountNote}>✓ Found</Text>
              )}
            </View>

            {/* Vault Saver */}
            <View style={[
              styles.accountCard,
              accounts.vault?.found && styles.accountCardSuccess
            ]}>
              <View style={styles.accountHeader}>
                <Ionicons
                  name={accounts.vault?.found ? 'checkmark-circle' : 'close-circle'}
                  size={32}
                  color={accounts.vault?.found ? Colors.success : Colors.alert}
                />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Vault Saver</Text>
                  {accounts.vault?.found ? (
                    <Text style={styles.accountBalance}>
                      ${accounts.vault.balance.toFixed(2)}
                    </Text>
                  ) : (
                    <TouchableOpacity style={styles.createButton}>
                      <Text style={styles.createButtonText}>Create in Up app</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {accounts.vault?.found ? (
                <Text style={styles.accountNote}>✓ Found - This is where your money is locked</Text>
              ) : (
                <Text style={styles.accountError}>Create "Vault" Saver in Up app first</Text>
              )}
            </View>

            {/* Allowance Saver */}
            <View style={[
              styles.accountCard,
              accounts.allowance?.found && styles.accountCardSuccess
            ]}>
              <View style={styles.accountHeader}>
                <Ionicons
                  name={accounts.allowance?.found ? 'checkmark-circle' : 'close-circle'}
                  size={32}
                  color={accounts.allowance?.found ? Colors.success : Colors.alert}
                />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Allowance Saver</Text>
                  {accounts.allowance?.found ? (
                    <Text style={styles.accountBalance}>
                      ${accounts.allowance.balance.toFixed(2)}
                    </Text>
                  ) : (
                    <TouchableOpacity style={styles.createButton}>
                      <Text style={styles.createButtonText}>Create in Up app</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {accounts.allowance?.found ? (
                <Text style={styles.accountNote}>✓ Found - Your daily allowance account</Text>
              ) : (
                <Text style={styles.accountError}>Create "Allowance" Saver in Up app first</Text>
              )}
            </View>

            {/* Missing Accounts Help */}
            {!allAccountsFound && (
              <View style={styles.helpCard}>
                <Ionicons name="information-circle" size={24} color={Colors.warning} />
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>Need to create Savers?</Text>
                  <Text style={styles.helpBody}>
                    1. Open Up app{'\n'}
                    2. Tap "Create Saver"{'\n'}
                    3. Name it exactly "Vault" or "Allowance"{'\n'}
                    4. Come back and tap "I've Created Them"
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      {!isChecking && (
        <View style={styles.footer}>
          {allAccountsFound ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Setup Complete → Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recheckButton}
              onPress={checkAccounts}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={Colors.accent} />
              <Text style={styles.recheckButtonText}>I've Created Them</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    ...Typography.h2,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  accountCard: {
    ...Components.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  accountCardSuccess: {
    backgroundColor: Colors.successBackground,
    borderColor: Colors.success,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  accountInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  accountName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  accountBalance: {
    ...Typography.h3,
    color: Colors.success,
  },
  accountNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  accountError: {
    ...Typography.caption,
    color: Colors.alert,
  },
  createButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.accentBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignSelf: 'flex-start',
  },
  createButtonText: {
    ...Typography.small,
    color: Colors.accent,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.warningBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginTop: Spacing.lg,
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    ...Typography.h4,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  helpBody: {
    ...Typography.caption,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continueButton: {
    ...Components.buttonSuccess,
  },
  continueButtonText: {
    ...Typography.button,
  },
  recheckButton: {
    ...Components.buttonSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  recheckButtonText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
});
