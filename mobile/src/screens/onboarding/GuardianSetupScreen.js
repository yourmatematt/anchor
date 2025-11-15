/**
 * Guardian Setup Screen
 * Choose someone who knows your shit and will call you on it
 * They won't approve/deny - they just KNOW what's happening
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

const RELATIONSHIP_OPTIONS = ['Friend', 'Family', 'Sponsor', 'Other'];

export default function GuardianSetupScreen({ navigation, route }) {
  const { commitmentMonths } = route.params || { commitmentMonths: 12 };

  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationship, setRelationship] = useState('Friend');

  const canProceed = guardianName.trim().length > 0 && guardianPhone.trim().length > 0;

  const handleSendInvite = () => {
    if (!canProceed) return;

    // In production, this would:
    // 1. Store guardian info in database
    // 2. Send SMS invite
    // 3. Navigate to waiting screen

    navigation.navigate('GuardianInviteSent', {
      guardianName,
      guardianPhone,
      guardianEmail,
      relationship,
      commitmentMonths,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <Text style={styles.heading}>WHO'S GOING TO KEEP YOU HONEST?</Text>

          {/* Explanation */}
          <Text style={styles.body}>
            Pick someone who knows your shit and will call you on it.{'\n\n'}
            They'll know when you request money, get gambling urges, take payday loans.
          </Text>

          {/* Guardian name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={guardianName}
            onChangeText={setGuardianName}
            placeholder="Guardian's name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {/* Phone number */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={guardianPhone}
            onChangeText={setGuardianPhone}
            placeholder="04XX XXX XXX"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
            autoCorrect={false}
          />

          {/* Email (optional) */}
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            value={guardianEmail}
            onChangeText={setGuardianEmail}
            placeholder="guardian@example.com"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Relationship */}
          <Text style={styles.label}>Relationship</Text>
          <View style={styles.relationshipOptions}>
            {RELATIONSHIP_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.relationshipOption,
                  relationship === option && styles.relationshipOptionSelected,
                ]}
                onPress={() => setRelationship(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.relationshipOptionText,
                  relationship === option && styles.relationshipOptionTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Important notice */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              They won't approve or deny requests. They just KNOW what's happening.
            </Text>
          </View>
        </ScrollView>

        {/* Footer button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canProceed && styles.disabledButton,
            ]}
            onPress={handleSendInvite}
            disabled={!canProceed}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.primaryButtonText,
              !canProceed && styles.disabledButtonText,
            ]}>
              Send Guardian Invite
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
  heading: {
    ...Typography.h2,
    marginBottom: Spacing.lg,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  label: {
    ...Typography.h4,
    fontSize: 16,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    ...Components.input,
  },
  relationshipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  relationshipOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  relationshipOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBackground,
  },
  relationshipOptionText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  relationshipOptionTextSelected: {
    color: Colors.accent,
  },
  noticeCard: {
    ...Components.card,
    backgroundColor: Colors.guardianBackground,
    borderWidth: 1,
    borderColor: Colors.guardian,
    marginTop: Spacing.xl,
  },
  noticeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButton: {
    ...Components.buttonPrimary,
  },
  primaryButtonText: {
    ...Typography.button,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
