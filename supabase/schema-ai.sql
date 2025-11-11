-- Anchor AI System - Database Schema
-- Adds conversational AI layer for financial accountability
-- Creates tables for user profiles, conversations, payment requests, and interventions

-- User profiles (psychological & financial)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Financial patterns (learned from transaction analysis)
  average_income DECIMAL,
  income_frequency TEXT, -- 'weekly', 'fortnightly', 'monthly'
  fixed_expenses JSONB, -- {rent: 440, utilities: 120, etc}
  gambling_spend_average DECIMAL,
  high_risk_times JSONB, -- [{day: 'Friday', time_range: '22:00-02:00'}]
  gambling_triggers JSONB, -- ['payday', 'after_bills', 'social_isolation']

  -- Psychological profile (from onboarding)
  why_gamble TEXT, -- transcribed response
  gambling_feeling TEXT, -- what they're chasing
  aftermath_feeling TEXT, -- how they feel after
  root_cause TEXT, -- underlying issue

  -- Goals
  savings_goal_amount DECIMAL,
  savings_goal_purpose TEXT,
  days_clean_goal INTEGER,
  clean_since_date DATE, -- date they started being clean

  -- Account configuration
  vault_account_id TEXT, -- Up Bank account ID for savings vault
  allowance_account_id TEXT, -- Up Bank account ID for daily allowance

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI conversations log
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_type TEXT, -- 'onboarding', 'payment_request', 'intervention', 'check_in'

  messages JSONB, -- [{role: 'user'/'assistant', content: '...', timestamp: '...'}]

  trigger_context JSONB, -- what triggered this conversation
  outcome TEXT, -- 'approved', 'denied', 'completed', 'abandoned'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment requests (things not on whitelist)
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  amount DECIMAL,
  payee_name TEXT,
  reason_given TEXT,

  ai_evaluation JSONB, -- AI's analysis
  decision TEXT, -- 'approved', 'denied', 'requires_conversation'
  decision_reason TEXT,

  conversation_id UUID REFERENCES conversations(id),

  approved_at TIMESTAMP,
  executed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily allowance tracking
CREATE TABLE daily_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  date DATE,
  opening_balance DECIMAL,
  top_up_amount DECIMAL,
  closing_balance DECIMAL,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- AI intervention events
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  trigger_type TEXT, -- 'non_whitelisted_transaction', 'high_risk_time', 'pattern_detected'
  trigger_details JSONB,

  intervention_method TEXT, -- 'full_screen_alert', 'voice_call', 'lock_account'
  user_response TEXT,
  outcome TEXT, -- 'prevented', 'delayed', 'user_proceeded'

  conversation_id UUID REFERENCES conversations(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);
CREATE INDEX idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_decision ON payment_requests(decision);
CREATE INDEX idx_daily_allowances_user_date ON daily_allowances(user_id, date);
CREATE INDEX idx_interventions_user_id ON interventions(user_id);
CREATE INDEX idx_interventions_created_at ON interventions(created_at DESC);

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- For MVP, allow all operations (single user)
-- In production, add proper user authentication policies
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on conversations" ON conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on payment_requests" ON payment_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_allowances" ON daily_allowances
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on interventions" ON interventions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- View for getting days clean
CREATE OR REPLACE VIEW user_clean_streak AS
SELECT
  user_id,
  clean_since_date,
  CASE
    WHEN clean_since_date IS NULL THEN 0
    ELSE EXTRACT(DAY FROM (CURRENT_DATE - clean_since_date))::INTEGER
  END as days_clean,
  days_clean_goal
FROM user_profiles;

-- View for recent conversations
CREATE OR REPLACE VIEW recent_conversations AS
SELECT
  c.id,
  c.user_id,
  c.conversation_type,
  c.outcome,
  c.created_at,
  JSONB_ARRAY_LENGTH(c.messages) as message_count
FROM conversations c
ORDER BY c.created_at DESC
LIMIT 50;
