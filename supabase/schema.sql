-- Anchor Financial Accountability System
-- Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
-- Stores user profile and commitment information
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  up_bank_token TEXT, -- Encrypted Up Bank API token
  clean_streak_start_date DATE NOT NULL, -- When clean streak began
  commitment_start_date DATE NOT NULL, -- When commitment period started
  commitment_end_date DATE NOT NULL, -- When commitment period ends
  commitment_months INTEGER NOT NULL, -- 6, 12, 18, or 24 months
  daily_allowance DECIMAL NOT NULL DEFAULT 30.00, -- Daily spending limit
  total_lost_amount DECIMAL, -- Self-reported total gambling losses
  gambling_type TEXT, -- 'pokies', 'sports', 'crypto', 'poker', 'other'
  interview_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  vault_balance DECIMAL DEFAULT 0.00, -- Current vault balance
  allowance_balance DECIMAL DEFAULT 30.00, -- Current day's allowance remaining
  allowance_last_reset TIMESTAMP DEFAULT NOW(), -- Last time allowance was reset
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guardians table
-- Stores guardian information for accountability
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT, -- 'friend', 'family', 'sponsor', 'other'
  invite_sent_at TIMESTAMP,
  invite_accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Whitelist table
-- Stores approved payees that won't trigger alerts
CREATE TABLE whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  amount DECIMAL, -- Expected amount (optional)
  frequency TEXT, -- 'weekly', 'fortnightly', 'monthly', 'once-off'
  bsb TEXT, -- Bank BSB number
  account_number TEXT, -- Bank account number
  biller_code TEXT, -- Biller code for BPAY
  priority TEXT DEFAULT 'other', -- 'critical', 'essential', 'other'
  category TEXT, -- 'rent', 'utilities', 'groceries', 'pet', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, payee_name)
);

-- Transactions log
-- Records all transactions from Up Bank for accountability
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL, -- Up Bank transaction ID
  amount DECIMAL NOT NULL, -- Transaction amount (negative for debits)
  payee_name TEXT,
  description TEXT,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  is_gambling BOOLEAN DEFAULT FALSE, -- Detected as gambling transaction
  pattern_matched TEXT, -- Which gambling pattern was matched
  timestamp TIMESTAMP NOT NULL,
  voice_memo_url TEXT, -- URL to audio file if recorded
  voice_memo_transcript TEXT, -- Transcribed text from voice memo
  intervention_completed BOOLEAN DEFAULT FALSE, -- Whether user completed voice memo
  guardian_notified_at TIMESTAMP, -- When guardian was notified
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment requests table
-- Tracks all requests for money from vault/additional allowance
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  reason TEXT NOT NULL, -- User's explanation
  reason_voice_url TEXT, -- Voice recording of reason
  request_time TIMESTAMP NOT NULL DEFAULT NOW(),
  day_of_week TEXT, -- 'Monday', 'Tuesday', etc.
  time_of_day TIME, -- Time of request
  status TEXT NOT NULL, -- 'approved', 'denied', 'needs_conversation'
  ai_analysis TEXT, -- AI's evaluation of the request
  conversation_id UUID, -- Link to AI conversation if applicable
  guardian_notified_at TIMESTAMP,
  completed_at TIMESTAMP, -- When user marked as completed
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI conversations table
-- Logs all AI intervention conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'payment_request', 'gambling_detection', 'payday_loan', 'daily_checkin'
  trigger_id UUID, -- Reference to transaction or payment request
  transcript JSONB NOT NULL, -- Full conversation transcript
  outcome TEXT, -- 'streak_reset', 'request_approved', 'request_denied', 'warning_given'
  duration_seconds INTEGER, -- How long the conversation lasted
  guardian_notified BOOLEAN DEFAULT FALSE,
  guardian_notified_at TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bills table
-- Tracks upcoming bills and payments
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT, -- 'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'once-off'
  category TEXT, -- 'rent', 'utilities', 'phone', 'internet', 'electricity', 'other'
  priority TEXT DEFAULT 'other', -- 'critical', 'essential', 'other'
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gambling patterns table
-- Stores detected patterns for pattern matching
CREATE TABLE gambling_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL, -- 'tuesday_poker', 'late_night_crypto', etc.
  payee_names TEXT[], -- Array of payee names associated with pattern
  typical_amount_min DECIMAL,
  typical_amount_max DECIMAL,
  typical_days TEXT[], -- Array of days: ['Tuesday', 'Wednesday']
  typical_time_start TIME,
  typical_time_end TIME,
  times_detected INTEGER DEFAULT 0,
  last_detected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_whitelist_payee_name ON whitelist(payee_name);
CREATE INDEX idx_whitelist_user_id ON whitelist(user_id);
CREATE INDEX idx_guardians_user_id ON guardians(user_id);
CREATE INDEX idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_gambling_patterns_user_id ON gambling_patterns(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON guardians
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON whitelist
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gambling_patterns_updated_at BEFORE UPDATE ON gambling_patterns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial data will be created during onboarding
-- This section is kept for reference but not auto-inserted
-- The onboarding flow will create the user and their whitelist

-- Enable Row Level Security (RLS) - for future multi-user support
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE gambling_patterns ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (single user MVP)
-- In production, you'll want to add proper user authentication
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on guardians" ON guardians
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on whitelist" ON whitelist
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on payment_requests" ON payment_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on ai_conversations" ON ai_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on bills" ON bills
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on gambling_patterns" ON gambling_patterns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Views for easy querying

-- Recent non-whitelisted transactions
CREATE OR REPLACE VIEW recent_alerts AS
SELECT
  t.id,
  t.transaction_id,
  t.amount,
  t.payee_name,
  t.description,
  t.timestamp,
  t.intervention_completed,
  t.voice_memo_transcript,
  t.is_gambling,
  t.pattern_matched,
  t.guardian_notified_at
FROM transactions t
WHERE t.is_whitelisted = FALSE
ORDER BY t.timestamp DESC
LIMIT 50;

-- Upcoming bills in next 7 days
CREATE OR REPLACE VIEW upcoming_bills AS
SELECT
  b.id,
  b.payee_name,
  b.amount,
  b.due_date,
  b.category,
  b.priority,
  b.is_paid,
  (b.due_date - CURRENT_DATE) as days_until_due
FROM bills b
WHERE b.is_paid = FALSE
  AND b.due_date >= CURRENT_DATE
  AND b.due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY b.due_date ASC;

-- User dashboard summary
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  u.id,
  u.daily_allowance,
  u.allowance_balance,
  u.vault_balance,
  (CURRENT_DATE - u.clean_streak_start_date) as days_clean,
  u.commitment_end_date,
  (u.commitment_end_date - CURRENT_DATE) as days_until_commitment_end,
  g.name as guardian_name,
  g.is_active as guardian_active,
  (SELECT COUNT(*) FROM transactions WHERE user_id = u.id AND is_whitelisted = FALSE AND intervention_completed = FALSE) as pending_interventions
FROM users u
LEFT JOIN guardians g ON g.user_id = u.id AND g.is_active = TRUE;
