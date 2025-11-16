/**
 * Test Fixtures
 * Realistic test data for Anchor testing
 */

const crypto = require('crypto');

/**
 * Generate test user ID
 */
function generateUserId() {
  return crypto.randomUUID();
}

/**
 * Test Users
 */
const testUsers = {
  newUser: {
    name: 'Test User',
    email: 'test@anchor.test',
    phone: '+61400000001',
    date_of_birth: '1990-01-01',
    onboarding_completed: false,
  },

  activeUser: {
    name: 'Active User',
    email: 'active@anchor.test',
    phone: '+61400000002',
    date_of_birth: '1988-05-15',
    onboarding_completed: true,
    current_streak_days: 45,
    longest_streak_days: 60,
    vault_balance: 2500.00,
    commitment_end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    daily_allowance: 30,
    daily_allowance_used: 0,
    up_bank_token: 'test_up_bank_token_active',
  },

  relapsingUser: {
    name: 'Relapsing User',
    email: 'relapsing@anchor.test',
    phone: '+61400000003',
    date_of_birth: '1985-03-20',
    onboarding_completed: true,
    current_streak_days: 3,
    longest_streak_days: 120,
    vault_balance: 450.00,
    last_relapse_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    daily_allowance: 30,
    daily_allowance_used: 25,
    up_bank_token: 'test_up_bank_token_relapsing',
  },

  highRiskUser: {
    name: 'High Risk User',
    email: 'highrisk@anchor.test',
    phone: '+61400000004',
    date_of_birth: '1992-11-10',
    onboarding_completed: true,
    current_streak_days: 1,
    longest_streak_days: 7,
    vault_balance: 100.00,
    last_relapse_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    daily_allowance: 30,
    daily_allowance_used: 30,
    up_bank_token: 'test_up_bank_token_highrisk',
    known_triggers: ['friday_night', 'payday', 'bored_at_home'],
  },
};

/**
 * Test Guardians
 */
const testGuardians = {
  activeGuardian: {
    name: 'Active Guardian',
    phone: '+61400000010',
    relationship: 'partner',
    status: 'active',
  },

  pendingGuardian: {
    name: 'Pending Guardian',
    phone: '+61400000011',
    relationship: 'parent',
    status: 'pending',
  },
};

/**
 * Test Transactions (Up Bank format)
 */
const testTransactions = {
  gamblingOnline: {
    id: 'txn_gambling_online_001',
    attributes: {
      description: 'Sportsbet',
      message: 'Online sports betting',
      rawText: 'SPORTSBET.COM.AU',
      amount: {
        value: '-150.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  gamblingVenue: {
    id: 'txn_gambling_venue_001',
    attributes: {
      description: 'Crown Casino',
      message: 'ATM withdrawal',
      rawText: 'CROWN MELBOURNE',
      amount: {
        value: '-200.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  paydayLoan: {
    id: 'txn_payday_loan_001',
    attributes: {
      description: 'Beforepay',
      message: 'Wage advance',
      rawText: 'BEFOREPAY PTY LTD',
      amount: {
        value: '300.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  lateNightCash: {
    id: 'txn_late_night_cash_001',
    attributes: {
      description: 'ATM Withdrawal',
      message: 'Cash withdrawal',
      rawText: 'ATM WITHDRAWAL',
      amount: {
        value: '-100.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date(new Date().setHours(2, 30, 0, 0)).toISOString(), // 2:30am
      settledAt: new Date(new Date().setHours(2, 30, 0, 0)).toISOString(),
      status: 'SETTLED',
    },
  },

  cryptoPurchase: {
    id: 'txn_crypto_001',
    attributes: {
      description: 'CoinSpot',
      message: 'Cryptocurrency purchase',
      rawText: 'COINSPOT PTY LTD',
      amount: {
        value: '-500.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  legitimateGroceries: {
    id: 'txn_groceries_001',
    attributes: {
      description: 'Woolworths',
      message: 'Grocery shopping',
      rawText: 'WOOLWORTHS 1234',
      amount: {
        value: '-85.50',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  legitimateBill: {
    id: 'txn_bill_001',
    attributes: {
      description: 'Telstra',
      message: 'Phone bill',
      rawText: 'TELSTRA CORPORATION',
      amount: {
        value: '-79.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      status: 'SETTLED',
    },
  },

  roundNumberTransfer: {
    id: 'txn_round_transfer_001',
    attributes: {
      description: 'Transfer to John',
      message: 'Money transfer',
      rawText: 'TRANSFER TO JOHN SMITH',
      amount: {
        value: '-100.00',
        currencyCode: 'AUD',
      },
      createdAt: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(), // 8pm
      settledAt: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
      status: 'SETTLED',
    },
  },
};

/**
 * Test Patterns
 */
const testPatterns = {
  tuesdayPoker: {
    pattern_type: 'TUESDAY_POKER',
    severity: 'HIGH',
    confidence: 0.85,
    description: 'Recurring Tuesday night cash transfers followed by ATM withdrawals',
    indicators: {
      day_of_week: 'Tuesday',
      time_range: '19:00-23:00',
      transfer_pattern: 'Round number to same contact',
      atm_followup: true,
    },
  },

  paydayBinge: {
    pattern_type: 'PAYDAY_BINGE',
    severity: 'CRITICAL',
    confidence: 0.92,
    description: 'Large gambling transactions within 48 hours of payday',
    indicators: {
      payday_proximity: '< 48 hours',
      total_amount: 800,
      transaction_count: 5,
      escalating_amounts: true,
    },
  },

  lateNightEscalation: {
    pattern_type: 'LATE_NIGHT_ESCALATION',
    severity: 'HIGH',
    confidence: 0.78,
    description: 'Multiple cash withdrawals late at night with increasing amounts',
    indicators: {
      time_range: '22:00-04:00',
      withdrawal_count: 4,
      escalation_detected: true,
    },
  },
};

/**
 * Test AI Conversations
 */
const testConversations = {
  gamblingConfrontation: {
    trigger_type: 'GAMBLING_ONLINE',
    status: 'active',
    messages: [
      {
        role: 'assistant',
        content: "I can see you just spent $150 at Sportsbet. That's not a random transaction - you made a choice to gamble. Why?",
        timestamp: new Date().toISOString(),
      },
    ],
  },

  paydayLoanInterrogation: {
    trigger_type: 'PAYDAY_LOAN_DETECTED',
    status: 'active',
    messages: [
      {
        role: 'assistant',
        content: "You just took out a $300 payday loan from Beforepay. That's a 400% interest rate trap. What gambling debt are you trying to cover?",
        timestamp: new Date().toISOString(),
      },
    ],
  },

  manipulationAttempt: {
    trigger_type: 'PATTERN_DETECTED',
    status: 'active',
    messages: [
      {
        role: 'assistant',
        content: "I detected a pattern of Tuesday night transfers followed by cash withdrawals. This looks like your poker game. Talk to me.",
        timestamp: new Date().toISOString(),
      },
      {
        role: 'user',
        content: "It's just helping a mate out, it's not gambling I swear.",
        timestamp: new Date(Date.now() + 60000).toISOString(),
      },
      {
        role: 'assistant',
        content: "That's minimization - one of the tactics I'm trained to catch. 'Just helping a mate' at 9pm on a Tuesday with a round $100? Try again.",
        timestamp: new Date(Date.now() + 120000).toISOString(),
      },
    ],
  },
};

/**
 * Test Payment Requests
 */
const testPaymentRequests = {
  legitimateGroceries: {
    amount: 85.50,
    reason: 'Groceries at Woolworths',
    is_voice: false,
    status: 'pending',
  },

  suspiciousRoundAmount: {
    amount: 100.00,
    reason: 'Need cash for weekend',
    is_voice: false,
    status: 'pending',
  },

  emergencyMedical: {
    amount: 250.00,
    reason: 'Emergency doctor visit',
    is_voice: true,
    status: 'pending',
    voice_recording_url: 'https://example.com/recordings/emergency_001.mp3',
  },

  vagueRequest: {
    amount: 50.00,
    reason: 'Just need some money',
    is_voice: false,
    status: 'pending',
  },
};

/**
 * Test Webhooks
 */
const testWebhooks = {
  validSignature: (payload) => {
    const crypto = require('crypto');
    const secret = process.env.UP_BANK_WEBHOOK_SECRET || 'test_webhook_secret';
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  },

  invalidSignature: 'invalid_signature_12345',
};

/**
 * Test Onboarding Data
 */
const testOnboarding = {
  completeFlow: {
    step1: {
      name: 'Test User',
      phone: '+61400000001',
      email: 'test@anchor.test',
    },
    step2: {
      date_of_birth: '1990-01-01',
      commitment_length: 90,
    },
    step3: {
      guardian_name: 'Test Guardian',
      guardian_phone: '+61400000010',
      guardian_relationship: 'partner',
    },
    step4: {
      ai_interview_responses: {
        biggest_loss: 'Lost $15,000 in 3 months on online sports betting',
        rock_bottom: 'When I had to borrow money from my parents to pay rent',
        why_now: "I can't keep lying to everyone. I need real accountability",
        previous_attempts: 'Self-exclusion failed, gambling apps blocked but used VPN',
      },
    },
    step5: {
      up_bank_token: 'test_up_bank_token_onboarding',
      verified_savers: ['The Vault', 'Daily Allowance'],
    },
    step6: {
      whitelist: [
        { merchant: 'Woolworths', category: 'groceries' },
        { merchant: 'Coles', category: 'groceries' },
        { merchant: 'Telstra', category: 'bills' },
      ],
    },
    step7: {
      final_commitment: true,
      understands_no_cancellation: true,
      accepts_terms: true,
    },
  },
};

/**
 * Mock API Responses
 */
const mockResponses = {
  upBank: {
    validToken: {
      data: {
        type: 'accounts',
        id: 'acc_test_123',
        attributes: {
          displayName: 'The Vault',
          accountType: 'SAVER',
          balance: {
            currencyCode: 'AUD',
            value: '2500.00',
          },
        },
      },
    },

    invalidToken: {
      errors: [
        {
          status: '401',
          title: 'Invalid authentication credentials',
        },
      ],
    },

    transactions: {
      data: [testTransactions.gamblingOnline, testTransactions.legitimateGroceries],
      links: {
        next: null,
      },
    },
  },

  openAI: {
    chatCompletion: {
      id: 'chatcmpl_test_123',
      choices: [
        {
          message: {
            role: 'assistant',
            content: "I can see you just tried to request $100 for 'weekend cash'. That's vague, and round numbers are a red flag. What's the real reason?",
          },
          finish_reason: 'stop',
        },
      ],
    },

    whisperTranscription: {
      text: 'I need money for groceries and to pay my phone bill',
    },
  },

  twilio: {
    messageSent: {
      sid: 'SM_test_123',
      status: 'queued',
      to: '+61400000010',
    },

    messageFailed: {
      code: 21211,
      message: 'Invalid phone number',
    },
  },

  elevenLabs: {
    audioGenerated: Buffer.from('fake_audio_data'),
  },
};

/**
 * Test Database State
 */
const testDatabaseStates = {
  fresh: {
    users: [],
    guardians: [],
    transactions: [],
    patterns: [],
    conversations: [],
  },

  withActiveUser: {
    users: [testUsers.activeUser],
    guardians: [testGuardians.activeGuardian],
    transactions: [
      testTransactions.legitimateGroceries,
      testTransactions.legitimateBill,
    ],
    patterns: [],
    conversations: [],
  },

  withRelapsingUser: {
    users: [testUsers.relapsingUser],
    guardians: [testGuardians.activeGuardian],
    transactions: [
      testTransactions.gamblingOnline,
      testTransactions.lateNightCash,
    ],
    patterns: [testPatterns.lateNightEscalation],
    conversations: [testConversations.gamblingConfrontation],
  },
};

module.exports = {
  generateUserId,
  testUsers,
  testGuardians,
  testTransactions,
  testPatterns,
  testConversations,
  testPaymentRequests,
  testWebhooks,
  testOnboarding,
  mockResponses,
  testDatabaseStates,
};
