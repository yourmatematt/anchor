/**
 * Conversation State Management for Anchor
 *
 * Manages conversation flow, state, and persistence
 * Handles guardian real-time updates via websocket
 * Prevents premature conversation ending
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Create new conversation
 */
async function createConversation(userId, triggerType, transactionId, context) {
  const conversationData = {
    user_id: userId,
    transaction_id: transactionId,
    trigger_type: triggerType,
    trigger_reason: context.triggerReason || null,
    ai_context: context,
    status: 'active', // active, completed, abandoned, timed_out
    is_unavoidable: true, // Cannot be dismissed
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    // Initialize transcript
    transcript: {
      messages: [],
      created_at: new Date().toISOString(),
    },
    // Metadata
    manipulation_detected_count: 0,
    evasion_detected_count: 0,
    message_count: 0,
  };

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  console.log('Conversation created:', data.id);

  // Notify guardian that conversation started
  await notifyGuardianConversationStarted(userId, data.id, triggerType, context);

  return data;
}

/**
 * Add message to conversation
 */
async function addMessage(conversationId, role, content, metadata = {}) {
  // Fetch current conversation
  const { data: conversation, error: fetchError } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (fetchError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Add message to transcript
  const transcript = conversation.transcript || { messages: [] };
  const newMessage = {
    role: role, // 'user' or 'assistant'
    content: content,
    timestamp: new Date().toISOString(),
    metadata: metadata, // Can include manipulation flags, audio URLs, etc.
  };

  transcript.messages.push(newMessage);

  // Update conversation
  const updateData = {
    transcript: transcript,
    last_activity_at: new Date().toISOString(),
    message_count: conversation.message_count + 1,
  };

  // Update counters if manipulation/evasion detected
  if (metadata.manipulationDetected) {
    updateData.manipulation_detected_count = conversation.manipulation_detected_count + 1;
  }
  if (metadata.evasionDetected) {
    updateData.evasion_detected_count = conversation.evasion_detected_count + 1;
  }

  const { data: updated, error: updateError } = await supabase
    .from('ai_conversations')
    .update(updateData)
    .eq('id', conversationId)
    .select()
    .single();

  if (updateError) {
    console.error('Error adding message:', updateError);
    throw new Error(`Failed to add message: ${updateError.message}`);
  }

  // Send real-time update to guardian via Supabase realtime
  await sendGuardianUpdate(conversation.user_id, conversationId, {
    type: 'new_message',
    role: role,
    content: content,
    flags: metadata.flags || [],
  });

  return updated;
}

/**
 * Update conversation status
 */
async function updateConversationStatus(conversationId, status, outcome = null) {
  const updateData = {
    status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    updateData.outcome = outcome; // 'approved', 'denied', 'confirmed_gambling', etc.
  }

  if (status === 'abandoned') {
    updateData.abandoned_at = new Date().toISOString();
    updateData.abandonment_reason = outcome;
  }

  if (status === 'timed_out') {
    updateData.timed_out_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update(updateData)
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversation status:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  // Notify guardian of conversation end
  if (status === 'completed') {
    await notifyGuardianConversationEnded(data.user_id, conversationId, outcome);
  }

  return data;
}

/**
 * Get conversation by ID
 */
async function getConversation(conversationId) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  return data;
}

/**
 * Get conversation transcript
 */
async function getTranscript(conversationId) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return [];

  return conversation.transcript?.messages || [];
}

/**
 * Check if conversation has timed out (no activity for 10 minutes)
 */
async function checkTimeout(conversationId) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return false;

  if (conversation.status !== 'active') return false;

  const lastActivity = new Date(conversation.last_activity_at);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  if (lastActivity < tenMinutesAgo) {
    // Timeout - mark as timed_out
    await updateConversationStatus(conversationId, 'timed_out', 'no_activity_10_minutes');
    return true;
  }

  return false;
}

/**
 * Get conversation context for AI
 */
function getConversationContext(conversation) {
  const transcript = conversation.transcript?.messages || [];

  return {
    conversationId: conversation.id,
    userId: conversation.user_id,
    triggerType: conversation.trigger_type,
    aiContext: conversation.ai_context,
    messageHistory: transcript,
    messageCount: conversation.message_count,
    manipulationCount: conversation.manipulation_detected_count,
    evasionCount: conversation.evasion_detected_count,
    duration: calculateDuration(conversation.created_at, conversation.last_activity_at),
  };
}

/**
 * Calculate conversation duration
 */
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime || Date.now());
  const durationMs = end - start;

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  return {
    milliseconds: durationMs,
    formatted: `${minutes}m ${seconds}s`,
    minutes: minutes,
    seconds: seconds,
  };
}

/**
 * Notify guardian that conversation started (via SMS or push)
 */
async function notifyGuardianConversationStarted(userId, conversationId, triggerType, context) {
  // Get guardian
  const { data: guardian } = await supabase
    .from('guardians')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!guardian) {
    console.warn('No guardian found for user:', userId);
    return;
  }

  // Get user name
  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();

  // Create realtime channel for guardian
  // Guardian mobile app can subscribe to this channel to see conversation in real-time
  const channelName = `conversation:${conversationId}`;

  // Log guardian notification
  await supabase
    .from('guardian_notifications')
    .insert({
      guardian_id: guardian.id,
      user_id: userId,
      notification_type: 'CONVERSATION_STARTED',
      message: `${user?.name || 'User'} is in an AI intervention conversation (${triggerType})`,
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered',
      metadata: {
        conversationId: conversationId,
        triggerType: triggerType,
        channelName: channelName,
      },
    });

  console.log('Guardian notified of conversation start:', guardian.id, channelName);
}

/**
 * Send real-time update to guardian during conversation
 */
async function sendGuardianUpdate(userId, conversationId, update) {
  // In production, this would use Supabase Realtime or WebSockets
  // Guardian app subscribes to: supabase.channel(`conversation:${conversationId}`)

  // For now, log the update
  console.log('Guardian update:', {
    conversationId: conversationId,
    update: update,
  });

  // Could also send to external webhook for guardian dashboard
  // await fetch(process.env.GUARDIAN_WEBHOOK_URL, {
  //   method: 'POST',
  //   body: JSON.stringify({ conversationId, update }),
  // });
}

/**
 * Notify guardian that conversation ended
 */
async function notifyGuardianConversationEnded(userId, conversationId, outcome) {
  const { data: guardian } = await supabase
    .from('guardians')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!guardian) return;

  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();

  const outcomeMessages = {
    approved: 'Request approved',
    denied: 'Request denied',
    confirmed_gambling: 'Gambling confirmed - streak reset',
    false_alarm: 'False alarm - legitimate transaction',
    needs_follow_up: 'Flagged for follow-up',
  };

  const message = `${user?.name || 'User'} AI conversation complete: ${outcomeMessages[outcome] || outcome}`;

  await supabase
    .from('guardian_notifications')
    .insert({
      guardian_id: guardian.id,
      user_id: userId,
      notification_type: 'CONVERSATION_ENDED',
      message: message,
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered',
      metadata: {
        conversationId: conversationId,
        outcome: outcome,
      },
    });

  console.log('Guardian notified of conversation end:', outcome);
}

/**
 * Prevent conversation from being closed prematurely
 */
function canCloseConversation(conversation) {
  if (!conversation) return false;

  // Can only close if:
  // 1. Status is 'completed', 'abandoned', or 'timed_out'
  // 2. OR conversation has been active for > 30 minutes (safety escape)

  if (['completed', 'abandoned', 'timed_out'].includes(conversation.status)) {
    return true;
  }

  // Safety escape: Allow close after 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const createdAt = new Date(conversation.created_at);

  if (createdAt < thirtyMinutesAgo) {
    console.warn('Allowing conversation close after 30 minutes:', conversation.id);
    return true;
  }

  return false;
}

/**
 * Recover from app crash or network issue
 */
async function recoverConversation(userId) {
  // Find most recent active conversation for user
  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !conversations || conversations.length === 0) {
    return null;
  }

  const conversation = conversations[0];

  // Check if it timed out
  const timedOut = await checkTimeout(conversation.id);
  if (timedOut) {
    return null;
  }

  console.log('Recovered conversation:', conversation.id);
  return conversation;
}

/**
 * Get conversation summary for post-conversation screen
 */
async function getConversationSummary(conversationId) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  const transcript = conversation.transcript?.messages || [];
  const duration = calculateDuration(conversation.created_at, conversation.completed_at);

  // Get AI's final message
  const aiMessages = transcript.filter(m => m.role === 'assistant');
  const finalMessage = aiMessages[aiMessages.length - 1]?.content || '';

  // Determine outcome from final message
  let outcome = conversation.outcome;
  if (!outcome) {
    if (finalMessage.includes('Not happening')) outcome = 'denied';
    else if (finalMessage.includes('You can send it')) outcome = 'approved';
    else if (finalMessage.includes('Your guardian has been notified')) outcome = 'confirmed_gambling';
    else outcome = 'completed';
  }

  return {
    conversationId: conversationId,
    triggerType: conversation.trigger_type,
    outcome: outcome,
    duration: duration.formatted,
    messageCount: conversation.message_count,
    manipulationDetected: conversation.manipulation_detected_count > 0,
    manipulationCount: conversation.manipulation_detected_count,
    transcript: transcript,
    aiReasoning: finalMessage,
  };
}

module.exports = {
  createConversation,
  addMessage,
  updateConversationStatus,
  getConversation,
  getTranscript,
  checkTimeout,
  getConversationContext,
  canCloseConversation,
  recoverConversation,
  getConversationSummary,
};
