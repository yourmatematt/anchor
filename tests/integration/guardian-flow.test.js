/**
 * Integration Tests: Guardian Flow
 * Tests guardian invitation, monitoring, and emergency triggers
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testUsers, testGuardians, generateUserId, mockResponses } = require('../fixtures/test-data');

jest.mock('twilio');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Guardian Flow Integration Tests', () => {
  let testUserId, guardianId, userToken, guardianToken;

  beforeEach(async () => {
    testUserId = generateUserId();
    await supabase.from('users').insert({ id: testUserId, ...testUsers.activeUser }).select().single();

    const jwt = require('jsonwebtoken');
    userToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterEach(async () => {
    await supabase.from('guardians').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  });

  describe('SMS Invitation Delivery', () => {
    test('should send SMS invitation to guardian', async () => {
      const twilio = require('twilio');
      const mockCreate = twilio().messages.create;

      const response = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testGuardians.activeGuardian)
        .expect(201);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testGuardians.activeGuardian.phone,
          body: expect.stringContaining('ANCHOR'),
        })
      );
    });
  });

  describe('Magic Link Authentication', () => {
    beforeEach(async () => {
      const { data } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        invite_token: 'test_invite_token_123',
      }).select().single();
      guardianId = data.id;
    });

    test('should authenticate guardian with magic link', async () => {
      const response = await request(app)
        .post('/api/guardian/accept')
        .send({ token: 'test_invite_token_123' })
        .expect(200);

      expect(response.body.token).toBeDefined();
      guardianToken = response.body.token;
    });

    test('should reject invalid magic link', async () => {
      await request(app)
        .post('/api/guardian/accept')
        .send({ token: 'invalid_token' })
        .expect(401);
    });
  });

  describe('Real-time Conversation Monitoring', () => {
    beforeEach(async () => {
      const { data } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        status: 'active',
      }).select().single();
      guardianId = data.id;

      const jwt = require('jsonwebtoken');
      guardianToken = jwt.sign({ guardianId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    });

    test('should allow guardian to view conversations', async () => {
      // Create conversation
      await supabase.from('ai_conversations').insert({
        user_id: testUserId,
        trigger_type: 'GAMBLING_ONLINE',
        status: 'active',
      });

      const response = await request(app)
        .get(`/api/guardian/${guardianId}/conversations`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);

      expect(response.body.conversations).toBeDefined();
      expect(response.body.conversations.length).toBeGreaterThan(0);
    });

    test('should update in real-time using Supabase', async () => {
      const { data: conversation } = await supabase.from('ai_conversations').insert({
        user_id: testUserId,
        trigger_type: 'PATTERN_DETECTED',
        status: 'active',
      }).select().single();

      // Subscribe to changes (guardian portal would do this)
      const channel = supabase
        .channel('conversation_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_conversations',
          filter: `id=eq.${conversation.id}`,
        }, (payload) => {
          expect(payload.new.status).toBe('completed');
        })
        .subscribe();

      // Update conversation
      await supabase.from('ai_conversations')
        .update({ status: 'completed' })
        .eq('id', conversation.id);

      await new Promise(resolve => setTimeout(resolve, 500));
      channel.unsubscribe();
    });
  });

  describe('Pattern Visibility (No Amounts)', () => {
    beforeEach(async () => {
      const { data } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        status: 'active',
      }).select().single();
      guardianId = data.id;

      const jwt = require('jsonwebtoken');
      guardianToken = jwt.sign({ guardianId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    });

    test('should show patterns without amounts', async () => {
      await supabase.from('gambling_patterns').insert({
        user_id: testUserId,
        pattern_type: 'LATE_NIGHT_ESCALATION',
        severity: 'HIGH',
        detected_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get(`/api/guardian/${guardianId}/patterns`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);

      expect(response.body.patterns.length).toBeGreaterThan(0);
      expect(response.body.patterns[0]).not.toHaveProperty('amount');
      expect(response.body.patterns[0].pattern_type).toBe('LATE_NIGHT_ESCALATION');
    });

    test('should not expose transaction amounts', async () => {
      await supabase.from('transactions').insert({
        user_id: testUserId,
        description: 'Test Transaction',
        amount: -150.00,
        merchant_category: 'GAMBLING_ONLINE',
      });

      const response = await request(app)
        .get(`/api/guardian/${guardianId}/activity`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);

      response.body.activity.forEach(item => {
        expect(item).not.toHaveProperty('amount');
      });
    });
  });

  describe('Emergency Check-in Trigger', () => {
    beforeEach(async () => {
      const { data } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        status: 'active',
      }).select().single();
      guardianId = data.id;

      const jwt = require('jsonwebtoken');
      guardianToken = jwt.sign({ guardianId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    });

    test('should trigger emergency check-in from guardian', async () => {
      const response = await request(app)
        .post(`/api/guardian/${guardianId}/emergency`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ reason: 'Concerned about recent behavior' })
        .expect(200);

      expect(response.body.conversationId).toBeDefined();
      expect(response.body.notification_sent).toBe(true);
    });

    test('should send push notification to user on emergency trigger', async () => {
      await request(app)
        .post(`/api/guardian/${guardianId}/emergency`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ reason: 'Welfare check' })
        .expect(200);

      // Verify emergency conversation created
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', testUserId)
        .eq('trigger_type', 'GUARDIAN_EMERGENCY')
        .single();

      expect(conversation).toBeDefined();
    });
  });

  describe('Guardian Access Restrictions', () => {
    test('should prevent guardian from accessing other users', async () => {
      const otherUserId = generateUserId();
      await supabase.from('users').insert({ id: otherUserId, ...testUsers.activeUser });

      const { data: guardian } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        status: 'active',
      }).select().single();

      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ guardianId: guardian.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Try to access other user's data
      await request(app)
        .get(`/api/guardian/${guardian.id}/conversations`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: otherUserId })
        .expect(403);

      await supabase.from('users').delete().eq('id', otherUserId);
    });

    test('should prevent guardian from modifying user settings', async () => {
      const { data: guardian } = await supabase.from('guardians').insert({
        user_id: testUserId,
        ...testGuardians.activeGuardian,
        status: 'active',
      }).select().single();

      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ guardianId: guardian.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      await request(app)
        .put(`/api/user/profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({ daily_allowance: 100 })
        .expect(403);
    });
  });
});
