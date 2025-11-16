/**
 * User Management Page
 * Search and view individual user details
 */

import { useState, useEffect } from 'react';
import { LineChart } from '../components/Chart';
import * as analytics from '../services/analytics';

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await analytics.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDetails(userId) {
    setLoading(true);
    try {
      const details = await analytics.getUserDetails(userId);
      setUserDetails(details);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>User Management</h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div style={styles.twoColumn}>
        {/* Search Results */}
        <div style={styles.resultsList}>
          <h2 style={styles.sectionTitle}>
            {searchResults.length > 0 ? `${searchResults.length} Users Found` : 'Search Results'}
          </h2>

          {searchResults.length === 0 ? (
            <div style={styles.emptyState}>
              Enter name, email, or phone to search users
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user.id}
                style={{
                  ...styles.userCard,
                  ...(selectedUser === user.id ? styles.userCardSelected : {}),
                }}
                onClick={() => loadUserDetails(user.id)}
              >
                <div>
                  <div style={styles.userName}>{user.name}</div>
                  <div style={styles.userMeta}>{user.phone}</div>
                  <div style={styles.userStats}>
                    {user.current_streak_days} days clean · {formatCurrency(user.vault_balance)} saved
                  </div>
                </div>
                <div style={styles.guardianBadge}>
                  {user.guardians?.[0]?.status === 'active' ? '✓ Guardian' : '○ No Guardian'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Details */}
        <div style={styles.detailsPanel}>
          {!userDetails ? (
            <div style={styles.emptyState}>
              Select a user to view details
            </div>
          ) : (
            <>
              <div style={styles.userHeader}>
                <div>
                  <h2 style={styles.userName}>{userDetails.name}</h2>
                  <div style={styles.userMeta}>{userDetails.phone}</div>
                </div>
                <div style={styles.streakBadge}>
                  {userDetails.current_streak_days} DAYS CLEAN
                </div>
              </div>

              {/* Key Metrics */}
              <div style={styles.metricsGrid}>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Vault Balance</div>
                  <div style={styles.metricValue}>{formatCurrency(userDetails.vault_balance)}</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Commitment End</div>
                  <div style={styles.metricValue}>{formatDate(userDetails.commitment_end_date)}</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Total Relapses</div>
                  <div style={styles.metricValue}>{userDetails.total_relapses || 0}</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Longest Streak</div>
                  <div style={styles.metricValue}>{userDetails.longest_streak || 0} days</div>
                </div>
              </div>

              {/* Guardian Info */}
              {userDetails.guardians?.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Guardian</h3>
                  {userDetails.guardians.map((guardian, i) => (
                    <div key={i} style={styles.guardianCard}>
                      <div>
                        <div style={styles.guardianName}>{guardian.name}</div>
                        <div style={styles.guardianMeta}>
                          {guardian.relationship} · {guardian.phone}
                        </div>
                      </div>
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: guardian.status === 'active' ? '#16A34A' : '#6B7280',
                      }}>
                        {guardian.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Patterns */}
              {userDetails.gambling_patterns?.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Recent Patterns</h3>
                  <div style={styles.patternList}>
                    {userDetails.gambling_patterns.slice(0, 10).map((pattern, i) => (
                      <div key={i} style={styles.patternItem}>
                        <div style={{
                          ...styles.severityDot,
                          backgroundColor: pattern.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B',
                        }}></div>
                        <div style={styles.patternInfo}>
                          <div style={styles.patternType}>{pattern.pattern_type.replace(/_/g, ' ')}</div>
                          <div style={styles.patternTime}>{formatDate(pattern.detected_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Conversations */}
              {userDetails.ai_conversations?.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Recent Conversations</h3>
                  <div style={styles.conversationList}>
                    {userDetails.ai_conversations.slice(0, 5).map((conv, i) => (
                      <div key={i} style={styles.conversationItem}>
                        <div style={styles.conversationInfo}>
                          <div style={styles.conversationType}>{conv.trigger_type.replace(/_/g, ' ')}</div>
                          <div style={styles.conversationTime}>{formatDate(conv.created_at)}</div>
                        </div>
                        <div style={{
                          ...styles.outcomeBadge,
                          backgroundColor: conv.outcome === 'approved' ? '#16A34A' :
                            conv.outcome === 'denied' ? '#DC2626' : '#6B7280',
                        }}>
                          {conv.outcome || conv.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
  searchForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#FFF',
  },
  searchButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#DC2626',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '24px',
  },
  resultsList: {},
  detailsPanel: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '24px',
    minHeight: '600px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6B7280',
  },
  userCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userCardSelected: {
    borderColor: '#DC2626',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  userMeta: {
    fontSize: '13px',
    color: '#9CA3AF',
    marginBottom: '8px',
  },
  userStats: {
    fontSize: '12px',
    color: '#6B7280',
  },
  guardianBadge: {
    fontSize: '11px',
    color: '#9CA3AF',
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #333',
  },
  streakBadge: {
    backgroundColor: '#16A34A',
    color: '#FFF',
    fontSize: '12px',
    fontWeight: '700',
    padding: '8px 12px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  metric: {
    backgroundColor: '#111',
    padding: '16px',
    borderRadius: '8px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '600',
  },
  section: {
    marginBottom: '32px',
  },
  guardianCard: {
    backgroundColor: '#111',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guardianName: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  guardianMeta: {
    fontSize: '13px',
    color: '#9CA3AF',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  patternList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  patternItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#111',
    borderRadius: '6px',
  },
  severityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  patternInfo: {
    flex: 1,
  },
  patternType: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
    textTransform: 'capitalize',
  },
  patternTime: {
    fontSize: '12px',
    color: '#6B7280',
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  conversationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#111',
    borderRadius: '6px',
  },
  conversationInfo: {},
  conversationType: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
    textTransform: 'capitalize',
  },
  conversationTime: {
    fontSize: '12px',
    color: '#6B7280',
  },
  outcomeBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#FFF',
    textTransform: 'uppercase',
  },
};
