/**
 * Profile Screen - Settings & Guardian Info
 *
 * Shows:
 * - Guardian details (always visible, cannot change during commitment)
 * - Commitment period countdown
 * - Settings and notifications
 * - Emergency helplines (prominent)
 * - NO deactivate button (hidden until commitment ends)
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
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

// Mock data - in production from Supabase
const MOCK_USER = {
  name: 'Matt',
  email: 'matt@example.com',
};

const MOCK_GUARDIAN = {
  name: 'Gutsy',
  phone: '0412 XXX XXX',
  email: 'gutsy@example.com',
  relationship: 'Friend',
  activeSince: '2024-10-01',
  isActive: true,
};

const MOCK_COMMITMENT = {
  months: 12,
  startDate: '2024-10-01',
  endDate: '2025-10-01',
  daysRemaining: 318,
};

const EMERGENCY_HELPLINES = [
  { name: 'Lifeline', phone: '13 11 14', description: 'Crisis support' },
  { name: 'Gambling Help', phone: '1800 858 858', description: '24/7 gambling support' },
  { name: 'Beyond Blue', phone: '1300 22 4636', description: 'Mental health support' },
];

export default function ProfileScreen({ navigation }) {
  const handleCallHelpline = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessageGuardian = () => {
    // In production, send SMS to guardian
    Alert.alert('Message Guardian', 'This would send an SMS to your guardian marked as "From Anchor"');
  };

  const handleViewWhatTheySee = () => {
    // Navigate to guardian view screen
    console.log('View what guardian sees');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color={Colors.textPrimary} />
          </View>
          <Text style={styles.userName}>{MOCK_USER.name}</Text>
          {MOCK_USER.email && (
            <Text style={styles.userEmail}>{MOCK_USER.email}</Text>
          )}
        </View>

        {/* Guardian Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GUARDIAN</Text>

          <View style={styles.guardianCard}>
            <View style={styles.guardianHeader}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.guardian} />
              <View style={styles.guardianInfo}>
                <Text style={styles.guardianName}>{MOCK_GUARDIAN.name}</Text>
                <Text style={styles.guardianRelationship}>{MOCK_GUARDIAN.relationship}</Text>
              </View>
              {MOCK_GUARDIAN.isActive && (
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              )}
            </View>

            <View style={styles.guardianDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{MOCK_GUARDIAN.phone}</Text>
              </View>
              {MOCK_GUARDIAN.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{MOCK_GUARDIAN.email}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>
                  Watching since {new Date(MOCK_GUARDIAN.activeSince).toLocaleDateString('en-AU')}
                </Text>
              </View>
            </View>

            <View style={styles.guardianActions}>
              <TouchableOpacity
                style={styles.guardianActionButton}
                onPress={handleViewWhatTheySee}
              >
                <Text style={styles.guardianActionText}>View What They See</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guardianActionButton}
                onPress={handleMessageGuardian}
              >
                <Text style={styles.guardianActionText}>Message Guardian</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>
                Cannot change guardian during commitment period
              </Text>
            </View>
          </View>
        </View>

        {/* Commitment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMMITMENT</Text>

          <View style={styles.commitmentCard}>
            <View style={styles.commitmentRow}>
              <Text style={styles.commitmentLabel}>Period</Text>
              <Text style={styles.commitmentValue}>{MOCK_COMMITMENT.months} months</Text>
            </View>

            <View style={styles.commitmentRow}>
              <Text style={styles.commitmentLabel}>Started</Text>
              <Text style={styles.commitmentValue}>
                {new Date(MOCK_COMMITMENT.startDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.commitmentRow}>
              <Text style={styles.commitmentLabel}>Ends</Text>
              <Text style={styles.commitmentValue}>
                {new Date(MOCK_COMMITMENT.endDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.commitmentCountdown}>
              <Text style={styles.countdownNumber}>{MOCK_COMMITMENT.daysRemaining}</Text>
              <Text style={styles.countdownLabel}>days remaining</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.noEscapeText}>
                NO CANCEL OPTION{'\n'}
                This was the point.
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Helplines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMERGENCY HELPLINES</Text>

          <View style={styles.helplinesCard}>
            {EMERGENCY_HELPLINES.map((helpline, index) => (
              <TouchableOpacity
                key={index}
                style={styles.helplineItem}
                onPress={() => handleCallHelpline(helpline.phone)}
                activeOpacity={0.7}
              >
                <View style={styles.helplineIcon}>
                  <Ionicons name="call" size={24} color={Colors.accent} />
                </View>
                <View style={styles.helplineInfo}>
                  <Text style={styles.helplineName}>{helpline.name}</Text>
                  <Text style={styles.helplineDesc}>{helpline.description}</Text>
                </View>
                <Text style={styles.helplinePhone}>{helpline.phone}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security & Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>

          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textPrimary} />
                <Text style={styles.settingText}>App Lock</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="logo-up" size={20} color={Colors.textPrimary} />
                <Text style={styles.settingText}>Up Bank Connection</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingStatus}>Connected</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="download-outline" size={20} color={Colors.textPrimary} />
                <Text style={styles.settingText}>Export Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Anchor v1.0{'\n'}
              Built by someone who lost $118k
            </Text>

            <TouchableOpacity style={styles.aboutLink}>
              <Text style={styles.aboutLinkText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.aboutLink}>
              <Text style={styles.aboutLinkText}>Terms of Service</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.aboutLink}>
              <Text style={styles.aboutLinkText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Spacing.xl,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  userName: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  guardianCard: {
    ...Components.card,
    backgroundColor: Colors.guardianBackground,
    borderWidth: 1,
    borderColor: Colors.guardian,
  },
  guardianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  guardianInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  guardianName: {
    ...Typography.h3,
  },
  guardianRelationship: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeText: {
    ...Typography.small,
    color: Colors.success,
  },
  guardianDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  guardianActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  guardianActionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.guardian,
    borderRadius: BorderRadius.sm,
  },
  guardianActionText: {
    ...Typography.buttonSmall,
    color: Colors.guardian,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  commitmentCard: {
    ...Components.card,
  },
  commitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  commitmentLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  commitmentValue: {
    ...Typography.body,
  },
  commitmentCountdown: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginVertical: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  countdownNumber: {
    ...Typography.numberLarge,
    fontSize: 56,
    lineHeight: 64,
  },
  countdownLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  noEscapeText: {
    ...Typography.body,
    textAlign: 'center',
    fontWeight: '600',
  },
  helplinesCard: {
    ...Components.card,
    gap: Spacing.md,
  },
  helplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  helplineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineInfo: {
    flex: 1,
  },
  helplineName: {
    ...Typography.body,
    fontWeight: '600',
  },
  helplineDesc: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  helplinePhone: {
    ...Typography.body,
    color: Colors.accent,
  },
  settingsCard: {
    ...Components.card,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingText: {
    ...Typography.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingStatus: {
    ...Typography.caption,
    color: Colors.success,
  },
  aboutCard: {
    ...Components.card,
  },
  aboutText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  aboutLink: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  aboutLinkText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
});
