/**
 * Guardian Portal - Pattern Insights
 * Shows detected behavioral patterns (not financial details)
 * Focus on helping guardian understand risk factors
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase, getCurrentGuardian } from '../lib/supabaseClient';
import BottomNav from '../components/BottomNav';
import '../styles/guardian.css';

export default function Patterns() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [insights, setInsights] = useState({});
  const [timeframe, setTimeframe] = useState(30); // 7, 30, 90 days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/');
      } else {
        loadPatterns();
      }
    });
  }, [router, timeframe]);

  const loadPatterns = async () => {
    try {
      const guardianData = await getCurrentGuardian();
      if (!guardianData) {
        router.push('/');
        return;
      }

      setUser(guardianData.users);

      // Get patterns for selected timeframe
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('gambling_patterns')
        .select('*')
        .eq('user_id', guardianData.user_id)
        .gte('detected_at', startDate)
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching patterns:', error);
      } else {
        setPatterns(data || []);
        calculateInsights(data || []);
      }

      setLoading(false);

    } catch (error) {
      console.error('Error loading patterns:', error);
      setLoading(false);
    }
  };

  const calculateInsights = (patternsData) => {
    const insights = {
      totalDetections: patternsData.length,
      criticalCount: patternsData.filter(p => p.severity === 'CRITICAL').length,
      highRiskCount: patternsData.filter(p => p.severity === 'HIGH').length,
      mostCommon: null,
      timePatterns: [],
      trending: null,
    };

    // Find most common pattern type
    const patternCounts = {};
    patternsData.forEach(p => {
      patternCounts[p.pattern_type] = (patternCounts[p.pattern_type] || 0) + 1;
    });
    if (Object.keys(patternCounts).length > 0) {
      insights.mostCommon = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])[0];
    }

    // Detect time-based patterns
    const timeOfDay = {};
    const dayOfWeek = {};
    patternsData.forEach(p => {
      const date = new Date(p.detected_at);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });

      if (hour >= 18 || hour <= 2) {
        timeOfDay['Evening/Night'] = (timeOfDay['Evening/Night'] || 0) + 1;
      }
      dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
    });

    if (timeOfDay['Evening/Night'] > patternsData.length * 0.5) {
      insights.timePatterns.push('Late night activity increased');
    }

    const topDay = Object.entries(dayOfWeek).sort((a, b) => b[1] - a[1])[0];
    if (topDay && topDay[1] >= 3) {
      insights.timePatterns.push(`${topDay[0]} appears to be high-risk (${topDay[1]} detections)`);
    }

    // Check if patterns are increasing or decreasing
    if (patternsData.length >= 6) {
      const firstHalf = patternsData.slice(patternsData.length / 2);
      const secondHalf = patternsData.slice(0, patternsData.length / 2);
      if (secondHalf.length > firstHalf.length * 1.5) {
        insights.trending = 'increasing';
      } else if (firstHalf.length > secondHalf.length * 1.5) {
        insights.trending = 'decreasing';
      }
    }

    setInsights(insights);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPatternDescription = (pattern) => {
    const descriptions = {
      PAYDAY_LOAN: 'Payday loan transaction detected - high relapse indicator',
      GAMBLING_VENUE: 'Transaction at known gambling venue',
      CASH_WITHDRAWAL: 'Large cash withdrawal - potential gambling risk',
      SUSPICIOUS_TRANSFER: 'Transfer matching known gambling pattern',
      CRYPTO_EXCHANGE: 'Crypto transaction - potential day trading/gambling',
      MULTIPLE_WITHDRAWALS: 'Multiple small withdrawals to evade limits',
    };
    return descriptions[pattern.pattern_type] || pattern.pattern_type;
  };

  const getRiskIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Patterns - Guardian Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div className="container">
        <h1>Behavioral Patterns</h1>

        {/* Timeframe Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
          <button
            className={timeframe === 7 ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTimeframe(7)}
            style={{ flex: 1, padding: '12px' }}
          >
            7 Days
          </button>
          <button
            className={timeframe === 30 ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTimeframe(30)}
            style={{ flex: 1, padding: '12px' }}
          >
            30 Days
          </button>
          <button
            className={timeframe === 90 ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTimeframe(90)}
            style={{ flex: 1, padding: '12px' }}
          >
            90 Days
          </button>
        </div>

        {/* Insights Summary */}
        {patterns.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Insights</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {insights.totalDetections}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  Total Detections
                </div>
              </div>

              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--red-crisis)' }}>
                  {insights.criticalCount}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  Critical Risk
                </div>
              </div>
            </div>

            {insights.mostCommon && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  Most Common Pattern
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {insights.mostCommon[0].replace(/_/g, ' ')} ({insights.mostCommon[1]}x)
                </div>
              </div>
            )}

            {insights.timePatterns.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Time-Based Patterns:
                </div>
                {insights.timePatterns.map((pattern, index) => (
                  <div key={index} style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    • {pattern}
                  </div>
                ))}
              </div>
            )}

            {insights.trending && (
              <div className={`alert ${insights.trending === 'increasing' ? 'alert-warning' : 'alert-info'}`} style={{ marginTop: '16px' }}>
                {insights.trending === 'increasing'
                  ? '📈 Pattern detections are increasing - elevated monitoring recommended'
                  : '📉 Pattern detections are decreasing - positive trend'
                }
              </div>
            )}
          </div>
        )}

        {/* Pattern List */}
        {patterns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p>No concerning patterns detected in this timeframe. They're doing well.</p>
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Detected Patterns</h2>

            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`pattern-card pattern-risk-${pattern.severity?.toLowerCase() || 'medium'}`}
              >
                <div className="pattern-title">
                  {getRiskIcon(pattern.severity)} {pattern.pattern_type.replace(/_/g, ' ')}
                </div>
                <div className="pattern-description">
                  {getPatternDescription(pattern)}
                </div>
                <div className="pattern-meta">
                  <span>{formatDate(pattern.detected_at)}</span>
                  <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '600' }}>
                    {pattern.severity}
                  </span>
                </div>

                {pattern.details && pattern.details.riskFactors && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Risk factors: {pattern.details.riskFactors.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="alert alert-info" style={{ marginTop: 'var(--spacing-lg)' }}>
          <strong>Privacy Note:</strong> You can see behavioral patterns, but specific transaction amounts and bank details remain private. This helps you understand risk without invading their financial privacy.
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
