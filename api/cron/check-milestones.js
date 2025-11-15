/**
 * Clean Milestone Detection Cron
 *
 * Runs daily at 8am AEST
 * Checks if user has reached clean milestones (30, 60, 90 days)
 * Sends celebration notifications to user and guardian
 */

const { createClient } = require('@supabase/supabase-js');
const { USER_ID } = require('../config/constants');
const { notifyGuardian } = require('../services/guardian');
const { sendPushNotification } = require('../services/notifications');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Milestone thresholds
const MILESTONES = [30, 60, 90, 120, 180, 270, 365];

/**
 * Calculate days clean
 */
function calculateDaysClean(cleanSinceDate) {
  if (!cleanSinceDate) return 0;

  const cleanDate = new Date(cleanSinceDate);
  const today = new Date();
  const diffTime = today - cleanDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if milestone was already celebrated
 */
async function milestoneAlreadyCelebrated(userId, milestone) {
  const { data, error } = await supabase
    .from('guardian_notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'clean_milestone')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data) return false;

  // Check if this specific milestone was celebrated
  return data.some(notification => {
    const eventData = notification.event_data;
    return eventData && eventData.days === milestone;
  });
}

/**
 * Get vault balance (from Up Bank API)
 */
async function getVaultBalance() {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${process.env.UP_PERSONAL_ACCESS_TOKEN}`
      }
    });

    const result = await response.json();
    const vaultAccount = result.data.find(acc => acc.attributes.displayName === 'Vault');

    if (vaultAccount) {
      return parseFloat(vaultAccount.attributes.balance.value);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching vault balance:', error);
    return 0;
  }
}

/**
 * Calculate total saved (estimate based on gambling spend average)
 */
async function calculateTotalSaved(daysClean, userId) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('gambling_spend_average')
    .eq('user_id', userId)
    .single();

  if (!profile || !profile.gambling_spend_average) {
    return 0;
  }

  // Weekly gambling spend average * number of weeks clean
  const weeksClean = daysClean / 7;
  const totalSaved = profile.gambling_spend_average * weeksClean;

  return Math.round(totalSaved);
}

/**
 * Calculate debt paid down (check Easygo payments)
 */
async function calculateDebtPaid(cleanSinceDate) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('timestamp', cleanSinceDate)
    .eq('is_whitelisted', true);

  if (error || !transactions) return 0;

  // Sum up payments to debt payees (Easygo, etc.)
  const debtPayments = transactions.filter(txn => {
    const description = txn.payee_name?.toLowerCase() || '';
    return description.includes('easygo') || description.includes('loan');
  });

  const totalPaid = debtPayments.reduce((sum, txn) => {
    return sum + Math.abs(parseFloat(txn.amount));
  }, 0);

  return Math.round(totalPaid);
}

/**
 * Main cron handler
 */
export default async function handler(req, res) {
  // Verify this is a cron request from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Clean Milestone] Starting daily check...');

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', USER_ID)
      .single();

    if (profileError || !profile) {
      console.log('[Clean Milestone] No user profile found');
      return res.status(404).json({ error: 'User profile not found' });
    }

    const { clean_since_date } = profile;

    if (!clean_since_date) {
      console.log('[Clean Milestone] No clean_since_date set');
      return res.status(200).json({
        success: true,
        message: 'No clean streak to track'
      });
    }

    // Calculate days clean
    const daysClean = calculateDaysClean(clean_since_date);

    console.log(`[Clean Milestone] User is ${daysClean} days clean`);

    // Check if today is a milestone day
    const isMilestone = MILESTONES.includes(daysClean);

    if (!isMilestone) {
      console.log('[Clean Milestone] Not a milestone day');
      return res.status(200).json({
        success: true,
        days_clean: daysClean,
        message: 'Not a milestone day'
      });
    }

    // Check if this milestone was already celebrated
    if (await milestoneAlreadyCelebrated(USER_ID, daysClean)) {
      console.log(`[Clean Milestone] ${daysClean} day milestone already celebrated`);
      return res.status(200).json({
        success: true,
        days_clean: daysClean,
        message: 'Milestone already celebrated'
      });
    }

    // Calculate milestone stats
    const vaultBalance = await getVaultBalance();
    const totalSaved = await calculateTotalSaved(daysClean, USER_ID);
    const debtPaid = await calculateDebtPaid(clean_since_date);

    console.log(`[Clean Milestone] 🎉 ${daysClean} DAY MILESTONE!`, {
      vault_balance: vaultBalance,
      total_saved: totalSaved,
      debt_paid: debtPaid
    });

    // Send push notification to user
    const userMessage = daysClean === 30
      ? `🎉 30 DAYS CLEAN!\n\nYou've saved an estimated $${totalSaved}.\nVault: $${vaultBalance}\nDebt paid: $${debtPaid}\n\nKeep going. You're doing this.`
      : daysClean === 60
      ? `🔥 60 DAYS CLEAN!\n\nTwo months without gambling.\nSaved: $${totalSaved}\nVault: $${vaultBalance}\nDebt paid: $${debtPaid}\n\nHalfway to 90. Don't stop now.`
      : daysClean === 90
      ? `🏆 90 DAYS CLEAN!\n\nThree months. This is massive.\nSaved: $${totalSaved}\nVault: $${vaultBalance}\nDebt paid: $${debtPaid}\n\nYou've broken the cycle.`
      : `✨ ${daysClean} DAYS CLEAN!\n\nSaved: $${totalSaved}\nVault: $${vaultBalance}\nDebt paid: $${debtPaid}\n\nYou're crushing it.`;

    await sendPushNotification(USER_ID, {
      title: `🎉 ${daysClean} Days Clean!`,
      body: userMessage,
      data: {
        type: 'clean_milestone',
        days_clean: daysClean,
        total_saved: totalSaved,
        vault_balance: vaultBalance
      },
      priority: 'high',
      sound: 'default'
    });

    // Notify guardian
    await notifyGuardian(USER_ID, {
      type: 'clean_milestone',
      data: {
        days: daysClean,
        total_saved: totalSaved,
        vault_balance: vaultBalance,
        debt_paid: debtPaid
      }
    });

    console.log(`[Clean Milestone] Milestone celebration sent for ${daysClean} days`);

    return res.status(200).json({
      success: true,
      milestone: daysClean,
      days_clean: daysClean,
      stats: {
        total_saved: totalSaved,
        vault_balance: vaultBalance,
        debt_paid: debtPaid
      }
    });

  } catch (error) {
    console.error('[Clean Milestone] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
