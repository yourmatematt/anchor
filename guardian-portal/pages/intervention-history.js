/**
 * Intervention History Page
 *
 * Shows past interventions with transcripts and effectiveness
 * Helps guardians learn what works and refine their approach
 */

import React, { useState, useEffect } from 'react';
import styles from '../styles/InterventionHistory.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function InterventionHistoryPage() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, recent, effective
  const [selectedUser] = useState('patient-zero');

  useEffect(() => {
    loadInterventions();
  }, [selectedUser]);

  /**
   * Load intervention history
   */
  async function loadInterventions() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/guardian-advanced/interventions?userId=${selectedUser}&limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to load interventions');
      }

      const data = await response.json();
      setInterventions(data.interventions || []);
    } catch (error) {
      console.error('Error loading interventions:', error);
      alert('Failed to load intervention history.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Filter interventions based on selected filter
   */
  const filteredInterventions = interventions.filter(intervention => {
    if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(intervention.timestamp) >= sevenDaysAgo;
    }
    return true;
  });

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /**
   * Format time for display
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading intervention history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Intervention History</h1>
          <p className={styles.subtitle}>
            {interventions.length} total interventions recorded
          </p>
        </div>

        <div className={styles.filters}>
          <button
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'recent' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('recent')}
          >
            Recent (7 days)
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div>
            <div className={styles.statValue}>{interventions.length}</div>
            <div className={styles.statLabel}>Total Interventions</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📅</div>
          <div>
            <div className={styles.statValue}>
              {filteredInterventions.filter(i => {
                const date = new Date(i.timestamp);
                const now = new Date();
                return (now - date) < (7 * 24 * 60 * 60 * 1000);
              }).length}
            </div>
            <div className={styles.statLabel}>Last 7 Days</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💬</div>
          <div>
            <div className={styles.statValue}>
              {interventions.filter(i => i.voice_memo_transcript).length}
            </div>
            <div className={styles.statLabel}>With Transcripts</div>
          </div>
        </div>
      </div>

      {/* Intervention List */}
      <div className={styles.interventionList}>
        {filteredInterventions.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📝</span>
            <p className={styles.emptyText}>No interventions found</p>
            <p className={styles.emptySubtext}>
              Interventions will appear here when the user completes voice memos
            </p>
          </div>
        ) : (
          filteredInterventions.map((intervention, index) => (
            <div key={intervention.id} className={styles.interventionCard}>
              <div className={styles.interventionHeader}>
                <div className={styles.interventionMeta}>
                  <span className={styles.interventionDate}>
                    {formatDate(intervention.timestamp)}
                  </span>
                  <span className={styles.interventionTime}>
                    {formatTime(intervention.timestamp)}
                  </span>
                </div>
                <span className={styles.interventionNumber}>#{interventions.length - index}</span>
              </div>

              {intervention.payee_name && (
                <div className={styles.interventionPayee}>
                  <span className={styles.payeeLabel}>Merchant:</span>
                  <span className={styles.payeeName}>{intervention.payee_name}</span>
                </div>
              )}

              {intervention.voice_memo_transcript ? (
                <div className={styles.interventionTranscript}>
                  <div className={styles.transcriptHeader}>
                    <span className={styles.transcriptIcon}>🎙️</span>
                    <span className={styles.transcriptLabel}>Voice Memo Transcript</span>
                  </div>
                  <p className={styles.transcriptText}>
                    "{intervention.voice_memo_transcript}"
                  </p>
                </div>
              ) : (
                <div className={styles.noTranscript}>
                  <span>No transcript available</span>
                </div>
              )}

              <div className={styles.interventionFooter}>
                <span className={styles.completedBadge}>✓ Completed</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Insights */}
      {interventions.length > 0 && (
        <div className={styles.insightsSection}>
          <h2 className={styles.insightsTitle}>Intervention Insights</h2>
          <div className={styles.insightsGrid}>
            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>💡</div>
              <div className={styles.insightContent}>
                <h3>Pattern Recognition</h3>
                <p>
                  Review past transcripts to identify what was happening emotionally
                  during gambling episodes. This helps you recognize early warning signs.
                </p>
              </div>
            </div>

            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>🎯</div>
              <div className={styles.insightContent}>
                <h3>Effectiveness Tracking</h3>
                <p>
                  Monitor whether interventions lead to clean periods. Adjust your
                  approach based on what works best for your specific situation.
                </p>
              </div>
            </div>

            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>📈</div>
              <div className={styles.insightContent}>
                <h3>Progress Measurement</h3>
                <p>
                  Seeing intervention frequency decrease over time is a strong
                  indicator of progress and behavioral change.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
          View Guardian Resources →
        </button>
      </div>
    </div>
  );
}
