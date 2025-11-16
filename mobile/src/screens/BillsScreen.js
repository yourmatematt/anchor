/**
 * Bills Screen - Whitelist Management
 *
 * Shows whitelisted bills grouped by priority:
 * - 🔴 CRITICAL (Cannot miss - debts, legal obligations)
 * - 🟠 ESSENTIAL (Rent, utilities)
 * - 🟡 OTHER DEBTS (Personal debts)
 *
 * Payment tracking, upcoming due dates, auto-pay status
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
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

// Mock data - in production from Supabase bills table
const MOCK_BILLS = {
  critical: [
    {
      id: 1,
      payee: 'Easygo Debt Repayment',
      amount: 626.22,
      frequency: 'monthly',
      dueDate: 'Tomorrow',
      remaining: 11898.41,
      original: 21861.02,
      isAutoPay: false,
    },
    {
      id: 2,
      payee: 'Tax Debt (ATO)',
      amount: 186,
      frequency: 'fortnightly',
      dueDate: '3 days',
      remaining: 3642.47,
      original: 4196.47,
      isAutoPay: false,
    },
  ],
  essential: [
    {
      id: 3,
      payee: 'Rent - Mallacoota Real Estate',
      amount: 440,
      frequency: 'fortnightly',
      dueDate: '5 days',
      isAutoPay: false,
    },
    {
      id: 4,
      payee: 'Optus Mobile',
      amount: 135,
      frequency: 'monthly',
      dueDate: '12 days',
      isAutoPay: true,
    },
    {
      id: 5,
      payee: 'Starlink Internet',
      amount: 158,
      frequency: 'monthly',
      dueDate: '11 days',
      isAutoPay: true,
    },
  ],
  other: [
    {
      id: 6,
      payee: 'Natasha',
      amount: 100,
      frequency: 'monthly',
      remaining: 4000,
      dueDate: '8 days',
      isAutoPay: false,
    },
  ],
};

export default function BillsScreen({ navigation }) {
  const [showAllOther, setShowAllOther] = useState(false);

  const renderBill = (bill, priorityColor) => (
    <TouchableOpacity
      key={bill.id}
      style={styles.billCard}
      onPress={() => {
        // Navigate to bill detail
        console.log('View bill detail:', bill.payee);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.billHeader}>
        <Text style={styles.billPayee}>{bill.payee}</Text>
        {bill.isAutoPay && (
          <View style={styles.autoPayBadge}>
            <Text style={styles.autoPayText}>Auto</Text>
          </View>
        )}
      </View>

      <View style={styles.billDetails}>
        <Text style={styles.billAmount}>
          ${bill.amount.toFixed(2)} {bill.frequency}
        </Text>
        <Text style={styles.billDue}>Next: {bill.dueDate}</Text>
      </View>

      {bill.remaining && (
        <View style={styles.debtProgress}>
          <Text style={styles.debtRemaining}>Remaining: ${bill.remaining.toFixed(2)}</Text>
          {bill.original && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((bill.original - bill.remaining) / bill.original) * 100}%`,
                    backgroundColor: priorityColor,
                  }
                ]}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.billActions}>
        {bill.remaining && (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Pay Extra</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BILLS & WHITELIST</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          These get paid automatically{'\n'}
          Everything else needs approval
        </Text>

        {/* Add Bill Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => console.log('Add bill')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
          <Text style={styles.addButtonText}>Add Bill</Text>
        </TouchableOpacity>

        {/* TIER 1: CRITICAL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.priorityDot, { backgroundColor: Colors.alert }]} />
            <Text style={styles.sectionTitle}>CRITICAL</Text>
          </View>
          {MOCK_BILLS.critical.map(bill => renderBill(bill, Colors.alert))}
        </View>

        {/* TIER 2: ESSENTIAL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.priorityDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.sectionTitle}>ESSENTIAL</Text>
          </View>
          {MOCK_BILLS.essential.map(bill => renderBill(bill, Colors.warning))}
        </View>

        {/* TIER 3: OTHER DEBTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.priorityDot, { backgroundColor: '#FFCC00' }]} />
            <Text style={styles.sectionTitle}>OTHER DEBTS</Text>
          </View>
          {MOCK_BILLS.other.slice(0, showAllOther ? undefined : 1).map(bill => renderBill(bill, '#FFCC00'))}

          {!showAllOther && MOCK_BILLS.other.length > 1 && (
            <TouchableOpacity
              style={styles.showAllButton}
              onPress={() => setShowAllOther(true)}
            >
              <Text style={styles.showAllText}>Show All ({MOCK_BILLS.other.length - 1} more)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.xl,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
    letterSpacing: 1,
  },
  billCard: {
    ...Components.card,
    marginBottom: Spacing.md,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  billPayee: {
    ...Typography.h4,
    flex: 1,
  },
  autoPayBadge: {
    backgroundColor: Colors.accentBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  autoPayText: {
    ...Typography.small,
    color: Colors.accent,
    fontSize: 11,
  },
  billDetails: {
    marginBottom: Spacing.md,
  },
  billAmount: {
    ...Typography.body,
    marginBottom: 4,
  },
  billDue: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  debtProgress: {
    marginBottom: Spacing.md,
  },
  debtRemaining: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundModal,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  billActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  actionButtonText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
  showAllButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  showAllText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
});
