/**
 * Guardian Portal - Conversations
 * View AI conversation transcripts (real-time + history)
 * No ability to intervene - just observe
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase, getCurrentGuardian } from '../lib/supabaseClient';
import BottomNav from '../components/BottomNav';
import '../styles/guardian.css';

export default function Conversations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/');
      } else {
        loadConversations();
      }
    });

    return () => {
      if (realtime) {
        realtime.unsubscribe();
      }
    };
  }, [router]);

  const loadConversations = async () => {
    try {
      const guardianData = await getCurrentGuardian();
      if (!guardianData) {
        router.push('/');
        return;
      }

      setUser(guardianData.users);

      // Get all conversations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', guardianData.user_id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
      } else {
        setConversations(data || []);

        // Auto-select first active conversation, or most recent
        if (data && data.length > 0) {
          const active = data.find(c => c.status === 'active');
          setSelectedConversation(active || data[0]);
        }
      }

      // Set up real-time subscription for active conversations
      const channel = supabase
        .channel('ai_conversations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_conversations',
            filter: `user_id=eq.${guardianData.user_id}`,
          },
          (payload) => {
            console.log('Conversation update:', payload);
            if (payload.eventType === 'INSERT') {
              setConversations(prev => [payload.new, ...prev]);
              if (payload.new.status === 'active') {
                setSelectedConversation(payload.new);
              }
            } else if (payload.eventType === 'UPDATE') {
              setConversations(prev =>
                prev.map(c => c.id === payload.new.id ? payload.new : c)
              );
              if (selectedConversation && selectedConversation.id === payload.new.id) {
                setSelectedConversation(payload.new);
              }
            }
          }
        )
        .subscribe();

      setRealtime(channel);
      setLoading(false);

    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTriggerLabel = (triggerType) => {
    const labels = {
      PAYDAY_LOAN: 'Payday Loan Detected',
      GAMBLING_VENUE: 'Gambling Venue',
      CASH_WITHDRAWAL: 'Cash Withdrawal',
      SUSPICIOUS_TRANSFER: 'Suspicious Transfer',
      CRYPTO_EXCHANGE: 'Crypto Exchange',
      MULTIPLE_WITHDRAWALS: 'Multiple Withdrawals',
      PAYMENT_REQUEST: 'Payment Request',
      GUARDIAN_EMERGENCY: 'Guardian Emergency Check-In',
    };
    return labels[triggerType] || triggerType;
  };

  const getOutcomeLabel = (outcome) => {
    const labels = {
      approved: 'Approved',
      denied: 'Denied',
      confirmed_gambling: 'Relapse Confirmed',
      false_alarm: 'False Alarm',
      completed: 'Completed',
    };
    return labels[outcome] || outcome;
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
        <title>Conversations - Guardian Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div className="container">
        <h1>AI Conversations</h1>

        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>No AI conversations yet. You'll see them here when triggered.</p>
          </div>
        ) : (
          <>
            {/* Conversation List */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`card ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    cursor: 'pointer',
                    border: selectedConversation?.id === conv.id ? '2px solid var(--purple-guardian)' : undefined,
                  }}
                >
                  <div className="card-header">
                    <span className="card-title">{getTriggerLabel(conv.trigger_type)}</span>
                    <span className={`status-badge ${
                      conv.status === 'active' ? 'status-conversation' :
                      conv.outcome === 'confirmed_gambling' ? 'status-high-risk' :
                      conv.outcome === 'denied' ? 'status-high-risk' :
                      'status-stable'
                    }`}>
                      {conv.status === 'active' ? 'ACTIVE' : getOutcomeLabel(conv.outcome)}
                    </span>
                  </div>
                  <div className="card-subtitle">{formatDate(conv.created_at)}</div>
                  {conv.manipulation_detected_count > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--red-crisis)', marginTop: '8px' }}>
                      ⚠️ {conv.manipulation_detected_count} manipulation attempt{conv.manipulation_detected_count > 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Conversation Transcript */}
            {selectedConversation && (
              <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Transcript</h2>

                {selectedConversation.status === 'active' && (
                  <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-md)' }}>
                    🔴 LIVE - Conversation in progress
                  </div>
                )}

                {selectedConversation.transcript && selectedConversation.transcript.messages ? (
                  <div>
                    {selectedConversation.transcript.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`conversation-message ${
                          message.role === 'user' ? 'message-user' : 'message-ai'
                        }`}
                      >
                        <div className="message-header">
                          <span className="message-role">
                            {message.role === 'user' ? user?.name || 'User' : 'AI'}
                          </span>
                          <span className="message-time">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="message-content">
                          {message.content}
                        </div>
                        {message.metadata?.flags && message.metadata.flags.length > 0 && (
                          <div>
                            {message.metadata.flags.map((flag, i) => (
                              <span key={i} className="message-flag">
                                {flag.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedConversation.status !== 'active' && (
                      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                          Conversation ended
                        </div>
                        {selectedConversation.outcome && (
                          <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '8px' }}>
                            Outcome: {getOutcomeLabel(selectedConversation.outcome)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No messages in this conversation yet.</p>
                  </div>
                )}
              </div>
            )}

            <div className="alert alert-info" style={{ marginTop: 'var(--spacing-lg)' }}>
              <strong>Real-time monitoring:</strong> You can see these conversations as they happen, but you cannot intervene. The AI handles all responses.
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
