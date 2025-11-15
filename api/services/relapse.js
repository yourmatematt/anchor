/**
 * Relapse Detection Service
 *
 * Detects when user relapses and sends notifications
 * A relapse occurs when:
 * 1. Payday loan detected (borrowing to gamble)
 * 2. Gambling transaction detected
 * 3. Clean streak is reset
 */

const { createClient } = require('@supabase/supabase-js');
const { notifyGuardian } = require('./guardian');
const { sendPushNotification } = require('./notifications');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Detect and handle relapse event
 *
 * @param {string} userId - User ID
 * @param {string} triggerType - What caused the relapse ('payday_loan', 'gambling_transaction', 'manual_reset')
 * @param {Object} details - Relapse details
 */
async function detectRelapse(userId, triggerType, details = {}) {
  try {
    // Get user's current clean streak
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('clean_since_date, days_clean_goal')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile || !profile.clean_since_date) {
      console.log('[Relapse] No clean streak to reset');
      return { relapsed: false };
    }

    // Calculate days that were clean before relapse
    const cleanDate = new Date(profile.clean_since_date);
    const today = new Date();
    const daysClean = Math.floor((today - cleanDate) / (1000 * 60 * 60 * 24));

    // Only count as relapse if they had at least 1 day clean
    if (daysClean < 1) {
      console.log('[Relapse] No meaningful streak to reset (< 1 day)');
      return { relapsed: false };
    }

    console.log(`[Relapse] DETECTED - ${daysClean} day streak ended`, {
      trigger: triggerType,
      details
    });

    // Reset clean_since_date to today
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        clean_since_date: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Relapse] Error resetting clean streak:', updateError);
    }

    // Get last conversation for context
    const { data: lastConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastConversationSummary = lastConversation
      ? `${lastConversation.conversation_type} conversation on ${new Date(lastConversation.created_at).toLocaleDateString()}`
      : 'No recent conversations';

    // Send push notification to user
    const userMessage = daysClean === 1
      ? `Your 1-day streak ended. That's okay. Start again today.`
      : daysClean < 7
      ? `You were ${daysClean} days clean. You've done it before. Start again.`
      : daysClean < 30
      ? `${daysClean} days clean. That's real progress. Don't throw it all away. Start again now.`
      : `You had ${daysClean} days. That proves you can do this. One slip doesn't erase that. Start again.`;

    await sendPushNotification(userId, {
      title: 'Clean Streak Reset',
      body: userMessage,
      data: {
        type: 'relapse',
        days_lost: daysClean,
        trigger: triggerType
      },
      priority: 'high',
      sound: 'default'
    });

    // Notify guardian
    await notifyGuardian(userId, {
      type: 'relapse',
      data: {
        days_clean: daysClean,
        trigger: formatTriggerDescription(triggerType, details),
        last_conversation_summary: lastConversationSummary
      }
    });

    // Log relapse event
    await supabase
      .from('interventions')
      .insert({
        user_id: userId,
        trigger_type: 'relapse',
        trigger_reason: `Clean streak of ${daysClean} days ended`,
        trigger_details: {
          relapse_trigger: triggerType,
          days_clean_lost: daysClean,
          ...details
        },
        severity: daysClean >= 30 ? 'high' : 'medium',
        status: 'completed',
        outcome: 'relapse',
        intervention_method: 'automatic'
      });

    return {
      relapsed: true,
      days_clean_lost: daysClean,
      trigger: triggerType
    };

  } catch (error) {
    console.error('[Relapse] Error detecting relapse:', error);
    return { relapsed: false, error: error.message };
  }
}

/**
 * Format trigger description for guardian notification
 */
function formatTriggerDescription(triggerType, details) {
  switch (triggerType) {
    case 'payday_loan':
      return `Payday loan: $${details.amount} from ${details.lender}`;
    case 'gambling_transaction':
      return `Gambling transaction: $${details.amount} to ${details.merchant}`;
    case 'manual_reset':
      return 'Manual streak reset';
    default:
      return triggerType;
  }
}

/**
 * Check if transaction is to a known gambling service
 */
function isGamblingMerchant(description) {
  if (!description) return false;

  const gamblingKeywords = [
    'bet', 'casino', 'poker', 'racing', 'sportsbet', 'ladbrokes',
    'unibet', 'pointsbet', 'neds', 'tab', 'slots', 'pokies',
    'coinspot', 'binance', 'crypto', 'btc', 'eth' // Crypto exchanges often used for gambling
  ];

  const descriptionLower = description.toLowerCase();

  return gamblingKeywords.some(keyword => descriptionLower.includes(keyword));
}

module.exports = {
  detectRelapse,
  isGamblingMerchant
};
