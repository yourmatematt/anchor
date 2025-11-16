/**
 * Guardian Portal - Login Page
 * Magic link authentication via SMS (no passwords)
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { sendMagicLink, verifyOTP, supabase } from '../lib/supabaseClient';
import '../styles/guardian.css';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Format phone number (add +61 if not present)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      // Remove leading 0 if present
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }
      formattedPhone = '+61' + formattedPhone;
    }

    const result = await sendMagicLink(formattedPhone);

    setLoading(false);

    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error || 'Failed to send code. Please try again.');
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }
      formattedPhone = '+61' + formattedPhone;
    }

    const result = await verifyOTP(formattedPhone, otp);

    setLoading(false);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError('Invalid code. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <Head>
        <title>Guardian Portal - Anchor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="description" content="Monitor your loved one's recovery journey" />
      </Head>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">ANCHOR</div>
          <div className="login-subtitle">Guardian Portal</div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Monitor, don't control
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendCode}>
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Your Mobile Number
            </label>
            <input
              type="tel"
              id="phone"
              placeholder="0412 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>

            <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              We'll send you a 6-digit code via SMS
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Code sent to {phone}
              </p>
              <button
                type="button"
                onClick={() => setStep('phone')}
                style={{ fontSize: '14px', color: 'var(--blue-info)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Change number
              </button>
            </div>

            <label htmlFor="otp" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Verification Code
            </label>
            <input
              type="text"
              id="otp"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
              pattern="[0-9]{6}"
              required
              autoFocus
            />

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleSendCode}
              disabled={loading}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Resend Code
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', maxWidth: '400px' }}>
        <p>
          You are a guardian for someone using Anchor. This portal lets you monitor their progress without having control over their decisions.
        </p>
        <p style={{ marginTop: '12px' }}>
          If you're having trouble logging in, ask them to check your guardian details in the app.
        </p>
      </div>
    </div>
  );
}
