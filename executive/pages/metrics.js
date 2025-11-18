/**
 * Detailed Metrics Page
 *
 * Comprehensive view of all Anchor metrics with drill-down capabilities,
 * advanced filtering, and exportable reports.
 */

import React, { useState, useEffect } from 'react';
import { KPICard, KPIGrid, KPISection, ProgressBar, StatBadge } from '../components/KPICard';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');

  useEffect(() => {
    loadMetrics();
  }, [selectedCategory, timeRange, comparisonPeriod]);

  const loadMetrics = async () => {
    // Load detailed metrics from API
    // Mock data for now
    setMetrics({
      loaded: true
    });
  };

  const categories = [
    { id: 'all', name: 'All Metrics', icon: '📊' },
    { id: 'growth', name: 'Growth', icon: '📈' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'success', name: 'Success', icon: '⭐' },
    { id: 'engagement', name: 'Engagement', icon: '📱' },
    { id: 'retention', name: 'Retention', icon: '🔄' },
    { id: 'predictive', name: 'Predictive', icon: '🔮' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Detailed Metrics</h1>
        <div style={styles.controls}>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={styles.select}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <select value={comparisonPeriod} onChange={(e) => setComparisonPeriod(e.target.value)} style={styles.select}>
            <option value="previous">vs Previous Period</option>
            <option value="year_ago">vs Year Ago</option>
            <option value="baseline">vs Baseline</option>
          </select>
          <button style={styles.exportButton}>Export Report</button>
        </div>
      </div>

      <div style={styles.categoryNav}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              ...styles.categoryButton,
              ...(selectedCategory === cat.id ? styles.categoryButtonActive : {})
            }}
          >
            <span style={styles.categoryIcon}>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {(selectedCategory === 'all' || selectedCategory === 'growth') && (
          <KPISection title="Growth Metrics">
            <div style={styles.metricsDescription}>
              Track user acquisition, activation, and growth trends over time.
            </div>
            <KPIGrid columns={3}>
              <KPICard title="User Acquisition Rate" value={42.3} format="number" subtitle="New users/day" status="success" trend={8.2} trendDirection="up" />
              <KPICard title="Activation Rate" value={78.5} format="percentage" subtitle="Completed onboarding" status="success" trend={2.1} trendDirection="up" />
              <KPICard title="Viral Coefficient" value={1.23} format="decimal" subtitle="Users invited per user" status="warning" trend={-0.05} trendDirection="down" />
            </KPIGrid>
            <div style={styles.progressSection}>
              <h3 style={styles.sectionSubtitle}>Onboarding Funnel</h3>
              <ProgressBar label="Sign Up" value={100} max={100} color="#10B981" />
              <ProgressBar label="Up Bank Connected" value={85} max={100} color="#3B82F6" />
              <ProgressBar label="Guardian Added" value={62.5} max={100} color="#F59E0B" />
              <ProgressBar label="First Vault Created" value={54.2} max={100} color="#8B5CF6" />
            </div>
          </KPISection>
        )}

        {(selectedCategory === 'all' || selectedCategory === 'retention') && (
          <KPISection title="Retention Analysis">
            <div style={styles.retentionMatrix}>
              <h3 style={styles.sectionSubtitle}>Retention Cohorts (Monthly)</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Cohort</th>
                    <th style={styles.th}>Size</th>
                    <th style={styles.th}>D1</th>
                    <th style={styles.th}>D7</th>
                    <th style={styles.th}>D30</th>
                    <th style={styles.th}>D90</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.td}>Nov 2024</td>
                    <td style={styles.td}>1,234</td>
                    <td style={styles.td}>85%</td>
                    <td style={styles.td}>67%</td>
                    <td style={styles.td}>46%</td>
                    <td style={styles.td}>32%</td>
                  </tr>
                  <tr>
                    <td style={styles.td}>Oct 2024</td>
                    <td style={styles.td}>1,156</td>
                    <td style={styles.td}>83%</td>
                    <td style={styles.td}>65%</td>
                    <td style={styles.td}>44%</td>
                    <td style={styles.td}>30%</td>
                  </tr>
                  <tr>
                    <td style={styles.td}>Sep 2024</td>
                    <td style={styles.td}>987</td>
                    <td style={styles.td}>81%</td>
                    <td style={styles.td}>63%</td>
                    <td style={styles.td}>42%</td>
                    <td style={styles.td}>28%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </KPISection>
        )}

        {(selectedCategory === 'all' || selectedCategory === 'predictive') && (
          <KPISection title="Predictive Analytics">
            <KPIGrid columns={3}>
              <KPICard title="Churn Risk (Next 30d)" value={8.5} format="percentage" subtitle="Predicted churn" status="warning" />
              <KPICard title="Revenue Forecast" value={18420} format="currency" subtitle="Next month" status="success" trend={15.2} trendDirection="up" />
              <KPICard title="Capacity Utilization" value={67.3} format="percentage" subtitle="Support capacity" status="success" />
            </KPIGrid>
            <div style={styles.alerts}>
              <h3 style={styles.sectionSubtitle}>AI-Powered Insights</h3>
              <div style={styles.alert}>
                <StatBadge type="success" label="Insight" value="Retention improving" />
                <p style={styles.alertText}>D30 retention up 3.2% vs last period. Guardian engagement is key driver.</p>
              </div>
              <div style={styles.alert}>
                <StatBadge type="warning" label="Alert" value="Churn risk" />
                <p style={styles.alertText}>156 users at high churn risk. Recommend intervention.</p>
              </div>
            </div>
          </KPISection>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 },
  controls: { display: 'flex', gap: '12px' },
  select: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' },
  exportButton: { padding: '8px 16px', borderRadius: '6px', backgroundColor: '#3B82F6', color: '#FFF', border: 'none', cursor: 'pointer' },
  categoryNav: { display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' },
  categoryButton: { padding: '12px 20px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  categoryButtonActive: { backgroundColor: '#3B82F6', color: '#FFF', borderColor: '#3B82F6' },
  categoryIcon: { fontSize: '18px' },
  content: { marginTop: '24px' },
  metricsDescription: { fontSize: '14px', color: '#6B7280', marginBottom: '16px' },
  sectionSubtitle: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
  progressSection: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', marginTop: '16px' },
  retentionMatrix: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', fontWeight: '600', color: '#111827' },
  td: { padding: '12px', borderBottom: '1px solid #E5E7EB', color: '#6B7280' },
  alerts: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', marginTop: '16px' },
  alert: { padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px' },
  alertText: { marginTop: '8px', fontSize: '14px', color: '#6B7280', margin: 0 }
};
