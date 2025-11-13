-- =====================================================
-- WHITELISTED PAYEES - POPULATE WITH YOUR DETAILS
-- =====================================================
-- Run this AFTER complete-schema.sql
-- Replace ALL placeholders with your actual details
-- =====================================================

-- User ID (must match hardcoded ID in app)
\set user_id '00000000-0000-0000-0000-000000000001'

-- =====================================================
-- TIER 1: CRITICAL (Housing & Essentials)
-- =====================================================

INSERT INTO whitelisted_payees (
  user_id, payee_name, payment_method,
  bsb, account_number, account_name, payment_reference,
  expected_amount, frequency, due_day, priority, category,
  is_essential, allow_extra_payments, notes
) VALUES
  -- RENT (Priority 1)
  (:'user_id', 'Mallacoota Real Estate', 'bank_transfer',
   '123-456', '12345678', 'Mallacoota Real Estate Trust Account', 'Weekly Rent',
   440.00, 'weekly', 1, 1, 'rent',
   true, false, 'CRITICAL - Must pay every week'),

  -- ELECTRICITY (Priority 2)
  (:'user_id', 'Red Energy', 'bpay',
   NULL, NULL, NULL, NULL, -- No bank details for BPAY
   120.00, 'monthly', 15, 2, 'utilities',
   true, false, 'Pay via BPAY manually - Biller Code: XXXXX, Ref: XXXXXXXXXX'),

  -- INTERNET (Priority 3)
  (:'user_id', 'Starlink', 'card',
   NULL, NULL, NULL, NULL, -- Card payment
   139.00, 'monthly', 1, 3, 'utilities',
   true, false, 'Auto-debits from card on 1st of month'),

  -- MOBILE (Priority 4)
  (:'user_id', 'Optus', 'card',
   NULL, NULL, NULL, NULL, -- Card payment
   49.00, 'monthly', 5, 4, 'utilities',
   true, false, 'Auto-debits from card on 5th of month');

-- =====================================================
-- TIER 2: VARIABLE ESSENTIALS
-- =====================================================

INSERT INTO whitelisted_payees (
  user_id, payee_name, payment_method,
  merchant_patterns, -- For auto-matching card transactions
  expected_amount, frequency, priority, category,
  is_essential, notes
) VALUES
  -- GROCERIES (Priority 5)
  (:'user_id', 'Mallacoota Foodworks', 'card',
   ARRAY['foodworks', 'FOODWORKS', 'Foodworks Mallacoota'],
   600.00, 'monthly', 5, 'groceries',
   true, 'Budget $600/month minus staff meals (shifts × $15)'),

  -- FUEL (Priority 6)
  (:'user_id', 'Caltex Fuel', 'card',
   ARRAY['caltex', 'CALTEX', 'Ampol'],
   200.00, 'monthly', 6, 'transport',
   true, 'Track actual vs budget for surplus'),

  -- PET SUPPLIES (Priority 7)
  (:'user_id', 'Petbarn', 'card',
   ARRAY['petbarn', 'PETBARN', 'Pet Barn'],
   100.00, 'monthly', 7, 'pet',
   true, 'Dog food & supplies');

-- =====================================================
-- TIER 3: DEBT PAYMENTS (High Priority)
-- =====================================================

INSERT INTO whitelisted_payees (
  user_id, payee_name, payment_method,
  bsb, account_number, account_name, payment_reference,
  expected_amount, frequency, due_day, priority, category,
  is_essential, allow_extra_payments, notes
) VALUES
  -- EASYGO DEBT (Priority 8 - Highest interest)
  (:'user_id', 'Easygo Finance', 'bank_transfer',
   'XXX-XXX', 'XXXXXXXX', 'Easygo Collections', 'YOUR_LOAN_REF',
   NULL, 'variable', NULL, 8, 'debt',
   true, true, 'Balance: $11,898 @ 48% APR - ACCELERATE PAYMENTS'),

  -- NIMBLE DEBT (Priority 9)
  (:'user_id', 'Nimble Debt', 'bank_transfer',
   'XXX-XXX', 'XXXXXXXX', 'Nimble Collections', 'YOUR_LOAN_REF',
   NULL, 'variable', NULL, 9, 'debt',
   true, true, 'Balance: $XXX - Track interest'),

  -- MONEYWELL DEBT (Priority 10)
  (:'user_id', 'Moneywell Finance', 'bank_transfer',
   'XXX-XXX', 'XXXXXXXX', 'Moneywell', 'YOUR_LOAN_REF',
   NULL, 'variable', NULL, 10, 'debt',
   true, true, 'Balance: $XXX');

-- =====================================================
-- TIER 4: TAX & GOVERNMENT
-- =====================================================

INSERT INTO whitelisted_payees (
  user_id, payee_name, payment_method,
  biller_code, bpay_reference,
  expected_amount, frequency, due_day, priority, category,
  is_essential, allow_extra_payments, notes
) VALUES
  -- ATO TAX DEBT (Priority 11)
  (:'user_id', 'Australian Taxation Office', 'bpay',
   '75556', 'YOUR_PRN_HERE',
   NULL, 'variable', NULL, 11, 'debt',
   true, true, 'Balance: $21,000 - Payment plan active');

-- =====================================================
-- TIER 5: KNOWN INCOME SOURCES (For Auto-Detection)
-- =====================================================
-- These aren't payees you PAY, but sources you RECEIVE from
-- Used for irregular deposit detection

-- YMA Clients (insert your actual client names/patterns)
-- Scallys Cafe (your employer)
-- Any other legitimate income sources

-- =====================================================
-- SUMMARY VIEW
-- =====================================================

-- View your whitelisted payees ordered by priority
SELECT
  payee_name,
  payment_method,
  expected_amount,
  frequency,
  priority,
  category,
  CASE
    WHEN bsb IS NOT NULL THEN CONCAT('BSB: ', bsb, ' ACC: ', account_number)
    WHEN biller_code IS NOT NULL THEN CONCAT('BPAY: ', biller_code, ' REF: ', bpay_reference)
    ELSE 'Card/Merchant'
  END as payment_details
FROM whitelisted_payees
WHERE user_id = :'user_id'
ORDER BY priority ASC;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*

1. FILL IN YOUR ACTUAL DETAILS:
   - Replace XXX-XXX with real BSB numbers
   - Replace XXXXXXXX with real account numbers
   - Add actual BPAY biller codes and references
   - Update expected_amount with actual bill amounts
   - Add merchant_patterns for card transactions

2. ADD MORE PAYEES:
   Copy the INSERT statement format and add:
   - Your other clients (YMA/Scallys)
   - Any other regular bills
   - One-off approved payees

3. RUN THIS SCRIPT in Supabase SQL Editor

4. VERIFY:
   The SELECT query at the end will show all your payees
   ordered by payment priority

5. IMPORTANT:
   - Priority 1-10: Most critical bills
   - Priority 11-20: Secondary/optional
   - allow_extra_payments = true: Can send extra to reduce debt

*/

-- =====================================================
-- BUDGET CATEGORIES (For Surplus Detection)
-- =====================================================

INSERT INTO budget_categories (
  user_id, category_name, monthly_budget, staff_meal_deduction_per_shift
) VALUES
  (:'user_id', 'foodworks_groceries', 600.00, 15.00),
  (:'user_id', 'caltex_fuel', 200.00, 0.00)
ON CONFLICT (user_id, category_name) DO UPDATE
  SET monthly_budget = EXCLUDED.monthly_budget,
      staff_meal_deduction_per_shift = EXCLUDED.staff_meal_deduction_per_shift;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Whitelisted payees configured!';
  RAISE NOTICE '📊 Check the SELECT query results above';
  RAISE NOTICE '⚠️  Remember to update Up Bank account IDs in user_profiles';
END$$;
