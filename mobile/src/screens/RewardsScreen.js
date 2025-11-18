/**
 * Rewards Screen
 *
 * Displays user's earned rewards, milestone progress, and available partner benefits.
 * Non-gamified design focusing on meaningful support and practical assistance.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const MILESTONES = [
  {
    id: 'month_1',
    days: 30,
    name: '30 Days',
    description: 'One month of progress',
    icon: 'leaf-outline',
    color: '#4CAF50'
  },
  {
    id: 'month_3',
    days: 90,
    name: '90 Days',
    description: 'Three months of commitment',
    icon: 'flower-outline',
    color: '#2196F3'
  },
  {
    id: 'month_6',
    days: 180,
    name: '180 Days',
    description: 'Six months of dedication',
    icon: 'sunny-outline',
    color: '#FF9800'
  },
  {
    id: 'year_1',
    days: 365,
    name: 'One Year',
    description: 'A full year of achievement',
    icon: 'trophy-outline',
    color: '#9C27B0'
  }
];

export default function RewardsScreen() {
  const [rewards, setRewards] = useState([]);
  const [cleanDays, setCleanDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showPartnerSelector, setShowPartnerSelector] = useState(false);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    loadRewards();
    loadCleanDays();
  }, []);

  /**
   * Load user's rewards
   */
  const loadRewards = async () => {
    try {
      // In production, this would call your API
      // const response = await fetch('/api/rewards', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setRewards(data.rewards);

      // Mock data for demonstration
      setRewards([
        {
          id: '1',
          milestone_id: 'month_1',
          status: 'issued',
          reward_type: 'grocery_voucher',
          reward_amount: 20,
          partner_used: 'woolworths',
          issued_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          distribution_details: {
            voucherCode: 'WW-XXXX-XXXX',
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load rewards:', error);
      setLoading(false);
    }
  };

  /**
   * Load user's clean days count
   */
  const loadCleanDays = async () => {
    try {
      // In production, fetch from API
      // const response = await fetch('/api/user/progress');
      // const data = await response.json();
      // setCleanDays(data.clean_days);

      // Mock data
      setCleanDays(45);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  /**
   * Refresh rewards
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRewards(), loadCleanDays()]);
    setRefreshing(false);
  };

  /**
   * Check for new rewards
   */
  const checkForRewards = async () => {
    try {
      Alert.alert(
        'Checking for Rewards',
        'Looking for any new rewards you may have earned...',
        [{ text: 'OK' }]
      );

      // In production:
      // const response = await fetch('/api/rewards/check', { method: 'POST' });
      // const data = await response.json();

      await loadRewards();
    } catch (error) {
      Alert.alert('Error', 'Failed to check for rewards');
    }
  };

  /**
   * Claim a choice reward
   */
  const claimReward = async (rewardId, partnerId) => {
    try {
      // In production:
      // await fetch(`/api/rewards/${rewardId}/claim`, {
      //   method: 'POST',
      //   body: JSON.stringify({ partnerId })
      // });

      Alert.alert(
        'Reward Claimed!',
        'Your reward will be delivered shortly. Check your email for details.',
        [{ text: 'OK' }]
      );

      setShowPartnerSelector(false);
      setSelectedReward(null);
      await loadRewards();
    } catch (error) {
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  /**
   * Open partner selector for choice rewards
   */
  const openPartnerSelector = (reward) => {
    setSelectedReward(reward);

    // Load available partners based on reward type
    const eligiblePartners = [
      { id: 'woolworths', name: 'Woolworths', type: 'retail' },
      { id: 'coles', name: 'Coles', type: 'retail' },
      { id: 'energy_australia', name: 'Energy Australia', type: 'utility' },
      { id: 'agl', name: 'AGL', type: 'utility' },
      { id: 'opal', name: 'Opal Card', type: 'transport' }
    ];

    setPartners(eligiblePartners);
    setShowPartnerSelector(true);
  };

  /**
   * Get milestone info
   */
  const getMilestone = (milestoneId) => {
    return MILESTONES.find(m => m.id === milestoneId);
  };

  /**
   * Calculate progress to next milestone
   */
  const getNextMilestone = () => {
    const upcoming = MILESTONES.find(m => m.days > cleanDays);
    if (!upcoming) return null;

    const progress = (cleanDays / upcoming.days) * 100;
    const daysRemaining = upcoming.days - cleanDays;

    return { ...upcoming, progress, daysRemaining };
  };

  /**
   * Render milestone progress
   */
  const renderMilestoneProgress = () => {
    const nextMilestone = getNextMilestone();

    if (!nextMilestone) {
      return (
        <View style={styles.progressCard}>
          <Ionicons name="star" size={40} color="#FFD700" />
          <Text style={styles.progressTitle}>All Milestones Complete!</Text>
          <Text style={styles.progressSubtitle}>
            You've achieved every milestone. Keep going!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Ionicons name={nextMilestone.icon} size={32} color={nextMilestone.color} />
          <View style={styles.progressHeaderText}>
            <Text style={styles.progressTitle}>Next Milestone</Text>
            <Text style={styles.progressMilestone}>{nextMilestone.name}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${nextMilestone.progress}%`, backgroundColor: nextMilestone.color }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {cleanDays} / {nextMilestone.days} days
          </Text>
        </View>

        <Text style={styles.progressDays}>
          {nextMilestone.daysRemaining} days remaining
        </Text>
      </View>
    );
  };

  /**
   * Render reward card
   */
  const renderReward = (reward) => {
    const milestone = getMilestone(reward.milestone_id);
    const isClaimable = reward.status === 'pending' && reward.reward_type === 'choice';

    return (
      <View key={reward.id} style={styles.rewardCard}>
        <View style={styles.rewardHeader}>
          <View style={styles.rewardIcon}>
            <Ionicons
              name={milestone?.icon || 'gift-outline'}
              size={24}
              color={milestone?.color || '#666'}
            />
          </View>
          <View style={styles.rewardHeaderText}>
            <Text style={styles.rewardTitle}>{milestone?.name || 'Reward'}</Text>
            <Text style={styles.rewardSubtitle}>{milestone?.description}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(reward.status)]}>
            <Text style={styles.statusText}>{getStatusLabel(reward.status)}</Text>
          </View>
        </View>

        <View style={styles.rewardBody}>
          <Text style={styles.rewardAmount}>${reward.reward_amount}</Text>
          <Text style={styles.rewardType}>{getRewardTypeLabel(reward.reward_type)}</Text>
        </View>

        {reward.status === 'issued' && reward.distribution_details && (
          <View style={styles.rewardDetails}>
            <Text style={styles.detailsLabel}>Voucher Code:</Text>
            <Text style={styles.detailsValue}>{reward.distribution_details.voucherCode}</Text>
            {reward.distribution_details.expiresAt && (
              <Text style={styles.detailsExpiry}>
                Expires: {new Date(reward.distribution_details.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {isClaimable && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => openPartnerSelector(reward)}
          >
            <Text style={styles.claimButtonText}>Choose Partner & Claim</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * Get status badge style
   */
  const getStatusBadgeStyle = (status) => {
    const styles = {
      pending: { backgroundColor: '#FFF3E0' },
      processing: { backgroundColor: '#E3F2FD' },
      issued: { backgroundColor: '#E8F5E9' },
      redeemed: { backgroundColor: '#F3E5F5' },
      expired: { backgroundColor: '#FFEBEE' },
      failed: { backgroundColor: '#FFEBEE' }
    };
    return styles[status] || styles.pending;
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Ready',
      processing: 'Processing',
      issued: 'Available',
      redeemed: 'Used',
      expired: 'Expired',
      failed: 'Failed'
    };
    return labels[status] || status;
  };

  /**
   * Get reward type label
   */
  const getRewardTypeLabel = (type) => {
    const labels = {
      grocery_voucher: 'Grocery Voucher',
      utility_credit: 'Utility Bill Credit',
      transport_credit: 'Transport Credit',
      choice: 'Your Choice'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
          <TouchableOpacity onPress={checkForRewards}>
            <Ionicons name="refresh-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {renderMilestoneProgress()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rewards</Text>
          {rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No rewards yet</Text>
              <Text style={styles.emptySubtext}>
                Keep going to earn your first milestone reward!
              </Text>
            </View>
          ) : (
            rewards.map(reward => renderReward(reward))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support Resources</Text>
          <TouchableOpacity style={styles.supportCard}>
            <Ionicons name="call-outline" size={24} color="#007AFF" />
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>Lifeline</Text>
              <Text style={styles.supportSubtitle}>24/7 Crisis Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportCard}>
            <Ionicons name="people-outline" size={24} color="#007AFF" />
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>Financial Counseling</Text>
              <Text style={styles.supportSubtitle}>Free professional support</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Partner Selection Modal */}
      <Modal
        visible={showPartnerSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPartnerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Partner</Text>
              <TouchableOpacity onPress={() => setShowPartnerSelector(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.partnerList}>
              {partners.map(partner => (
                <TouchableOpacity
                  key={partner.id}
                  style={styles.partnerCard}
                  onPress={() => claimReward(selectedReward?.id, partner.id)}
                >
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerType}>{partner.type}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  scrollView: {
    flex: 1
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  progressCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  progressHeaderText: {
    marginLeft: 16,
    flex: 1
  },
  progressTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4
  },
  progressMilestone: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  progressSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8
  },
  progressBarContainer: {
    marginBottom: 12
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  progressDays: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500'
  },
  section: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  rewardCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rewardHeaderText: {
    flex: 1,
    marginLeft: 12
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  rewardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  rewardBody: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  rewardType: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  rewardDetails: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12
  },
  detailsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  detailsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2
  },
  detailsExpiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 8
  },
  claimButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  claimButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center'
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  supportText: {
    flex: 1,
    marginLeft: 16
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  supportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  partnerList: {
    padding: 20
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  partnerType: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
    textTransform: 'capitalize'
  }
});
