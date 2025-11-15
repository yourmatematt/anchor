-- =====================================================
-- SEED DATA: Guardian and Bills
-- Run this after complete-schema.sql to set up test data
-- =====================================================

-- Set hardcoded user ID for MVP
\set user_id '00000000-0000-0000-0000-000000000001'

-- =====================================================
-- GUARDIAN SETUP
-- =====================================================

-- Insert Gutsy as guardian
-- NOTE: Replace phone number and email with real values
INSERT INTO guardians (
  user_id,
  guardian_name,
  guardian_phone,
  guardian_email,
  relationship,

  -- Notification preferences (all enabled for testing)
  notify_on_payment_requests,
  notify_on_declined_requests,
  notify_on_gambling_triggers,
  notify_on_payday_loans,
  notify_on_relapse,
  notify_on_clean_milestones,

  -- 12 month commitment
  active,
  commitment_start_date,
  commitment_end_date,
  invite_status,

  created_at
) VALUES (
  :'user_id',
  'Gutsy',
  '+61XXXXXXXXXX', -- REPLACE WITH REAL PHONE NUMBER
  'gutsy@example.com', -- REPLACE WITH REAL EMAIL
  'friend',

  -- All notifications enabled
  true,
  true,
  true,
  true,
  true,
  true,

  -- Active for 12 months from today
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '12 months',
  'pending', -- Will be 'accepted' after Gutsy responds to invite

  NOW()
) ON CONFLICT DO NOTHING;

-- =====================================================
-- WHITELISTED PAYEES WITH BILL DETAILS
-- =====================================================

-- NOTE: These are example payees. Replace with Matt's actual payees.
-- Priority: 1=Critical, 2=Essential, 3=Important, 4=Variable, 5=Discretionary

-- TIER 1: CRITICAL BILLS (Housing, Utilities)
INSERT INTO whitelisted_payees (
  user_id,
  payee_name,
  payment_method,

  -- Payment details
  bsb,
  account_number,
  account_name,
  payment_reference,

  -- Amount and frequency
  expected_amount,
  frequency,
  due_day, -- Day of month (1-31)

  -- Priority and category
  priority,
  category,
  is_essential,
  allow_extra_payments,

  -- Merchant matching
  merchant_patterns,

  notes,
  created_at
) VALUES
  -- Rent (Weekly on Monday = day 1 of week, but for monthly we'll use day 1 of month)
  (:'user_id', 'Mallacoota Real Estate', 'bank_transfer',
   '123-456', '12345678', 'Mallacoota Real Estate Trust Account', 'Weekly Rent - Matt Rowlands',
   440.00, 'weekly', 1, -- Due every week, day 1 for tracking
   1, 'rent', true, false,
   ARRAY['mallacoota', 'real estate', 'rent'],
   'CRITICAL - Weekly rent payment', NOW()),

  -- Mobile phone
  (:'user_id', 'Optus', 'direct_debit',
   NULL, NULL, NULL, NULL,
   65.00, 'monthly', 15, -- Due 15th of month
   1, 'utilities', true, false,
   ARRAY['optus', 'mobile'],
   'Mobile phone service', NOW()),

  -- Internet
  (:'user_id', 'Starlink', 'direct_debit',
   NULL, NULL, NULL, NULL,
   139.00, 'monthly', 20, -- Due 20th of month
   1, 'utilities', true, false,
   ARRAY['starlink', 'internet'],
   'Satellite internet', NOW()),

  -- Electricity
  (:'user_id', 'Red Energy', 'direct_debit',
   NULL, NULL, NULL, NULL,
   180.00, 'monthly', 10, -- Due 10th of month
   1, 'utilities', true, false,
   ARRAY['red energy', 'electricity'],
   'Electricity provider', NOW())
;

-- TIER 2: VARIABLE ESSENTIALS
INSERT INTO whitelisted_payees (
  user_id,
  payee_name,
  payment_method,
  bsb,
  account_number,
  account_name,
  payment_reference,
  expected_amount,
  frequency,
  due_day,
  priority,
  category,
  is_essential,
  allow_extra_payments,
  merchant_patterns,
  notes,
  created_at
) VALUES
  -- Groceries
  (:'user_id', 'Mallacoota Foodworks', 'card',
   NULL, NULL, NULL, NULL,
   600.00, 'monthly', NULL, -- No specific due date, ongoing
   2, 'groceries', true, false,
   ARRAY['foodworks', 'mallacoota foodworks'],
   'Local grocery store - budget $600/month (adjusted for staff meals)', NOW()),

  -- Fuel
  (:'user_id', 'Caltex', 'card',
   NULL, NULL, NULL, NULL,
   250.00, 'monthly', NULL,
   2, 'transport', true, false,
   ARRAY['caltex', 'fuel', 'petrol'],
   'Fuel - budget $250/month', NOW()),

  -- Pet supplies
  (:'user_id', 'Petbarn', 'card',
   NULL, NULL, NULL, NULL,
   150.00, 'monthly', NULL,
   2, 'pet', true, false,
   ARRAY['petbarn', 'pet supplies'],
   'Dog food and supplies', NOW())
;

-- TIER 3: DEBT PAYMENTS
INSERT INTO whitelisted_payees (
  user_id,
  payee_name,
  payment_method,
  bsb,
  account_number,
  account_name,
  payment_reference,
  expected_amount,
  frequency,
  due_day,
  priority,
  category,
  is_essential,
  allow_extra_payments,
  merchant_patterns,
  notes,
  created_at
) VALUES
  -- Car loan
  (:'user_id', 'Easygo Financial Services', 'bank_transfer',
   '083-028', '299986504', 'Easygo Financial Services', 'Matthew Rowlands',
   626.22, 'monthly', 12, -- Due 12th of month
   3, 'debt', true, true, -- Allow extra payments for debt acceleration
   ARRAY['easygo', 'easy go', 'car loan'],
   'Car loan - CAN make extra payments to accelerate payoff', NOW())
;

-- =====================================================
-- TEST BILL DUE IN 2 DAYS (For reminder testing)
-- =====================================================

-- Calculate a due date 2 days from now
DO $$
DECLARE
  test_due_date DATE;
  test_payee_id UUID;
BEGIN
  test_due_date := CURRENT_DATE + INTERVAL '2 days';

  -- Create a test bill payee
  INSERT INTO whitelisted_payees (
    user_id,
    payee_name,
    payment_method,
    bsb,
    account_number,
    account_name,
    payment_reference,
    expected_amount,
    frequency,
    due_day,
    priority,
    category,
    is_essential,
    allow_extra_payments,
    merchant_patterns,
    notes,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Test Bill (Due in 2 Days)',
    'bank_transfer',
    '000-000', '00000000', 'Test Company', 'Test Payment',
    50.00,
    'monthly',
    EXTRACT(DAY FROM test_due_date),
    4,
    'test',
    true,
    false,
    ARRAY['test'],
    'TEST BILL - Should trigger reminder in 2 days',
    NOW()
  ) RETURNING id INTO test_payee_id;

  RAISE NOTICE 'Test bill created with due date: % (2 days from now)', test_due_date;
  RAISE NOTICE 'Bill reminder cron should trigger for this in 2 days';
END$$;

-- =====================================================
-- UPDATE USER PROFILE WITH INITIAL DATA
-- =====================================================

UPDATE user_profiles
SET
  -- Financial patterns (will be updated by onboarding)
  average_income = 2400.00, -- Scallys income estimate
  income_frequency = 'irregular',

  -- Goals
  savings_goal_amount = 10000.00,
  savings_goal_purpose = 'Emergency fund and debt payoff',
  days_clean_goal = 90,

  -- Clean streak
  clean_since_date = CURRENT_DATE,

  updated_at = NOW()
WHERE user_id = '00000000-0000-0000-0000-000000000001'::UUID;

-- =====================================================
-- BUDGET CATEGORIES (For future surplus detection)
-- =====================================================

INSERT INTO budget_categories (
  user_id,
  category_name,
  budgeted_amount,
  category_type,
  allow_rollover,
  merchant_patterns,
  created_at
) VALUES
  (:'user_id', 'Groceries', 600.00, 'variable', false, ARRAY['foodworks'], NOW()),
  (:'user_id', 'Fuel', 250.00, 'variable', false, ARRAY['caltex', 'petrol'], NOW()),
  (:'user_id', 'Pet Supplies', 150.00, 'variable', true, ARRAY['petbarn'], NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Guardian and bills seed data inserted!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Update guardian phone number and email in guardians table';
  RAISE NOTICE '2. Update whitelisted_payees with real BSB/account numbers';
  RAISE NOTICE '3. Deploy backend to Vercel';
  RAISE NOTICE '4. Set up Twilio account for SMS';
  RAISE NOTICE '5. Set up Resend account for email';
  RAISE NOTICE '6. Test bill reminder cron (runs daily at 9am AEST)';
  RAISE NOTICE '7. Send guardian invite via API';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Testing:';
  RAISE NOTICE '- A test bill due in 2 days has been created';
  RAISE NOTICE '- Bill reminder cron will send notification in 2 days';
  RAISE NOTICE '- Guardian will receive notification if phone/email configured';
  RAISE NOTICE '';
END$$;
