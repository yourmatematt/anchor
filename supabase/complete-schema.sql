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

  -- Push notification token
  push_token TEXT,

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
-- PART 3B: PHASE 2 ADVISORY SYSTEM TABLES
-- =====================================================

-- Manual payment instructions tracking
-- Since Up Bank API cannot execute payments, we provide instructions
-- and track when users complete them manually
CREATE TABLE IF NOT EXISTS manual_payment_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- What was approved
  payment_request_id UUID REFERENCES payment_requests(id),
  approved_amount DECIMAL NOT NULL,
  purpose TEXT NOT NULL,

  -- Instructions given to user
  instructions JSONB NOT NULL, -- Array of step-by-step instructions

  -- Expected action (for tracking completion)
  expected_transfer_from TEXT, -- 'Vault', 'Transaction Account', 'Bills'
  expected_transfer_to TEXT, -- 'Allowance', 'Transaction Account', or external BSB/Account
  expected_amount DECIMAL,
  expected_payee TEXT, -- For external payments

  -- Tracking
  instructions_sent_at TIMESTAMP DEFAULT NOW(),
  timeout_at TIMESTAMP, -- When instructions expire
  completed_at TIMESTAMP,
  completed_transaction_id TEXT, -- Up transaction ID that fulfilled this

  -- Status
  status TEXT DEFAULT 'awaiting_action', -- 'awaiting_action', 'completed', 'timeout', 'cancelled'

  created_at TIMESTAMP DEFAULT NOW()
);

-- Bill reminder tracking
-- Prevents duplicate reminders and tracks bill payment completion
CREATE TABLE IF NOT EXISTS bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Bill details
  payee_id UUID REFERENCES whitelisted_payees(id),
  due_date DATE NOT NULL,
  amount DECIMAL NOT NULL,

  -- Reminder tracking
  reminder_sent_at TIMESTAMP,
  reminder_type TEXT, -- '3_days', '1_day', 'overdue'

  -- Completion
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  paid_transaction_id TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Debt acceleration opportunities
-- Logs when user was offered debt acceleration vs when they accepted
CREATE TABLE IF NOT EXISTS debt_acceleration_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Opportunity details
  vault_balance DECIMAL NOT NULL,
  emergency_buffer DECIMAL NOT NULL,
  upcoming_bills_total DECIMAL NOT NULL,
  safe_to_send DECIMAL NOT NULL,

  -- Target debt
  debt_payee_id UUID REFERENCES whitelisted_payees(id),
  current_debt_balance DECIMAL,
  new_debt_balance DECIMAL, -- After acceleration
  months_saved DECIMAL,

  -- User response
  offered_at TIMESTAMP DEFAULT NOW(),
  user_response TEXT, -- 'accepted', 'declined', 'ignored'
  response_at TIMESTAMP,

  -- If accepted, link to payment instruction
  payment_instruction_id UUID REFERENCES manual_payment_instructions(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Budget surplus events
-- Monthly surplus detection history
CREATE TABLE IF NOT EXISTS budget_surplus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Month tracked
  month_year TEXT NOT NULL, -- 'YYYY-MM'

  -- Category details
  category TEXT NOT NULL, -- 'groceries', 'fuel', etc
  budgeted_amount DECIMAL NOT NULL,
  actual_spent DECIMAL NOT NULL,

  -- Adjustments (e.g., staff meals from Scallys)
  adjustments JSONB, -- {staff_meals: 45, etc}
  effective_budget DECIMAL,

  -- Surplus
  surplus_amount DECIMAL NOT NULL,

  -- User response
  offered_debt_payment BOOLEAN DEFAULT FALSE,
  user_accepted BOOLEAN,
  payment_instruction_id UUID REFERENCES manual_payment_instructions(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Scallys income tracking
-- Tracks irregular income from Scallys work with tax and meal offsets
CREATE TABLE IF NOT EXISTS scallys_income_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Deposit details
  irregular_deposit_id UUID REFERENCES irregular_deposits(id),
  transaction_id TEXT,
  amount DECIMAL NOT NULL,
  deposit_date DATE NOT NULL,

  -- Work details (from user interrogation)
  hours_worked DECIMAL,
  shifts_worked INTEGER,
  hourly_rate DECIMAL DEFAULT 40.00,

  -- Calculations
  gross_income DECIMAL, -- hours * rate
  tax_withholding_30 DECIMAL, -- 30% for tax
  staff_meals_offset DECIMAL, -- shifts * $15

  -- Applied to budget
  groceries_budget_adjusted BOOLEAN DEFAULT FALSE,
  adjustment_amount DECIMAL, -- How much groceries budget was reduced

  -- Tax tracking
  tax_saver_transfer_instructed BOOLEAN DEFAULT FALSE,
  tax_saver_transfer_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Guardian system
-- Tracks accountability partners who receive notifications about user activity
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,

  -- Guardian details
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT,
  guardian_email TEXT,
  relationship TEXT, -- 'friend', 'family', 'sponsor', 'other'

  -- Notification preferences
  notify_on_payment_requests BOOLEAN DEFAULT true,
  notify_on_declined_requests BOOLEAN DEFAULT true,
  notify_on_gambling_triggers BOOLEAN DEFAULT true,
  notify_on_payday_loans BOOLEAN DEFAULT true,
  notify_on_relapse BOOLEAN DEFAULT true,
  notify_on_clean_milestones BOOLEAN DEFAULT true,

  -- Commitment tracking
  active BOOLEAN DEFAULT true,
  commitment_start_date DATE NOT NULL,
  commitment_end_date DATE NOT NULL,
  invite_sent_at TIMESTAMP,
  invite_accepted_at TIMESTAMP,
  invite_status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guardian notifications log
-- Tracks all notifications sent to guardians
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID REFERENCES guardians(id),
  user_id UUID,

  -- Event details
  event_type TEXT NOT NULL, -- 'payment_request', 'payment_approved', 'payment_denied', etc.
  event_data JSONB,

  -- Message details
  message_title TEXT,
  message_body TEXT,

  -- Delivery
  sent_via_sms BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP,
  email_sent_at TIMESTAMP,
  sms_status TEXT, -- 'sent', 'delivered', 'failed'
  email_status TEXT, -- 'sent', 'delivered', 'failed'

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

-- Phase 2 indexes
CREATE INDEX IF NOT EXISTS idx_manual_payment_status ON manual_payment_instructions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_manual_payment_timeout ON manual_payment_instructions(timeout_at) WHERE status = 'awaiting_action';
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user ON bill_reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_unpaid ON bill_reminders(user_id, paid) WHERE paid = FALSE;
CREATE INDEX IF NOT EXISTS idx_debt_acceleration_user ON debt_acceleration_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_surplus_user_month ON budget_surplus_events(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_scallys_income_user ON scallys_income_events(user_id, deposit_date DESC);

-- Guardian indexes
CREATE INDEX IF NOT EXISTS idx_guardians_user_active ON guardians(user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_guardians_commitment ON guardians(commitment_end_date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_guardian ON guardian_notifications(guardian_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_event ON guardian_notifications(event_type, created_at DESC);

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
ALTER TABLE manual_payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_acceleration_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_surplus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scallys_income_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_notifications ENABLE ROW LEVEL SECURITY;

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
            'reminders', 'budget_categories', 'budget_surplus',
            'manual_payment_instructions', 'bill_reminders',
            'debt_acceleration_opportunities', 'budget_surplus_events',
            'scallys_income_events', 'guardians', 'guardian_notifications'
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
