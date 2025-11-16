/**
 * MetricCard Component
 * Reusable metric display for admin dashboard
 */

export default function MetricCard({ title, value, subtitle, trend, status, icon, loading }) {
  // Determine status color
  const getStatusColor = () => {
    if (status === 'good') return '#16A34A'; // green
    if (status === 'warning') return '#F59E0B'; // yellow
    if (status === 'alert') return '#DC2626'; // red
    return '#6B7280'; // gray
  };

  // Determine trend arrow
  const getTrendArrow = () => {
    if (!trend) return null;
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  };

  const getTrendColor = () => {
    if (!trend) return '#6B7280';
    // For most metrics, up is good
    if (trend > 0) return '#16A34A';
    if (trend < 0) return '#DC2626';
    return '#6B7280';
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {icon && <span style={styles.icon}>{icon}</span>}
      </div>

      {/* Value */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
        </div>
      ) : (
        <>
          <div style={{...styles.value, color: getStatusColor()}}>
            {value}
          </div>

          {/* Subtitle/Trend */}
          {(subtitle || trend !== undefined) && (
            <div style={styles.footer}>
              {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
              {trend !== undefined && (
                <span style={{...styles.trend, color: getTrendColor()}}>
                  {getTrendArrow()} {Math.abs(trend)}%
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '24px',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  icon: {
    fontSize: '24px',
  },
  value: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '8px',
    lineHeight: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6B7280',
  },
  trend: {
    fontSize: '13px',
    fontWeight: '600',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #333',
    borderTop: '3px solid #FFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add keyframe animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
