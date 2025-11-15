/**
 * Home Screen - Daily Dashboard
 *
 * Shows:
 * - Days clean (LARGEST element - primary metric)
 * - Guardian status (always visible - can't forget they're watching)
 * - Allowance card (current state, Request Money button)
 * - Vault summary (locked, growing = good)
 * - Recent activity
 * - Upcoming bills
 *
 * NO cute greetings, NO "How are you feeling?" prompts
 * Dark mode, high contrast, instantly readable
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

// Mock data for MVP - in production, these would come from Supabase
const MOCK_USER = {
  daysClean: 47,
  dailyAllowance: 30.00,
  allowanceRemaining: 23.50,
  vaultBalance: 2150.00,
  vaultGrowth: 2150.00,
  guardian: {
    name: 'Gutsy',
    isActive: true,
  },
};

const MOCK_RECENT_ACTIVITY = [
  { id: 1, type: 'payment', payee: 'Easygo payment', amount: -626.22, daysAgo: 2, status: 'approved' },
  { id: 2, type: 'payment', payee: 'Foodworks', amount: -45.30, daysAgo: 3, status: 'approved' },
  { id: 3, type: 'request', reason: 'Cash request', amount: 50, daysAgo: 5, status: 'denied' },
];

const MOCK_UPCOMING_BILLS = [
  { id: 1, payee: 'Easygo', amount: 626.22, dueDate: 'Tomorrow' },
  { id: 2, payee: 'Rent', amount: 440.00, dueDate: '3 days' },
];

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(MOCK_USER);
  const [recentActivity, setRecentActivity] = useState(MOCK_RECENT_ACTIVITY);
  const [upcomingBills, setUpcomingBills] = useState(MOCK_UPCOMING_BILLS);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // In production, load from Supabase:
      // - User data (days clean, allowance, vault balance)
      // - Recent transactions/requests
      // - Upcoming bills
      // - Guardian status

      // For now, using mock data
      setUserData(MOCK_USER);
      setRecentActivity(MOCK_RECENT_ACTIVITY);
      setUpcomingBills(MOCK_UPCOMING_BILLS);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Pull to refresh.');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const handleRequestMoney = () => {
    navigation.navigate('PaymentRequest');
  };

  const handleViewAllActivity = () => {
    // Navigate to full transaction history
    console.log('View all activity');
  };

  const handleViewAllBills = () => {
    navigation.navigate('Bills');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section: Header + Days Clean + Guardian */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ANCHOR</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={32} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Days Clean - LARGEST ELEMENT (primary metric) */}
          <View style={styles.daysCleanContainer}>
            <Text style={styles.daysCleanNumber}>{userData.daysClean}</Text>
            <Text style={styles.daysCleanLabel}>DAYS CLEAN</Text>
          </View>

          {/* Guardian Status - Always Visible */}
          <TouchableOpacity
            style={styles.guardianStatus}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.guardianText}>
              Guardian: <Text style={styles.guardianName}>{userData.guardian.name}</Text> ✓ Watching
            </Text>
          </TouchableOpacity>
        </View>

        {/* Allowance Card */}
        <View style={styles.allowanceCard}>
          <Text style={styles.cardTitle}>TODAY'S ALLOWANCE</Text>

          <Text style={styles.allowanceAmount}>
            ${userData.allowanceRemaining.toFixed(2)} <Text style={styles.allowanceTotal}>of ${userData.dailyAllowance.toFixed(0)}</Text>
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(userData.allowanceRemaining / userData.dailyAllowance) * 100}%`,
                  backgroundColor: userData.allowanceRemaining > 10 ? Colors.success : Colors.warning,
                }
              ]}
            />
          </View>

          <Text style={styles.allowanceReset}>Resets at midnight</Text>

          <TouchableOpacity
            style={styles.requestButton}
            onPress={handleRequestMoney}
            activeOpacity={0.8}
          >
            <Text style={styles.requestButtonText}>Request More Money</Text>
          </TouchableOpacity>
        </View>

        {/* Vault Summary */}
        <View style={styles.vaultCard}>
          <View style={styles.vaultHeader}>
            <Text style={styles.cardTitle}>VAULT (Locked)</Text>
            <Ionicons name="lock-closed" size={18} color={Colors.textSecondary} />
          </View>

          <Text style={styles.vaultAmount}>${userData.vaultBalance.toFixed(2)}</Text>

          <Text style={styles.vaultGrowth}>
            Since clean: <Text style={styles.vaultGrowthAmount}>+${userData.vaultGrowth.toFixed(0)}</Text>
          </Text>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT</Text>

          {recentActivity.map(item => (
            <View key={item.id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                {item.status === 'approved' && <Text style={styles.activityIcon}>✓</Text>}
                {item.status === 'denied' && <Text style={styles.activityIconDenied}>⚠</Text>}
                <Text style={styles.activityDescription}>{item.payee || item.reason}</Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={[
                  styles.activityAmount,
                  item.status === 'denied' && styles.activityAmountDenied
                ]}>
                  {item.status === 'denied' ? `$${item.amount}` : `-$${Math.abs(item.amount).toFixed(2)}`}
                </Text>
                <Text style={styles.activityDate}>({item.daysAgo}d)</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllActivity}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Bills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILLS DUE SOON</Text>

          {upcomingBills.map(bill => (
            <View key={bill.id} style={styles.billItem}>
              <View>
                <Text style={styles.billPayee}>{bill.payee} - ${bill.amount.toFixed(2)}</Text>
                <Text style={styles.billDue}>({bill.dueDate})</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllBills}>
            <Text style={styles.viewAllText}>View All Bills</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => {}}>
          <Ionicons name="home" size={24} color={Colors.accent} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Bills')}>
          <Ionicons name="receipt-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.navLabel}>Bills</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Progress')}>
          <Ionicons name="trending-up-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.navLabel}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.navLabel}>Profile</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xl,
  },

  // Top Section
  topSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h2,
    letterSpacing: 2,
  },

  // Days Clean - LARGEST ELEMENT
  daysCleanContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  daysCleanNumber: {
    ...Typography.numberLarge,
    fontSize: 72,
    lineHeight: 80,
    marginBottom: Spacing.sm,
  },
  daysCleanLabel: {
    ...Typography.h3,
    color: Colors.textSecondary,
    letterSpacing: 3,
  },

  // Guardian Status
  guardianStatus: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  guardianText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  guardianName: {
    color: Colors.guardian,
    fontWeight: '600',
  },

  // Allowance Card
  allowanceCard: {
    ...Components.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cardTitle: {
    ...Typography.h4,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  allowanceAmount: {
    ...Typography.numberMedium,
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  allowanceTotal: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.backgroundModal,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  allowanceReset: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
  },
  requestButton: {
    ...Components.buttonPrimary,
    paddingVertical: 14,
  },
  requestButtonText: {
    ...Typography.button,
  },

  // Vault Card
  vaultCard: {
    ...Components.card,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundModal,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  vaultAmount: {
    ...Typography.numberMedium,
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  vaultGrowth: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  vaultGrowthAmount: {
    color: Colors.success,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // Activity Items
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    ...Typography.body,
    color: Colors.success,
    marginRight: Spacing.sm,
  },
  activityIconDenied: {
    ...Typography.body,
    color: Colors.warning,
    marginRight: Spacing.sm,
  },
  activityDescription: {
    ...Typography.body,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    ...Typography.body,
    fontWeight: '600',
  },
  activityAmountDenied: {
    color: Colors.warning,
  },
  activityDate: {
    ...Typography.small,
    color: Colors.textTertiary,
  },

  // Bill Items
  billItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  billPayee: {
    ...Typography.body,
    marginBottom: 4,
  },
  billDue: {
    ...Typography.small,
    color: Colors.textSecondary,
  },

  // View All Button
  viewAllButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  viewAllText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  navLabel: {
    ...Typography.small,
    fontSize: 11,
    marginTop: 4,
    color: Colors.textSecondary,
  },
  navLabelActive: {
    color: Colors.accent,
  },
});
