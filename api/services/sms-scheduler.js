/**
 * SMS Scheduler Service
 *
 * Handles scheduled SMS communications:
 * - Daily check-ins (6am)
 * - Weekly reports (Sunday 6pm)
 * - Monthly commitment countdowns
 * - Contextual high-risk warnings
 * - Emergency protocol notifications
 */

const CommunicationEngine = require('./communication-engine');

class SMSScheduler {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.commEngine = new CommunicationEngine(supabaseClient);
  }

  /**
   * Send daily check-in to all active users (6am local time)
   */
  async sendDailyCheckIns() {
    try {
      console.log('Starting daily check-ins...');

      // Get all active users with commitments
      const { data: users } = await this.supabase
        .from('users')
        .select('id, phone, commitment_start, commitment_days, daily_allowance')
        .not('commitment_start', 'is', null)
        .not('phone', 'is', null);

      if (!users || users.length === 0) {
        console.log('No active users for daily check-ins');
        return;
      }

      let sent = 0;
      let skipped = 0;

      for (const user of users) {
        // Calculate clean streak
        const cleanStreak = await this._calculateCleanStreak(user.id);

        // Calculate total saved
        const savedTotal = await this._calculateSaved(user.id);

        try {
          await this.commEngine.sendUserSMS(user.id, 'DAILY_CHECKIN', {
            cleanStreak,
            savedTotal: savedTotal.toFixed(2)
          });

          sent++;
        } catch (error) {
          console.error(`Failed to send daily check-in to user ${user.id}:`, error);
          skipped++;
        }

        // Rate limiting
        await this._sleep(100);
      }

      console.log(`Daily check-ins complete: ${sent} sent, ${skipped} skipped`);

      return { sent, skipped };
    } catch (error) {
      console.error('Error sending daily check-ins:', error);
      throw error;
    }
  }

  /**
   * Send allowance reset confirmations (6am local time)
   */
  async sendAllowanceResets() {
    try {
      console.log('Starting allowance reset notifications...');

      const { data: users } = await this.supabase
        .from('users')
        .select('id, phone, daily_allowance')
        .not('daily_allowance', 'is', null)
        .not('phone', 'is', null);

      if (!users || users.length === 0) {
        return;
      }

      let sent = 0;

      for (const user of users) {
        const cleanStreak = await this._calculateCleanStreak(user.id);

        try {
          await this.commEngine.sendUserSMS(user.id, 'ALLOWANCE_RESET', {
            dailyAllowance: user.daily_allowance,
            cleanStreak
          });

          sent++;
        } catch (error) {
          console.error(`Failed to send allowance reset to user ${user.id}:`, error);
        }

        await this._sleep(100);
      }

      console.log(`Allowance resets sent: ${sent}`);

      return { sent };
    } catch (error) {
      console.error('Error sending allowance resets:', error);
      throw error;
    }
  }

  /**
   * Send weekly reports (Sunday 6pm)
   */
  async sendWeeklyReports() {
    try {
      console.log('Starting weekly reports...');

      const { data: users } = await this.supabase
        .from('users')
        .select('id, email, phone')
        .not('email', 'is', null);

      if (!users || users.length === 0) {
        return;
      }

      let sent = 0;

      for (const user of users) {
        // Calculate weekly stats
        const weekStats = await this._calculateWeekStats(user.id);

        // Send SMS summary
        if (user.phone) {
          try {
            await this.commEngine.sendUserSMS(user.id, 'WEEKLY_SUMMARY', {
              weekNumber: weekStats.weekNumber,
              cleanDays: weekStats.cleanDays,
              savedWeek: weekStats.savedWeek.toFixed(2)
            });
          } catch (error) {
            console.error(`Failed to send weekly SMS to user ${user.id}:`, error);
          }
        }

        // Send detailed email report
        if (user.email) {
          try {
            await this.commEngine.sendUserEmail(user.id, 'WEEKLY_REPORT', weekStats);
            sent++;
          } catch (error) {
            console.error(`Failed to send weekly email to user ${user.id}:`, error);
          }
        }

        await this._sleep(200);
      }

      console.log(`Weekly reports sent: ${sent}`);

      return { sent };
    } catch (error) {
      console.error('Error sending weekly reports:', error);
      throw error;
    }
  }

  /**
   * Send high-risk warnings (contextual based on patterns)
   */
  async sendHighRiskWarnings() {
    try {
      console.log('Checking for high-risk situations...');

      const { data: users } = await this.supabase
        .from('users')
        .select('id, phone')
        .not('phone', 'is', null);

      if (!users || users.length === 0) {
        return;
      }

      let sent = 0;

      const now = new Date();
      const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      const currentHour = now.getHours();

      for (const user of users) {
        // Get user's high-risk patterns
        const riskPatterns = await this._getHighRiskPatterns(user.id);

        // Check if current time matches any high-risk pattern
        for (const pattern of riskPatterns) {
          if (this._matchesPattern(pattern, currentDay, currentHour)) {
            try {
              // Send warning
              await this.commEngine.sendUserSMS(user.id, 'HIGH_RISK_WARNING', {
                day: currentDay,
                time: `${currentHour}:00`,
                pattern: pattern.name
              });

              // Notify guardian
              const { data: guardians } = await this.supabase
                .from('guardians')
                .select('id, phone, name')
                .eq('user_id', user.id)
                .not('phone', 'is', null);

              if (guardians && guardians.length > 0) {
                for (const guardian of guardians) {
                  await this.commEngine.sendGuardianSMS(
                    user.id,
                    guardian.id,
                    'HIGH_RISK_ALERT',
                    {
                      userName: 'User', // TODO: Get actual name
                      trigger: pattern.name
                    }
                  );
                }
              }

              sent++;
            } catch (error) {
              console.error(`Failed to send high-risk warning to user ${user.id}:`, error);
            }

            await this._sleep(200);
          }
        }
      }

      console.log(`High-risk warnings sent: ${sent}`);

      return { sent };
    } catch (error) {
      console.error('Error sending high-risk warnings:', error);
      throw error;
    }
  }

  /**
   * Send payday reminders (checks for payday patterns)
   */
  async sendPaydayReminders() {
    try {
      console.log('Checking for payday situations...');

      const { data: users } = await this.supabase
        .from('users')
        .select('id, phone, daily_allowance')
        .not('phone', 'is', null);

      if (!users || users.length === 0) {
        return;
      }

      const now = new Date();
      const dayOfMonth = now.getDate();

      // Check if it's typical payday (15th or last day of month)
      const isPayday = dayOfMonth === 15 || dayOfMonth >= 28 || dayOfMonth <= 2;

      if (!isPayday) {
        return;
      }

      let sent = 0;

      for (const user of users) {
        // Check if user has payday gambling pattern
        const hasPaydayPattern = await this._hasPaydayPattern(user.id);

        if (hasPaydayPattern) {
          try {
            await this.commEngine.sendUserSMS(user.id, 'PAYDAY_REMINDER', {
              dailyAllowance: user.daily_allowance
            });

            sent++;
          } catch (error) {
            console.error(`Failed to send payday reminder to user ${user.id}:`, error);
          }

          await this._sleep(100);
        }
      }

      console.log(`Payday reminders sent: ${sent}`);

      return { sent };
    } catch (error) {
      console.error('Error sending payday reminders:', error);
      throw error;
    }
  }

  /**
   * Send commitment countdown reminders
   */
  async sendCommitmentReminders() {
    try {
      console.log('Checking commitment expiration...');

      const { data: users } = await this.supabase
        .from('users')
        .select('id, phone, commitment_start, commitment_days')
        .not('commitment_start', 'is', null)
        .not('phone', 'is', null);

      if (!users || users.length === 0) {
        return;
      }

      let sent = 0;
      const now = new Date();

      for (const user of users) {
        const startDate = new Date(user.commitment_start);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + user.commitment_days);

        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Send reminder at 7, 3, and 1 day(s) before expiration
        if ([7, 3, 1].includes(daysLeft)) {
          const savedTotal = await this._calculateSaved(user.id);

          try {
            await this.commEngine.sendUserSMS(user.id, 'COMMITMENT_ENDING', {
              daysLeft,
              savedTotal: savedTotal.toFixed(2)
            });

            sent++;
          } catch (error) {
            console.error(`Failed to send commitment reminder to user ${user.id}:`, error);
          }

          await this._sleep(100);
        }
      }

      console.log(`Commitment reminders sent: ${sent}`);

      return { sent };
    } catch (error) {
      console.error('Error sending commitment reminders:', error);
      throw error;
    }
  }

  /**
   * Calculate clean streak for user
   */
  async _calculateCleanStreak(userId) {
    // TODO: Implement proper streak calculation from transactions
    // For now, calculate days since commitment start
    const { data: user } = await this.supabase
      .from('users')
      .select('commitment_start')
      .eq('id', userId)
      .single();

    if (!user || !user.commitment_start) {
      return 0;
    }

    const start = new Date(user.commitment_start);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));

    return days;
  }

  /**
   * Calculate total money saved
   */
  async _calculateSaved(userId) {
    // TODO: Implement proper savings calculation from baseline
    // For now, estimate based on clean days
    const cleanDays = await this._calculateCleanStreak(userId);
    const estimatedDailySaving = 50; // $50/day average

    return cleanDays * estimatedDailySaving;
  }

  /**
   * Calculate weekly statistics
   */
  async _calculateWeekStats(userId) {
    // TODO: Implement proper weekly stats calculation
    const cleanStreak = await this._calculateCleanStreak(userId);
    const weekNumber = Math.ceil(cleanStreak / 7);

    return {
      weekNumber,
      cleanDays: 7, // TODO: Calculate actual clean days this week
      cleanPercentage: 100,
      savedWeek: 350, // TODO: Calculate actual savings
      savedTotal: await this._calculateSaved(userId),
      totalDays: cleanStreak,
      totalTransactions: 0,
      interventions: 0,
      guardianMessages: 0,
      relapses: 0,
      triggers: [],
      improvements: [],
      concerns: [],
      commitmentDaysRemaining: 30, // TODO: Calculate from commitment
      upcomingRisks: []
    };
  }

  /**
   * Get user's high-risk patterns
   */
  async _getHighRiskPatterns(userId) {
    // TODO: Get from pattern analysis
    return [
      { name: 'Tuesday evening', day: 'Tuesday', hours: [18, 19, 20, 21] },
      { name: 'Friday night', day: 'Friday', hours: [20, 21, 22, 23] }
    ];
  }

  /**
   * Check if current time matches pattern
   */
  _matchesPattern(pattern, currentDay, currentHour) {
    return pattern.day === currentDay && pattern.hours.includes(currentHour);
  }

  /**
   * Check if user has payday gambling pattern
   */
  async _hasPaydayPattern(userId) {
    // TODO: Check from pattern analysis
    // For now, assume all users have payday risk
    return true;
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SMSScheduler;
