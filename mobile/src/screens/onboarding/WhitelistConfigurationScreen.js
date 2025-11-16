/**
 * Whitelist Configuration Screen
 * Set up initial whitelist of bills that won't trigger alerts
 * Pre-populated suggestions + add custom
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

const SUGGESTED_BILLS = [
  { name: 'Rent', category: 'rent', priority: 'critical' },
  { name: 'Phone', category: 'utilities', priority: 'essential' },
  { name: 'Internet', category: 'utilities', priority: 'essential' },
  { name: 'Electricity', category: 'utilities', priority: 'essential' },
];

export default function WhitelistConfigurationScreen({ navigation, route }) {
  const { commitmentMonths, interviewAnswers, upBankToken, accounts } = route.params || {};

  const [whitelist, setWhitelist] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    priority: 'essential',
  });

  const handleAddSuggested = (suggested) => {
    if (!whitelist.find(b => b.name === suggested.name)) {
      setWhitelist([...whitelist, { ...suggested, amount: '', frequency: 'monthly' }]);
    }
  };

  const handleAddCustom = () => {
    if (newBill.name.trim().length === 0) return;

    setWhitelist([...whitelist, { ...newBill }]);
    setNewBill({ name: '', amount: '', frequency: 'monthly', priority: 'essential' });
    setShowAddModal(false);
  };

  const handleRemove = (index) => {
    setWhitelist(whitelist.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    navigation.navigate('FinalCommitment', {
      commitmentMonths,
      interviewAnswers,
      upBankToken,
      accounts,
      whitelist,
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
        {/* Header */}
        <Text style={styles.heading}>WHAT BILLS CAN'T YOU MISS?</Text>

        <Text style={styles.body}>
          These get paid automatically.{'\n'}
          Everything else requires approval.
        </Text>

        {/* Suggested Bills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested:</Text>
          <View style={styles.suggestedGrid}>
            {SUGGESTED_BILLS.map((suggested, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestedChip,
                  whitelist.find(b => b.name === suggested.name) && styles.suggestedChipAdded
                ]}
                onPress={() => handleAddSuggested(suggested)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={whitelist.find(b => b.name === suggested.name) ? 'checkmark' : 'add'}
                  size={16}
                  color={whitelist.find(b => b.name === suggested.name) ? Colors.success : Colors.accent}
                />
                <Text style={[
                  styles.suggestedChipText,
                  whitelist.find(b => b.name === suggested.name) && styles.suggestedChipTextAdded
                ]}>
                  {suggested.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current Whitelist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Whitelist ({whitelist.length}):</Text>

          {whitelist.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No bills added yet</Text>
            </View>
          ) : (
            whitelist.map((bill, index) => (
              <View key={index} style={styles.billCard}>
                <View style={styles.billHeader}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <TouchableOpacity onPress={() => handleRemove(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.alert} />
                  </TouchableOpacity>
                </View>
                <View style={styles.billDetails}>
                  <Text style={styles.billDetail}>
                    {bill.frequency} • {bill.priority}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add Custom Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
          <Text style={styles.addButtonText}>Add Custom Bill</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Save Whitelist ({whitelist.length} bills)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Custom Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom Bill</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Payee Name</Text>
            <TextInput
              style={styles.input}
              value={newBill.name}
              onChangeText={(text) => setNewBill({ ...newBill, name: text })}
              placeholder="Red Energy"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Amount (optional)</Text>
            <TextInput
              style={styles.input}
              value={newBill.amount}
              onChangeText={(text) => setNewBill({ ...newBill, amount: text })}
              placeholder="150"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.optionsRow}>
              {['weekly', 'fortnightly', 'monthly', 'once-off'].map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.option,
                    newBill.frequency === freq && styles.optionSelected
                  ]}
                  onPress={() => setNewBill({ ...newBill, frequency: freq })}
                >
                  <Text style={[
                    styles.optionText,
                    newBill.frequency === freq && styles.optionTextSelected
                  ]}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.optionsRow}>
              {['critical', 'essential', 'other'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.option,
                    newBill.priority === priority && styles.optionSelected
                  ]}
                  onPress={() => setNewBill({ ...newBill, priority })}
                >
                  <Text style={[
                    styles.optionText,
                    newBill.priority === priority && styles.optionTextSelected
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.addCustomButton,
                newBill.name.length === 0 && styles.disabledButton
              ]}
              onPress={handleAddCustom}
              disabled={newBill.name.length === 0}
            >
              <Text style={[
                styles.addCustomButtonText,
                newBill.name.length === 0 && styles.disabledButtonText
              ]}>
                Add to Whitelist
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: Spacing.lg,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.accentBackground,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.md,
  },
  suggestedChipAdded: {
    backgroundColor: Colors.successBackground,
    borderColor: Colors.success,
  },
  suggestedChipText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
  suggestedChipTextAdded: {
    color: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  billCard: {
    ...Components.card,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  billName: {
    ...Typography.h4,
  },
  billDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  billDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  addButton: {
    ...Components.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    backgroundColor: Colors.accentBackground,
    paddingVertical: Spacing.md,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continueButton: {
    ...Components.buttonPrimary,
  },
  continueButtonText: {
    ...Typography.button,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h3,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  optionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBackground,
  },
  optionText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.accent,
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addCustomButton: {
    ...Components.buttonPrimary,
  },
  addCustomButtonText: {
    ...Typography.button,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
