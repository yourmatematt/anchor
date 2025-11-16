/**
 * Guardian Portal - Dashboard
 * Main overview of user's recovery progress
 * Shows: Clean streak, status, recent timeline, money saved (vague)
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase, getCurrentGuardian, calculateCleanStreak, signOut } from '../lib/supabaseClient';
import BottomNav from '../components/BottomNav';
import EmergencyButton from '../components/EmergencyButton';
import '../styles/guardian.css';

export default function Dashboard() {
  const router = useRouter();
  const [guardian, setGuardian] = useState(null);
  const [user, setUser] = useState(null);
  const [cleanStreak, setCleanStreak] = useState(0);
  const [status, setStatus] = useState('stable'); // 'stable', 'conversation', 'high_risk'
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/');
      } else {
        loadDashboard();
      }
    });

    // Check online/offline status
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const loadDashboard = async () => {
    try {
      // Get guardian and user data
      const guardianData = await getCurrentGuardian();
      if (!guardianData) {
        await signOut();
        router.push('/');
        return;
      }

      setGuardian(guardianData);
      setUser(guardianData.users);

      // Calculate clean streak
      const streak = calculateCleanStreak(
        guardianData.users.last_relapse_date,
        guardianData.users.commitment_start_date
      );
      setCleanStreak(streak);

      // Get current status (check for active conversations)
      const { data: activeConversations } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', guardianData.user_id)
        .eq('status', 'active')
        .limit(1);

      if (activeConversations && activeConversations.length > 0) {
        setStatus('conversation');
      } else {
        // Check for recent high-risk patterns (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentPatterns } = await supabase
          .from('gambling_patterns')
          .select('*')
          .eq('user_id', guardianData.user_id)
          .gte('detected_at', oneDayAgo)
          .eq('severity', 'CRITICAL')
          .limit(1);

        if (recentPatterns && recentPatterns.length > 0) {
          setStatus('high_risk');
        } else {
          setStatus('stable');
        }
      }

      // Get recent timeline (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get AI conversations
      const { data: conversations } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', guardianData.user_id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get gambling patterns
      const { data: patterns } = await supabase
        .from('gambling_patterns')
        .select('*')
        .eq('user_id', guardianData.user_id)
        .gte('detected_at', sevenDaysAgo)
        .order('detected_at', { ascending: false })
        .limit(10);

      // Combine and sort timeline
      const timelineEvents = [];

      if (conversations) {
        conversations.forEach(conv => {
          timelineEvents.push({
            time: conv.created_at,
            type: 'conversation',
            data: conv,
          });
        });
      }

      if (patterns) {
        patterns.forEach(pattern => {
          timelineEvents.push({
            time: pattern.detected_at,
            type: 'pattern',
            data: pattern,
          });
        });
      }

      timelineEvents.sort((a, b) => new Date(b.time) - new Date(a.time));
      setTimeline(timelineEvents.slice(0, 10));

      setLoading(false);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'conversation':
        return {
          label: 'AI Conversation Active',
          className: 'status-conversation',
          description: 'They're in a conversation with the AI right now',
        };
      case 'high_risk':
        return {
          label: 'High Risk Detected',
          className: 'status-high-risk',
          description: 'Pattern detected in last 24 hours - monitoring closely',
        };
      default:
        return {
          label: 'Stable',
          className: 'status-stable',
          description: 'No concerning activity detected',
        };
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statusConfig = getStatusConfig();

  return (
    <div>
      <Head>
        <title>Dashboard - Guardian Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      {offline && (
        <div className="offline-banner">
          ⚠️ Connection lost - Data may be outdated
        </div>
      )}

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1>Dashboard</h1>
          <button
            onClick={handleSignOut}
            style={{ fontSize: '14px', color: 'var(--text-tertiary)', background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>

        {/* Clean Streak Display */}
        <div className="streak-display">
          <div className="streak-username">{user.name}</div>
          <div className="streak-number">{cleanStreak}</div>
          <div className="streak-label">days clean</div>
        </div>

        {/* Current Status */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Current Status</span>
            <span className={`status-badge ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 0 }}>
            {statusConfig.description}
          </p>
        </div>

        {/* Money Saved (vague, privacy-focused) */}
        <div className="card">
          <div className="card-title">Financial Progress</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Has saved a significant amount since starting Anchor. Specific amounts are private.
          </p>
          <p style={{ color: 'var(--green-stable)', fontSize: '16px', fontWeight: '600', marginBottom: 0 }}>
            ✓ Vault savings growing
          </p>
        </div>

        {/* Recent Timeline */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 'var(--spacing-md)' }}>
            Recent Activity (Last 7 Days)
          </div>

          {timeline.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>No interventions needed this week. They're doing well.</p>
            </div>
          ) : (
            <div className="timeline">
              {timeline.map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-time">{formatTimeAgo(event.time)}</div>
                  <div className="timeline-content">
                    {event.type === 'conversation' ? (
                      <>
                        <span className="timeline-highlight">AI conversation</span> triggered
                        {event.data.trigger_type && ` (${event.data.trigger_type.replace(/_/g, ' ').toLowerCase()})`}
                        {event.data.status === 'completed' && ` - ${event.data.outcome || 'completed'}`}
                      </>
                    ) : (
                      <>
                        <span className="timeline-highlight">{event.data.pattern_type?.replace(/_/g, ' ').toLowerCase() || 'Pattern'}</span> detected
                        {event.data.severity && ` - ${event.data.severity.toLowerCase()} risk`}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Check-In */}
        <div className="card">
          <div className="card-title">Next Accountability Check-In</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 0 }}>
            Automatic check-ins occur based on risk patterns. You'll be notified if one is triggered.
          </p>
        </div>

        {/* Emergency Button */}
        <EmergencyButton userId={user.id} userName={user.name} />

        {/* Info Box */}
        <div className="alert alert-info" style={{ marginTop: 'var(--spacing-lg)' }}>
          <strong>About this dashboard:</strong> You can see their progress and patterns, but you cannot approve/deny transactions or access their bank details. This is about accountability, not control.
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
