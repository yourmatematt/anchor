/**
 * Progress Screen - Clean Streak + Financial Tracking
 *
 * Shows:
 * - Days clean (LARGE number, factual)
 * - Calendar visualization (green = clean, red = relapse)
 * - Financial progress (vault growth, debt paid)
 * - Intervention history (approved/denied log)
 * - Milestones (factual, NO celebration)
 *
 * NO gamification, NO badges, NO "Great job!" fluff
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

// Mock data - in production from Supabase
const MOCK_DATA = {
  daysClean: 47,
  startDate: '2024-10-01',
  targetDate: '2025-10-01',
  vaultSaved: 2150.00,
  debtPaid: 1252.44,
  wouldHaveLost: 3500.00,
  longestStreak: 47,
};

const MOCK_INTERVENTIONS = [
  { id: 1, daysAgo: 0, type: 'Anchor started', status: 'milestone' },
  { id: 2, daysAgo: 7, type: 'Request approved', detail: 'Work boots $100', status: 'approved' },
  { id: 3, daysAgo: 15, type: 'Request denied', detail: 'Vague $50 11pm', status: 'denied' },
  { id: 4, daysAgo: 32, type: 'Request approved', detail: 'Trivia equipment', status: 'approved' },
];

const MILESTONES = [
  { days: 7, date: '2024-11-08', completed: true },
  { days: 30, date: '2024-10-31', completed: true },
  { days: 60, date: null, inDays: 13, completed: false },
  { days: 90, date: null, inDays: 43, completed: false },
  { days: 180, date: null, inDays: 136, completed: false },
  { days: 365, date: null, inDays: 318, completed: false },
];

export default function ProgressScreen({ navigation }) {
  const renderCalendarDay = (day, isClean, isToday) => {
    let backgroundColor = Colors.background;
    let textColor = Colors.textTertiary;

    if (isClean) {
      backgroundColor = Colors.successBackground;
      textColor = Colors.success;
    }
    if (isToday) {
      backgroundColor = Colors.accent;
      textColor = Colors.textPrimary;
    }

    return (
      <View
        key={day}
        style={[
          styles.calendarDay,
          { backgroundColor },
        ]}
      >
        <Text style={[styles.calendarDayText, { color: textColor }]}>
          {day}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROGRESS</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Days Clean - LARGE */}
        <View style={styles.daysCleanSection}>
          <Text style={styles.daysCleanNumber}>{MOCK_DATA.daysClean}</Text>
          <Text style={styles.daysCleanLabel}>DAYS CLEAN</Text>

          <Text style={styles.daysCleanDates}>
            Started: {new Date(MOCK_DATA.startDate).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}{'\n'}
            Target: {new Date(MOCK_DATA.targetDate).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })} (12 months)
          </Text>
        </View>

        {/* Financial Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FINANCIAL PROGRESS</Text>

          <View style={styles.financialCard}>
            <Text style={styles.financialSubtitle}>
              Since clean ({MOCK_DATA.daysClean} days):
            </Text>

            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Saved in Vault</Text>
              <Text style={[styles.financialValue, { color: Colors.success }]}>
                +${MOCK_DATA.vaultSaved.toFixed(2)}
              </Text>
            </View>

            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Debt paid down</Text>
              <Text style={[styles.financialValue, { color: Colors.success }]}>
                -${MOCK_DATA.debtPaid.toFixed(2)}
              </Text>
            </View>

            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Not lost gambling</Text>
              <Text style={[styles.financialValue, { color: Colors.success }]}>
                +${(MOCK_DATA.vaultSaved + MOCK_DATA.debtPaid).toFixed(2)}
              </Text>
            </View>

            <View style={styles.financialNote}>
              <Text style={styles.financialNoteText}>
                At your old rate, you would have lost ${MOCK_DATA.wouldHaveLost.toFixed(0)} by now.
              </Text>
            </View>
          </View>
        </View>

        {/* Clean Streak Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOVEMBER 2024</Text>

          <View style={styles.calendarCard}>
            {/* Day labels */}
            <View style={styles.calendarHeader}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                <Text key={day} style={styles.calendarHeaderText}>{day}</Text>
              ))}
            </View>

            {/* Calendar days (simplified - in production, calculate from actual dates) */}
            <View style={styles.calendarGrid}>
              {/* Week 1 */}
              <View style={styles.calendarRow}>
                {[null, null, null, 1, 2, 3].map((day, i) =>
                  day ? renderCalendarDay(day, true, false) : <View key={i} style={styles.calendarDay} />
                )}
              </View>

              {/* Week 2 */}
              <View style={styles.calendarRow}>
                {[4, 5, 6, 7, 8, 9, 10].map(day => renderCalendarDay(day, true, false))}
              </View>

              {/* Week 3 */}
              <View style={styles.calendarRow}>
                {[11, 12, 13, 14, 15, 16, 17].map(day => renderCalendarDay(day, true, day === 16))}
              </View>
            </View>

            {/* Legend */}
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Clean day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.alert }]} />
                <Text style={styles.legendText}>Relapse</Text>
              </View>
            </View>

            <View style={styles.streakStats}>
              <View style={styles.streakStat}>
                <Text style={styles.streakStatLabel}>Current streak</Text>
                <Text style={styles.streakStatValue}>{MOCK_DATA.daysClean} days</Text>
              </View>
              <View style={styles.streakStat}>
                <Text style={styles.streakStatLabel}>Longest streak</Text>
                <Text style={styles.streakStatValue}>{MOCK_DATA.longestStreak} days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Intervention History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTERVENTIONS</Text>

          <View style={styles.interventionCard}>
            {MOCK_INTERVENTIONS.map(intervention => (
              <View key={intervention.id} style={styles.interventionItem}>
                <Text style={styles.interventionDate}>
                  {intervention.daysAgo === 0 ? 'Today' : `${intervention.daysAgo} days ago`}
                </Text>
                <Text style={styles.interventionType}>{intervention.type}</Text>
                {intervention.detail && (
                  <Text style={styles.interventionDetail}>({intervention.detail})</Text>
                )}
              </View>
            ))}

            <View style={styles.interventionStats}>
              <Text style={styles.interventionStatsText}>
                Total requests: 8 • Approved: 6 • Denied: 2 • Conversations: 3
              </Text>
            </View>

            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Interventions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milestones - Factual, Not Gamified */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MILESTONES</Text>

          <View style={styles.milestonesCard}>
            {MILESTONES.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <View style={styles.milestoneIcon}>
                  <Ionicons
                    name={milestone.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={milestone.completed ? Colors.success : Colors.textTertiary}
                  />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[
                    styles.milestoneText,
                    milestone.completed && styles.milestoneTextComplete,
                  ]}>
                    {milestone.days} days clean
                  </Text>
                  {milestone.date && (
                    <Text style={styles.milestoneDate}>
                      {new Date(milestone.date).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </Text>
                  )}
                  {milestone.inDays && (
                    <Text style={styles.milestoneDate}>(in {milestone.inDays} days)</Text>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.milestonesFooter}>
              <Text style={styles.milestonesFooterText}>
                No badges. No points.{'\n'}
                Just days. Keep going.
              </Text>
            </View>
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
    paddingTop: Spacing.lg,
  },
  daysCleanSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  daysCleanNumber: {
    ...Typography.numberLarge,
    fontSize: 80,
    lineHeight: 88,
    marginBottom: Spacing.sm,
  },
  daysCleanLabel: {
    ...Typography.h2,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginBottom: Spacing.lg,
  },
  daysCleanDates: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
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
  financialCard: {
    ...Components.card,
  },
  financialSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  financialLabel: {
    ...Typography.body,
  },
  financialValue: {
    ...Typography.h3,
  },
  financialNote: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  financialNoteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  calendarCard: {
    ...Components.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  calendarHeaderText: {
    ...Typography.small,
    color: Colors.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    marginBottom: Spacing.lg,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    ...Typography.caption,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  streakStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  streakStat: {
    flex: 1,
  },
  streakStatLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  streakStatValue: {
    ...Typography.h4,
  },
  interventionCard: {
    ...Components.card,
  },
  interventionItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  interventionDate: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  interventionType: {
    ...Typography.body,
  },
  interventionDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  interventionStats: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  interventionStatsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  viewAllButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  viewAllText: {
    ...Typography.buttonSmall,
    color: Colors.accent,
  },
  milestonesCard: {
    ...Components.card,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  milestoneIcon: {
    marginRight: Spacing.md,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  milestoneTextComplete: {
    color: Colors.textPrimary,
  },
  milestoneDate: {
    ...Typography.small,
    color: Colors.textTertiary,
  },
  milestonesFooter: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  milestonesFooterText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
