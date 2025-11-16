/**
 * AI Conversation Engine for Anchor
 *
 * Main conversation handler that orchestrates:
 * - OpenAI GPT-4 for conversation logic
 * - Manipulation detection
 * - Voice processing
 * - State management
 * - Guardian updates
 *
 * Hard accountability conversations for gambling intervention
 */

const { getPromptsForTrigger, isConversationEnder } = require('../prompts/intervention-prompts');
const {
  detectManipulation,
  detectEvasion,
  detectInconsistencies,
  generateCounterResponse,
  assessConversationHonesty,
} = require('./manipulation-detector');
const {
  createConversation,
  addMessage,
  updateConversationStatus,
  getConversation,
  getConversationContext,
} = require('./conversation-state');
const {
  processUserVoice,
  processAIVoice,
} = require('./voice-handler');

/**
 * Start new AI conversation
 */
async function startConversation(userId, triggerType, transactionId, context) {
  try {
    // Get prompts for this trigger type
    const prompts = getPromptsForTrigger(triggerType, context);

    // Create conversation in database
    const conversation = await createConversation(userId, triggerType, transactionId, {
      ...context,
      systemPrompt: prompts.systemPrompt,
      initialMessage: prompts.initialMessage,
      triggerReason: prompts.contextPrompt,
    });

    // Add initial AI message
    await addMessage(
      conversation.id,
      'assistant',
      prompts.initialMessage,
      {
        isInitial: true,
        promptType: triggerType,
      }
    );

    // Process voice for initial message
    const voiceResult = await processAIVoice(
      prompts.initialMessage,
      conversation.id,
      0
    );

    return {
      success: true,
      conversationId: conversation.id,
      initialMessage: prompts.initialMessage,
      audioUrl: voiceResult.audioUrl,
      canDismiss: false, // Conversations are unavoidable
    };

  } catch (error) {
    console.error('Error starting conversation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process user response (text or voice)
 */
async function processUserResponse(conversationId, userInput, options = {}) {
  const {
    isVoice = false,
    audioBlob = null,
  } = options;

  try {
    // Get conversation
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status !== 'active') {
      throw new Error('Conversation is not active');
    }

    let userText = userInput;
    let audioUrl = null;

    // Process voice input if provided
    if (isVoice && audioBlob) {
      const voiceResult = await processUserVoice(
        audioBlob,
        conversationId,
        conversation.message_count
      );

      if (voiceResult.success) {
        userText = voiceResult.text;
        audioUrl = voiceResult.audioUrl;
      } else {
        // Voice transcription failed, ask user to type
        return {
          success: false,
          error: 'Voice transcription failed. Please type your response.',
          requiresRetry: true,
        };
      }
    }

    // Get conversation context
    const context = getConversationContext(conversation);
    const messageHistory = context.messageHistory;

    // Detect manipulation, evasion, inconsistencies
    const lastAIMessage = [...messageHistory].reverse().find(m => m.role === 'assistant');
    const questionAsked = lastAIMessage?.content || '';

    const manipulation = detectManipulation(userText, messageHistory);
    const evasion = detectEvasion(userText, questionAsked);
    const inconsistency = detectInconsistencies(userText, messageHistory);

    // Add user message to conversation
    await addMessage(
      conversationId,
      'user',
      userText,
      {
        audioUrl: audioUrl,
        manipulationDetected: manipulation,
        evasionDetected: evasion,
        inconsistencyDetected: inconsistency,
        flags: [
          ...(manipulation.detected ? manipulation.tactics.map(t => t.tactic) : []),
          ...(evasion.isEvasive ? [evasion.reason] : []),
          ...(inconsistency.hasInconsistencies ? ['inconsistent'] : []),
        ],
      }
    );

    // Generate AI response
    const aiResponse = await generateAIResponse(
      conversationId,
      userText,
      manipulation,
      evasion,
      inconsistency,
      context
    );

    // Add AI message to conversation
    await addMessage(
      conversationId,
      'assistant',
      aiResponse.message,
      {
        reasoning: aiResponse.reasoning,
        shouldEnd: aiResponse.shouldEnd,
        outcome: aiResponse.outcome,
      }
    );

    // Process voice for AI response
    const voiceResult = await processAIVoice(
      aiResponse.message,
      conversationId,
      conversation.message_count + 1
    );

    // Check if conversation should end
    if (aiResponse.shouldEnd) {
      await updateConversationStatus(
        conversationId,
        'completed',
        aiResponse.outcome
      );
    }

    return {
      success: true,
      aiMessage: aiResponse.message,
      audioUrl: voiceResult.audioUrl,
      shouldEnd: aiResponse.shouldEnd,
      outcome: aiResponse.outcome,
      manipulationDetected: manipulation.detected,
      evasionDetected: evasion.isEvasive,
    };

  } catch (error) {
    console.error('Error processing user response:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate AI response using GPT-4
 */
async function generateAIResponse(conversationId, userText, manipulation, evasion, inconsistency, context) {
  // Check if we should use a pre-programmed counter-response
  const counterResponse = generateCounterResponse(manipulation, evasion, inconsistency, context);

  if (counterResponse) {
    return {
      message: counterResponse.message,
      reasoning: `Detected ${counterResponse.type}: ${counterResponse.flags.join(', ')}`,
      shouldEnd: counterResponse.shouldEnd,
      outcome: counterResponse.shouldEnd ? 'denied' : null,
    };
  }

  // Otherwise, use GPT-4 for natural conversation
  const conversation = await getConversation(conversationId);
  const prompts = getPromptsForTrigger(conversation.trigger_type, conversation.ai_context);

  // Build message history for GPT
  const messages = [
    { role: 'system', content: prompts.systemPrompt },
    { role: 'system', content: `Context: ${prompts.contextPrompt}` },
  ];

  // Add conversation history
  for (const msg of context.messageHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add latest user message (already added to history, but GPT needs it)
  messages.push({
    role: 'user',
    content: userText,
  });

  try {
    // Call OpenAI GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // or 'gpt-4-turbo-preview' or 'gpt-3.5-turbo'
        messages: messages,
        temperature: 0.7, // Balanced creativity/consistency
        max_tokens: 150, // Keep responses short (1-3 sentences)
        presence_penalty: 0.3, // Encourage varied language
        frequency_penalty: 0.3, // Reduce repetition
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`GPT error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const aiMessage = result.choices[0].message.content.trim();

    // Check if AI ended the conversation
    const shouldEnd = isConversationEnder(aiMessage);

    // Determine outcome
    let outcome = null;
    if (shouldEnd) {
      if (aiMessage.includes('Not happening') || aiMessage.includes('money stays locked')) {
        outcome = 'denied';
      } else if (aiMessage.includes('You can send it')) {
        outcome = 'approved';
      } else if (aiMessage.includes('guardian has been notified')) {
        outcome = 'confirmed_gambling';
      } else {
        outcome = 'completed';
      }
    }

    return {
      message: aiMessage,
      reasoning: `GPT-4 response based on conversation flow`,
      shouldEnd: shouldEnd,
      outcome: outcome,
    };

  } catch (error) {
    console.error('Error generating AI response:', error);

    // Fallback response
    return {
      message: "Something went wrong. Let's try again. What were you saying?",
      reasoning: `Error: ${error.message}`,
      shouldEnd: false,
      outcome: null,
    };
  }
}

/**
 * End conversation manually (timeout, abandonment)
 */
async function endConversation(conversationId, reason) {
  try {
    const status = reason === 'timeout' ? 'timed_out' : 'abandoned';
    await updateConversationStatus(conversationId, status, reason);

    return {
      success: true,
      message: 'Conversation ended',
      reason: reason,
    };

  } catch (error) {
    console.error('Error ending conversation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get conversation summary (for post-conversation screen)
 */
async function getConversationSummary(conversationId) {
  try {
    const { getConversationSummary: getSummary } = require('./conversation-state');
    const summary = await getSummary(conversationId);

    if (!summary) {
      throw new Error('Conversation not found');
    }

    // Assess overall honesty
    const honestyAssessment = assessConversationHonesty(summary.transcript);

    return {
      success: true,
      conversationId: conversationId,
      outcome: summary.outcome,
      duration: summary.duration,
      messageCount: summary.messageCount,
      aiReasoning: summary.aiReasoning,
      manipulationDetected: summary.manipulationDetected,
      manipulationCount: summary.manipulationCount,
      honestyAssessment: honestyAssessment.assessment,
      transcript: summary.transcript,
    };

  } catch (error) {
    console.error('Error getting conversation summary:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Recover active conversation for user (after app crash)
 */
async function recoverActiveConversation(userId) {
  try {
    const { recoverConversation } = require('./conversation-state');
    const conversation = await recoverConversation(userId);

    if (!conversation) {
      return {
        success: false,
        hasActiveConversation: false,
      };
    }

    return {
      success: true,
      hasActiveConversation: true,
      conversationId: conversation.id,
      triggerType: conversation.trigger_type,
      messageCount: conversation.message_count,
    };

  } catch (error) {
    console.error('Error recovering conversation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  startConversation,
  processUserResponse,
  endConversation,
  getConversationSummary,
  recoverActiveConversation,
};
