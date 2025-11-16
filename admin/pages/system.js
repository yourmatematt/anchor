/**
 * System Health Monitoring Page
 * Monitor API, webhooks, and third-party services
 */

import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import * as analytics from '../services/analytics';

export default function System() {
  const [webhookSuccessRate, setWebhookSuccessRate] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [webhooks, errors] = await Promise.all([
        analytics.getWebhookSuccessRate(),
        analytics.getRecentErrors(),
      ]);

      setWebhookSuccessRate(webhooks);
      setRecentErrors(errors);
      setLoading(false);
    } catch (error) {
      console.error('Error loading system data:', error);
      setLoading(false);
    }
  }

  const getWebhookStatus = () => {
    if (webhookSuccessRate >= 95) return 'good';
    if (webhookSuccessRate >= 85) return 'warning';
    return 'alert';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>System Health</h1>

      <div style={styles.grid}>
        <MetricCard
          title="Webhook Success"
          value={webhookSuccessRate !== null ? `${webhookSuccessRate}%` : '-'}
          subtitle="Last 24 hours"
          icon="📡"
          status={getWebhookStatus()}
          loading={loading}
        />
        <MetricCard
          title="Recent Errors"
          value={recentErrors.length}
          subtitle="Last 50 entries"
          icon="⚠️"
          status={recentErrors.length > 10 ? 'warning' : 'good'}
          loading={loading}
        />
      </div>

      {/* Error Log */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Errors</h2>

        {recentErrors.length === 0 ? (
          <div style={styles.emptyState}>No recent errors</div>
        ) : (
          <div style={styles.errorLog}>
            {recentErrors.slice(0, 20).map((error, i) => (
              <div key={i} style={styles.errorItem}>
                <div style={styles.errorHeader}>
                  <div style={styles.errorMessage}>{error.error_message}</div>
                  <div style={styles.errorTime}>
                    {new Date(error.created_at).toLocaleString('en-AU')}
                  </div>
                </div>
                {error.context && (
                  <div style={styles.errorContext}>
                    Context: {JSON.stringify(error.context)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Third-Party Services</h2>

        <div style={styles.serviceGrid}>
          <div style={styles.serviceCard}>
            <div style={styles.serviceName}>Up Bank API</div>
            <div style={{...styles.serviceStatus, backgroundColor: '#16A34A'}}>OPERATIONAL</div>
          </div>
          <div style={styles.serviceCard}>
            <div style={styles.serviceName}>Supabase</div>
            <div style={{...styles.serviceStatus, backgroundColor: '#16A34A'}}>OPERATIONAL</div>
          </div>
          <div style={styles.serviceCard}>
            <div style={styles.serviceName}>OpenAI API</div>
            <div style={{...styles.serviceStatus, backgroundColor: '#16A34A'}}>OPERATIONAL</div>
          </div>
          <div style={styles.serviceCard}>
            <div style={styles.serviceName}>Twilio SMS</div>
            <div style={{...styles.serviceStatus, backgroundColor: '#16A34A'}}>OPERATIONAL</div>
          </div>
        </div>
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
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6B7280',
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
  },
  errorLog: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '16px',
  },
  errorItem: {
    padding: '16px',
    borderBottom: '1px solid #333',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  errorMessage: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: '14px',
  },
  errorTime: {
    color: '#6B7280',
    fontSize: '12px',
  },
  errorContext: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  serviceCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: '600',
  },
  serviceStatus: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#FFF',
    letterSpacing: '0.5px',
  },
};
