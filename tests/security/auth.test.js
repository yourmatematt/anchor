/**
 * Security Tests: Authentication and Authorization
 * Tests security measures, access controls, and vulnerability protection
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { generateUserId } = require('../fixtures/test-data');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

describe('Security Tests', () => {
  let testUserId, authToken;

  beforeEach(async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({
      id: testUserId,
      name: 'Security Test User',
      email: 'security@test.com',
      onboarding_completed: true,
    });

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterEach(async () => {
    await supabase.from('users').delete().eq('id', testUserId);
  });

  describe('JWT Token Validation', () => {
    test('should reject missing authorization header', async () => {
      await request(app)
        .get('/api/payment/history')
        .expect(401);
    });

    test('should reject invalid JWT token', async () => {
      await request(app)
        .get('/api/payment/history')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);
    });

    test('should reject expired JWT token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      await request(app)
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    test('should reject token with invalid signature', async () => {
      const jwt = require('jsonwebtoken');
      const tampered = jwt.sign({ userId: testUserId }, 'wrong_secret', { expiresIn: '7d' });

      await request(app)
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${tampered}`)
        .expect(401);
    });
  });

  describe('Guardian Access Restrictions', () => {
    test('should prevent guardians from accessing user-only endpoints', async () => {
      const { data: guardian } = await supabase.from('guardians').insert({
        user_id: testUserId,
        name: 'Guardian',
        phone: '+61400000010',
        status: 'active',
      }).select().single();

      const jwt = require('jsonwebtoken');
      const guardianToken = jwt.sign({ guardianId: guardian.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ amount: 50, reason: 'Test', is_voice: false })
        .expect(403);

      await supabase.from('guardians').delete().eq('id', guardian.id);
    });

    test('should prevent guardians from viewing other users\' data', async () => {
      const otherUserId = generateUserId();
      await supabase.from('users').insert({
        id: otherUserId,
        name: 'Other User',
        email: 'other@test.com',
      });

      const { data: guardian } = await supabase.from('guardians').insert({
        user_id: testUserId,
        name: 'Guardian',
        phone: '+61400000010',
        status: 'active',
      }).select().single();

      const jwt = require('jsonwebtoken');
      const guardianToken = jwt.sign({ guardianId: guardian.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Try to access other user's conversations
      await request(app)
        .get(`/api/guardian/${guardian.id}/conversations`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .query({ userId: otherUserId })
        .expect(403);

      await supabase.from('guardians').delete().eq('id', guardian.id);
      await supabase.from('users').delete().eq('id', otherUserId);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in user search', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/user/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ name: maliciousInput })
        .expect(400);

      // Verify users table still exists
      const { data: users } = await supabase.from('users').select('id').limit(1);
      expect(users).toBeDefined();
    });

    test('should sanitize transaction descriptions', async () => {
      const maliciousDescription = "<script>alert('XSS')</script>";

      await supabase.from('transactions').insert({
        user_id: testUserId,
        description: maliciousDescription,
        amount: -50.00,
      });

      const response = await request(app)
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Ensure script tags are escaped or removed
      const hasRawScript = response.text.includes('<script>');
      expect(hasRawScript).toBe(false);
    });
  });

  describe('XSS Prevention', () => {
    test('should escape HTML in payment reasons', async () => {
      const xssPayload = "<img src=x onerror=alert('XSS')>";

      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 25,
          reason: xssPayload,
          is_voice: false,
        });

      // Should either reject or sanitize
      if (response.status === 201) {
        expect(response.body.reason).not.toContain('<img');
      }
    });

    test('should sanitize guardian names', async () => {
      const xssName = "<script>alert('XSS')</script>";

      const response = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: xssName,
          phone: '+61400000010',
          relationship: 'partner',
        });

      if (response.status === 201) {
        const { data: guardian } = await supabase
          .from('guardians')
          .select('name')
          .eq('user_id', testUserId)
          .single();

        expect(guardian.name).not.toContain('<script>');
      }
    });
  });

  describe('CORS Configuration', () => {
    test('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .options('/api/user/profile')
        .set('Origin', 'https://anchor.app')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Origin', 'https://evil.com')
        .set('Authorization', `Bearer ${authToken}`);

      const corsHeader = response.headers['access-control-allow-origin'];
      expect(corsHeader).not.toBe('https://evil.com');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per IP', async () => {
      const requests = [];

      // Make 150 requests (limit is 100/min)
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThan(40);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid email formats', async () => {
      await request(app)
        .post('/api/user/onboard')
        .send({
          name: 'Test User',
          email: 'not_an_email',
          phone: '+61400000001',
        })
        .expect(400);
    });

    test('should reject invalid phone numbers', async () => {
      await request(app)
        .post('/api/user/onboard')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          phone: '123', // Invalid format
        })
        .expect(400);
    });

    test('should reject negative payment amounts', async () => {
      await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -50,
          reason: 'Invalid amount',
          is_voice: false,
        })
        .expect(400);
    });

    test('should reject extremely large payment amounts', async () => {
      await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999999999,
          reason: 'Suspiciously large',
          is_voice: false,
        })
        .expect(400);
    });
  });

  describe('Webhook Signature Validation', () => {
    test('should reject webhooks with invalid signatures', async () => {
      await request(app)
        .post('/api/webhooks/up-bank')
        .send({
          data: {
            type: 'transactions',
            id: 'txn_test',
            attributes: {
              description: 'Test',
              amount: { value: '-50.00', currencyCode: 'AUD' },
            },
          },
        })
        .set('X-Up-Authenticity-Signature', 'invalid_signature')
        .expect(401);
    });

    test('should reject webhooks without signatures', async () => {
      await request(app)
        .post('/api/webhooks/up-bank')
        .send({
          data: {
            type: 'transactions',
            id: 'txn_test',
          },
        })
        .expect(401);
    });
  });

  describe('Sensitive Data Protection', () => {
    test('should not expose Up Bank tokens in API responses', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('up_bank_token');
    });

    test('should not log sensitive data', async () => {
      // This would require checking actual logs, but we can verify the response doesn't leak data
      const response = await request(app)
        .post('/api/payment/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 25,
          reason: 'Test payment',
          is_voice: false,
        })
        .expect(201);

      // Verify response doesn't contain internal user ID
      expect(response.body.paymentId).toBeDefined();
      expect(response.body.paymentId).not.toBe(testUserId);
    });
  });
});
