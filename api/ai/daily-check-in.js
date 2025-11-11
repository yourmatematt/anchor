/**
 * Daily Check-in Endpoint
 *
 * Proactive daily conversation with user
 * Reviews yesterday's activity, asks how they're doing, offers guidance
 */

const { createClient } = require('@supabase/supabase-js');
const { getAIResponse } = require('../services/claude');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Main handler for daily check-in
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      time_of_day // 'morning' or 'evening'
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get yesterday's transactions
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdayTransactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('timestamp', yesterdayStr)
      .lt('timestamp', new Date().toISOString().split('T')[0])
      .order('timestamp', { ascending: false });

    // Get days clean
    const { data: cleanStreak } = await supabase
      .from('user_clean_streak')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get savings progress (if applicable)
    let savingsProgress = null;
    if (userProfile.vault_account_id) {
      // TODO: Fetch from Up Bank API
      // For now, use placeholder
      savingsProgress = {
        current: 0,
        goal: userProfile.savings_goal_amount || 0
      };
    }

    // Build context message for AI
    let contextMessage = '';
    if (time_of_day === 'morning') {
      contextMessage = `Morning check-in. User has been clean for ${cleanStreak?.days_clean || 0} days. `;
      if (yesterdayTransactions && yesterdayTransactions.length > 0) {
        const nonWhitelisted = yesterdayTransactions.filter(t => !t.is_whitelisted);
        if (nonWhitelisted.length > 0) {
          contextMessage += `Yesterday they had ${nonWhitelisted.length} non-whitelisted transactions. `;
        } else {
          contextMessage += `Yesterday was clean - all transactions whitelisted. `;
        }
      }
      contextMessage += 'Ask how they\'re feeling and set a positive tone for the day.';
    } else {
      // Evening check-in
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', new Date().toISOString().split('T')[0])
        .order('timestamp', { ascending: false });

      contextMessage = `Evening check-in. User has been clean for ${cleanStreak?.days_clean || 0} days. `;
      if (todayTransactions && todayTransactions.length > 0) {
        const nonWhitelisted = todayTransactions.filter(t => !t.is_whitelisted);
        if (nonWhitelisted.length > 0) {
          contextMessage += `Today they had ${nonWhitelisted.length} non-whitelisted transactions. Review their day.`;
        } else {
          contextMessage += `Today was clean. Acknowledge their success.`;
        }
      }
    }

    // Get AI check-in message
    const aiResponse = await getAIResponse({
      conversationType: 'check_in',
      conversationHistory: [],
      userMessage: contextMessage,
      context: {
        userProfile,
        yesterdayTransactions: yesterdayTransactions || [],
        daysClean: cleanStreak?.days_clean || 0,
        savingsProgress
      }
    });

    // Create conversation record
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id,
        conversation_type: 'check_in',
        messages: [
          {
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
          }
        ],
        trigger_context: {
          time_of_day,
          days_clean: cleanStreak?.days_clean || 0,
          transaction_count: yesterdayTransactions?.length || 0
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating check-in conversation:', convError);
    }

    return res.status(200).json({
      conversation_id: conversation?.id,
      message: aiResponse,
      days_clean: cleanStreak?.days_clean || 0,
      savings_progress: savingsProgress
    });

  } catch (error) {
    console.error('Daily check-in error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
