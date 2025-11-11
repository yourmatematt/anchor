/**
 * Home Screen
 *
 * Main dashboard showing:
 * - Current account balance
 * - Today's transactions
 * - Whitelist status indicator
 * - Pending interventions badge
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
  Alert
} from 'react-native';
import { accountService, transactionService as upTransactionService } from '../services/upBank';
import { transactionService, realtimeService } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [balance, setBalance] = useState(null);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [pendingInterventions, setPendingInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription on unmount
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load balance
      const totalBalance = await accountService.getTotalBalance();
      setBalance(totalBalance);

      // Load today's transactions
      const { transactions } = await upTransactionService.getTodayTransactions();
      setTodayTransactions(transactions);

      // Load pending interventions
      const pending = await transactionService.getPendingInterventions();
      setPendingInterventions(pending);

      // If there are pending interventions, navigate to alert screen
      if (pending.length > 0) {
        navigation.navigate('Alert', { transaction: pending[0] });
      }

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function setupRealtimeSubscription() {
    // Subscribe to new transactions
    const channel = realtimeService.subscribeToTransactions((payload) => {
      console.log('New transaction:', payload);
      const newTransaction = payload.new;

      // If transaction is not whitelisted, navigate to alert
      if (!newTransaction.is_whitelisted) {
        navigation.navigate('Alert', { transaction: newTransaction });
      }

      // Refresh data
      loadData();
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Anchor</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Whitelist')}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Pending Interventions Alert */}
      {pendingInterventions.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => navigation.navigate('Alert', { transaction: pendingInterventions[0] })}
        >
          <Ionicons name="warning" size={24} color="#fff" />
          <View style={styles.alertBannerText}>
            <Text style={styles.alertBannerTitle}>
              {pendingInterventions.length} Pending Transaction{pendingInterventions.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertBannerSubtitle}>
              Tap to complete voice memo
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          ${balance ? parseFloat(balance).toFixed(2) : '0.00'}
        </Text>
        <View style={styles.balanceStatus}>
          <View style={[styles.statusDot, { backgroundColor: '#34c759' }]} />
          <Text style={styles.statusText}>Protected by Anchor</Text>
        </View>
      </View>

      {/* Today's Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Transactions</Text>

        {todayTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#34c759" />
            <Text style={styles.emptyStateText}>No transactions today</Text>
          </View>
        ) : (
          todayTransactions.map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Ionicons
                  name={parseFloat(tx.amount.value) < 0 ? 'arrow-up' : 'arrow-down'}
                  size={20}
                  color={parseFloat(tx.amount.value) < 0 ? '#ff3b30' : '#34c759'}
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>{tx.description}</Text>
                <Text style={styles.transactionTime}>
                  {new Date(tx.createdAt).toLocaleTimeString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: parseFloat(tx.amount.value) < 0 ? '#ff3b30' : '#34c759' }
                ]}
              >
                ${Math.abs(parseFloat(tx.amount.value)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Whitelist')}
        >
          <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
          <Text style={styles.actionButtonText}>Manage Whitelist</Text>
          <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertBanner: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  alertBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  alertBannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertBannerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  balanceCard: {
    backgroundColor: '#1c1c1e',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
  },
  balanceLabel: {
    color: '#8e8e93',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  balanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#8e8e93',
    fontSize: 16,
    marginTop: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionTime: {
    color: '#8e8e93',
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
});
