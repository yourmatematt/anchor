/**
 * Integration Tests: Onboarding Flow
 * Tests complete user onboarding from welcome to final commitment
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../api/index');
const { testOnboarding, mockResponses, generateUserId } = require('../fixtures/test-data');

// Mock external services
jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue(mockResponses.twilio.messageSent),
    },
  })),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockResponses.openAI.chatCompletion),
      },
    },
  })),
}));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Onboarding Integration Tests', () => {
  let testUserId;
  let authToken;

  beforeEach(async () => {
    // Clean up test data
    testUserId = generateUserId();

    await supabase.from('users').delete().eq('email', testOnboarding.completeFlow.step1.email);
    await supabase.from('guardians').delete().eq('phone', testOnboarding.completeFlow.step3.guardian_phone);
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId);
      await supabase.from('guardians').delete().eq('user_id', testUserId);
    }
  });

  describe('Complete Onboarding Flow', () => {
    test('should complete full onboarding successfully', async () => {
      // Step 1: Create account
      const step1Response = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      expect(step1Response.body).toHaveProperty('userId');
      expect(step1Response.body).toHaveProperty('token');

      testUserId = step1Response.body.userId;
      authToken = step1Response.body.token;

      // Verify user created
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(user).toBeDefined();
      expect(user.name).toBe(testOnboarding.completeFlow.step1.name);
      expect(user.onboarding_completed).toBe(false);
      expect(user.current_streak_days).toBe(0);

      // Step 2: Invite guardian
      const step2Response = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step3)
        .expect(201);

      expect(step2Response.body).toHaveProperty('guardianId');
      expect(step2Response.body.status).toBe('pending');

      // Verify guardian invitation sent
      const { data: guardian } = await supabase
        .from('guardians')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(guardian).toBeDefined();
      expect(guardian.name).toBe(testOnboarding.completeFlow.step3.guardian_name);
      expect(guardian.status).toBe('pending');

      // Step 3: Connect Up Bank
      const step3Response = await request(app)
        .post('/api/user/onboard/up-bank')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          up_bank_token: testOnboarding.completeFlow.step5.up_bank_token,
        })
        .expect(200);

      expect(step3Response.body.success).toBe(true);

      // Verify Up Bank token stored securely
      const { data: updatedUser } = await supabase
        .from('users')
        .select('up_bank_token')
        .eq('id', testUserId)
        .single();

      expect(updatedUser.up_bank_token).toBe(testOnboarding.completeFlow.step5.up_bank_token);

      // Step 4: Complete onboarding
      const step4Response = await request(app)
        .post('/api/user/onboard/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whitelist: testOnboarding.completeFlow.step6.whitelist,
          commitment_confirmed: true,
        })
        .expect(200);

      expect(step4Response.body.onboarding_completed).toBe(true);

      // Verify onboarding marked complete
      const { data: finalUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(finalUser.onboarding_completed).toBe(true);
      expect(finalUser.commitment_end_date).toBeDefined();
      expect(finalUser.vault_balance).toBe(0);
      expect(finalUser.daily_allowance).toBe(30);
    });

    test('should reject onboarding without guardian', async () => {
      const response = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
          skip_guardian: true,
        })
        .expect(400);

      expect(response.body.error).toMatch(/guardian.*required/i);
    });

    test('should reject invalid Up Bank token', async () => {
      // Create user first
      const onboardResponse = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      authToken = onboardResponse.body.token;
      testUserId = onboardResponse.body.userId;

      // Try to connect with invalid token
      const response = await request(app)
        .post('/api/user/onboard/up-bank')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          up_bank_token: 'invalid_token',
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*up bank.*token/i);
    });

    test('should verify Vault and Allowance savers exist', async () => {
      // Create user
      const onboardResponse = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      authToken = onboardResponse.body.token;
      testUserId = onboardResponse.body.userId;

      // Connect Up Bank
      const upBankResponse = await request(app)
        .post('/api/user/onboard/up-bank')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          up_bank_token: testOnboarding.completeFlow.step5.up_bank_token,
        })
        .expect(200);

      expect(upBankResponse.body.verified_savers).toContain('The Vault');
      expect(upBankResponse.body.verified_savers).toContain('Daily Allowance');
    });
  });

  describe('Guardian Invitation', () => {
    beforeEach(async () => {
      // Create test user
      const response = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      testUserId = response.body.userId;
      authToken = response.body.token;
    });

    test('should send SMS invitation to guardian', async () => {
      const twilio = require('twilio');
      const mockCreate = twilio().messages.create;

      await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step3)
        .expect(201);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testOnboarding.completeFlow.step3.guardian_phone,
          body: expect.stringContaining('ANCHOR'),
        })
      );
    });

    test('should generate unique guardian invite token', async () => {
      const response = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step3)
        .expect(201);

      const { data: guardian } = await supabase
        .from('guardians')
        .select('invite_token')
        .eq('id', response.body.guardianId)
        .single();

      expect(guardian.invite_token).toBeDefined();
      expect(guardian.invite_token.length).toBeGreaterThan(20);
    });

    test('should accept guardian invitation with valid token', async () => {
      // Create invitation
      const inviteResponse = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step3)
        .expect(201);

      // Get invite token
      const { data: guardian } = await supabase
        .from('guardians')
        .select('invite_token')
        .eq('id', inviteResponse.body.guardianId)
        .single();

      // Accept invitation
      const acceptResponse = await request(app)
        .post('/api/guardian/accept')
        .send({
          token: guardian.invite_token,
        })
        .expect(200);

      expect(acceptResponse.body.status).toBe('active');

      // Verify guardian activated
      const { data: updatedGuardian } = await supabase
        .from('guardians')
        .select('status')
        .eq('id', inviteResponse.body.guardianId)
        .single();

      expect(updatedGuardian.status).toBe('active');
    });

    test('should reject expired guardian invitation', async () => {
      // Create invitation
      const inviteResponse = await request(app)
        .post('/api/guardian/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step3)
        .expect(201);

      // Manually expire the invitation (7+ days old)
      const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('guardians')
        .update({ created_at: expiredDate })
        .eq('id', inviteResponse.body.guardianId);

      // Get invite token
      const { data: guardian } = await supabase
        .from('guardians')
        .select('invite_token')
        .eq('id', inviteResponse.body.guardianId)
        .single();

      // Try to accept expired invitation
      const response = await request(app)
        .post('/api/guardian/accept')
        .send({
          token: guardian.invite_token,
        })
        .expect(400);

      expect(response.body.error).toMatch(/expired/i);
    });
  });

  describe('AI Interview', () => {
    beforeEach(async () => {
      // Create test user
      const response = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      testUserId = response.body.userId;
      authToken = response.body.token;
    });

    test('should store AI interview responses', async () => {
      const response = await request(app)
        .post('/api/user/onboard/ai-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOnboarding.completeFlow.step4.ai_interview_responses)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify responses stored
      const { data: user } = await supabase
        .from('users')
        .select('ai_interview_responses')
        .eq('id', testUserId)
        .single();

      expect(user.ai_interview_responses).toBeDefined();
      expect(user.ai_interview_responses.biggest_loss).toBe(
        testOnboarding.completeFlow.step4.ai_interview_responses.biggest_loss
      );
    });

    test('should reject incomplete AI interview', async () => {
      const response = await request(app)
        .post('/api/user/onboard/ai-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          biggest_loss: 'Lost some money',
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.error).toMatch(/incomplete.*interview/i);
    });
  });

  describe('Commitment Lock-in', () => {
    beforeEach(async () => {
      // Create fully onboarded user
      const onboardResponse = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      testUserId = onboardResponse.body.userId;
      authToken = onboardResponse.body.token;

      // Complete onboarding
      await request(app)
        .post('/api/user/onboard/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whitelist: testOnboarding.completeFlow.step6.whitelist,
          commitment_confirmed: true,
        })
        .expect(200);
    });

    test('should prevent commitment cancellation', async () => {
      const response = await request(app)
        .post('/api/user/cancel-commitment')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toMatch(/cannot.*cancel.*commitment/i);
    });

    test('should calculate correct commitment end date', async () => {
      const { data: user } = await supabase
        .from('users')
        .select('commitment_end_date, created_at')
        .eq('id', testUserId)
        .single();

      const created = new Date(user.created_at);
      const endDate = new Date(user.commitment_end_date);
      const diffDays = Math.round((endDate - created) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(testOnboarding.completeFlow.step2.commitment_length);
    });

    test('should lock commitment period to minimum 90 days', async () => {
      const { data: user } = await supabase
        .from('users')
        .select('commitment_end_date, created_at')
        .eq('id', testUserId)
        .single();

      const created = new Date(user.created_at);
      const endDate = new Date(user.commitment_end_date);
      const diffDays = Math.round((endDate - created) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Whitelist Configuration', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/user/onboard')
        .send({
          ...testOnboarding.completeFlow.step1,
          ...testOnboarding.completeFlow.step2,
        })
        .expect(201);

      testUserId = response.body.userId;
      authToken = response.body.token;
    });

    test('should store whitelist configuration', async () => {
      await request(app)
        .post('/api/user/onboard/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whitelist: testOnboarding.completeFlow.step6.whitelist,
          commitment_confirmed: true,
        })
        .expect(200);

      const { data: whitelist } = await supabase
        .from('bills_whitelist')
        .select('*')
        .eq('user_id', testUserId);

      expect(whitelist.length).toBe(testOnboarding.completeFlow.step6.whitelist.length);
      expect(whitelist[0].merchant).toBe('Woolworths');
    });

    test('should reject gambling merchants in whitelist', async () => {
      const response = await request(app)
        .post('/api/user/onboard/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whitelist: [
            { merchant: 'Sportsbet', category: 'entertainment' },
          ],
          commitment_confirmed: true,
        })
        .expect(400);

      expect(response.body.error).toMatch(/gambling.*merchant.*not allowed/i);
    });
  });
});
