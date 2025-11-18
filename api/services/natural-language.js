/**
 * Natural Language Processing Service
 *
 * Orchestrates voice command processing and Claude AI integration.
 * Main entry point for all voice interactions.
 */

const { claudeVoiceService } = require('./claude-voice');
const { voiceCommandProcessor } = require('./voice-commands');

class NaturalLanguageService {
  /**
   * Process voice input with intelligent routing
   */
  async processVoiceInput(userId, text, options = {}) {
    const {conversationId, bypassCommands = false} = options;

    // First, try specific command processing (faster, cheaper)
    if (!bypassCommands) {
      const commandResult = await voiceCommandProcessor.processCommand(userId, text);

      // If command was recognized and doesn't require Claude processing
      if (commandResult.intent !== 'UNKNOWN' && !commandResult.requiresClaudeProcessing) {
        return {
          ...commandResult,
          source: 'command_processor',
          timestamp: new Date().toISOString()
        };
      }
    }

    // Fall back to Claude for complex queries, conversation, and emotional support
    const claudeResult = await claudeVoiceService.processVoiceInput(
      userId,
      text,
      conversationId
    );

    return {
      ...claudeResult,
      source: 'claude_ai',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Continue conversation
   */
  async continueConversation(userId, conversationId, text) {
    return await this.processVoiceInput(userId, text, {
      conversationId,
      bypassCommands: true // In active conversation, always use Claude
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId, limit = 10) {
    return await claudeVoiceService.getConversationHistory(userId, limit);
  }

  /**
   * End conversation
   */
  async endConversation(conversationId) {
    return await claudeVoiceService.endConversation(conversationId);
  }

  /**
   * Get quick suggestions based on context
   */
  async getSuggestions(userId) {
    // Common helpful queries
    return [
      "How many days clean am I?",
      "What's my balance?",
      "Check my vault",
      "Show my patterns",
      "Talk to my guardian"
    ];
  }
}

// Export singleton
const naturalLanguageService = new NaturalLanguageService();

module.exports = {
  naturalLanguageService,
  NaturalLanguageService
};
