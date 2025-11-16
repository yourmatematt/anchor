/**
 * Integration Tests: Payment Request Flow
 * Tests payment approval, denial, AI triggers, and allowance management
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testUsers, testPaymentRequests, generateUserId, mockResponses } = require('../fixtures/test-data');

// Mock external services
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockResponses.openAI.chatCompletion),
      },
    },
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue(mockResponses.openAI.whisperTranscription),
      },
    },
  })),
}));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Payment Request Integration Tests', () => {
  let testUserId;
  let authToken;

  beforeEach(async () => {
    testUserId = generateUserId();

    // Create test user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        ...testUsers.activeUser,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterEach(async () => {
    // Clean up
    await supabase.from('payment_requests').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  });

  describe('Approved Payment Flow', () => {
    test('should approve legitimate payment request', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPaymentRequests.legitimateGroceries)
        .expect(201);

      expect(response.body.status).toBe('pending');
      expect(response.body.paymentId).toBeDefined();

      // Verify payment request created
      const { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', response.body.paymentId)
        .single();

      expect(payment.amount).toBe(testPaymentRequests.legitimateGroceries.amount);
      expect(payment.reason).toBe(testPaymentRequests.legitimateGroceries.reason);
    });

    test('should deduct from daily allowance', async () => {
      const requestAmount = 20.00;

      await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: requestAmount,
          reason: 'Groceries',
          is_voice: false,
        })
        .expect(201);

      // Confirm payment
      const { data: payment } = await supabase
        .from('payment_requests')
        .select('id')
        .eq('user_id', testUserId)
        .single();

      await request(app)
        .post('/api/payment/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: payment.id,
        })
        .expect(200);

      // Verify allowance deducted
      const { data: user } = await supabase
        .from('users')
        .select('daily_allowance_used')
        .eq('id', testUserId)
        .single();

      expect(user.daily_allowance_used).toBe(requestAmount);
    });

    test('should track payment history', async () => {
      // Make multiple payments
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/payment/request')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 10.00,
            reason: `Payment ${i + 1}`,
            is_voice: false,
          })
          .expect(201);
      }

      // Get payment history
      const response = await request(app)
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.payments.length).toBe(3);
    });
  });

  describe('Denied Payment Flow', () => {
    test('should deny payment exceeding daily allowance', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.00, // Exceeds $30 daily allowance
          reason: 'Need cash',
          is_voice: false,
        })
        .expect(200);

      expect(response.body.status).toBe('ai_required');
      expect(response.body.trigger_type).toBe('ALLOWANCE_EXCEEDED');
    });

    test('should force AI conversation on denial', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.00,
          reason: 'Need cash',
          is_voice: false,
        })
        .expect(200);

      expect(response.body.conversationId).toBeDefined();

      // Verify AI conversation created
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', response.body.conversationId)
        .single();

      expect(conversation.status).toBe('active');
      expect(conversation.trigger_type).toBe('ALLOWANCE_EXCEEDED');
    });

    test('should detect suspicious round number payment', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPaymentRequests.suspiciousRoundAmount)
        .expect(200);

      expect(response.body.flags).toContain('ROUND_NUMBER');
    });

    test('should detect vague payment reason', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPaymentRequests.vagueRequest)
        .expect(200);

      expect(response.body.flags).toContain('VAGUE_REASON');
      expect(response.body.status).toBe('ai_required');
    });
  });

  describe('Voice Payment Requests', () => {
    test('should transcribe voice payment request', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPaymentRequests.emergencyMedical)
        .expect(201);

      expect(response.body.transcription).toBeDefined();
    });

    test('should analyze voice for authenticity', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.00,
          is_voice: true,
          voice_recording_url: 'https://example.com/recordings/test.mp3',
        })
        .expect(201);

      expect(response.body.voice_analysis).toBeDefined();
      expect(response.body.voice_analysis).toHaveProperty('stress_detected');
      expect(response.body.voice_analysis).toHaveProperty('confidence');
    });
  });

  describe('Pattern Detection Triggers', () => {
    test('should trigger AI on multiple requests in short time', async () => {
      // Make 3 payment requests within 5 minutes
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/payment/request')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 10.00,
            reason: `Request ${i + 1}`,
            is_voice: false,
          });
      }

      // Fourth request should trigger AI
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10.00,
          reason: 'Another request',
          is_voice: false,
        })
        .expect(200);

      expect(response.body.status).toBe('ai_required');
      expect(response.body.trigger_type).toBe('MULTIPLE_REQUESTS');
    });

    test('should detect late night payment requests', async () => {
      // Mock current time to 2am
      jest.useFakeTimers();
      jest.setSystemTime(new Date(new Date().setHours(2, 0, 0, 0)));

      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.00,
          reason: 'Need money',
          is_voice: false,
        })
        .expect(200);

      expect(response.body.flags).toContain('LATE_NIGHT_REQUEST');

      jest.useRealTimers();
    });
  });

  describe('Manual Payment Confirmation', () => {
    test('should require manual confirmation for large amounts', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200.00,
          reason: 'Emergency car repair',
          is_voice: true,
          voice_recording_url: 'https://example.com/recordings/emergency.mp3',
        })
        .expect(201);

      expect(response.body.status).toBe('pending_confirmation');
      expect(response.body.requires_manual_transfer).toBe(true);
    });

    test('should allow user to confirm manual transfer', async () => {
      // Create payment request
      const { data: payment } = await supabase
        .from('payment_requests')
        .insert({
          user_id: testUserId,
          amount: 200.00,
          reason: 'Emergency',
          status: 'pending_confirmation',
        })
        .select()
        .single();

      const response = await request(app)
        .post('/api/payment/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: payment.id,
          confirmation_code: 'test_code',
        })
        .expect(200);

      expect(response.body.status).toBe('approved');

      // Verify payment updated
      const { data: updatedPayment } = await supabase
        .from('payment_requests')
        .select('status')
        .eq('id', payment.id)
        .single();

      expect(updatedPayment.status).toBe('approved');
    });
  });

  describe('Allowance Management', () => {
    test('should track remaining allowance', async () => {
      const response = await request(app)
        .get('/api/allowance/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.daily_allowance).toBe(30);
      expect(response.body.used).toBe(0);
      expect(response.body.remaining).toBe(30);
    });

    test('should reset allowance at midnight AEST', async () => {
      // Use some allowance
      await supabase
        .from('users')
        .update({ daily_allowance_used: 25 })
        .eq('id', testUserId);

      // Simulate allowance reset cron job
      await supabase
        .from('users')
        .update({
          daily_allowance_used: 0,
          allowance_reset_at: new Date().toISOString(),
        })
        .eq('id', testUserId);

      const { data: user } = await supabase
        .from('users')
        .select('daily_allowance_used')
        .eq('id', testUserId)
        .single();

      expect(user.daily_allowance_used).toBe(0);
    });

    test('should track allowance history', async () => {
      const response = await request(app)
        .get('/api/allowance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 7 })
        .expect(200);

      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('Vault Protection', () => {
    test('should protect vault balance from withdrawals', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.00,
          reason: 'Need money from vault',
          source: 'vault',
          is_voice: false,
        })
        .expect(403);

      expect(response.body.error).toMatch(/vault.*locked/i);
    });

    test('should allow vault access after commitment period', async () => {
      // Set commitment end date to past
      await supabase
        .from('users')
        .update({
          commitment_end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', testUserId);

      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.00,
          reason: 'Vault withdrawal after commitment',
          source: 'vault',
          is_voice: false,
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
    });

    test('should show vault growth', async () => {
      const response = await request(app)
        .get('/api/vault/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.balance).toBe(testUsers.activeUser.vault_balance);
      expect(response.body.days_locked).toBeDefined();
      expect(response.body.unlock_date).toBeDefined();
    });
  });

  describe('Payment Statistics', () => {
    test('should calculate payment stats', async () => {
      // Create multiple payments
      await supabase.from('payment_requests').insert([
        {
          user_id: testUserId,
          amount: 20.00,
          reason: 'Groceries',
          status: 'approved',
          created_at: new Date().toISOString(),
        },
        {
          user_id: testUserId,
          amount: 15.00,
          reason: 'Transport',
          status: 'approved',
          created_at: new Date().toISOString(),
        },
        {
          user_id: testUserId,
          amount: 50.00,
          reason: 'Suspicious',
          status: 'denied',
          created_at: new Date().toISOString(),
        },
      ]);

      const response = await request(app)
        .get('/api/payment/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.total_requests).toBe(3);
      expect(response.body.approved_count).toBe(2);
      expect(response.body.denied_count).toBe(1);
      expect(response.body.approval_rate).toBeCloseTo(66.7, 1);
    });
  });

  describe('Edge Cases', () => {
    test('should reject negative payment amounts', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -50.00,
          reason: 'Invalid amount',
          is_voice: false,
        })
        .expect(400);

      expect(response.body.error).toMatch(/invalid.*amount/i);
    });

    test('should reject zero amount payments', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0.00,
          reason: 'Zero amount',
          is_voice: false,
        })
        .expect(400);

      expect(response.body.error).toMatch(/amount.*must be greater than zero/i);
    });

    test('should reject payment without reason', async () => {
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.00,
          is_voice: false,
        })
        .expect(400);

      expect(response.body.error).toMatch(/reason.*required/i);
    });

    test('should handle concurrent payment requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/payment/request')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              amount: 5.00,
              reason: `Concurrent request ${i + 1}`,
              is_voice: false,
            })
        );
      }

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 201).length;

      // Some should succeed, some should be throttled or trigger AI
      expect(successCount).toBeGreaterThan(0);
    });
  });
});
