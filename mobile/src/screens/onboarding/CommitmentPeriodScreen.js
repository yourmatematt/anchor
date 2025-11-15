/**
 * Commitment Period Screen
 * Lock-in mechanism - no cancel, no escape hatches
 * User chooses 6, 12, 18, or 24 months
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
} from 'react-native';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

const COMMITMENT_OPTIONS = [
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
  { months: 18, label: '18 months' },
  { months: 24, label: '24 months' },
];

export default function CommitmentPeriodScreen({ navigation }) {
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [understoodNoCancel, setUnderstoodNoCancel] = useState(false);
  const [understoodNeed, setUnderstoodNeed] = useState(false);

  const canProceed = understoodNoCancel && understoodNeed;

  const handleLockMeIn = () => {
    if (!canProceed) return;

    // Navigate to guardian setup, passing commitment period
    navigation.navigate('GuardianSetup', { commitmentMonths: selectedMonths });
  };

  const toggleCheckbox = (setter) => {
    return () => setter(prev => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <Text style={styles.heading}>
          OTHER SERVICES LET YOU QUIT WHEN IT GETS HARD
        </Text>

        {/* Comparison list */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonText}>
            BetStop: Cancel after 3 months{'\n'}
            Gamban: Uninstall anytime{'\n'}
            Self-exclusion: Only works at listed venues{'\n\n'}
            Anchor doesn't.
          </Text>
        </View>

        {/* Commitment period selector */}
        <Text style={styles.sectionLabel}>Choose your commitment period:</Text>
        <View style={styles.optionsContainer}>
          {COMMITMENT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.months}
              style={[
                styles.option,
                selectedMonths === option.months && styles.optionSelected,
              ]}
              onPress={() => setSelectedMonths(option.months)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                selectedMonths === option.months && styles.optionTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Warning text */}
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>During this period:</Text>
          <Text style={styles.warningText}>
            • No cancel button{'\n'}
            • No 'I changed my mind' form{'\n'}
            • No easy way out at 11pm when urge hits
          </Text>
        </View>

        {/* Checkboxes */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={toggleCheckbox(setUnderstoodNoCancel)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            understoodNoCancel && styles.checkboxChecked,
          ]}>
            {understoodNoCancel && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand I cannot deactivate Anchor during my commitment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={toggleCheckbox(setUnderstoodNeed)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            understoodNeed && styles.checkboxChecked,
          ]}>
            {understoodNeed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            This is what I need
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.lockButton,
            !canProceed && styles.disabledButton,
          ]}
          onPress={handleLockMeIn}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.lockButtonText,
            !canProceed && styles.disabledButtonText,
          ]}>
            Lock Me In
          </Text>
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
    ...Typography.h2,
    fontSize: 26,
    marginBottom: Spacing.xl,
    lineHeight: 32,
  },
  comparisonCard: {
    ...Components.card,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comparisonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  sectionLabel: {
    ...Typography.h4,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  option: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBackground,
  },
  optionText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.accent,
  },
  warningCard: {
    ...Components.cardWarning,
    marginTop: Spacing.lg,
  },
  warningTitle: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: Spacing.md,
  },
  warningText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 6,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...Typography.body,
    flex: 1,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lockButton: {
    ...Components.buttonDestructive,
  },
  lockButtonText: {
    ...Typography.button,
    fontSize: 19,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
    borderColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
