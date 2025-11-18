/**
 * Executive Dashboard - Main View
 *
 * High-level overview of Anchor's key business metrics for leadership.
 * Real-time updates on growth, financial health, and user success.
 */

import React, { useState, useEffect } from 'react';
import { KPICard, KPIGrid, KPISection, MetricComparison, Sparkline } from '../components/KPICard';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadDashboardMetrics();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardMetrics();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardMetrics = async () => {
    try {
      // In production, this would call your API
      // const response = await fetch(`/api/executive/dashboard?timeRange=${timeRange}`);
      // const data = await response.json();

      // Mock data for demonstration
      setMetrics({
        growth: {
          totalUsers: 12547,
          newUsers: 1234,
          activationRate: 78.5,
          retention: {
            day1: 85.2,
            day7: 67.3,
            day30: 45.8,
            day90: 32.1
          },
          churnRate: 4.2,
          guardianAttachmentRate: 62.5,
          weekOverWeekGrowth: { rate: 8.3, absolute: 95 },
          monthOverMonthGrowth: { rate: 22.1, absolute: 342 }
        },
        financial: {
          totalVaultLocked: 1247893.50,
          averageVaultPerUser: 347.25,
          projectedAnnualSavings: { totalToDate: 8475923.00, projectedAnnual: 25423000.00 },
          costPerAcquisition: 42.50,
          lifetimeValue: 187.40,
          ltvCacRatio: 4.41,
          revenue: {
            total: 45230.00,
            mrr: 15410.00,
            arr: 184920.00
          }
        },
        success: {
          averageCleanStreak: 47.3,
          medianCleanStreak: 32,
          maxCleanStreak: 387,
          relapseRates: {
            overall: 15.2,
            by_commitment: {
              '7_days': 8.5,
              '30_days': 12.3,
              '90_days': 18.7
            }
          },
          interventionSuccessRate: { rate: 87.4 },
          patternDetectionAccuracy: 91.2,
          guardianEngagementScore: { score: 73.8 },
          milestoneAchievementRates: {
            '30_days': 58.3,
            '90_days': 34.2,
            '180_days': 18.7,
            '365_days': 6.4
          },
          usersAt30Days: 58.3,
          usersAt90Days: 34.2,
          usersAt180Days: 18.7,
          usersAt365Days: 6.4
        },
        engagement: {
          dailyActiveUsers: 3847,
          weeklyActiveUsers: 7234,
          monthlyActiveUsers: 9821,
          dauMauRatio: 39.2,
          voiceMemoCompletionRate: 82.5,
          averageInterventionsPerUser: 2.7,
          guardianAverageResponseTime: 12.3
        }
      });

      setLoading(false);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    // Export dashboard to PDF or CSV
    console.log(`Exporting dashboard as ${format}`);
  };

  const handleGenerateReport = () => {
    // Generate board report
    window.location.href = '/executive/reports/board';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Executive Dashboard</h1>
          <p style={styles.subtitle}>
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div style={styles.actions}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last Year</option>
          </select>
          <button onClick={() => handleExport('pdf')} style={styles.button}>
            Export PDF
          </button>
          <button onClick={handleGenerateReport} style={{...styles.button, ...styles.primaryButton}}>
            Board Report
          </button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <KPISection title="At a Glance">
        <KPIGrid columns={4}>
          <KPICard
            title="Total Users"
            value={metrics.growth.totalUsers}
            format="number"
            trend={metrics.growth.monthOverMonthGrowth.rate}
            trendDirection="up"
            subtitle={`+${metrics.growth.newUsers} this period`}
            status="success"
            icon="👥"
          />
          <KPICard
            title="Total Vault Locked"
            value={metrics.financial.totalVaultLocked}
            format="currency"
            trend={12.5}
            trendDirection="up"
            subtitle="Committed funds"
            status="success"
            icon="🔒"
          />
          <KPICard
            title="Average Clean Streak"
            value={metrics.success.averageCleanStreak}
            format="days"
            trend={5.2}
            trendDirection="up"
            subtitle="Across all users"
            status="success"
            icon="⭐"
          />
          <KPICard
            title="Monthly Active Users"
            value={metrics.engagement.monthlyActiveUsers}
            format="number"
            trend={metrics.growth.monthOverMonthGrowth.rate}
            trendDirection="up"
            subtitle={`${metrics.engagement.dauMauRatio.toFixed(1)}% DAU/MAU`}
            status="success"
            icon="📱"
          />
        </KPIGrid>
      </KPISection>

      {/* Growth Metrics */}
      <KPISection title="Growth Metrics">
        <KPIGrid columns={4}>
          <KPICard
            title="New Users"
            value={metrics.growth.newUsers}
            format="number"
            trend={metrics.growth.weekOverWeekGrowth.rate}
            trendDirection={metrics.growth.weekOverWeekGrowth.rate > 0 ? 'up' : 'down'}
            subtitle={`WoW: ${metrics.growth.weekOverWeekGrowth.rate > 0 ? '+' : ''}${metrics.growth.weekOverWeekGrowth.absolute}`}
            status="success"
          />
          <KPICard
            title="Activation Rate"
            value={metrics.growth.activationRate}
            format="percentage"
            trend={2.1}
            trendDirection="up"
            subtitle="Completed onboarding"
            status={metrics.growth.activationRate > 75 ? 'success' : 'warning'}
          />
          <KPICard
            title="30-Day Retention"
            value={metrics.growth.retention.day30}
            format="percentage"
            trend={-1.2}
            trendDirection="down"
            subtitle="D30 retention rate"
            status={metrics.growth.retention.day30 > 40 ? 'success' : 'warning'}
          />
          <KPICard
            title="Churn Rate"
            value={metrics.growth.churnRate}
            format="percentage"
            trend={-0.3}
            trendDirection="down"
            subtitle="Monthly churn"
            status={metrics.growth.churnRate < 5 ? 'success' : 'warning'}
          />
        </KPIGrid>

        <div style={styles.retentionCurve}>
          <h3 style={styles.sectionSubtitle}>Retention Curve</h3>
          <div style={styles.retentionGrid}>
            <div style={styles.retentionItem}>
              <div style={styles.retentionLabel}>Day 1</div>
              <div style={styles.retentionValue}>{metrics.growth.retention.day1.toFixed(1)}%</div>
            </div>
            <div style={styles.retentionItem}>
              <div style={styles.retentionLabel}>Day 7</div>
              <div style={styles.retentionValue}>{metrics.growth.retention.day7.toFixed(1)}%</div>
            </div>
            <div style={styles.retentionItem}>
              <div style={styles.retentionLabel}>Day 30</div>
              <div style={styles.retentionValue}>{metrics.growth.retention.day30.toFixed(1)}%</div>
            </div>
            <div style={styles.retentionItem}>
              <div style={styles.retentionLabel}>Day 90</div>
              <div style={styles.retentionValue}>{metrics.growth.retention.day90.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </KPISection>

      {/* Financial Metrics */}
      <KPISection title="Financial Metrics">
        <KPIGrid columns={4}>
          <KPICard
            title="Average Vault Size"
            value={metrics.financial.averageVaultPerUser}
            format="currency"
            trend={3.2}
            trendDirection="up"
            subtitle="Per user"
            status="neutral"
          />
          <KPICard
            title="Customer Acquisition Cost"
            value={metrics.financial.costPerAcquisition}
            format="currency"
            trend={-5.1}
            trendDirection="down"
            subtitle="CAC"
            status="success"
          />
          <KPICard
            title="Lifetime Value"
            value={metrics.financial.lifetimeValue}
            format="currency"
            trend={8.3}
            trendDirection="up"
            subtitle={`LTV:CAC = ${metrics.financial.ltvCacRatio.toFixed(2)}x`}
            status="success"
          />
          <KPICard
            title="Monthly Recurring Revenue"
            value={metrics.financial.revenue.mrr}
            format="currency"
            trend={15.2}
            trendDirection="up"
            subtitle={`ARR: $${metrics.financial.revenue.arr.toLocaleString()}`}
            status="success"
          />
        </KPIGrid>

        <div style={styles.savingsCard}>
          <h3 style={styles.sectionSubtitle}>Projected User Savings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <MetricComparison
              current={metrics.financial.projectedAnnualSavings.totalToDate}
              previous={metrics.financial.projectedAnnualSavings.totalToDate * 0.7}
              label="Total Savings to Date"
              format="currency"
            />
            <MetricComparison
              current={metrics.financial.projectedAnnualSavings.projectedAnnual}
              previous={metrics.financial.projectedAnnualSavings.projectedAnnual * 0.8}
              label="Projected Annual Savings"
              format="currency"
            />
          </div>
        </div>
      </KPISection>

      {/* Success Metrics */}
      <KPISection title="Success Metrics">
        <KPIGrid columns={4}>
          <KPICard
            title="Intervention Success"
            value={metrics.success.interventionSuccessRate.rate}
            format="percentage"
            trend={1.8}
            trendDirection="up"
            subtitle="Completed interventions"
            status="success"
          />
          <KPICard
            title="Guardian Engagement"
            value={metrics.success.guardianEngagementScore.score}
            format="percentage"
            trend={-2.3}
            trendDirection="down"
            subtitle="Response rate"
            status="warning"
          />
          <KPICard
            title="Pattern Detection"
            value={metrics.success.patternDetectionAccuracy}
            format="percentage"
            trend={0.8}
            trendDirection="up"
            subtitle="ML accuracy"
            status="success"
          />
          <KPICard
            title="Voice Memo Rate"
            value={metrics.engagement.voiceMemoCompletionRate}
            format="percentage"
            trend={3.2}
            trendDirection="up"
            subtitle="Completion rate"
            status="success"
          />
        </KPIGrid>

        <div style={styles.milestonesCard}>
          <h3 style={styles.sectionSubtitle}>Milestone Achievement Rates</h3>
          <div style={styles.milestonesGrid}>
            <div style={styles.milestoneItem}>
              <div style={styles.milestoneIcon}>🌱</div>
              <div style={styles.milestoneLabel}>30 Days</div>
              <div style={styles.milestoneValue}>{metrics.success.usersAt30Days.toFixed(1)}%</div>
              <div style={styles.milestoneSubtext}>of users</div>
            </div>
            <div style={styles.milestoneItem}>
              <div style={styles.milestoneIcon}>🌿</div>
              <div style={styles.milestoneLabel}>90 Days</div>
              <div style={styles.milestoneValue}>{metrics.success.usersAt90Days.toFixed(1)}%</div>
              <div style={styles.milestoneSubtext}>of users</div>
            </div>
            <div style={styles.milestoneItem}>
              <div style={styles.milestoneIcon}>🌳</div>
              <div style={styles.milestoneLabel}>180 Days</div>
              <div style={styles.milestoneValue}>{metrics.success.usersAt180Days.toFixed(1)}%</div>
              <div style={styles.milestoneSubtext}>of users</div>
            </div>
            <div style={styles.milestoneItem}>
              <div style={styles.milestoneIcon}>🏆</div>
              <div style={styles.milestoneLabel}>365 Days</div>
              <div style={styles.milestoneValue}>{metrics.success.usersAt365Days.toFixed(1)}%</div>
              <div style={styles.milestoneSubtext}>of users</div>
            </div>
          </div>
        </div>
      </KPISection>

      {/* Engagement Metrics */}
      <KPISection title="Engagement Metrics">
        <KPIGrid columns={4}>
          <KPICard
            title="Daily Active Users"
            value={metrics.engagement.dailyActiveUsers}
            format="number"
            subtitle="Today"
            status="neutral"
          />
          <KPICard
            title="Weekly Active Users"
            value={metrics.engagement.weeklyActiveUsers}
            format="number"
            subtitle="Last 7 days"
            status="neutral"
          />
          <KPICard
            title="DAU/MAU Ratio"
            value={metrics.engagement.dauMauRatio}
            format="percentage"
            trend={1.2}
            trendDirection="up"
            subtitle="Stickiness"
            status={metrics.engagement.dauMauRatio > 30 ? 'success' : 'warning'}
          />
          <KPICard
            title="Guardian Response Time"
            value={metrics.engagement.guardianAverageResponseTime}
            format="minutes"
            trend={-2.1}
            trendDirection="down"
            subtitle="Average"
            status="success"
          />
        </KPIGrid>
      </KPISection>

      {/* Quick Links */}
      <div style={styles.quickLinks}>
        <h3 style={styles.sectionSubtitle}>Detailed Analysis</h3>
        <div style={styles.linksGrid}>
          <a href="/executive/metrics" style={styles.link}>
            <div style={styles.linkIcon}>📊</div>
            <div style={styles.linkText}>Detailed Metrics</div>
          </a>
          <a href="/executive/cohorts" style={styles.link}>
            <div style={styles.linkIcon}>👥</div>
            <div style={styles.linkText}>Cohort Analysis</div>
          </a>
          <a href="/executive/revenue" style={styles.link}>
            <div style={styles.linkIcon}>💰</div>
            <div style={styles.linkText}>Revenue Tracking</div>
          </a>
          <a href="/executive/reports" style={styles.link}>
            <div style={styles.linkIcon}>📈</div>
            <div style={styles.linkText}>Custom Reports</div>
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: '#F9FAFB',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '8px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  select: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: '#FFFFFF'
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#6B7280'
  },
  sectionSubtitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px'
  },
  retentionCurve: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    marginTop: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  retentionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px'
  },
  retentionItem: {
    textAlign: 'center'
  },
  retentionLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '8px'
  },
  retentionValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#3B82F6'
  },
  savingsCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    marginTop: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  milestonesCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    marginTop: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  milestonesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px'
  },
  milestoneItem: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  milestoneIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  milestoneLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '8px'
  },
  milestoneValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '4px'
  },
  milestoneSubtext: {
    fontSize: '12px',
    color: '#9CA3AF'
  },
  quickLinks: {
    marginTop: '32px',
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  linksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  link: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  linkIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  linkText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  }
};
