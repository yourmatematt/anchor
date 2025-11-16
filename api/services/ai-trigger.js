/**
 * AI Trigger Service for Anchor
 *
 * Creates AI conversation triggers and sends push notifications
 * to mobile app when intervention is required
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Create AI conversation trigger in database
 * This will be picked up by the mobile app to force a conversation
 */
async function createAIConversation(userId, pattern, transactionId) {
  const conversationData = {
    user_id: userId,
    transaction_id: transactionId,
    trigger_type: pattern.pattern,
    trigger_reason: pattern.message,
    ai_context: pattern.aiContext || {},
    status: 'pending', // pending, in_progress, completed, abandoned
    is_unavoidable: true, // User cannot dismiss this conversation
    created_at: new Date().toISOString(),
    // Pre-load AI questions based on pattern
    suggested_questions: pattern.aiContext?.questions || [],
  };

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating AI conversation:', error);
    throw new Error(`Failed to create AI conversation: ${error.message}`);
  }

  console.log('AI conversation created:', {
    id: data.id,
    userId: userId,
    trigger: pattern.pattern,
  });

  return data;
}

/**
 * Send push notification to mobile app via Expo
 * This triggers the Alert Screen immediately
 */
async function sendPushNotification(userId, pattern, transactionId, conversationId) {
  // Get user's push token from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('push_token, name')
    .eq('id', userId)
    .single();

  if (userError || !user?.push_token) {
    console.warn('No push token found for user:', userId);
    return null;
  }

  const pushToken = user.push_token;

  // Prepare notification based on pattern type
  const notification = buildNotificationContent(pattern, transactionId);

  // Send via Expo Push API
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          type: 'INTERVENTION_REQUIRED',
          conversationId: conversationId,
          transactionId: transactionId,
          pattern: pattern.pattern,
          triggerType: pattern.pattern.toLowerCase(),
        },
        priority: 'high',
        badge: 1,
        channelId: 'interventions', // Android notification channel
        categoryId: 'intervention', // iOS notification category
      }),
    });

    const result = await response.json();

    if (result.data?.status === 'error') {
      console.error('Push notification error:', result.data);
      return null;
    }

    console.log('Push notification sent:', {
      userId: userId,
      pushToken: pushToken.substring(0, 20) + '...',
      status: result.data?.status,
    });

    return result.data;

  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
}

/**
 * Build notification content based on pattern type
 */
function buildNotificationContent(pattern, transactionId) {
  const patternMessages = {
    PAYDAY_LOAN: {
      title: '🚨 PAYDAY LOAN DETECTED',
      body: `Mate, you just took a payday loan. We need to talk NOW.`,
    },
    GAMBLING_VENUE: {
      title: '🚨 GAMBLING DETECTED',
      body: `Transaction at ${pattern.venue || 'gambling venue'}. What happened?`,
    },
    CRYPTO_EXCHANGE: {
      title: '🚨 CRYPTO TRANSACTION',
      body: `Crypto detected. Why are you buying crypto right now?`,
    },
    CASH_WITHDRAWAL: {
      title: '⚠️ CASH WITHDRAWAL',
      body: `You just withdrew $${pattern.amount}. What's this for?`,
    },
    SUSPICIOUS_TRANSFER: {
      title: '⚠️ SUSPICIOUS TRANSFER',
      body: `Transfer flagged: $${pattern.amount}. Let's talk about this.`,
    },
    MULTIPLE_WITHDRAWALS: {
      title: '🚨 MULTIPLE WITHDRAWALS',
      body: `${pattern.count} withdrawals today. This looks like a pattern.`,
    },
    SUSPICIOUS_LOAN: {
      title: '⚠️ SUSPICIOUS TRANSACTION',
      body: `Loan-like transaction detected. Need to check this with you.`,
    },
  };

  return patternMessages[pattern.pattern] || {
    title: '⚠️ ANCHOR ALERT',
    body: 'Transaction requires your attention.',
  };
}

/**
 * Update conversation status
 */
async function updateConversationStatus(conversationId, status, metadata = {}) {
  const updateData = {
    status: status,
    updated_at: new Date().toISOString(),
    ...metadata,
  };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update(updateData)
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversation status:', error);
    throw new Error(`Failed to update conversation: ${error.message}`);
  }

  return data;
}

/**
 * Add message to conversation
 */
async function addConversationMessage(conversationId, role, content, metadata = {}) {
  const messageData = {
    conversation_id: conversationId,
    role: role, // 'user' or 'assistant'
    content: content,
    metadata: metadata,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ai_conversation_messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error('Error adding conversation message:', error);
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return data;
}

/**
 * Get pending conversations for a user
 */
async function getPendingConversations(userId) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending conversations:', error);
    return [];
  }

  return data || [];
}

/**
 * Main function to trigger AI intervention
 * Creates conversation, sends push notification
 */
async function triggerAIIntervention(userId, pattern, transactionId, guardianName) {
  try {
    // 1. Create AI conversation record
    const conversation = await createAIConversation(userId, pattern, transactionId);

    // 2. Send push notification to user's device
    await sendPushNotification(userId, pattern, transactionId, conversation.id);

    // 3. Log the intervention trigger
    console.log('AI intervention triggered:', {
      userId: userId,
      conversationId: conversation.id,
      pattern: pattern.pattern,
      risk: pattern.risk,
      transactionId: transactionId,
    });

    return {
      success: true,
      conversationId: conversation.id,
      pattern: pattern.pattern,
      message: `AI intervention triggered for ${pattern.pattern}`,
    };

  } catch (error) {
    console.error('Error triggering AI intervention:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send test push notification (for debugging)
 */
async function sendTestNotification(userId) {
  const testPattern = {
    pattern: 'TEST',
    amount: 100,
    message: 'This is a test notification',
  };

  const notification = {
    title: '🧪 TEST NOTIFICATION',
    body: 'If you see this, push notifications are working!',
  };

  const { data: user } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (!user?.push_token) {
    return { error: 'No push token found' };
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.push_token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: { type: 'TEST' },
      priority: 'high',
    }),
  });

  return await response.json();
}

module.exports = {
  createAIConversation,
  sendPushNotification,
  updateConversationStatus,
  addConversationMessage,
  getPendingConversations,
  triggerAIIntervention,
  sendTestNotification,
};
