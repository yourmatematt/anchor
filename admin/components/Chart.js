/**
 * Chart Components
 * Simple, lightweight chart components for admin dashboard
 * No external dependencies - pure SVG
 */

/**
 * Line Chart
 */
export function LineChart({ data, width = 400, height = 200, color = '#16A34A', label }) {
  if (!data || data.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 40) + 20;
    const y = height - ((d.value - minValue) / range) * (height - 40) - 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={styles.chartContainer}>
      {label && <div style={styles.chartLabel}>{label}</div>}
      <svg width={width} height={height} style={styles.svg}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
          const y = height - percent * (height - 40) - 20;
          return (
            <g key={i}>
              <line
                x1="20"
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="5"
                y={y + 4}
                fontSize="10"
                fill="#666"
              >
                {Math.round(minValue + range * percent)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (width - 40) + 20;
          const y = height - ((d.value - minValue) / range) * (height - 40) - 20;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Bar Chart
 */
export function BarChart({ data, width = 400, height = 200, color = '#DC2626', label }) {
  if (!data || data.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 40) / data.length - 10;

  return (
    <div style={styles.chartContainer}>
      {label && <div style={styles.chartLabel}>{label}</div>}
      <svg width={width} height={height} style={styles.svg}>
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * (height - 60);
          const x = i * ((width - 40) / data.length) + 20;
          const y = height - barHeight - 30;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={height - 10}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {d.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="11"
                fill="#FFF"
                fontWeight="600"
                textAnchor="middle"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Heatmap (24-hour)
 */
export function Heatmap({ data, width = 600, height = 100, label }) {
  if (!data || data.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const cellWidth = (width - 40) / data.length;

  const getColor = (value) => {
    const intensity = value / maxValue;
    const r = Math.round(220 * intensity);
    const g = Math.round(38 * intensity);
    const b = Math.round(38 * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={styles.chartContainer}>
      {label && <div style={styles.chartLabel}>{label}</div>}
      <svg width={width} height={height} style={styles.svg}>
        {data.map((d, i) => {
          const x = i * cellWidth + 20;

          return (
            <g key={i}>
              <rect
                x={x}
                y="20"
                width={cellWidth - 2}
                height="40"
                fill={getColor(d.value)}
                rx="2"
              />
              {i % 3 === 0 && (
                <text
                  x={x + cellWidth / 2}
                  y="75"
                  fontSize="9"
                  fill="#666"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={styles.heatmapLegend}>
        <span style={styles.legendText}>Low</span>
        <div style={styles.gradient}></div>
        <span style={styles.legendText}>High</span>
      </div>
    </div>
  );
}

/**
 * Donut Chart
 */
export function DonutChart({ data, size = 200, label }) {
  if (!data || data.length === 0) {
    return <div style={styles.empty}>No data available</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const innerRadius = radius * 0.6;

  let currentAngle = -90;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${cx + innerRadius * Math.cos((startAngle * Math.PI) / 180)} ${cy + innerRadius * Math.sin((startAngle * Math.PI) / 180)}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${cx + innerRadius * Math.cos((endAngle * Math.PI) / 180)} ${cy + innerRadius * Math.sin((endAngle * Math.PI) / 180)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${cx + innerRadius * Math.cos((startAngle * Math.PI) / 180)} ${cy + innerRadius * Math.sin((startAngle * Math.PI) / 180)}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return {
      pathData,
      color: d.color || `hsl(${(i * 360) / data.length}, 70%, 50%)`,
      label: d.label,
      value: d.value,
      percentage: Math.round((d.value / total) * 100),
    };
  });

  return (
    <div style={styles.chartContainer}>
      {label && <div style={styles.chartLabel}>{label}</div>}
      <div style={{...styles.donutContainer, width: size}}>
        <svg width={size} height={size} style={styles.svg}>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              fill={slice.color}
              stroke="#000"
              strokeWidth="2"
            />
          ))}
          <text
            x={cx}
            y={cy}
            fontSize="24"
            fontWeight="700"
            fill="#FFF"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {total}
          </text>
        </svg>
        <div style={styles.donutLegend}>
          {slices.map((slice, i) => (
            <div key={i} style={styles.legendItem}>
              <div style={{...styles.legendColor, backgroundColor: slice.color}}></div>
              <span style={styles.legendLabel}>{slice.label}</span>
              <span style={styles.legendValue}>{slice.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  chartContainer: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '20px',
  },
  chartLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  svg: {
    display: 'block',
  },
  empty: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  heatmapLegend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '16px',
    gap: '12px',
  },
  legendText: {
    fontSize: '12px',
    color: '#666',
  },
  gradient: {
    width: '100px',
    height: '12px',
    background: 'linear-gradient(to right, #1A1A1A, #DC2626)',
    borderRadius: '6px',
  },
  donutContainer: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  donutLegend: {
    flex: 1,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendLabel: {
    fontSize: '13px',
    color: '#9CA3AF',
    flex: 1,
  },
  legendValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#FFF',
  },
};
