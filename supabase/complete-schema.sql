-- =====================================================
-- ANCHOR FINANCIAL ACCOUNTABILITY SYSTEM
-- COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: ORIGINAL TABLES (Whitelist & Transactions)
-- =====================================================

-- Whitelist table (original - kept for backward compatibility)
CREATE TABLE IF NOT EXISTS whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_name TEXT NOT NULL UNIQUE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions log
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  amount DECIMAL NOT NULL,
  payee_name TEXT,
  description TEXT,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL,
  voice_memo_url TEXT,
  voice_memo_transcript TEXT,
  intervention_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PART 2: AI SYSTEM TABLES
-- =====================================================

-- User profiles (psychological & financial)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- Will be hardcoded for single-user MVP

  -- Financial patterns
  average_income DECIMAL,
  income_frequency TEXT,
  fixed_expenses JSONB,
  gambling_spend_average DECIMAL,
  high_risk_times JSONB,
  gambling_triggers JSONB,

  -- Psychological profile
  why_gamble TEXT,
  gambling_feeling TEXT,
  aftermath_feeling TEXT,
  root_cause TEXT,

  -- Goals
  savings_goal_amount DECIMAL,
  savings_goal_purpose TEXT,
  days_clean_goal INTEGER,
  clean_since_date DATE,

  -- Up Bank account IDs (for tracking only, not execution)
  transaction_account_id TEXT,
  vault_account_id TEXT,
  allowance_account_id TEXT,
  bills_account_id TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- AI conversations log
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  conversation_type TEXT,
  messages JSONB,
  trigger_context JSONB,
  outcome TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment requests
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  amount DECIMAL,
  payee_name TEXT,
  reason_given TEXT,
  ai_evaluation JSONB,
  decision TEXT,
  decision_reason TEXT,
  conversation_id UUID REFERENCES conversations(id),
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily allowance tracking
CREATE TABLE IF NOT EXISTS daily_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  date DATE,
  opening_balance DECIMAL,
  top_up_amount DECIMAL,
  closing_balance DECIMAL,
  reminder_sent BOOLEAN DEFAULT FALSE,
  manually_moved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- AI intervention events
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  trigger_type TEXT,
  trigger_details JSONB,
  intervention_method TEXT,
  user_response TEXT,
  outcome TEXT,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PART 3: NEW TABLES FOR REVISED SYSTEM
-- =====================================================

-- Whitelisted payees with payment details
CREATE TABLE IF NOT EXISTS whitelisted_payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  payee_name TEXT NOT NULL,
  payment_method TEXT NOT NULL, -- 'bank_transfer', 'bpay', 'card', 'osko'

  -- Bank transfer details
  bsb TEXT,
  account_number TEXT,
  account_name TEXT,
  payment_reference TEXT,

  -- BPAY details
  biller_code TEXT,
  bpay_reference TEXT,

  -- Card merchant matching (for auto-categorization)
  merchant_patterns TEXT[],

  -- Payment configuration
  expected_amount DECIMAL,
  frequency TEXT, -- 'weekly', 'fortnightly', 'monthly', 'quarterly', 'variable'
  due_day INTEGER, -- Day of month (1-31) or fortnight day
  priority INTEGER DEFAULT 10, -- 1-20, lower = higher priority

  -- Categorization
  category TEXT, -- 'rent', 'utilities', 'debt', 'groceries', 'pet', 'transport'
  is_essential BOOLEAN DEFAULT true,
  notes TEXT,

  -- Flags
  allow_extra_payments BOOLEAN DEFAULT false, -- For debts
  require_receipt BOOLEAN DEFAULT false, -- Must upload receipt after payment
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Irregular deposits (income tracking & loan detection)
CREATE TABLE IF NOT EXISTS irregular_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Deposit details
  transaction_id TEXT REFERENCES transactions(transaction_id),
  amount DECIMAL NOT NULL,
  source_merchant TEXT,
  source_type TEXT, -- 'client_payment', 'payday_loan', 'mate', 'refund', 'unknown'
  detected_at TIMESTAMP DEFAULT NOW(),

  -- AI conversation
  conversation_id UUID REFERENCES conversations(id),
  user_explanation TEXT,

  -- If it's a loan
  is_loan BOOLEAN DEFAULT FALSE,
  lender_name TEXT,
  repayment_amount DECIMAL,
  repayment_due_date DATE,
  interest_amount DECIMAL,
  interest_percentage DECIMAL,
  repayment_scheduled BOOLEAN DEFAULT FALSE,
  repayment_completed BOOLEAN DEFAULT FALSE,

  -- Action taken (since we can't automate)
  locked_in_vault BOOLEAN DEFAULT FALSE, -- Manually moved by user
  vault_lock_reminder_sent BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP,
  released_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Predatory lenders tracking
CREATE TABLE IF NOT EXISTS predatory_lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name TEXT UNIQUE NOT NULL,
  detection_patterns TEXT[], -- ["beforepay", "before pay", "bfrepay"]
  average_interest_rate DECIMAL,
  typical_loan_amount DECIMAL,
  typical_term_days INTEGER,

  -- Stats
  total_loans_detected INTEGER DEFAULT 0,
  total_principal DECIMAL DEFAULT 0,
  total_interest_paid DECIMAL DEFAULT 0,

  -- Flags
  is_blocked BOOLEAN DEFAULT FALSE, -- Alert user before accepting
  warning_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reminders & notifications (since we can't automate)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  reminder_type TEXT NOT NULL, -- 'daily_allowance', 'bill_due', 'debt_payment', 'lock_deposit'

  -- Reminder details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT, -- What user needs to do manually

  -- Scheduling
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  snoozed_until TIMESTAMP,

  -- Related entities
  related_payee_id UUID REFERENCES whitelisted_payees(id),
  related_deposit_id UUID REFERENCES irregular_deposits(id),
  related_allowance_id UUID REFERENCES daily_allowances(id),

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'completed', 'snoozed', 'cancelled'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Budget tracking (for surplus detection)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  category_name TEXT NOT NULL, -- 'foodworks_groceries', 'caltex_fuel', etc
  monthly_budget DECIMAL NOT NULL,

  -- Adjustments
  staff_meal_deduction_per_shift DECIMAL DEFAULT 0, -- e.g., $15 for Foodworks

  -- Tracking
  current_month_actual DECIMAL DEFAULT 0,
  last_updated DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, category_name)
);

-- Budget surplus events
CREATE TABLE IF NOT EXISTS budget_surplus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  month DATE NOT NULL, -- First day of month
  category_id UUID REFERENCES budget_categories(id),

  budgeted_amount DECIMAL NOT NULL,
  actual_amount DECIMAL NOT NULL,
  surplus_amount DECIMAL NOT NULL,

  -- AI conversation about what to do with surplus
  conversation_id UUID REFERENCES conversations(id),
  suggested_use TEXT, -- 'debt_acceleration', 'vault', 'allowance_boost'

  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PART 4: INDEXES
-- =====================================================

-- Original indexes
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_payee_name ON whitelist(payee_name);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_allowances_user_date ON daily_allowances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at DESC);

-- New indexes
CREATE INDEX IF NOT EXISTS idx_whitelisted_payees_user_id ON whitelisted_payees(user_id);
CREATE INDEX IF NOT EXISTS idx_whitelisted_payees_category ON whitelisted_payees(category);
CREATE INDEX IF NOT EXISTS idx_whitelisted_payees_merchant ON whitelisted_payees USING GIN(merchant_patterns);
CREATE INDEX IF NOT EXISTS idx_irregular_deposits_user_id ON irregular_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_irregular_deposits_type ON irregular_deposits(source_type);
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user ON budget_categories(user_id);

-- =====================================================
-- PART 5: FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER IF NOT EXISTS update_whitelist_updated_at BEFORE UPDATE ON whitelist
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_whitelisted_payees_updated_at BEFORE UPDATE ON whitelisted_payees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_predatory_lenders_updated_at BEFORE UPDATE ON predatory_lenders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_budget_categories_updated_at BEFORE UPDATE ON budget_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 6: VIEWS
-- =====================================================

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
  t.voice_memo_transcript
FROM transactions t
WHERE t.is_whitelisted = FALSE
ORDER BY t.timestamp DESC
LIMIT 50;

-- User clean streak
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

-- Pending reminders
CREATE OR REPLACE VIEW pending_reminders AS
SELECT
  r.*,
  wp.payee_name,
  wp.expected_amount
FROM reminders r
LEFT JOIN whitelisted_payees wp ON r.related_payee_id = wp.id
WHERE r.status = 'pending'
  AND r.scheduled_for <= NOW()
ORDER BY r.priority DESC, r.scheduled_for ASC;

-- Recent conversations summary
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

-- =====================================================
-- PART 7: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelisted_payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE irregular_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE predatory_lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_surplus ENABLE ROW LEVEL SECURITY;

-- For MVP (single user), allow all operations
-- In production, add proper user authentication policies

DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name IN (
            'whitelist', 'transactions', 'user_profiles', 'conversations',
            'payment_requests', 'daily_allowances', 'interventions',
            'whitelisted_payees', 'irregular_deposits', 'predatory_lenders',
            'reminders', 'budget_categories', 'budget_surplus'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations on %I" ON %I', tbl_name, tbl_name);
        EXECUTE format('CREATE POLICY "Allow all operations on %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl_name, tbl_name);
    END LOOP;
END$$;

-- =====================================================
-- PART 8: SEED DATA
-- =====================================================

-- Create hardcoded user ID for MVP (single user)
-- This will be used throughout the app instead of auth.users
INSERT INTO user_profiles (
  id,
  user_id,
  clean_since_date,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  CURRENT_DATE,
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Seed predatory lenders (known payday loan services)
INSERT INTO predatory_lenders (merchant_name, detection_patterns, warning_message) VALUES
  ('Beforepay', ARRAY['beforepay', 'before pay', 'bfrepay'], 'Payday lender detected. Interest rates up to 400% APR.'),
  ('MoneyMe', ARRAY['moneyme', 'money me'], 'Personal loan provider. Check interest rates.'),
  ('Nimble', ARRAY['nimble', 'nimble money'], 'Payday lender. High interest rates.'),
  ('Wallet Wizard', ARRAY['wallet wizard', 'walletwizard'], 'Payday lender. Consider alternatives.'),
  ('Cash Converters', ARRAY['cash converters', 'cashconverters'], 'Pawn shop & payday loans. High fees.')
ON CONFLICT (merchant_name) DO NOTHING;

-- Initial whitelist data (will be migrated to whitelisted_payees)
INSERT INTO whitelist (payee_name, category, notes) VALUES
  ('Optus', 'utilities', 'Mobile phone service'),
  ('Starlink', 'utilities', 'Internet service'),
  ('Red Energy', 'utilities', 'Electricity provider'),
  ('Mallacoota Real Estate', 'rent', 'Monthly rent payment'),
  ('Petbarn', 'pet', 'Pet supplies'),
  ('Mallacoota Foodworks', 'groceries', 'Local grocery store')
ON CONFLICT (payee_name) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Anchor database schema deployed successfully!';
  RAISE NOTICE '✅ Hardcoded user ID: 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE '✅ All tables created with RLS enabled';
  RAISE NOTICE '✅ Seed data inserted';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Update mobile app with hardcoded USER_ID';
  RAISE NOTICE '2. Add your Up Bank account IDs to user_profiles';
  RAISE NOTICE '3. Migrate whitelist to whitelisted_payees with BSB/account numbers';
  RAISE NOTICE '4. Deploy backend to Vercel';
  RAISE NOTICE '5. Test webhook with real transaction';
END$$;
