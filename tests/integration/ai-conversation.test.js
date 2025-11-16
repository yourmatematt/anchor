/**
 * Integration Tests: AI Conversation Flow
 * Tests AI interventions, manipulation detection, and conversation outcomes
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testUsers, testConversations, generateUserId, mockResponses } = require('../fixtures/test-data');
const { detectManipulation } = require('../../api/services/manipulation-detector');

// Mock external services
jest.mock('openai');
jest.mock('twilio');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('AI Conversation Integration Tests', () => {
  let testUserId;
  let authToken;
  let conversationId;

  beforeEach(async () => {
    testUserId = generateUserId();

    await supabase.from('users').insert({ id: testUserId, ...testUsers.activeUser }).select().single();

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterEach(async () => {
    await supabase.from('ai_conversations').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  });

  describe('Payday Loan Interrogation', () => {
    test('should trigger AI conversation on payday loan detection', async () => {
      const response = await request(app)
        .post('/api/ai/conversation/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trigger_type: 'PAYDAY_LOAN_DETECTED',
          transaction: {
            description: 'Beforepay',
            amount: 300.00,
          },
        })
        .expect(201);

      expect(response.body.conversationId).toBeDefined();
      expect(response.body.initial_message).toMatch(/payday loan/i);
    });

    test('should use aggressive intervention prompt for payday loans', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'PAYDAY_LOAN_DETECTED',
          status: 'active',
        })
        .select()
        .single();

      conversationId = conversation.id;

      const response = await request(app)
        .post(`/api/ai/conversation/${conversationId}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "It's just a small loan to cover bills",
        })
        .expect(200);

      expect(response.body.ai_response).toMatch(/400%.*interest/i);
    });
  });

  describe('Gambling Venue Detection', () => {
    test('should confront gambling venue transaction', async () => {
      const response = await request(app)
        .post('/api/ai/conversation/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trigger_type: 'GAMBLING_VENUE',
          transaction: {
            description: 'Crown Casino',
            amount: 200.00,
          },
        })
        .expect(201);

      expect(response.body.initial_message).toMatch(/Crown Casino/i);
      expect(response.body.initial_message).toMatch(/\$200/);
    });
  });

  describe('Manipulation Detection', () => {
    const manipulationTactics = [
      { name: 'minimization', message: "It's just a small bet, not a big deal" },
      { name: 'deflection', message: "Can we talk about something else?" },
      { name: 'rationalization', message: "I had a system, I was about to win big" },
      { name: 'blame_shift', message: "It's because I was stressed from work" },
      { name: 'false_promise', message: "I promise this was the last time" },
      { name: 'partial_truth', message: "I only went to help a friend" },
      { name: 'future_focus', message: "Let's just focus on moving forward" },
      { name: 'appeal_to_pity', message: "I'm going through a really tough time" },
      { name: 'attacking', message: "You don't understand what it's like" },
      { name: 'playing_victim', message: "Everyone is against me" },
    ];

    manipulationTactics.forEach(({ name, message }) => {
      test(`should detect ${name} manipulation tactic`, () => {
        const result = detectManipulation(message);

        expect(result.detected).toBe(true);
        expect(result.tactics).toContain(name.toUpperCase());
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    test('should call out manipulation in conversation', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_ONLINE',
          status: 'active',
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "It's just a small bet, not a big deal",
        })
        .expect(200);

      expect(response.body.ai_response).toMatch(/minimization/i);
      expect(response.body.manipulation_detected).toBe(true);
    });
  });

  describe('Conversation Timeout', () => {
    test('should timeout conversation after 10 minutes', async () => {
      // Create conversation
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'PATTERN_DETECTED',
          status: 'active',
          created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      // Run timeout check (simulating cron job)
      await request(app)
        .post('/api/ai/conversation/check-timeouts')
        .expect(200);

      // Verify conversation marked as timed out
      const { data: updated } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();

      expect(updated.status).toBe('completed');
      expect(updated.outcome).toBe('timed_out');
    });

    test('should notify guardian on timeout', async () => {
      const twilio = require('twilio');
      const mockCreate = twilio().messages.create;

      await supabase.from('guardians').insert({
        user_id: testUserId,
        name: 'Test Guardian',
        phone: '+61400000010',
        status: 'active',
      });

      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_ONLINE',
          status: 'active',
          created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      await request(app)
        .post('/api/ai/conversation/check-timeouts')
        .expect(200);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+61400000010',
          body: expect.stringContaining("didn't complete their AI check-in"),
        })
      );
    });
  });

  describe('Voice Transcription', () => {
    test('should transcribe voice message using Whisper', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'PAYMENT_REQUEST',
          status: 'active',
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/ai/conversation/${conversation.id}/voice`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', Buffer.from('fake_audio_data'), 'voice.mp3')
        .expect(200);

      expect(response.body.transcription).toBeDefined();
      expect(response.body.ai_response).toBeDefined();
    });

    test('should generate voice response using ElevenLabs', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_VENUE',
          status: 'active',
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "I went to Crown to meet a friend",
          request_voice_response: true,
        })
        .expect(200);

      expect(response.body.voice_url).toBeDefined();
      expect(response.body.voice_url).toMatch(/\.mp3$/);
    });
  });

  describe('Conversation Ending Conditions', () => {
    test('should end conversation on honest admission', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_ONLINE',
          status: 'active',
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "You're right. I gambled. I messed up. I'm sorry.",
        })
        .expect(200);

      expect(response.body.outcome).toBe('honest_admission');
      expect(response.body.conversation_ended).toBe(true);
    });

    test('should continue conversation on evasive responses', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'PATTERN_DETECTED',
          status: 'active',
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "I don't know what you're talking about",
        })
        .expect(200);

      expect(response.body.conversation_ended).toBe(false);
      expect(response.body.ai_response).toMatch(/evasive|try again/i);
    });

    test('should reset streak on gambling admission', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_VENUE',
          status: 'active',
        })
        .select()
        .single();

      await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: "Yes, I gambled at Crown. I relapsed.",
        })
        .expect(200);

      const { data: user } = await supabase
        .from('users')
        .select('current_streak_days, last_relapse_date')
        .eq('id', testUserId)
        .single();

      expect(user.current_streak_days).toBe(0);
      expect(user.last_relapse_date).toBeDefined();
    });
  });

  describe('Guardian Notification', () => {
    test('should notify guardian on critical conversations', async () => {
      const twilio = require('twilio');
      const mockCreate = twilio().messages.create;

      await supabase.from('guardians').insert({
        user_id: testUserId,
        name: 'Test Guardian',
        phone: '+61400000010',
        status: 'active',
      });

      await request(app)
        .post('/api/ai/conversation/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trigger_type: 'GAMBLING_ONLINE',
          transaction: {
            description: 'Sportsbet',
            amount: 500.00,
          },
        })
        .expect(201);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+61400000010',
          body: expect.stringContaining('high-risk pattern'),
        })
      );
    });

    test('should not send guardian amounts, only patterns', async () => {
      const twilio = require('twilio');
      const mockCreate = twilio().messages.create;

      await supabase.from('guardians').insert({
        user_id: testUserId,
        name: 'Test Guardian',
        phone: '+61400000010',
        status: 'active',
      });

      await request(app)
        .post('/api/ai/conversation/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trigger_type: 'PAYDAY_LOAN_DETECTED',
          transaction: {
            description: 'Beforepay',
            amount: 300.00,
          },
        })
        .expect(201);

      const smsBody = mockCreate.mock.calls[0][0].body;

      expect(smsBody).not.toContain('$300');
      expect(smsBody).not.toContain('300');
      expect(smsBody).toMatch(/payday loan/i);
    });
  });

  describe('Conversation State Management', () => {
    test('should track conversation duration', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'GAMBLING_ONLINE',
          status: 'active',
        })
        .select()
        .single();

      // Add messages
      await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: "It wasn't gambling" })
        .expect(200);

      await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: "Fine, I gambled" })
        .expect(200);

      const { data: updated } = await supabase
        .from('ai_conversations')
        .select('created_at, completed_at, message_count')
        .eq('id', conversation.id)
        .single();

      expect(updated.message_count).toBe(2);
      expect(updated.completed_at).toBeDefined();
    });

    test('should store conversation history', async () => {
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: testUserId,
          trigger_type: 'PATTERN_DETECTED',
          status: 'active',
        })
        .select()
        .single();

      await request(app)
        .post(`/api/ai/conversation/${conversation.id}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: "Test message" })
        .expect(200);

      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id);

      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario-Specific Prompts', () => {
    const scenarios = [
      { trigger: 'GAMBLING_ONLINE', expectedKeywords: ['online', 'sports betting'] },
      { trigger: 'GAMBLING_VENUE', expectedKeywords: ['casino', 'venue'] },
      { trigger: 'PAYDAY_LOAN_DETECTED', expectedKeywords: ['payday loan', '400%'] },
      { trigger: 'CRYPTO_EXCHANGE', expectedKeywords: ['crypto', 'offshore'] },
      { trigger: 'LATE_NIGHT_CASH', expectedKeywords: ['late night', 'cash withdrawal'] },
      { trigger: 'PATTERN_DETECTED', expectedKeywords: ['pattern', 'recurring'] },
      { trigger: 'ALLOWANCE_EXCEEDED', expectedKeywords: ['allowance', 'limit'] },
    ];

    scenarios.forEach(({ trigger, expectedKeywords }) => {
      test(`should use correct prompt for ${trigger}`, async () => {
        const response = await request(app)
          .post('/api/ai/conversation/trigger')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            trigger_type: trigger,
            transaction: { description: 'Test', amount: 100 },
          })
          .expect(201);

        const messageText = response.body.initial_message.toLowerCase();
        const hasKeyword = expectedKeywords.some(keyword => messageText.includes(keyword.toLowerCase()));

        expect(hasKeyword).toBe(true);
      });
    });
  });
});
