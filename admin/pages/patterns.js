/**
 * Pattern Analysis Page
 * Analyze gambling pattern detection trends
 */

import { useState, useEffect } from 'react';
import { BarChart, Heatmap } from '../components/Chart';
import MetricCard from '../components/MetricCard';
import * as analytics from '../services/analytics';

export default function Patterns() {
  const [patternFrequency, setPatternFrequency] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [frequency, heatmap] = await Promise.all([
        analytics.getPatternFrequency(),
        analytics.getPatternTimeOfDayHeatmap(),
      ]);

      setPatternFrequency(frequency.map(p => ({
        label: p.type.replace(/_/g, ' ').substring(0, 12),
        value: p.count,
      })));

      setHeatmapData(heatmap.map(h => ({
        label: `${h.hour}h`,
        value: h.count,
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error loading pattern data:', error);
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pattern Analysis</h1>

      <div style={styles.grid}>
        <MetricCard
          title="Most Common"
          value={patternFrequency[0]?.label || 'N/A'}
          subtitle={`${patternFrequency[0]?.value || 0} detections`}
          icon="🔍"
          status="good"
          loading={loading}
        />
        <MetricCard
          title="Peak Hour"
          value={`${heatmapData.sort((a, b) => b.value - a.value)[0]?.label || '0h'}`}
          subtitle="Most detections"
          icon="⏰"
          status="warning"
          loading={loading}
        />
      </div>

      <div style={styles.section}>
        <BarChart
          data={patternFrequency}
          label="Pattern Frequency (All Time)"
          height={300}
          width={800}
          color="#DC2626"
        />
      </div>

      <div style={styles.section}>
        <Heatmap
          data={heatmapData}
          label="Time of Day Heatmap (24 Hours)"
          width={800}
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
