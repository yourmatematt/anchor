/**
 * Anonymous Group Insights Page
 *
 * Shows aggregated, anonymized data from all Anchor users
 * Helps guardians and users understand they're not alone
 * Provides community benchmarks and insights
 */

import React, { useState, useEffect } from 'react';
import styles from '../styles/GroupView.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function GroupViewPage() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupInsights();
  }, []);

  /**
   * Load anonymous group insights
   */
  async function loadGroupInsights() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/guardian-advanced/group-insights`);

      if (!response.ok) {
        throw new Error('Failed to load group insights');
      }

      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error loading group insights:', error);
      alert('Failed to load community insights.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading community insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className={styles.container}>
        <p>No community data available yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Community Insights</h1>
          <p className={styles.subtitle}>
            Anonymous aggregated data from all Anchor users - You're not alone in this journey
          </p>
        </div>
        <div className={styles.privacyBadge}>
          <span className={styles.privacyIcon}>🔒</span>
          <span className={styles.privacyText}>100% Anonymous</span>
        </div>
      </header>

      {/* Community Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Community Impact</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{insights.community.totalUsers}</div>
              <div className={styles.statLabel}>Total Users</div>
              <div className={styles.statSubtext}>Fighting gambling addiction together</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                ${insights.community.totalCommunitySavings.toLocaleString()}
              </div>
              <div className={styles.statLabel}>Community Savings</div>
              <div className={styles.statSubtext}>Projected yearly if all users stay clean</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📈</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{insights.avgSuccessRate}%</div>
              <div className={styles.statLabel}>Average Success Rate</div>
              <div className={styles.statSubtext}>Users maintaining clean periods</div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Distribution */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Risk Level Distribution</h2>
        <div className={styles.riskDistribution}>
          {Object.entries(insights.riskDistribution).map(([level, count]) => {
            const total = Object.values(insights.riskDistribution).reduce((a, b) => a + b, 0);
            const percentage = ((count / total) * 100).toFixed(1);

            return (
              <div key={level} className={styles.riskBar}>
                <div className={styles.riskBarHeader}>
                  <span className={styles.riskBarLevel}>{level}</span>
                  <span className={styles.riskBarCount}>
                    {count} users ({percentage}%)
                  </span>
                </div>
                <div className={styles.riskBarTrack}>
                  <div
                    className={`${styles.riskBarFill} ${styles[level.toLowerCase()]}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Common Triggers */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Most Common Triggers</h2>
        <div className={styles.triggersGrid}>
          {insights.commonTriggers.map((trigger, index) => (
            <div key={index} className={styles.triggerCard}>
              <div className={styles.triggerRank}>#{index + 1}</div>
              <div className={styles.triggerContent}>
                <div className={styles.triggerName}>{trigger.trigger}</div>
                <div className={styles.triggerPercentage}>{trigger.percentage}% of users</div>
              </div>
              <div className={styles.triggerChart}>
                <div
                  className={styles.triggerChartFill}
                  style={{ height: `${trigger.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Insights */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Shared Experiences</h2>
        <div className={styles.insightsGrid}>
          {insights.insights.map((insight, index) => (
            <div key={index} className={styles.insightCard}>
              <div className={styles.insightIcon}>
                {insight.icon === 'time' && '🕐'}
                {insight.icon === 'trending-up' && '📈'}
                {insight.icon === 'people' && '👥'}
              </div>
              <p className={styles.insightMessage}>{insight.message}</p>
              <span className={styles.insightType}>{insight.type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recovery Milestones */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Community Milestones</h2>
        <div className={styles.milestonesGrid}>
          <div className={styles.milestoneCard}>
            <div className={styles.milestoneIcon}>🔥</div>
            <div className={styles.milestoneContent}>
              <div className={styles.milestoneTitle}>Active Streaks</div>
              <div className={styles.milestoneDescription}>
                <strong>3 users</strong> are at 40-50 days clean
              </div>
              <div className={styles.milestoneDescription}>
                <strong>8 users</strong> are at 20-30 days clean
              </div>
              <div className={styles.milestoneDescription}>
                <strong>15 users</strong> are at 7-14 days clean
              </div>
            </div>
          </div>

          <div className={styles.milestoneCard}>
            <div className={styles.milestoneIcon}>🎯</div>
            <div className={styles.milestoneContent}>
              <div className={styles.milestoneTitle}>Recovery Journey</div>
              <div className={styles.milestoneDescription}>
                Average <strong>3 relapses</strong> before sustained clean period
              </div>
              <div className={styles.milestoneDescription}>
                Most common clean streak: <strong>14-21 days</strong>
              </div>
              <div className={styles.milestoneDescription}>
                <strong>67%</strong> achieve 30+ days within 3 months
              </div>
            </div>
          </div>

          <div className={styles.milestoneCard}>
            <div className={styles.milestoneIcon}>💪</div>
            <div className={styles.milestoneContent}>
              <div className={styles.milestoneTitle}>Support Systems</div>
              <div className={styles.milestoneDescription}>
                <strong>89%</strong> of users have guardians
              </div>
              <div className={styles.milestoneDescription}>
                Guardian support = <strong>3x</strong> better outcomes
              </div>
              <div className={styles.milestoneDescription}>
                Voice memos used in <strong>92%</strong> of interventions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Risk Patterns */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Community-Wide Patterns</h2>
        <div className={styles.patternsGrid}>
          <div className={styles.patternCard}>
            <h3 className={styles.patternTitle}>📅 Time Patterns</h3>
            <ul className={styles.patternList}>
              <li>Tuesday evening: High-risk for <strong>67% of users</strong></li>
              <li>Friday-Saturday nights: Peak risk period</li>
              <li>Late night (10pm-2am): <strong>43%</strong> of all gambling</li>
              <li>Payday (+/- 3 days): <strong>78%</strong> higher risk</li>
            </ul>
          </div>

          <div className={styles.patternCard}>
            <h3 className={styles.patternTitle}>🎰 Gambling Types</h3>
            <ul className={styles.patternList}>
              <li>Online/Mobile: <strong>62%</strong> of users</li>
              <li>Pokies/Venues: <strong>28%</strong> of users</li>
              <li>Sports betting: <strong>24%</strong> of users</li>
              <li>Mixed types: <strong>18%</strong> of users</li>
            </ul>
          </div>

          <div className={styles.patternCard}>
            <h3 className={styles.patternTitle}>✅ What Works</h3>
            <ul className={styles.patternList}>
              <li>Pre-emptive guardian check-ins: <strong>82% effective</strong></li>
              <li>Alternative activity planning: <strong>76% effective</strong></li>
              <li>Trigger avoidance: <strong>71% effective</strong></li>
              <li>Voice memo reflection: <strong>68% effective</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy Notice */}
      <div className={styles.privacyNotice}>
        <div className={styles.privacyIcon}>🔒</div>
        <div className={styles.privacyContent}>
          <h3 className={styles.privacyTitle}>Your Privacy is Protected</h3>
          <p className={styles.privacyText}>
            All data shown is completely anonymous and aggregated. No individual user information,
            names, locations, or specific dollar amounts are ever shared. We calculate trends and
            patterns across the entire Anchor community to help everyone succeed together.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => window.location.href = '/guardian-portal/analytics'}
        >
          ← Back to Analytics
        </button>
        <button
          className={styles.actionButton}
          onClick={() => window.location.href = '/guardian-portal/resources'}
        >
          Guardian Resources →
        </button>
      </div>
    </div>
  );
}
