/**
 * Integration Tests: Pattern Detection
 * Tests gambling pattern detection accuracy and trigger conditions
 */

const { createClient } = require('@supabase/supabase-js');
const { detectGamblingPattern } = require('../../api/services/pattern-detection');
const { enrichTransaction } = require('../../api/services/transaction-enrichment');
const { testUsers, testTransactions, generateUserId } = require('../fixtures/test-data');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Pattern Detection Integration Tests', () => {
  let testUserId;

  beforeEach(async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({ id: testUserId, ...testUsers.activeUser }).select().single();
  });

  afterEach(async () => {
    await supabase.from('gambling_patterns').delete().eq('user_id', testUserId);
    await supabase.from('transactions').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  });

  describe('Tuesday Poker Pattern', () => {
    test('should detect recurring Tuesday night cash transfers', async () => {
      // Create Tuesday night transactions for 3 consecutive weeks
      const tuesdayTransactions = [];
      for (let week = 0; week < 3; week++) {
        const tuesday = new Date();
        tuesday.setDate(tuesday.getDate() - tuesday.getDay() + 2 - (week * 7)); // Get Tuesday
        tuesday.setHours(20, 0, 0, 0); // 8pm

        tuesdayTransactions.push({
          user_id: testUserId,
          description: 'Transfer to John',
          amount: -100.00,
          created_at: tuesday.toISOString(),
          day_of_week: 'Tuesday',
          pattern_flags: ['ROUND_NUMBER', 'HIGH_RISK_TRANSFER'],
        });
      }

      await supabase.from('transactions').insert(tuesdayTransactions);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern).toBeDefined();
      expect(pattern.pattern_type).toBe('TUESDAY_POKER');
      expect(pattern.severity).toBe('HIGH');
      expect(pattern.confidence).toBeGreaterThan(0.8);
    });

    test('should require time + transfer pattern for Tuesday poker', async () => {
      // Create Tuesday transactions but at different times
      const transactions = [
        {
          user_id: testUserId,
          description: 'Transfer to John',
          amount: -100.00,
          created_at: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
          day_of_week: 'Tuesday',
        },
        {
          user_id: testUserId,
          description: 'Transfer to John',
          amount: -100.00,
          created_at: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
          day_of_week: 'Tuesday',
        },
      ];

      await supabase.from('transactions').insert(transactions);

      const pattern = await detectGamblingPattern(testUserId);

      // Should not detect Tuesday poker without consistent time pattern
      expect(pattern?.pattern_type).not.toBe('TUESDAY_POKER');
    });
  });

  describe('Late Night Cash Withdrawal Pattern', () => {
    test('should detect late night ATM withdrawals', async () => {
      const lateNightTransactions = [];
      for (let i = 0; i < 4; i++) {
        const lateNight = new Date();
        lateNight.setDate(lateNight.getDate() - i);
        lateNight.setHours(2, 30, 0, 0); // 2:30am

        lateNightTransactions.push({
          user_id: testUserId,
          description: 'ATM Withdrawal',
          amount: -(50 + i * 25), // Escalating amounts
          created_at: lateNight.toISOString(),
          pattern_flags: ['LATE_NIGHT_CASH', 'CASH_WITHDRAWAL'],
        });
      }

      await supabase.from('transactions').insert(lateNightTransactions);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern).toBeDefined();
      expect(pattern.pattern_type).toBe('LATE_NIGHT_ESCALATION');
      expect(pattern.severity).toBe('HIGH');
    });
  });

  describe('Payday Loan Detection', () => {
    test('should detect payday loan transactions', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_001',
        description: 'Beforepay',
        amount: 300.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.merchant_category).toBe('PAYDAY_LOAN');
      expect(enriched.pattern_flags).toContain('PAYDAY_LOAN');
      expect(enriched.overall_risk_score).toBeGreaterThan(80);
    });

    test('should trigger immediate intervention on payday loan', async () => {
      const transaction = {
        user_id: testUserId,
        description: 'Beforepay',
        amount: 300.00,
        merchant_category: 'PAYDAY_LOAN',
        pattern_flags: ['PAYDAY_LOAN'],
        overall_risk_score: 95,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(transaction);

      const pattern = await detectGamblingPattern(testUserId, transaction.id);

      expect(pattern.requires_immediate_intervention).toBe(true);
      expect(pattern.severity).toBe('CRITICAL');
    });
  });

  describe('Multiple Small Withdrawals', () => {
    test('should detect escalating small withdrawals', async () => {
      const withdrawals = [20, 40, 60, 100, 150].map((amount, i) => ({
        user_id: testUserId,
        description: 'ATM Withdrawal',
        amount: -amount,
        created_at: new Date(Date.now() - (4 - i) * 60 * 60 * 1000).toISOString(), // Each hour
        pattern_flags: ['CASH_WITHDRAWAL'],
      }));

      await supabase.from('transactions').insert(withdrawals);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern).toBeDefined();
      expect(pattern.pattern_type).toContain('ESCALATION');
      expect(pattern.indicators.escalating_amounts).toBe(true);
    });
  });

  describe('Crypto Exchange Transfers', () => {
    test('should detect crypto purchases as potential offshore gambling', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_002',
        description: 'CoinSpot',
        amount: -500.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.merchant_category).toBe('CRYPTO_EXCHANGE');
      expect(enriched.pattern_flags).toContain('CRYPTO_EXCHANGE');
    });

    test('should flag large crypto purchases as high risk', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_003',
        description: 'Binance',
        amount: -1000.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.pattern_flags).toContain('LARGE_CRYPTO_PURCHASE');
      expect(enriched.overall_risk_score).toBeGreaterThan(70);
    });
  });

  describe('Gambling Venue Transactions', () => {
    test('should detect casino transactions', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_004',
        description: 'Crown Casino',
        amount: -200.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.merchant_category).toBe('GAMBLING_VENUE');
      expect(enriched.pattern_flags).toContain('GAMBLING_VENUE');
      expect(enriched.overall_risk_score).toBeGreaterThan(85);
    });

    test('should detect RSL club gambling', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_005',
        description: 'Parramatta RSL Club',
        amount: -150.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.merchant_category).toBe('GAMBLING_VENUE');
    });
  });

  describe('Pattern Confidence Levels', () => {
    test('should have high confidence for direct gambling transactions', async () => {
      const transaction = {
        user_id: testUserId,
        description: 'Sportsbet',
        merchant_category: 'GAMBLING_ONLINE',
        pattern_flags: ['GAMBLING_ONLINE'],
        overall_risk_score: 98,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(transaction);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern.confidence).toBeGreaterThan(0.95);
    });

    test('should have medium confidence for suspicious patterns', async () => {
      // Create suspicious but not definitive pattern
      const transactions = [];
      for (let i = 0; i < 3; i++) {
        transactions.push({
          user_id: testUserId,
          description: 'Transfer to Friend',
          amount: -50.00,
          created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          pattern_flags: ['ROUND_NUMBER'],
        });
      }

      await supabase.from('transactions').insert(transactions);

      const pattern = await detectGamblingPattern(testUserId);

      if (pattern) {
        expect(pattern.confidence).toBeLessThan(0.8);
      }
    });
  });

  describe('Pattern Severity Levels', () => {
    test('should mark payday loans as CRITICAL', async () => {
      const transaction = {
        user_id: testUserId,
        merchant_category: 'PAYDAY_LOAN',
        pattern_flags: ['PAYDAY_LOAN'],
        overall_risk_score: 95,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(transaction);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern.severity).toBe('CRITICAL');
    });

    test('should mark direct gambling as HIGH', async () => {
      const transaction = {
        user_id: testUserId,
        merchant_category: 'GAMBLING_ONLINE',
        pattern_flags: ['GAMBLING_ONLINE'],
        overall_risk_score: 90,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(transaction);

      const pattern = await detectGamblingPattern(testUserId);

      expect(pattern.severity).toBe('HIGH');
    });
  });

  describe('False Positive Prevention', () => {
    test('should not flag legitimate grocery shopping', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_006',
        description: 'Woolworths',
        amount: -85.50,
        created_at: new Date().toISOString(),
      });

      expect(enriched.merchant_category).not.toBe('GAMBLING_ONLINE');
      expect(enriched.merchant_category).not.toBe('GAMBLING_VENUE');
      expect(enriched.overall_risk_score).toBeLessThan(30);
    });

    test('should not flag legitimate bills', async () => {
      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_007',
        description: 'Telstra',
        amount: -79.00,
        created_at: new Date().toISOString(),
      });

      expect(enriched.overall_risk_score).toBeLessThan(20);
      expect(enriched.pattern_flags.length).toBe(0);
    });

    test('should not flag business hours transfers', async () => {
      const transaction = new Date();
      transaction.setHours(14, 0, 0, 0); // 2pm

      const enriched = enrichTransaction({
        up_transaction_id: 'test_txn_008',
        description: 'Transfer to Landlord',
        amount: -500.00,
        created_at: transaction.toISOString(),
      });

      expect(enriched.time_risk_score).toBeLessThan(40);
    });
  });
});
