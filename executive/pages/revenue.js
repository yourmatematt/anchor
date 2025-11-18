/**
 * Revenue Tracking Page
 *
 * Financial performance tracking, forecasting, and investor metrics.
 */

import React, { useState, useEffect } from 'react';
import { KPICard, KPIGrid, KPISection, MetricComparison } from '../components/KPICard';

export default function RevenuePage() {
  const [timeRange, setTimeRange] = useState('12m');
  const [data, setData] = useState(null);

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    setData({ loaded: true });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Revenue & Financial Performance</h1>
          <p style={styles.subtitle}>Track financial metrics and projections</p>
        </div>
        <div style={styles.controls}>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={styles.select}>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button style={styles.button}>Investor Deck</button>
          <button style={{...styles.button, ...styles.primaryButton}}>Board Report</button>
        </div>
      </div>

      <KPISection title="Revenue Metrics">
        <KPIGrid columns={4}>
          <KPICard title="Monthly Recurring Revenue" value={15410} format="currency" trend={15.2} trendDirection="up" subtitle="MRR" status="success" icon="💰" />
          <KPICard title="Annual Run Rate" value={184920} format="currency" trend={18.3} trendDirection="up" subtitle="ARR" status="success" icon="📈" />
          <KPICard title="Revenue Growth" value={22.5} format="percentage" trend={3.2} trendDirection="up" subtitle="MoM growth" status="success" icon="📊" />
          <KPICard title="Gross Margin" value={78.3} format="percentage" subtitle="Profitability" status="success" icon="💎" />
        </KPIGrid>
      </KPISection>

      <KPISection title="Unit Economics">
        <KPIGrid columns={3}>
          <KPICard title="CAC" value={42.50} format="currency" trend={-5.1} trendDirection="down" subtitle="Customer acquisition cost" status="success" />
          <KPICard title="LTV" value={187.40} format="currency" trend={8.3} trendDirection="up" subtitle="Lifetime value" status="success" />
          <KPICard title="LTV:CAC Ratio" value={4.41} format="decimal" subtitle="Payback in 2.7 months" status="success" />
        </KPIGrid>
        <div style={styles.unitEconomics}>
          <h3 style={styles.sectionSubtitle}>Cohort Economics</h3>
          <MetricComparison current={42.50} previous={44.80} label="CAC (Current vs Previous)" format="currency" />
          <MetricComparison current={187.40} previous={172.90} label="LTV (Current vs Previous)" format="currency" />
        </div>
      </KPISection>

      <KPISection title="Revenue Forecast">
        <div style={styles.forecast}>
          <h3 style={styles.sectionSubtitle}>12-Month Projection</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Month</th>
                <th style={styles.th}>Projected MRR</th>
                <th style={styles.th}>New Users</th>
                <th style={styles.th}>Churn</th>
                <th style={styles.th}>Net Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(month => (
                <tr key={month}>
                  <td style={styles.td}>Month {month}</td>
                  <td style={styles.td}>${(15410 * (1 + 0.15 * month/6)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td style={styles.td}>{Math.floor(1234 * (1 + 0.1 * month/6))}</td>
                  <td style={styles.td}>4.2%</td>
                  <td style={styles.td}>${(15410 * (1 + 0.15 * month/6) * 0.96).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </KPISection>

      <KPISection title="Investor Metrics">
        <KPIGrid columns={4}>
          <KPICard title="Runway" value={18.5} format="number" subtitle="Months remaining" status="success" />
          <KPICard title="Burn Rate" value={45200} format="currency" subtitle="Monthly burn" status="neutral" />
          <KPICard title="Cash on Hand" value={836400} format="currency" subtitle="Current balance" status="success" />
          <KPICard title="Fundraising Status" value="Series A" subtitle="Next milestone" status="info" />
        </KPIGrid>
      </KPISection>
    </div>
  );
}

const styles = {
  container: { padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', backgroundColor: '#FFF', padding: '24px', borderRadius: '12px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '8px' },
  controls: { display: 'flex', gap: '12px' },
  select: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' },
  button: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer' },
  primaryButton: { backgroundColor: '#3B82F6', color: '#FFF', border: 'none' },
  sectionSubtitle: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
  unitEconomics: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  forecast: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '16px' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', fontWeight: '600', color: '#111827' },
  td: { padding: '12px', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }
};
