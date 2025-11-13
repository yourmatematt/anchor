/**
 * AI Conversation Endpoint
 *
 * Handles back-and-forth conversations with the AI
 * Used for payment request discussions, interventions, and check-ins
 */

const { createClient } = require('@supabase/supabase-js');
const { getAIResponse } = require('../services/claude');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Main handler for conversation endpoint
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      conversation_id,
      user_message,
      conversation_type, // 'payment_request', 'intervention', 'check_in'
      context // Additional context (payment_request_id, transaction_id, etc.)
    } = req.body;

    // Validate required fields
    if (!user_id || !user_message) {
      return res.status(400).json({
        error: 'user_id and user_message are required'
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        error: 'User profile not found'
      });
    }

    let conversation;
    let conversationHistory = [];

    // Get or create conversation
    if (conversation_id) {
      // Continue existing conversation
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .single();

      if (convError || !existingConv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      conversation = existingConv;
      conversationHistory = existingConv.messages || [];

    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id,
          conversation_type: conversation_type || 'intervention',
          messages: [],
          trigger_context: context || {},
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      conversation = newConv;
    }

    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: user_message,
      timestamp: new Date().toISOString()
    });

    // Prepare context for AI
    const aiContext = {
      userProfile,
      currentTime: new Date().toISOString(),
      ...context
    };

    // If this is related to a payment request, include it
    if (context?.payment_request_id) {
      const { data: paymentRequest } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', context.payment_request_id)
        .single();

      if (paymentRequest) {
        aiContext.paymentRequest = paymentRequest;
      }
    }

    // If this is related to a transaction (intervention), include it
    if (context?.transaction_id) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', context.transaction_id)
        .single();

      if (transaction) {
        aiContext.transaction = transaction;
      }
    }

    // Get AI response
    const aiResponse = await getAIResponse({
      conversationType: conversation.conversation_type,
      conversationHistory,
      userMessage: user_message,
      context: aiContext
    });

    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    // Detect if conversation should end
    // Look for approval/denial keywords or user confirmation
    const shouldEnd = detectConversationEnd(aiResponse, user_message, conversation.conversation_type);
    const outcome = determineOutcome(conversationHistory, shouldEnd, conversation.conversation_type);

    // Update conversation in database
    await supabase
      .from('conversations')
      .update({
        messages: conversationHistory,
        outcome: shouldEnd ? outcome : null
      })
      .eq('id', conversation.id);

    // If payment request conversation ended with approval, update payment request
    if (shouldEnd && outcome === 'approved' && context?.payment_request_id) {
      await supabase
        .from('payment_requests')
        .update({
          decision: 'approved',
          approved_at: new Date().toISOString(),
          conversation_id: conversation.id
        })
        .eq('id', context.payment_request_id);
    }

    // If payment request conversation ended with denial, update payment request
    if (shouldEnd && outcome === 'denied' && context?.payment_request_id) {
      await supabase
        .from('payment_requests')
        .update({
          decision: 'denied',
          conversation_id: conversation.id
        })
        .eq('id', context.payment_request_id);
    }

    // Update intervention if this was an intervention conversation
    if (context?.intervention_id) {
      await supabase
        .from('interventions')
        .update({
          user_response: user_message,
          outcome: shouldEnd ? outcome : 'in_progress',
          conversation_id: conversation.id
        })
        .eq('id', context.intervention_id);
    }

    // Update irregular deposit if this was a deposit interrogation
    if (conversation.conversation_type === 'deposit_interrogation' && context?.irregular_deposit_id) {
      await supabase
        .from('irregular_deposits')
        .update({
          interrogation_status: shouldEnd ? 'completed' : 'in_progress',
          user_explanation: user_message,
          ai_assessment: shouldEnd ? outcome : null,
          conversation_id: conversation.id,
          completed_at: shouldEnd ? new Date().toISOString() : null
        })
        .eq('id', context.irregular_deposit_id);

      // If outcome is high_risk, update user's clean_since_date (reset the counter)
      if (shouldEnd && outcome === 'high_risk') {
        await supabase
          .from('user_profiles')
          .update({
            clean_since_date: new Date().toISOString()
          })
          .eq('user_id', user_id);
      }
    }

    return res.status(200).json({
      conversation_id: conversation.id,
      assistant_message: aiResponse,
      should_continue: !shouldEnd,
      outcome: shouldEnd ? outcome : null,
      message_count: conversationHistory.length
    });

  } catch (error) {
    console.error('Conversation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Detect if conversation should end based on AI response and user message
 */
function detectConversationEnd(aiResponse, userMessage, conversationType) {
  const aiLower = aiResponse.toLowerCase();
  const userLower = userMessage.toLowerCase();

  // Check for approval keywords
  if (aiLower.includes("you can send") ||
      aiLower.includes("go ahead") ||
      aiLower.includes("that's legitimate") ||
      aiLower.includes("approved")) {
    return true;
  }

  // Check for denial keywords
  if (aiLower.includes("i can't approve") ||
      aiLower.includes("not happening") ||
      aiLower.includes("denied") ||
      aiLower.includes("sorry mate, no")) {
    return true;
  }

  // Check for conversation completion (check-in type)
  if (conversationType === 'check_in' &&
      (aiLower.includes("stay strong") ||
       aiLower.includes("see you tomorrow") ||
       aiLower.includes("good chat"))) {
    return true;
  }

  // Check for deposit interrogation completion
  if (conversationType === 'deposit_interrogation' &&
      (aiLower.includes("alright") ||
       aiLower.includes("got it") ||
       aiLower.includes("fair enough") ||
       aiLower.includes("keep me posted") ||
       aiLower.includes("we'll talk about this"))) {
    return true;
  }

  // Check if user gives up
  if (userLower.includes("forget it") ||
      userLower.includes("never mind") ||
      userLower.includes("don't bother")) {
    return true;
  }

  return false;
}

/**
 * Determine the outcome of the conversation
 */
function determineOutcome(conversationHistory, hasEnded, conversationType) {
  if (!hasEnded) {
    return null;
  }

  const lastAssistantMessage = conversationHistory
    .filter(m => m.role === 'assistant')
    .pop();

  if (!lastAssistantMessage) {
    return 'abandoned';
  }

  const content = lastAssistantMessage.content.toLowerCase();

  // Deposit interrogation outcomes
  if (conversationType === 'deposit_interrogation') {
    if (content.includes('payday loan') ||
        content.includes('borrowing to gamble') ||
        content.includes('debt trap')) {
      return 'high_risk';
    }

    if (content.includes('irregular') ||
        content.includes('keep an eye') ||
        content.includes('track this')) {
      return 'concerning';
    }

    if (content.includes('legitimate') ||
        content.includes('fair enough') ||
        content.includes('alright')) {
      return 'legitimate';
    }

    if (content.includes('lying') ||
        content.includes('deflecting') ||
        content.includes('not buying it')) {
      return 'intervention_needed';
    }

    return 'completed';
  }

  // Payment request outcomes
  if (content.includes('approved') ||
      content.includes('go ahead') ||
      content.includes('you can send')) {
    return 'approved';
  }

  if (content.includes('denied') ||
      content.includes('not happening') ||
      content.includes("can't approve")) {
    return 'denied';
  }

  // Check-in outcomes
  if (content.includes('stay strong') ||
      content.includes('good chat')) {
    return 'completed';
  }

  return 'abandoned';
}
