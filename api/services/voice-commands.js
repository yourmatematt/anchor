/**
 * Voice Command Processor
 *
 * Processes specific voice commands and maps them to actions.
 * Handles common intents and provides structured responses.
 *
 * Supported Commands:
 * - Balance/allowance queries
 * - Streak/clean days queries
 * - Payment requests
 * - Emergency/crisis help
 * - Guardian communication
 * - Pattern analysis
 * - Vault management
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Command Patterns
 */
const COMMAND_PATTERNS = {
  BALANCE: [
    /what'?s my (balance|allowance)/i,
    /how much (do i have|money)/i,
    /check (my )?balance/i,
    /show (my )?balance/i
  ],
  CLEAN_DAYS: [
    /how many (days )?clean/i,
    /what'?s my streak/i,
    /how long have i been clean/i,
    /check (my )?progress/i,
    /days without gambling/i
  ],
  PAYMENT_REQUEST: [
    /i need money for/i,
    /can i (have|get|access) money/i,
    /request (a )?payment/i,
    /unlock (my )?vault/i,
    /emergency (payment|money)/i
  ],
  EMERGENCY: [
    /emergency/i,
    /help me/i,
    /i'?m in crisis/i,
    /need (immediate )?help/i,
    /suicide|self-?harm/i
  ],
  GUARDIAN: [
    /talk to (my )?guardian/i,
    /contact (my )?guardian/i,
    /message (my )?guardian/i,
    /call (my )?guardian/i
  ],
  PATTERNS: [
    /what are my patterns/i,
    /gambling patterns/i,
    /show (my )?patterns/i,
    /analyze (my )?behavior/i
  ],
  VAULT_STATUS: [
    /vault status/i,
    /what'?s in my vault/i,
    /check (my )?vault/i,
    /how much (is )?locked/i
  ],
  MILESTONES: [
    /my milestones/i,
    /achievements/i,
    /rewards/i,
    /what have i (earned|achieved)/i
  ]
};

/**
 * Voice Command Processor Class
 */
class VoiceCommandProcessor {
  /**
   * Process voice command
   */
  async processCommand(userId, text) {
    const intent = this.detectIntent(text);

    switch (intent) {
      case 'BALANCE':
        return await this.handleBalanceQuery(userId);

      case 'CLEAN_DAYS':
        return await this.handleCleanDaysQuery(userId);

      case 'PAYMENT_REQUEST':
        return await this.handlePaymentRequest(userId, text);

      case 'EMERGENCY':
        return await this.handleEmergency(userId);

      case 'GUARDIAN':
        return await this.handleGuardianContact(userId, text);

      case 'PATTERNS':
        return await this.handlePatternsQuery(userId);

      case 'VAULT_STATUS':
        return await this.handleVaultStatus(userId);

      case 'MILESTONES':
        return await this.handleMilestonesQuery(userId);

      default:
        return {
          intent: 'UNKNOWN',
          requiresClaudeProcessing: true,
          message: "I'll help you with that."
        };
    }
  }

  /**
   * Detect intent from text
   */
  detectIntent(text) {
    for (const [intent, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return intent;
        }
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Handle balance query
   */
  async handleBalanceQuery(userId) {
    try {
      const { data: allowance } = await supabase
        .from('allowances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!allowance) {
        return {
          intent: 'BALANCE',
          success: false,
          message: "You don't have an active allowance set up yet. Would you like to create one?"
        };
      }

      const spent = await this.getSpentAmount(userId, allowance.period_start);
      const remaining = allowance.amount - spent;

      return {
        intent: 'BALANCE',
        success: true,
        data: {
          total: allowance.amount,
          spent,
          remaining,
          period: allowance.period
        },
        message: `You have $${remaining.toFixed(2)} remaining out of your $${allowance.amount} ${allowance.period} allowance. You've spent $${spent.toFixed(2)} so far.`,
        visualData: {
          type: 'balance',
          total: allowance.amount,
          spent,
          remaining
        }
      };
    } catch (error) {
      console.error('Balance query error:', error);
      return {
        intent: 'BALANCE',
        success: false,
        message: "Sorry, I couldn't fetch your balance right now."
      };
    }
  }

  /**
   * Handle clean days query
   */
  async handleCleanDaysQuery(userId) {
    try {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!progress) {
        return {
          intent: 'CLEAN_DAYS',
          success: false,
          message: "I couldn't find your progress data. Let's set that up."
        };
      }

      const { clean_days, current_streak, start_date } = progress;

      let message = `You've been clean for ${clean_days} days total! `;

      if (current_streak > 0) {
        message += `Your current streak is ${current_streak} days. `;

        // Add milestone context
        const nextMilestone = this.getNextMilestone(current_streak);
        if (nextMilestone) {
          const daysToGo = nextMilestone.days - current_streak;
          message += `You're ${daysToGo} days away from your ${nextMilestone.name} milestone!`;
        }
      } else {
        message += "Keep going, every day counts!";
      }

      return {
        intent: 'CLEAN_DAYS',
        success: true,
        data: {
          cleanDays: clean_days,
          currentStreak: current_streak,
          startDate: start_date
        },
        message,
        visualData: {
          type: 'progress',
          cleanDays: clean_days,
          currentStreak: current_streak
        }
      };
    } catch (error) {
      console.error('Clean days query error:', error);
      return {
        intent: 'CLEAN_DAYS',
        success: false,
        message: "Sorry, I couldn't fetch your progress right now."
      };
    }
  }

  /**
   * Handle payment request
   */
  async handlePaymentRequest(userId, text) {
    // Extract reason from text
    const reasonMatch = text.match(/for (.+)/i);
    const reason = reasonMatch ? reasonMatch[1] : 'unspecified';

    return {
      intent: 'PAYMENT_REQUEST',
      requiresGuardianApproval: true,
      data: {
        reason,
        timestamp: new Date().toISOString()
      },
      message: `I understand you need money for ${reason}. I'll need to notify your guardian for approval. Would you like me to send them a message?`,
      actions: [
        { type: 'create_payment_request', data: { reason } },
        { type: 'notify_guardian', data: { reason, urgent: false } }
      ]
    };
  }

  /**
   * Handle emergency
   */
  async handleEmergency(userId) {
    // Log emergency
    await supabase.from('crisis_events').insert({
      user_id: userId,
      event_type: 'voice_emergency',
      timestamp: new Date().toISOString()
    });

    return {
      intent: 'EMERGENCY',
      crisis: true,
      data: {
        lifelineNumber: '13 11 14',
        gamblingHelpNumber: '1800 858 858'
      },
      message: "I hear you need help. I'm connecting you with crisis support. Lifeline is available 24/7 at 13 11 14. Gambling Help is at 1800 858 858. Should I call your guardian too?",
      actions: [
        { type: 'show_crisis_resources', data: {} },
        { type: 'notify_guardian', data: { urgent: true } },
        { type: 'enable_emergency_unlock', data: {} }
      ]
    };
  }

  /**
   * Handle guardian contact
   */
  async handleGuardianContact(userId, text) {
    const { data: guardian } = await supabase
      .from('guardians')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!guardian) {
      return {
        intent: 'GUARDIAN',
        success: false,
        message: "You don't have a guardian set up yet. Would you like to add one?"
      };
    }

    // Extract message if present
    const messageMatch = text.match(/say (.+)/i);
    const message = messageMatch ? messageMatch[1] : null;

    return {
      intent: 'GUARDIAN',
      success: true,
      data: {
        guardianName: guardian.name,
        message
      },
      message: `I'll contact ${guardian.name} for you. ${message ? "I'll let them know: " + message : "What would you like me to tell them?"}`,
      actions: [
        { type: 'contact_guardian', data: { message } }
      ]
    };
  }

  /**
   * Handle patterns query
   */
  async handlePatternsQuery(userId) {
    try {
      // Get transaction patterns
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      const patterns = this.analyzePatterns(transactions);

      let message = "Here's what I've noticed about your gambling patterns: ";

      if (patterns.commonTimes.length > 0) {
        message += `You tend to gamble most often ${patterns.commonTimes.join(', ')}. `;
      }

      if (patterns.triggers.length > 0) {
        message += `Common triggers include ${patterns.triggers.join(', ')}. `;
      }

      if (patterns.averageAmount > 0) {
        message += `Your average gambling amount is $${patterns.averageAmount.toFixed(2)}. `;
      }

      return {
        intent: 'PATTERNS',
        success: true,
        data: patterns,
        message,
        visualData: {
          type: 'patterns',
          ...patterns
        }
      };
    } catch (error) {
      console.error('Patterns query error:', error);
      return {
        intent: 'PATTERNS',
        success: false,
        message: "I couldn't analyze your patterns right now."
      };
    }
  }

  /**
   * Handle vault status
   */
  async handleVaultStatus(userId) {
    try {
      const { data: vault } = await supabase
        .from('commitment_vaults')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'locked')
        .single();

      if (!vault) {
        return {
          intent: 'VAULT_STATUS',
          success: false,
          message: "You don't have an active vault. Would you like to create one?"
        };
      }

      const unlockDate = new Date(vault.unlock_date);
      const daysRemaining = Math.ceil((unlockDate - new Date()) / (1000 * 60 * 60 * 24));

      return {
        intent: 'VAULT_STATUS',
        success: true,
        data: {
          amount: vault.amount,
          unlockDate: vault.unlock_date,
          daysRemaining
        },
        message: `You have $${vault.amount} locked in your vault. It unlocks in ${daysRemaining} days on ${unlockDate.toLocaleDateString()}.`,
        visualData: {
          type: 'vault',
          amount: vault.amount,
          daysRemaining
        }
      };
    } catch (error) {
      console.error('Vault status error:', error);
      return {
        intent: 'VAULT_STATUS',
        success: false,
        message: "I couldn't check your vault status right now."
      };
    }
  }

  /**
   * Handle milestones query
   */
  async handleMilestonesQuery(userId) {
    try {
      const { data: rewards } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const earned = rewards.filter(r => r.status === 'issued' || r.status === 'redeemed');
      const pending = rewards.filter(r => r.status === 'pending');

      let message = '';

      if (earned.length > 0) {
        message += `You've earned ${earned.length} reward${earned.length > 1 ? 's' : ''}! `;
        const totalValue = earned.reduce((sum, r) => sum + r.reward_amount, 0);
        message += `That's $${totalValue} in total rewards. `;
      }

      if (pending.length > 0) {
        message += `You have ${pending.length} pending reward${pending.length > 1 ? 's' : ''} ready to claim. `;
      }

      if (earned.length === 0 && pending.length === 0) {
        message = "You're working towards your first milestone! Keep going!";
      }

      return {
        intent: 'MILESTONES',
        success: true,
        data: {
          earned: earned.length,
          pending: pending.length,
          rewards
        },
        message,
        actions: pending.length > 0 ? [{ type: 'show_rewards', data: {} }] : []
      };
    } catch (error) {
      console.error('Milestones query error:', error);
      return {
        intent: 'MILESTONES',
        success: false,
        message: "I couldn't fetch your milestones right now."
      };
    }
  }

  /**
   * Helper: Get spent amount
   */
  async getSpentAmount(userId, periodStart) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_whitelisted', false)
      .gte('timestamp', periodStart);

    return transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  }

  /**
   * Helper: Get next milestone
   */
  getNextMilestone(currentStreak) {
    const milestones = [
      { days: 30, name: '30-day' },
      { days: 90, name: '90-day' },
      { days: 180, name: '180-day' },
      { days: 365, name: '365-day' }
    ];

    return milestones.find(m => m.days > currentStreak);
  }

  /**
   * Helper: Analyze patterns
   */
  analyzePatterns(transactions) {
    // Time analysis
    const hourCounts = {};
    const dayOfWeekCounts = {};
    const amounts = [];

    transactions.forEach(t => {
      const date = new Date(t.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;

      amounts.push(Math.abs(parseFloat(t.amount)));
    });

    // Find common times
    const commonHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([hour]) => this.formatHour(parseInt(hour)));

    const commonDays = Object.entries(dayOfWeekCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([day]) => this.getDayName(parseInt(day)));

    const averageAmount = amounts.reduce((sum, a) => sum + a, 0) / (amounts.length || 1);

    return {
      commonTimes: [...commonHours, ...commonDays],
      triggers: [], // Would be populated by ML analysis
      averageAmount,
      frequency: transactions.length
    };
  }

  /**
   * Helper: Format hour
   */
  formatHour(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'late night';
  }

  /**
   * Helper: Get day name
   */
  getDayName(day) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }
}

// Export singleton instance
const voiceCommandProcessor = new VoiceCommandProcessor();

module.exports = {
  voiceCommandProcessor,
  VoiceCommandProcessor,
  COMMAND_PATTERNS
};
