/**
 * Voice Handler Service
 *
 * Handles voice-related operations for AI interventions.
 * Uses Claude API for conversation intelligence with native device audio APIs.
 *
 * NOTE: Anthropic doesn't currently provide dedicated voice APIs.
 * This service structures voice handling to work with:
 * - Native device speech recognition (mobile app)
 * - Native device text-to-speech (mobile app)
 * - Claude API for conversation intelligence
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAIResponse } from './ai-conversation.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Voice configuration for different contexts
 */
export const VoiceConfig = {
  // For critical interventions (right after transaction)
  URGENT: {
    speed: 1.0,
    tone: 'firm',
    emphasis: 'high'
  },
  // For follow-ups and check-ins
  CASUAL: {
    speed: 1.0,
    tone: 'conversational',
    emphasis: 'medium'
  },
  // For encouragement
  SUPPORTIVE: {
    speed: 0.95,
    tone: 'warm',
    emphasis: 'low'
  }
};

/**
 * Transcribe audio using Claude API context
 *
 * Note: Actual transcription happens on device (mobile app using expo-speech-recognition).
 * This function processes the transcript with Claude for context and understanding.
 *
 * @param {string} transcript - Pre-transcribed text from mobile device
 * @param {Object} context - Transaction/conversation context
 * @returns {Promise<Object>} Processed transcript with Claude insights
 */
export async function processVoiceTranscript(transcript, context = {}) {
  try {
    // Use Claude to understand intent and extract key information
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      temperature: 0.3,
      system: `You are processing voice memos from someone explaining their spending decisions.
               Extract: main reason, emotional state, any red flags (rationalization, defensiveness).
               Keep it brief and factual.`,
      messages: [{
        role: 'user',
        content: `Transaction: $${context.amount || 0} at ${context.payee || 'unknown'}
                  Voice memo: "${transcript}"

                  What's the key takeaway?`
      }]
    });

    return {
      originalTranscript: transcript,
      processed: response.content[0].text,
      context,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Transcript processing error:', error);

    // Return unprocessed transcript if Claude fails
    return {
      originalTranscript: transcript,
      processed: transcript,
      context,
      timestamp: new Date().toISOString(),
      error: 'Processing failed, using raw transcript'
    };
  }
}

/**
 * Generate voice response text optimized for speech synthesis
 *
 * Claude generates the text, device handles speech synthesis.
 *
 * @param {Object} params - Response parameters
 * @param {Array} params.messages - Conversation history
 * @param {string} params.trigger - Intervention trigger type
 * @param {Object} params.userData - User context
 * @param {string} params.voiceMode - Voice configuration (URGENT, CASUAL, SUPPORTIVE)
 * @returns {Promise<Object>} Response text and voice config
 */
export async function generateVoiceResponse({
  messages,
  trigger,
  userData,
  voiceMode = 'CASUAL'
}) {
  try {
    // Get AI response using the conversation service
    const responseText = await getAIResponse({
      messages,
      trigger,
      userData,
      streaming: false
    });

    // Optimize text for speech (remove formatting, adjust punctuation)
    const speechOptimizedText = optimizeForSpeech(responseText);

    return {
      text: speechOptimizedText,
      voiceConfig: VoiceConfig[voiceMode] || VoiceConfig.CASUAL,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Voice response generation error:', error);

    return {
      text: "Let's talk about what happened, mate.",
      voiceConfig: VoiceConfig.CASUAL,
      timestamp: new Date().toISOString(),
      error: 'Generation failed, using fallback'
    };
  }
}

/**
 * Generate streaming voice response for real-time playback
 *
 * @param {Object} params - Response parameters
 * @param {Function} onTextChunk - Callback for each text chunk (for TTS)
 * @returns {Promise<Stream>} Streaming response
 */
export async function generateStreamingVoiceResponse(params, onTextChunk) {
  try {
    const { messages, trigger, userData } = params;

    // Use streaming conversation API
    const stream = await getAIResponse({
      messages,
      trigger,
      userData,
      streaming: true
    });

    // Process stream chunks for speech
    let buffer = '';

    stream.on('text', (chunk) => {
      buffer += chunk;

      // Send complete sentences to TTS for more natural speech
      const sentences = extractCompleteSentences(buffer);
      sentences.forEach(sentence => {
        const optimized = optimizeForSpeech(sentence);
        if (onTextChunk) onTextChunk(optimized);
      });

      // Keep incomplete sentence in buffer
      buffer = buffer.substring(sentences.join('').length);
    });

    stream.on('end', () => {
      // Send any remaining text
      if (buffer.trim() && onTextChunk) {
        onTextChunk(optimizeForSpeech(buffer));
      }
    });

    return stream;
  } catch (error) {
    console.error('Streaming voice generation error:', error);
    throw error;
  }
}

/**
 * Optimize text for natural speech synthesis
 *
 * @param {string} text - Original text
 * @returns {string} Speech-optimized text
 */
function optimizeForSpeech(text) {
  return text
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    // Add pauses for natural speech
    .replace(/\. /g, '. ')
    .replace(/\? /g, '? ')
    .replace(/! /g, '! ')
    // Handle common abbreviations
    .replace(/\$/g, 'dollar ')
    .replace(/\&/g, ' and ')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract complete sentences from text buffer
 * Used for streaming speech synthesis
 *
 * @param {string} buffer - Text buffer
 * @returns {Array<string>} Complete sentences
 */
function extractCompleteSentences(buffer) {
  const sentences = [];
  const sentenceEndings = /[.!?]\s/g;
  let match;
  let lastIndex = 0;

  while ((match = sentenceEndings.exec(buffer)) !== null) {
    sentences.push(buffer.substring(lastIndex, match.index + 1));
    lastIndex = match.index + match[0].length;
  }

  return sentences;
}

/**
 * Detect voice activity and engagement
 * Helps determine if user is genuinely engaging with intervention
 *
 * @param {Object} audioMetadata - Metadata from voice recording
 * @returns {Object} Engagement metrics
 */
export function analyzeVoiceEngagement(audioMetadata = {}) {
  const {
    duration = 0,        // seconds
    pauseCount = 0,      // number of pauses
    averageVolume = 0,   // 0-100
    wordCount = 0        // estimated words
  } = audioMetadata;

  // Quick engagement assessment
  const metrics = {
    duration,
    engagement: 'unknown',
    confidence: 0,
    flags: []
  };

  // Too short = possibly rushed/avoiding
  if (duration < 3) {
    metrics.engagement = 'low';
    metrics.confidence = 0.8;
    metrics.flags.push('very_short_response');
    return metrics;
  }

  // Reasonable length with substance
  if (duration >= 5 && wordCount > 15) {
    metrics.engagement = 'high';
    metrics.confidence = 0.9;
    return metrics;
  }

  // Medium engagement
  if (duration >= 3 && duration < 10) {
    metrics.engagement = 'medium';
    metrics.confidence = 0.7;

    if (pauseCount > 3) {
      metrics.flags.push('hesitant');
    }

    return metrics;
  }

  // Very long might be deflection/rambling
  if (duration > 30) {
    metrics.engagement = 'medium';
    metrics.confidence = 0.6;
    metrics.flags.push('potentially_deflecting');
  }

  return metrics;
}

/**
 * Get voice configuration based on conversation context
 *
 * @param {string} trigger - Intervention trigger type
 * @param {Object} userData - User context
 * @returns {Object} Voice configuration
 */
export function getVoiceConfigForContext(trigger, userData = {}) {
  // Urgent voice for immediate interventions
  if (trigger === 'immediate' && userData.totalSpend > 100) {
    return VoiceConfig.URGENT;
  }

  // Supportive voice for encouragement
  if (trigger === 'encouragement' || userData.cleanStreak > 30) {
    return VoiceConfig.SUPPORTIVE;
  }

  // Default to casual conversational tone
  return VoiceConfig.CASUAL;
}

export default {
  processVoiceTranscript,
  generateVoiceResponse,
  generateStreamingVoiceResponse,
  analyzeVoiceEngagement,
  getVoiceConfigForContext,
  VoiceConfig
};
