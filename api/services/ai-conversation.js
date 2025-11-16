/**
 * AI Conversation Service - Claude API Integration
 *
 * Handles intervention conversations using Anthropic's Claude API.
 * Provides empathetic, Australian-vernacular support for spending accountability.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getInterventionPrompt } from '../prompts/intervention-prompts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Trigger types for interventions
 */
export const TriggerType = {
  IMMEDIATE: 'immediate',        // Right after transaction
  FOLLOW_UP: 'follow_up',        // 24h check-in
  PATTERN: 'pattern',            // Spending pattern detected
  STREAK_RISK: 'streak_risk',    // Clean streak at risk
  ENCOURAGEMENT: 'encouragement' // Positive reinforcement
};

/**
 * Get AI response for an intervention
 *
 * @param {Object} params - Conversation parameters
 * @param {Array} params.messages - Conversation history in Claude format
 * @param {string} params.trigger - Type of intervention trigger
 * @param {Object} params.userData - User context data
 * @param {number} params.userData.cleanStreak - Days clean
 * @param {number} params.userData.totalSpend - Amount spent today
 * @param {string} params.userData.lastTransaction - Recent transaction details
 * @param {boolean} params.streaming - Enable streaming responses
 * @returns {Promise<string|Stream>} AI response text or stream
 */
export async function getAIResponse({
  messages = [],
  trigger = TriggerType.IMMEDIATE,
  userData = {},
  streaming = false
}) {
  try {
    const systemPrompt = getInterventionPrompt(trigger, userData);

    // Use Claude Opus for higher-quality interventions
    // Can switch to Sonnet for faster/cheaper responses if needed
    const model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';

    const config = {
      model,
      max_tokens: 200, // Keep responses concise but meaningful
      temperature: 0.7, // Balanced creativity and consistency
      system: systemPrompt,
      messages: messages.length > 0 ? messages : [
        {
          role: 'user',
          content: 'I need to talk about what just happened.'
        }
      ]
    };

    if (streaming) {
      // Return stream for real-time response rendering
      const stream = await anthropic.messages.stream(config);
      return stream;
    }

    // Standard non-streaming response
    const response = await anthropic.messages.create(config);

    return response.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);

    // Fallback response if API fails
    return getFallbackResponse(trigger);
  }
}

/**
 * Get streaming AI response with proper event handling
 *
 * @param {Object} params - Same as getAIResponse
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onComplete - Callback when stream completes
 * @param {Function} onError - Callback for errors
 */
export async function getStreamingResponse({
  messages,
  trigger,
  userData
}, onChunk, onComplete, onError) {
  try {
    const systemPrompt = getInterventionPrompt(trigger, userData);
    const model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 200,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.length > 0 ? messages : [
        {
          role: 'user',
          content: 'I need to talk about what just happened.'
        }
      ]
    });

    let fullText = '';

    // Handle streaming events
    stream.on('text', (text) => {
      fullText += text;
      if (onChunk) onChunk(text);
    });

    stream.on('end', () => {
      if (onComplete) onComplete(fullText);
    });

    stream.on('error', (error) => {
      console.error('Streaming error:', error);
      if (onError) onError(error);
    });

    return stream;
  } catch (error) {
    console.error('Claude streaming error:', error);
    if (onError) onError(error);
    throw error;
  }
}

/**
 * Analyze voice memo transcript for concerning patterns
 *
 * @param {string} transcript - Voice memo text
 * @param {Object} transactionData - Transaction context
 * @returns {Promise<Object>} Analysis with flags and suggestions
 */
export async function analyzeTranscript(transcript, transactionData) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229', // Sonnet is fast enough for analysis
      max_tokens: 300,
      temperature: 0.3, // Lower temp for more consistent analysis
      system: `You are analyzing voice memos from someone in spending addiction recovery.
               Identify concerning patterns: justification, minimization, rationalization,
               defensiveness, or planning future impulse purchases.

               Respond in JSON format:
               {
                 "concernLevel": "low|medium|high",
                 "flags": ["flag1", "flag2"],
                 "supportNeeded": boolean,
                 "suggestion": "brief supportive suggestion"
               }`,
      messages: [{
        role: 'user',
        content: `Transaction: $${transactionData.amount} at ${transactionData.payee}
                  Voice memo: "${transcript}"

                  Analyze this for concerning patterns.`
      }]
    });

    // Parse JSON response
    const analysisText = response.content[0].text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if JSON parsing fails
    return {
      concernLevel: 'low',
      flags: [],
      supportNeeded: false,
      suggestion: 'Keep up the honest reflection.'
    };
  } catch (error) {
    console.error('Transcript analysis error:', error);
    return {
      concernLevel: 'low',
      flags: [],
      supportNeeded: false,
      suggestion: 'Stay accountable.'
    };
  }
}

/**
 * Fallback responses when API is unavailable
 */
function getFallbackResponse(trigger) {
  const fallbacks = {
    [TriggerType.IMMEDIATE]: "Alright, what's going on mate? You know the drill - let's talk about this spend.",
    [TriggerType.FOLLOW_UP]: "How are you feeling about yesterday's transaction?",
    [TriggerType.PATTERN]: "I'm noticing a pattern here. Want to talk about it?",
    [TriggerType.STREAK_RISK]: "You've come too far to let this derail you. What's really going on?",
    [TriggerType.ENCOURAGEMENT]: "Proud of you for staying accountable. Keep it up."
  };

  return fallbacks[trigger] || "Let's talk about what happened.";
}

/**
 * Format conversation history for Claude API
 * Ensures alternating user/assistant messages
 *
 * @param {Array} rawMessages - Raw message history
 * @returns {Array} Formatted messages for Claude
 */
export function formatMessageHistory(rawMessages) {
  const formatted = [];
  let lastRole = null;

  for (const msg of rawMessages) {
    // Claude requires alternating roles, merge consecutive same-role messages
    if (lastRole === msg.role && formatted.length > 0) {
      formatted[formatted.length - 1].content += '\n\n' + msg.content;
    } else {
      formatted.push({
        role: msg.role,
        content: msg.content
      });
      lastRole = msg.role;
    }
  }

  // Claude requires starting with user message
  if (formatted.length > 0 && formatted[0].role !== 'user') {
    formatted.unshift({
      role: 'user',
      content: 'I need to talk.'
    });
  }

  return formatted;
}

export default {
  getAIResponse,
  getStreamingResponse,
  analyzeTranscript,
  formatMessageHistory,
  TriggerType
};
