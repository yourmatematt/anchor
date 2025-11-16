/**
 * Intervention Analytics Page
 * AI conversation effectiveness metrics
 */

import { useState, useEffect } from 'react';
import { DonutChart } from '../components/Chart';
import MetricCard from '../components/MetricCard';
import * as analytics from '../services/analytics';

export default function Interventions() {
  const [durationStats, setDurationStats] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [duration, outcomeData] = await Promise.all([
        analytics.getConversationDurationStats(),
        analytics.getConversationOutcomes(),
      ]);

      setDurationStats(duration);

      const outcomeArray = Object.entries(outcomeData).map(([label, value], i) => ({
        label: label || 'pending',
        value,
        color: label === 'approved' ? '#16A34A' :
          label === 'denied' ? '#DC2626' :
          label === 'follow_up' ? '#F59E0B' : '#6B7280',
      }));

      setOutcomes(outcomeArray);
      setLoading(false);
    } catch (error) {
      console.error('Error loading intervention data:', error);
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Intervention Analytics</h1>

      <div style={styles.grid}>
        <MetricCard
          title="Avg Duration"
          value={durationStats ? `${durationStats.average} min` : '-'}
          subtitle={`Range: ${durationStats?.min}-${durationStats?.max} min`}
          icon="⏱️"
          status="good"
          loading={loading}
        />
        <MetricCard
          title="Total Conversations"
          value={outcomes.reduce((sum, o) => sum + o.value, 0)}
          subtitle="All time"
          icon="💬"
          status="good"
          loading={loading}
        />
      </div>

      <div style={styles.section}>
        <DonutChart
          data={outcomes}
          label="Conversation Outcomes"
          size={300}
        />
      </div>
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
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  section: {
    marginBottom: '32px',
  },
};
