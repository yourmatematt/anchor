/**
 * KPI Card Component
 *
 * Reusable component for displaying key performance indicators
 * with trend indicators, comparisons, and visual elements.
 */

import React from 'react';

/**
 * KPI Card Component
 */
export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendDirection,
  icon,
  format = 'number',
  comparison,
  onClick,
  status = 'neutral'
}) {
  const formatValue = (val, fmt) => {
    if (val === null || val === undefined) return '-';

    switch (fmt) {
      case 'number':
        return val.toLocaleString();
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(2);
      case 'days':
        return `${Math.floor(val)} days`;
      case 'minutes':
        return `${val.toFixed(1)} min`;
      default:
        return val.toString();
    }
  };

  const getTrendColor = (direction) => {
    switch (direction) {
      case 'up':
        return status === 'danger' ? '#DC2626' : '#10B981';
      case 'down':
        return status === 'danger' ? '#10B981' : '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'danger':
        return '#DC2626';
      default:
        return '#3B82F6';
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  return (
    <div
      className={`kpi-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        border: `2px solid ${getStatusColor(status)}20`,
        position: 'relative'
      }}
    >
      {/* Status Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: getStatusColor(status),
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', margin: 0 }}>
            {title}
          </h3>
        </div>
        {icon && (
          <div style={{ fontSize: '24px', color: getStatusColor(status), marginLeft: '12px' }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
          {formatValue(value, format)}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
          {subtitle}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        {/* Trend */}
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: getTrendColor(trendDirection), fontSize: '18px', fontWeight: 'bold' }}>
              {getTrendIcon(trendDirection)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: getTrendColor(trendDirection) }}>
              {formatValue(Math.abs(trend), format === 'currency' ? 'currency' : 'percentage')}
            </span>
          </div>
        )}

        {/* Comparison */}
        {comparison && (
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            {comparison}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * KPI Grid Component
 */
export function KPIGrid({ children, columns = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${300 / columns}px, 1fr))`,
        gap: '24px',
        marginBottom: '24px'
      }}
    >
      {children}
    </div>
  );
}

/**
 * KPI Section Component
 */
export function KPISection({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

/**
 * Metric Comparison Component
 */
export function MetricComparison({ current, previous, label, format = 'number' }) {
  const change = current - previous;
  const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  const formatValue = (val, fmt) => {
    if (val === null || val === undefined) return '-';

    switch (fmt) {
      case 'number':
        return val.toLocaleString();
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toString();
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatValue(current, format)}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: direction === 'up' ? '#10B981' : direction === 'down' ? '#DC2626' : '#6B7280' }}>
            {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {Math.abs(percentChange).toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            vs {formatValue(previous, format)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sparkline Component (Simple line chart)
 */
export function Sparkline({ data, width = 100, height = 30, color = '#3B82F6' }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Progress Bar Component
 */
export function ProgressBar({ value, max = 100, label, showPercentage = true, color = '#3B82F6' }) {
  const percentage = (value / max) * 100;

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280' }}>{label}</span>
          {showPercentage && (
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}

/**
 * Stat Badge Component
 */
export function StatBadge({ label, value, type = 'neutral' }) {
  const getColors = (t) => {
    switch (t) {
      case 'success':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'danger':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'info':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const colors = getColors(type);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: colors.bg, borderRadius: '6px' }}>
      <span style={{ fontSize: '12px', color: colors.text, fontWeight: '600' }}>
        {label}:
      </span>
      <span style={{ fontSize: '14px', color: colors.text, fontWeight: 'bold' }}>
        {value}
      </span>
    </div>
  );
}

// CSS for hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .kpi-card.clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  `;
  document.head.appendChild(style);
}

export default KPICard;
