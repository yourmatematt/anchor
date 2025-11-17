/**
 * Guardian Analytics Dashboard
 *
 * Comprehensive analytics view for guardians
 * Shows patterns, risks, and trends WITHOUT dollar amounts
 * Focus on behavioral patterns and intervention effectiveness
 */

import React, { useState, useEffect } from 'react';
import { RiskAlertList } from '../components/RiskAlert';
import styles from '../styles/Analytics.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);
  const [selectedUser, setSelectedUser] = useState('patient-zero'); // TODO: Multi-user support

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, selectedUser]);

  /**
   * Load analytics data
   */
  async function loadAnalytics() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/guardian-advanced/analytics?userId=${selectedUser}&timeframe=${timeframe}`
      );

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle risk alert action
   */
  async function handleTakeAction(risk) {
    // Navigate to appropriate action based on risk type
    if (risk.severity === 'very-high') {
      if (confirm('This is a high-risk situation. Send immediate check-in message?')) {
        await sendQuickMessage('high_risk');
      }
    } else {
      // Schedule check-in
      if (confirm(`Schedule check-in for ${risk.recommendation}?`)) {
        await scheduleCheckIn(risk);
      }
    }
  }

  /**
   * Send quick message
   */
  async function sendQuickMessage(context) {
    try {
      const response = await fetch(`${API_URL}/api/guardian-advanced/quick-messages?context=${context}`);
      const data = await response.json();

      // Show message picker
      const message = prompt('Select or customize message:', data.messages[0]);

      if (message) {
        await fetch(`${API_URL}/api/guardian-advanced/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUser,
            message: message,
            context: context
          })
        });

        alert('Message sent successfully!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    }
  }

  /**
   * Schedule check-in
   */
  async function scheduleCheckIn(risk) {
    try {
      const scheduledTime = new Date();
      scheduledTime.setHours(scheduledTime.getHours() + (risk.daysAway * 24));

      await fetch(`${API_URL}/api/guardian-advanced/schedule-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          scheduledTime: scheduledTime.toISOString(),
          message: risk.recommendation,
          type: risk.type
        })
      });

      alert('Check-in scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling check-in:', error);
      alert('Failed to schedule check-in.');
    }
  }

  /**
   * Get risk trend icon and color
   */
  const getRiskTrendDisplay = (trend, direction) => {
    if (trend === 'decreasing') {
      return { icon: '📉', color: '#10b981', text: 'Improving' };
    } else if (trend === 'increasing') {
      return { icon: '📈', color: '#dc2626', text: 'Escalating' };
    } else {
      return { icon: '➡️', color: '#6b7280', text: 'Stable' };
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={styles.container}>
        <p>No analytics data available.</p>
      </div>
    );
  }

  const trendDisplay = getRiskTrendDisplay(analytics.riskTrend.trend, analytics.riskTrend.trendDirection);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Guardian Analytics</h1>
          <p className={styles.subtitle}>Pattern insights and intervention effectiveness</p>
        </div>

        <div className={styles.timeframeSelector}>
          <button
            className={timeframe === 7 ? styles.timeframeActive : styles.timeframeButton}
            onClick={() => setTimeframe(7)}
          >
            7 Days
          </button>
          <button
            className={timeframe === 30 ? styles.timeframeActive : styles.timeframeButton}
            onClick={() => setTimeframe(30)}
          >
            30 Days
          </button>
          <button
            className={timeframe === 90 ? styles.timeframeActive : styles.timeframeButton}
            onClick={() => setTimeframe(90)}
          >
            90 Days
          </button>
        </div>
      </header>

      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Current Streak</h3>
            <span className={styles.cardIcon}>🔥</span>
          </div>
          <p className={styles.metricLarge}>{analytics.overview.currentStreak} days</p>
          <p className={styles.metricSubtext}>
            Longest: {analytics.overview.longestStreak} days
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Clean Days</h3>
            <span className={styles.cardIcon}>✅</span>
          </div>
          <p className={styles.metricLarge}>{analytics.overview.cleanPercentage}%</p>
          <p className={styles.metricSubtext}>
            {analytics.overview.cleanDaysCount} of {analytics.timeframe} days
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Risk Trend</h3>
            <span className={styles.cardIcon}>{trendDisplay.icon}</span>
          </div>
          <p className={styles.metricLarge} style={{ color: trendDisplay.color }}>
            {trendDisplay.text}
          </p>
          <p className={styles.metricSubtext}>
            {analytics.riskTrend.message}
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Intervention Success</h3>
            <span className={styles.cardIcon}>🎯</span>
          </div>
          <p className={styles.metricLarge}>{analytics.interventionEffectiveness.rate}%</p>
          <p className={styles.metricSubtext}>
            {analytics.interventionEffectiveness.effective} of {analytics.interventionEffectiveness.total} effective
          </p>
        </div>
      </div>

      {/* Risk Alerts */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming Risks</h2>
        <RiskAlertList
          risks={analytics.upcomingRisks}
          onTakeAction={handleTakeAction}
        />
      </section>

      {/* Active Triggers */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Active Trigger Patterns</h2>
        <div className={styles.triggersGrid}>
          {analytics.activeTriggers.map((trigger, index) => (
            <div key={index} className={styles.triggerCard}>
              <div className={styles.triggerHeader}>
                <span className={styles.triggerName}>{trigger.name}</span>
                <span className={`${styles.triggerBadge} ${styles[`severity${trigger.severity.charAt(0).toUpperCase() + trigger.severity.slice(1)}`]}`}>
                  {trigger.severity}
                </span>
              </div>
              <p className={styles.triggerCount}>{trigger.count} incidents</p>
              <div className={styles.triggerBar}>
                <div
                  className={styles.triggerBarFill}
                  style={{
                    width: `${Math.min((trigger.count / analytics.overview.riskDaysCount) * 100, 100)}%`,
                    backgroundColor: trigger.severity === 'high' ? '#dc2626' : trigger.severity === 'medium' ? '#f59e0b' : '#10b981'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* High-Risk Time Periods */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>High-Risk Time Periods</h2>
        <div className={styles.riskPeriodsGrid}>
          {analytics.highRiskPeriods.map((period, index) => (
            <div key={index} className={styles.riskPeriodCard}>
              <div className={styles.riskPeriodDay}>{period.day}</div>
              <div className={styles.riskPeriodTime}>{period.timeRange}</div>
              <div className={styles.riskPeriodCount}>{period.count} incidents</div>
              <span className={`${styles.riskLevelBadge} ${styles[period.riskLevel]}`}>
                {period.riskLevel.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Trend Chart */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Risk Trend Over Time</h2>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            {analytics.riskTrend.periodScores.map((period, index) => (
              <div key={index} className={styles.chartBar}>
                <div
                  className={styles.chartBarFill}
                  style={{
                    height: `${Math.max(period.riskScore * 20, 5)}%`,
                    backgroundColor: period.riskScore > 5 ? '#dc2626' : period.riskScore > 2 ? '#f59e0b' : '#10b981'
                  }}
                ></div>
                <div className={styles.chartLabel}>{period.period}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          <button
            className={styles.actionButton}
            onClick={() => sendQuickMessage('general')}
          >
            📱 Send Check-In Message
          </button>
          <button
            className={styles.actionButton}
            onClick={() => window.location.href = '/guardian-portal/intervention-history'}
          >
            📋 View Intervention History
          </button>
          <button
            className={styles.actionButton}
            onClick={() => window.location.href = '/guardian-portal/resources'}
          >
            📚 Guardian Resources
          </button>
          <button
            className={styles.actionButton}
            onClick={() => window.location.href = '/guardian-portal/group-view'}
          >
            👥 Community Insights
          </button>
        </div>
      </section>
    </div>
  );
}
