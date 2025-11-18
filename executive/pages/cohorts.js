/**
 * Cohort Analysis Page
 *
 * Advanced cohort segmentation and analysis for understanding
 * user behavior patterns across different dimensions.
 */

import React, { useState, useEffect } from 'react';
import { KPICard, KPIGrid, KPISection } from '../components/KPICard';

export default function CohortsPage() {
  const [dimension, setDimension] = useState('signup_month');
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);

  const dimensions = [
    { id: 'signup_month', name: 'Sign-up Month', icon: '📅' },
    { id: 'risk_level', name: 'Risk Level', icon: '⚠️' },
    { id: 'gambling_type', name: 'Gambling Type', icon: '🎰' },
    { id: 'commitment_period', name: 'Commitment Period', icon: '⏱️' },
    { id: 'guardian_status', name: 'Guardian Status', icon: '👥' },
    { id: 'geography', name: 'Geography', icon: '🌍' },
    { id: 'acquisition_channel', name: 'Channel', icon: '📢' }
  ];

  useEffect(() => {
    loadCohortData();
  }, [dimension]);

  const loadCohortData = async () => {
    // Mock cohort data
    setCohorts([
      { id: '2024-11', name: 'November 2024', size: 1234, retention30: 45.8, avgCleanDays: 52.3, savings: 234500 },
      { id: '2024-10', name: 'October 2024', size: 1156, retention30: 44.2, avgCleanDays: 67.8, savings: 312400 },
      { id: '2024-09', name: 'September 2024', size: 987, retention30: 42.1, avgCleanDays: 89.2, savings: 428900 }
    ]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cohort Analysis</h1>
          <p style={styles.subtitle}>Segment and analyze user behavior across dimensions</p>
        </div>
        <div style={styles.controls}>
          <select value={dimension} onChange={(e) => setDimension(e.target.value)} style={styles.select}>
            {dimensions.map(d => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>
          <button style={styles.button}>Compare Cohorts</button>
          <button style={{...styles.button, ...styles.primaryButton}}>Export Analysis</button>
        </div>
      </div>

      <KPISection title="Cohort Overview">
        <div style={styles.cohortList}>
          {cohorts.map(cohort => (
            <div
              key={cohort.id}
              style={{...styles.cohortCard, ...(selectedCohort === cohort.id ? styles.cohortCardSelected : {})}}
              onClick={() => setSelectedCohort(cohort.id)}
            >
              <div style={styles.cohortHeader}>
                <h3 style={styles.cohortName}>{cohort.name}</h3>
                <span style={styles.cohortSize}>{cohort.size} users</span>
              </div>
              <KPIGrid columns={3}>
                <div style={styles.cohortMetric}>
                  <div style={styles.cohortMetricLabel}>30-Day Retention</div>
                  <div style={styles.cohortMetricValue}>{cohort.retention30.toFixed(1)}%</div>
                </div>
                <div style={styles.cohortMetric}>
                  <div style={styles.cohortMetricLabel}>Avg Clean Days</div>
                  <div style={styles.cohortMetricValue}>{cohort.avgCleanDays.toFixed(0)}</div>
                </div>
                <div style={styles.cohortMetric}>
                  <div style={styles.cohortMetricLabel}>Total Savings</div>
                  <div style={styles.cohortMetricValue}>${cohort.savings.toLocaleString()}</div>
                </div>
              </KPIGrid>
            </div>
          ))}
        </div>
      </KPISection>

      <KPISection title="Risk Level Analysis">
        <KPIGrid columns={3}>
          <KPICard title="Low Risk" value={42.3} format="percentage" subtitle="Of user base" status="success" />
          <KPICard title="Medium Risk" value={38.7} format="percentage" subtitle="Of user base" status="warning" />
          <KPICard title="High Risk" value={19.0} format="percentage" subtitle="Of user base" status="danger" />
        </KPIGrid>
        <div style={styles.riskAnalysis}>
          <h3 style={styles.sectionSubtitle}>Success Rates by Risk Level</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Risk Level</th>
                <th style={styles.th}>Users</th>
                <th style={styles.th}>30-Day Success</th>
                <th style={styles.th}>90-Day Success</th>
                <th style={styles.th}>Avg Clean Streak</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}><span style={{...styles.badge, backgroundColor: '#D1FAE5', color: '#065F46'}}>Low</span></td>
                <td style={styles.td}>5,309</td>
                <td style={styles.td}>73.2%</td>
                <td style={styles.td}>52.8%</td>
                <td style={styles.td}>67.3 days</td>
              </tr>
              <tr>
                <td style={styles.td}><span style={{...styles.badge, backgroundColor: '#FEF3C7', color: '#92400E'}}>Medium</span></td>
                <td style={styles.td}>4,853</td>
                <td style={styles.td}>61.5%</td>
                <td style={styles.td}>38.2%</td>
                <td style={styles.td}>45.7 days</td>
              </tr>
              <tr>
                <td style={styles.td}><span style={{...styles.badge, backgroundColor: '#FEE2E2', color: '#991B1B'}}>High</span></td>
                <td style={styles.td}>2,385</td>
                <td style={styles.td}>48.3%</td>
                <td style={styles.td}>24.1%</td>
                <td style={styles.td}>28.9 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </KPISection>

      <KPISection title="Geographic Analysis">
        <KPIGrid columns={4}>
          <KPICard title="New South Wales" value={4523} format="number" subtitle="35% of users" />
          <KPICard title="Victoria" value={3892} format="number" subtitle="29% of users" />
          <KPICard title="Queensland" value={2341} format="number" subtitle="18% of users" />
          <KPICard title="Other" value={2344} format="number" subtitle="18% of users" />
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
  cohortList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  cohortCard: { backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' },
  cohortCardSelected: { borderColor: '#3B82F6', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1)' },
  cohortHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cohortName: { fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 },
  cohortSize: { fontSize: '14px', color: '#6B7280' },
  cohortMetric: { textAlign: 'center' },
  cohortMetricLabel: { fontSize: '12px', color: '#6B7280', marginBottom: '4px' },
  cohortMetricValue: { fontSize: '20px', fontWeight: 'bold', color: '#111827' },
  sectionSubtitle: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
  riskAnalysis: { backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', marginTop: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', fontWeight: '600', color: '#111827' },
  td: { padding: '12px', borderBottom: '1px solid #E5E7EB', color: '#6B7280' },
  badge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }
};
