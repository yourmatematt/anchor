/**
 * Reward Distribution Engine
 *
 * Manages milestone-based reward distribution for Anchor users.
 * Non-gamified approach focusing on meaningful support and accountability.
 *
 * Milestone Structure:
 * - 30 days: $20 grocery voucher (essential support)
 * - 90 days: $50 utility credit (bill assistance)
 * - 180 days: $100 transport/fuel (mobility support)
 * - 365 days: $200 choice reward (flexibility and recognition)
 */

const { createClient } = require('@supabase/supabase-js');
const { partnerManager } = require('./partner-manager');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Milestone Definitions
 */
const MILESTONES = {
  MONTH_1: {
    id: 'month_1',
    days: 30,
    name: '30 Day Milestone',
    description: 'One month of progress',
    reward: {
      type: 'grocery_voucher',
      amount: 20,
      partners: ['woolworths', 'coles'],
      message: 'Congratulations on 30 days of progress! Here\'s a grocery voucher to support you.'
    }
  },
  MONTH_3: {
    id: 'month_3',
    days: 90,
    name: '90 Day Milestone',
    description: 'Three months of commitment',
    reward: {
      type: 'utility_credit',
      amount: 50,
      partners: ['energy_australia', 'agl', 'origin'],
      message: 'Amazing! 90 days of progress. This bill credit is to help ease your financial burden.'
    }
  },
  MONTH_6: {
    id: 'month_6',
    days: 180,
    name: '180 Day Milestone',
    description: 'Six months of dedication',
    reward: {
      type: 'transport_credit',
      amount: 100,
      partners: ['opal', 'myki', 'fuel_vouchers'],
      message: 'Half a year of commitment! Here\'s transport credit to help you keep moving forward.'
    }
  },
  YEAR_1: {
    id: 'year_1',
    days: 365,
    name: '365 Day Milestone',
    description: 'One full year of achievement',
    reward: {
      type: 'choice',
      amount: 200,
      partners: ['woolworths', 'coles', 'energy_australia', 'agl', 'origin', 'opal', 'myki'],
      message: 'Incredible! One full year of progress. Choose your reward - you\'ve earned it.'
    }
  }
};

/**
 * Reward Status
 */
const REWARD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  ISSUED: 'issued',
  REDEEMED: 'redeemed',
  EXPIRED: 'expired',
  FAILED: 'failed'
};

/**
 * Reward Distributor Class
 */
class RewardDistributor {
  /**
   * Check user milestones and distribute eligible rewards
   */
  async checkAndDistributeRewards(userId) {
    try {
      // Get user's clean days count
      const cleanDays = await this.getUserCleanDays(userId);

      console.log(`User ${userId} has ${cleanDays} clean days`);

      // Check each milestone
      const results = [];
      for (const [key, milestone] of Object.entries(MILESTONES)) {
        if (cleanDays >= milestone.days) {
          const result = await this.processMilestone(userId, milestone, cleanDays);
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking rewards:', error);
      throw error;
    }
  }

  /**
   * Get user's clean days count
   */
  async getUserCleanDays(userId) {
    // Query transactions to calculate clean days
    // A clean day is one where intervention was completed successfully
    // or where all transactions were whitelisted

    const { data, error } = await supabase
      .from('user_progress')
      .select('clean_days, start_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress record yet, create one
        return await this.initializeUserProgress(userId);
      }
      throw error;
    }

    return data.clean_days || 0;
  }

  /**
   * Initialize user progress tracking
   */
  async initializeUserProgress(userId) {
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        start_date: new Date().toISOString(),
        clean_days: 0,
        current_streak: 0
      })
      .select()
      .single();

    if (error) throw error;
    return 0;
  }

  /**
   * Process milestone and issue reward if eligible
   */
  async processMilestone(userId, milestone, cleanDays) {
    // Check if reward already issued for this milestone
    const existingReward = await this.getExistingReward(userId, milestone.id);

    if (existingReward) {
      console.log(`Reward already ${existingReward.status} for milestone ${milestone.id}`);
      return {
        milestone: milestone.id,
        status: existingReward.status,
        alreadyIssued: true
      };
    }

    // Issue the reward
    console.log(`Issuing ${milestone.id} reward for user ${userId}`);
    return await this.issueReward(userId, milestone);
  }

  /**
   * Check if reward already exists for this milestone
   */
  async getExistingReward(userId, milestoneId) {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('milestone_id', milestoneId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  /**
   * Issue reward to user
   */
  async issueReward(userId, milestone) {
    // Create reward record
    const { data: rewardRecord, error: recordError } = await supabase
      .from('rewards')
      .insert({
        user_id: userId,
        milestone_id: milestone.id,
        milestone_days: milestone.days,
        reward_type: milestone.reward.type,
        reward_amount: milestone.reward.amount,
        status: REWARD_STATUS.PENDING,
        eligible_partners: milestone.reward.partners,
        message: milestone.reward.message
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // For choice rewards, let user select partner
    if (milestone.reward.type === 'choice') {
      return {
        milestone: milestone.id,
        status: REWARD_STATUS.PENDING,
        requiresUserChoice: true,
        rewardId: rewardRecord.id,
        options: milestone.reward.partners,
        amount: milestone.reward.amount
      };
    }

    // Auto-issue for specific reward types
    return await this.distributeReward(rewardRecord.id, userId, milestone);
  }

  /**
   * Distribute the actual reward via partner integration
   */
  async distributeReward(rewardId, userId, milestone, selectedPartner = null) {
    try {
      // Update status to processing
      await this.updateRewardStatus(rewardId, REWARD_STATUS.PROCESSING);

      // Select partner (random from eligible list if not specified)
      const partnerId = selectedPartner || this.selectPartner(milestone.reward.partners);

      console.log(`Distributing ${milestone.reward.type} via ${partnerId}`);

      let distributionResult;

      // Distribute based on reward type
      switch (milestone.reward.type) {
        case 'grocery_voucher':
          distributionResult = await this.issueGroceryVoucher(
            partnerId,
            userId,
            milestone.reward.amount,
            milestone
          );
          break;

        case 'utility_credit':
          distributionResult = await this.issueUtilityCredit(
            partnerId,
            userId,
            milestone.reward.amount,
            milestone
          );
          break;

        case 'transport_credit':
          distributionResult = await this.issueTransportCredit(
            partnerId,
            userId,
            milestone.reward.amount,
            milestone
          );
          break;

        case 'choice':
          // For choice rewards, partner should be pre-selected
          if (!selectedPartner) {
            throw new Error('Partner must be selected for choice rewards');
          }
          distributionResult = await this.issueChoiceReward(
            partnerId,
            userId,
            milestone.reward.amount,
            milestone
          );
          break;

        default:
          throw new Error(`Unknown reward type: ${milestone.reward.type}`);
      }

      // Update reward record with distribution details
      await this.updateRewardDistribution(rewardId, partnerId, distributionResult);

      // Send notification to user
      await this.notifyUserOfReward(userId, milestone, distributionResult);

      return {
        milestone: milestone.id,
        status: REWARD_STATUS.ISSUED,
        partnerId,
        distributionResult,
        rewardId
      };

    } catch (error) {
      console.error('Reward distribution failed:', error);
      await this.updateRewardStatus(rewardId, REWARD_STATUS.FAILED, error.message);
      throw error;
    }
  }

  /**
   * Select partner from eligible list
   */
  selectPartner(eligiblePartners) {
    // For now, simple random selection
    // In production, could use load balancing, partner preferences, etc.
    return eligiblePartners[Math.floor(Math.random() * eligiblePartners.length)];
  }

  /**
   * Issue grocery voucher
   */
  async issueGroceryVoucher(partnerId, userId, amount, milestone) {
    const integration = await partnerManager.initializeIntegration(partnerId);
    const tokens = await partnerManager.getPartnerTokens(partnerId);

    const result = await integration.issueVoucher(tokens.access_token, {
      userId,
      amount,
      reason: milestone.id,
      metadata: {
        milestone: milestone.id,
        milestoneDay: milestone.days
      }
    });

    return result;
  }

  /**
   * Issue utility credit
   */
  async issueUtilityCredit(partnerId, userId, amount, milestone) {
    const integration = await partnerManager.initializeIntegration(partnerId);
    const tokens = await partnerManager.getPartnerTokens(partnerId);

    // Get user's linked utility account
    const accountNumber = await this.getUserUtilityAccount(userId, partnerId);

    if (!accountNumber) {
      throw new Error('No utility account linked for user');
    }

    const result = await integration.applyBillCredit(tokens.access_token, partnerId, {
      accountNumber,
      amount,
      reason: milestone.id,
      metadata: {
        userId,
        milestone: milestone.id,
        milestoneDay: milestone.days
      }
    });

    return result;
  }

  /**
   * Issue transport credit
   */
  async issueTransportCredit(partnerId, userId, amount, milestone) {
    const integration = await partnerManager.initializeIntegration(partnerId);
    const tokens = await partnerManager.getPartnerTokens(partnerId);

    // Check if fuel voucher or transport card
    if (partnerId === 'fuel_vouchers') {
      const result = await integration.issueFuelVoucher(tokens.access_token, {
        userId,
        amount,
        network: null, // Allow any network
        metadata: {
          milestone: milestone.id,
          milestoneDay: milestone.days
        }
      });
      return result;
    } else {
      // Opal or Myki - need linked card
      const cardNumber = await this.getUserTransportCard(userId, partnerId);

      if (!cardNumber) {
        throw new Error('No transport card linked for user');
      }

      const result = await integration.addTransportCredit(tokens.access_token, partnerId, {
        cardNumber,
        amount,
        reason: milestone.id,
        metadata: {
          userId,
          milestone: milestone.id,
          milestoneDay: milestone.days
        }
      });
      return result;
    }
  }

  /**
   * Issue choice reward (user has selected partner)
   */
  async issueChoiceReward(partnerId, userId, amount, milestone) {
    // Determine partner type and route accordingly
    const partnerConfig = await partnerManager.getPartnerConfig(partnerId);

    switch (partnerConfig.type) {
      case 'retail':
        return await this.issueGroceryVoucher(partnerId, userId, amount, milestone);

      case 'utility':
        return await this.issueUtilityCredit(partnerId, userId, amount, milestone);

      case 'transport':
        return await this.issueTransportCredit(partnerId, userId, amount, milestone);

      default:
        throw new Error(`Unsupported partner type: ${partnerConfig.type}`);
    }
  }

  /**
   * Get user's linked utility account
   */
  async getUserUtilityAccount(userId, partnerId) {
    const { data, error } = await supabase
      .from('user_partner_accounts')
      .select('account_number')
      .eq('user_id', userId)
      .eq('partner_id', partnerId)
      .eq('account_type', 'utility')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.account_number || null;
  }

  /**
   * Get user's linked transport card
   */
  async getUserTransportCard(userId, partnerId) {
    const { data, error } = await supabase
      .from('user_partner_accounts')
      .select('card_number')
      .eq('user_id', userId)
      .eq('partner_id', partnerId)
      .eq('account_type', 'transport')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.card_number || null;
  }

  /**
   * Update reward status
   */
  async updateRewardStatus(rewardId, status, errorMessage = null) {
    const { error } = await supabase
      .from('rewards')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId);

    if (error) throw error;
  }

  /**
   * Update reward with distribution details
   */
  async updateRewardDistribution(rewardId, partnerId, distributionResult) {
    const { error } = await supabase
      .from('rewards')
      .update({
        status: REWARD_STATUS.ISSUED,
        partner_used: partnerId,
        distribution_details: distributionResult,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId);

    if (error) throw error;
  }

  /**
   * Send notification to user about new reward
   */
  async notifyUserOfReward(userId, milestone, distributionResult) {
    // This would integrate with your notification system
    // For now, just log
    console.log(`Notifying user ${userId} of ${milestone.id} reward`, {
      milestone: milestone.name,
      message: milestone.reward.message,
      details: distributionResult
    });

    // In production, trigger push notification:
    // - Mobile app notification
    // - Email notification
    // - SMS notification (optional)
  }

  /**
   * Get user's reward history
   */
  async getUserRewards(userId) {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Update clean days count (called by daily cron job)
   */
  async updateUserCleanDays(userId) {
    // Check yesterday's transactions and interventions
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString());

    if (error) throw error;

    // Check if all transactions were either whitelisted or intervention completed
    const isCleanDay = transactions.every(tx =>
      tx.is_whitelisted || tx.intervention_completed
    );

    if (isCleanDay) {
      // Increment clean days
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          clean_days: supabase.sql`clean_days + 1`,
          current_streak: supabase.sql`current_streak + 1`,
          last_clean_day: yesterday.toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Check for new milestones
      await this.checkAndDistributeRewards(userId);
    } else {
      // Reset streak but keep total clean days
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          current_streak: 0
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }
  }
}

// Export singleton instance
const rewardDistributor = new RewardDistributor();

module.exports = {
  rewardDistributor,
  RewardDistributor,
  MILESTONES,
  REWARD_STATUS
};
