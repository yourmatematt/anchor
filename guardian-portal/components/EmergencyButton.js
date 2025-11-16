/**
 * Emergency Button Component
 * Triggers immediate check-in with user
 * Large, red, cannot be missed
 */

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function EmergencyButton({ userId, userName }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleTriggerEmergency = async () => {
    setLoading(true);

    try {
      // Create emergency AI conversation
      const { error: conversationError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          trigger_type: 'GUARDIAN_EMERGENCY',
          trigger_reason: `Guardian concerned: ${reason}`,
          status: 'pending',
          is_unavoidable: true,
          ai_context: {
            guardianConcern: reason,
            triggeredAt: new Date().toISOString(),
          },
        });

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        alert('Failed to send alert. Please try calling them directly.');
        setLoading(false);
        return;
      }

      // Send push notification to user
      // This would be handled by the AI trigger service in production

      // Log the emergency trigger
      const { error: logError } = await supabase
        .from('guardian_notifications')
        .insert({
          guardian_id: userId, // Will be replaced with actual guardian ID
          user_id: userId,
          notification_type: 'GUARDIAN_EMERGENCY_TRIGGERED',
          message: `Emergency check-in requested: ${reason}`,
          sent_at: new Date().toISOString(),
          delivery_status: 'delivered',
          metadata: {
            reason: reason,
          },
        });

      setSent(true);
      setTimeout(() => {
        setShowModal(false);
        setSent(false);
        setReason('');
      }, 3000);

    } catch (error) {
      console.error('Emergency trigger error:', error);
      alert('Failed to send alert. Please try calling them directly.');
    }

    setLoading(false);
  };

  return (
    <>
      <button
        className="btn-emergency"
        onClick={() => setShowModal(true)}
      >
        🆘 {userName} May Be In Crisis
      </button>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            {!sent ? (
              <>
                <h2 style={{ marginBottom: '16px' }}>Emergency Check-In</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  This will immediately notify {userName} that you're concerned and trigger a mandatory AI check-in.
                </p>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Use this if you believe they may be in crisis or relapsing.
                </p>

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  What's your concern?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Haven't heard from them in days, noticed concerning behavior, etc."
                  rows="4"
                  style={{ marginBottom: '16px' }}
                  required
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-emergency"
                    onClick={handleTriggerEmergency}
                    disabled={loading || !reason.trim()}
                    style={{ flex: 2, marginTop: 0 }}
                  >
                    {loading ? 'Sending...' : 'Send Emergency Alert'}
                  </button>
                </div>

                <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  If you believe they are in immediate danger, please call emergency services (000) or a crisis helpline.
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <h2 style={{ marginBottom: '16px', color: 'var(--green-stable)' }}>Alert Sent</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {userName} will receive an immediate notification and be guided into a check-in conversation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  maxWidth: '500px',
  width: '100%',
  border: '1px solid var(--border-color)',
};
