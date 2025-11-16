/**
 * End-to-End Tests: Critical User Journeys
 * Tests complete user flows from start to finish
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testOnboarding, generateUserId } = require('../fixtures/test-data');

jest.mock('twilio');
jest.mock('openai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

describe('E2E Critical Paths', () => {
  let testUserId, authToken;

  afterEach(async () => {
    if (testUserId) {
      await supabase.from('ai_conversations').delete().eq('user_id', testUserId);
      await supabase.from('payment_requests').delete().eq('user_id', testUserId);
      await supabase.from('guardians').delete().eq('user_id', testUserId);
      await supabase.from('users').delete().eq('id', testUserId);
    }
  });

  test('Path 1: New user onboarding → first payment request → AI approval', async () => {
    // Onboard
    const onboardResponse = await request(app)
      .post('/api/user/onboard')
      .send({ ...testOnboarding.completeFlow.step1, ...testOnboarding.completeFlow.step2 })
      .expect(201);

    testUserId = onboardResponse.body.userId;
    authToken = onboardResponse.body.token;

    // Complete onboarding
    await request(app)
      .post('/api/user/onboard/complete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ whitelist: [], commitment_confirmed: true })
      .expect(200);

    // Request payment
    const paymentResponse = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 25, reason: 'Groceries at Woolworths', is_voice: false })
      .expect(201);

    expect(paymentResponse.body.status).toBe('pending');
  });

  test('Path 2: Gambling relapse → pattern detection → intervention → guardian notification', async () => {
    // Create user
    testUserId = generateUserId();
    await supabase.from('users').insert({
      id: testUserId,
      name: 'Test User',
      email: 'test@test.com',
      onboarding_completed: true,
      current_streak_days: 30,
    });

    // Create guardian
    await supabase.from('guardians').insert({
      user_id: testUserId,
      name: 'Guardian',
      phone: '+61400000010',
      status: 'active',
    });

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Simulate webhook: gambling transaction
    const webhookPayload = {
      data: {
        type: 'transactions',
        id: 'txn_test',
        attributes: {
          description: 'Sportsbet',
          amount: { value: '-150.00', currencyCode: 'AUD' },
          createdAt: new Date().toISOString(),
        },
      },
    };

    await request(app)
      .post('/api/webhooks/up-bank')
      .send(webhookPayload)
      .set('X-Up-Authenticity-Signature', 'test_signature')
      .expect(200);

    // Verify pattern detected
    const { data: patterns } = await supabase
      .from('gambling_patterns')
      .select('*')
      .eq('user_id', testUserId);

    expect(patterns.length).toBeGreaterThan(0);

    // Verify AI conversation triggered
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', testUserId);

    expect(conversations.length).toBeGreaterThan(0);
  });

  test('Path 3: Payday loan → AI confrontation → denial → streak reset', async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({
      id: testUserId,
      name: 'Test User',
      email: 'test@test.com',
      onboarding_completed: true,
      current_streak_days: 15,
    });

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Trigger AI conversation for payday loan
    const conversationResponse = await request(app)
      .post('/api/ai/conversation/trigger')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        trigger_type: 'PAYDAY_LOAN_DETECTED',
        transaction: { description: 'Beforepay', amount: 300 },
      })
      .expect(201);

    const conversationId = conversationResponse.body.conversationId;

    // User admits to gambling debt
    await request(app)
      .post(`/api/ai/conversation/${conversationId}/message`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: "I needed it to cover gambling losses" })
      .expect(200);

    // Verify streak reset
    const { data: user } = await supabase
      .from('users')
      .select('current_streak_days, last_relapse_date')
      .eq('id', testUserId)
      .single();

    expect(user.current_streak_days).toBe(0);
    expect(user.last_relapse_date).toBeDefined();
  });

  test('Path 4: Daily allowance reset → payment request → manual transfer', async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({
      id: testUserId,
      name: 'Test User',
      email: 'test@test.com',
      onboarding_completed: true,
      daily_allowance: 30,
      daily_allowance_used: 30,
    });

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Reset allowance
    await supabase.from('users')
      .update({ daily_allowance_used: 0 })
      .eq('id', testUserId);

    // Request payment
    const paymentResponse = await request(app)
      .post('/api/payment/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 20, reason: 'Groceries', is_voice: false })
      .expect(201);

    expect(paymentResponse.body.status).toBe('pending');

    // Verify allowance deducted after confirmation
    const { data: payment } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('user_id', testUserId)
      .single();

    await request(app)
      .post('/api/payment/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentId: payment.id })
      .expect(200);

    const { data: user } = await supabase
      .from('users')
      .select('daily_allowance_used')
      .eq('id', testUserId)
      .single();

    expect(user.daily_allowance_used).toBe(20);
  });

  test('Path 5: Guardian emergency → push notification → forced check-in', async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({
      id: testUserId,
      name: 'Test User',
      email: 'test@test.com',
      onboarding_completed: true,
    });

    const { data: guardian } = await supabase.from('guardians').insert({
      user_id: testUserId,
      name: 'Guardian',
      phone: '+61400000010',
      status: 'active',
    }).select().single();

    const jwt = require('jsonwebtoken');
    const guardianToken = jwt.sign({ guardianId: guardian.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Guardian triggers emergency
    const response = await request(app)
      .post(`/api/guardian/${guardian.id}/emergency`)
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ reason: 'Welfare check' })
      .expect(200);

    expect(response.body.conversationId).toBeDefined();

    // Verify emergency conversation created
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('trigger_type', 'GUARDIAN_EMERGENCY')
      .single();

    expect(conversation.status).toBe('active');
  });
});
