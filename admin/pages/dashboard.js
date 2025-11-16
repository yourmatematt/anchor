/**
 * Admin Dashboard - Main Page
 * Overview of key system health and success metrics
 */

import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import { LineChart, BarChart } from '../components/Chart';
import * as analytics from '../services/analytics';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    activeUsers: null,
    totalVault: null,
    allowanceDisbursed: null,
    activeConversations: null,
    averageStreak: null,
    longestStreak: null,
    relapsesThisWeek: null,
    moneySaved: null,
    conversationsToday: null,
    approvalRate: null,
    patternAccuracy: null,
    guardianResponse: null,
  });

  const [highRiskUsers, setHighRiskUsers] = useState([]);
  const [paydayTrend, setPaydayTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const [
        activeUsers,
        totalVault,
        allowanceDisbursed,
        activeConversations,
        averageStreak,
        longestStreak,
        relapsesThisWeek,
        moneySaved,
        conversationsToday,
        approvalRate,
        patternAccuracy,
        guardianResponse,
        highRisk,
        payday,
      ] = await Promise.all([
        analytics.getActiveUsersCount(),
        analytics.getTotalVaultBalance(),
        analytics.getDailyAllowanceDisbursed(),
        analytics.getActiveConversationsCount(),
        analytics.getAverageCleanStreak(),
        analytics.getLongestCurrentStreak(),
        analytics.getTotalRelapsesThisWeek(),
        analytics.getTotalMoneySaved(),
        analytics.getConversationsTriggeredToday(),
        analytics.getPaymentApprovalRate(),
        analytics.getPatternDetectionAccuracy(),
        analytics.getGuardianResponseRate(),
        analytics.getHighRiskUsers(),
        analytics.getPaydayLoanTrend(),
      ]);

      setMetrics({
        activeUsers,
        totalVault,
        allowanceDisbursed,
        activeConversations,
        averageStreak,
        longestStreak,
        relapsesThisWeek,
        moneySaved,
        conversationsToday,
        approvalRate,
        patternAccuracy,
        guardianResponse,
      });

      setHighRiskUsers(highRisk);
      setPaydayTrend(payday.map(p => ({ label: p.date.split('-')[2], value: p.count })));
      setLoading(false);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Anchor Admin Dashboard</h1>
          <p style={styles.subtitle}>Internal analytics and system monitoring</p>
        </div>
        <div style={styles.timestamp}>
          Last updated: {new Date().toLocaleTimeString('en-AU')}
        </div>
      </div>

      {/* System Health */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Health</h2>
        <div style={styles.grid}>
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers !== null ? metrics.activeUsers : '-'}
            subtitle="Currently locked in"
            icon="👥"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Total in Vault"
            value={metrics.totalVault !== null ? formatCurrency(metrics.totalVault) : '-'}
            subtitle="Aggregate locked savings"
            icon="🔒"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Allowance Today"
            value={metrics.allowanceDisbursed !== null ? formatCurrency(metrics.allowanceDisbursed) : '-'}
            subtitle="Disbursed daily allowance"
            icon="💰"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Active Conversations"
            value={metrics.activeConversations !== null ? metrics.activeConversations : '-'}
            subtitle="Real-time interventions"
            icon="💬"
            status={metrics.activeConversations > 5 ? 'warning' : 'good'}
            loading={loading}
          />
        </div>
      </section>

      {/* Success Metrics */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Success Metrics</h2>
        <div style={styles.grid}>
          <MetricCard
            title="Average Streak"
            value={metrics.averageStreak !== null ? `${metrics.averageStreak} days` : '-'}
            subtitle="Across all users"
            icon="📈"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Longest Streak"
            value={metrics.longestStreak ? `${metrics.longestStreak.current_streak_days} days` : '-'}
            subtitle={metrics.longestStreak?.name || 'No data'}
            icon="🏆"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Relapses This Week"
            value={metrics.relapsesThisWeek !== null ? metrics.relapsesThisWeek : '-'}
            subtitle="Total relapse events"
            icon="⚠️"
            status={metrics.relapsesThisWeek > 10 ? 'warning' : 'good'}
            loading={loading}
          />
          <MetricCard
            title="Money Saved"
            value={metrics.moneySaved !== null ? formatCurrency(metrics.moneySaved) : '-'}
            subtitle="Aggregate from gambling"
            icon="💵"
            status="good"
            loading={loading}
          />
        </div>
      </section>

      {/* Intervention Effectiveness */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Intervention Effectiveness</h2>
        <div style={styles.grid}>
          <MetricCard
            title="Conversations Today"
            value={metrics.conversationsToday !== null ? metrics.conversationsToday : '-'}
            subtitle="AI interventions triggered"
            icon="🤖"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Approval Rate"
            value={metrics.approvalRate !== null ? `${metrics.approvalRate}%` : '-'}
            subtitle="Payment requests approved"
            icon="✅"
            status={metrics.approvalRate < 40 ? 'warning' : 'good'}
            loading={loading}
          />
          <MetricCard
            title="Pattern Accuracy"
            value={metrics.patternAccuracy !== null ? `${metrics.patternAccuracy}%` : '-'}
            subtitle="Detection accuracy"
            icon="🎯"
            status="good"
            loading={loading}
          />
          <MetricCard
            title="Guardian Response"
            value={metrics.guardianResponse !== null ? `${metrics.guardianResponse}%` : '-'}
            subtitle="Active in last week"
            icon="👁️"
            status={metrics.guardianResponse < 50 ? 'warning' : 'good'}
            loading={loading}
          />
        </div>
      </section>

      {/* Risk Indicators */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Risk Indicators</h2>

        <div style={styles.twoColumn}>
          {/* High Risk Users */}
          <div style={styles.riskCard}>
            <h3 style={styles.cardTitle}>High Risk Users</h3>
            <p style={styles.cardSubtitle}>3+ critical triggers in last week</p>

            {highRiskUsers.length === 0 ? (
              <div style={styles.emptyState}>No high-risk users</div>
            ) : (
              <div style={styles.riskList}>
                {highRiskUsers.slice(0, 5).map((user, i) => (
                  <div key={i} style={styles.riskItem}>
                    <div>
                      <div style={styles.userName}>{user.name}</div>
                      <div style={styles.userMeta}>
                        {user.trigger_count} triggers · {user.streak} days clean
                      </div>
                    </div>
                    <div style={styles.riskBadge}>HIGH RISK</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payday Loan Trend */}
          <div style={styles.chartCard}>
            <BarChart
              data={paydayTrend}
              label="Payday Loan Detections (Last 30 Days)"
              height={250}
              color="#DC2626"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#000',
    minHeight: '100vh',
    color: '#FFF',
  },
  header: {
    marginBottom: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#9CA3AF',
    margin: 0,
  },
  timestamp: {
    fontSize: '14px',
    color: '#6B7280',
  },
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#FFF',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  riskCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '24px',
  },
  chartCard: {
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#9CA3AF',
    margin: '0 0 20px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6B7280',
  },
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  riskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #DC2626',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  userMeta: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  riskBadge: {
    backgroundColor: '#DC2626',
    color: '#FFF',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
};
