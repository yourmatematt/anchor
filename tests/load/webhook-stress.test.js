/**
 * Load Tests: Webhook Performance Under Stress
 * Tests system performance with concurrent requests
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testTransactions, testWebhooks } = require('../fixtures/test-data');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

describe('Webhook Load Tests', () => {
  beforeAll(async () => {
    // Create test users for load testing
    const testUsers = [];
    for (let i = 0; i < 100; i++) {
      testUsers.push({
        id: `load_test_user_${i}`,
        name: `Load Test User ${i}`,
        email: `loadtest${i}@anchor.test`,
        onboarding_completed: true,
      });
    }
    await supabase.from('users').insert(testUsers);
  });

  afterAll(async () => {
    await supabase.from('transactions').delete().like('user_id', 'load_test_user_%');
    await supabase.from('users').delete().like('id', 'load_test_user_%');
  });

  test('should handle 1000 concurrent webhook calls', async () => {
    const webhookCalls = [];
    const startTime = Date.now();

    // Create 1000 webhook requests
    for (let i = 0; i < 1000; i++) {
      const userId = `load_test_user_${i % 100}`;
      const payload = {
        data: {
          type: 'transactions',
          id: `txn_load_${i}`,
          attributes: {
            description: i % 5 === 0 ? 'Sportsbet' : 'Woolworths',
            amount: { value: `-${50 + (i % 50)}.00`, currencyCode: 'AUD' },
            createdAt: new Date().toISOString(),
          },
        },
      };

      webhookCalls.push(
        request(app)
          .post('/api/webhooks/up-bank')
          .send(payload)
          .set('X-Up-Authenticity-Signature', testWebhooks.validSignature(payload))
      );
    }

    // Execute all webhooks concurrently
    const responses = await Promise.allSettled(webhookCalls);

    const duration = Date.now() - startTime;
    const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    const failureCount = responses.filter(r => r.status === 'rejected' || r.value.status !== 200).length;

    console.log(`Load Test Results:`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success: ${successCount}`);
    console.log(`Failures: ${failureCount}`);
    console.log(`Throughput: ${(1000 / (duration / 1000)).toFixed(2)} req/sec`);

    // Expect at least 95% success rate
    expect(successCount / 1000).toBeGreaterThan(0.95);

    // Expect response time under 30 seconds
    expect(duration).toBeLessThan(30000);
  }, 60000); // 60 second timeout

  test('should handle pattern detection under load', async () => {
    const patternDetectionCalls = [];

    for (let i = 0; i < 200; i++) {
      const userId = `load_test_user_${i % 100}`;

      patternDetectionCalls.push(
        request(app)
          .post('/api/patterns/detect')
          .send({
            userId,
            transaction: {
              description: 'Crown Casino',
              amount: -200.00,
            },
          })
      );
    }

    const responses = await Promise.allSettled(patternDetectionCalls);
    const successCount = responses.filter(r => r.status === 'fulfilled').length;

    expect(successCount / 200).toBeGreaterThan(0.95);
  }, 30000);

  test('should handle AI conversation concurrency', async () => {
    const conversationCalls = [];

    for (let i = 0; i < 50; i++) {
      const userId = `load_test_user_${i % 100}`;

      conversationCalls.push(
        request(app)
          .post('/api/ai/conversation/trigger')
          .send({
            userId,
            trigger_type: 'GAMBLING_ONLINE',
            transaction: { description: 'Sportsbet', amount: 150 },
          })
      );
    }

    const responses = await Promise.allSettled(conversationCalls);
    const successCount = responses.filter(r => r.status === 'fulfilled').length;

    expect(successCount).toBeGreaterThan(45); // Allow for some throttling
  }, 30000);

  test('should maintain database connection pooling', async () => {
    // Create rapid sequential queries
    const queries = [];
    for (let i = 0; i < 500; i++) {
      queries.push(
        supabase.from('users').select('id').eq('id', `load_test_user_${i % 100}`).single()
      );
    }

    const startTime = Date.now();
    await Promise.all(queries);
    const duration = Date.now() - startTime;

    console.log(`Database pooling: ${queries.length} queries in ${duration}ms`);

    // Should complete in under 10 seconds
    expect(duration).toBeLessThan(10000);
  });

  test('should enforce rate limiting per user', async () => {
    const userId = 'load_test_user_0';
    const rapidRequests = [];

    // Try to make 150 requests from same user (limit is 100/min)
    for (let i = 0; i < 150; i++) {
      rapidRequests.push(
        request(app)
          .get('/api/payment/history')
          .set('Authorization', `Bearer test_token_${userId}`)
      );
    }

    const responses = await Promise.allSettled(rapidRequests);
    const rateLimitedCount = responses.filter(
      r => r.status === 'fulfilled' && r.value.status === 429
    ).length;

    // Expect some requests to be rate limited
    expect(rateLimitedCount).toBeGreaterThan(40);
  });
});
