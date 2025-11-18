/**
 * Claude Voice Integration
 *
 * Integrates Anthropic's Claude AI for natural language understanding,
 * emotion detection, manipulation detection, and crisis support.
 *
 * Features:
 * - Natural conversation with context awareness
 * - Emotion and sentiment analysis
 * - Crisis detection and intervention
 * - Manipulation attempt detection
 * - Australian English preference
 * - Multi-turn conversation tracking
 */

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { VOICE_PROMPTS } = require('../prompts/voice-prompts');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Conversation Context Manager
 */
class ConversationContext {
  constructor(userId) {
    this.userId = userId;
    this.history = [];
    this.metadata = {};
    this.startTime = new Date();
  }

  addMessage(role, content, metadata = {}) {
    this.history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  getMessages() {
    // Format for Claude API
    return this.history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  getMetadata(key) {
    return this.metadata[key];
  }
}

/**
 * Claude Voice Service
 */
class ClaudeVoiceService {
  constructor() {
    this.conversations = new Map();
    this.model = 'claude-3-5-sonnet-20241022'; // Latest Claude model
  }

  /**
   * Process voice input with Claude
   */
  async processVoiceInput(userId, text, conversationId = null) {
    try {
      // Get or create conversation context
      const context = this.getOrCreateContext(userId, conversationId);

      // Get user data for personalization
      const userData = await this.getUserData(userId);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(userData);

      // Add user message to context
      context.addMessage('user', text);

      // Detect intent and urgency
      const analysis = await this.analyzeInput(text, context);

      // Handle crisis situations immediately
      if (analysis.crisis) {
        return await this.handleCrisis(userId, text, analysis);
      }

      // Handle manipulation attempts
      if (analysis.manipulation) {
        return await this.handleManipulation(userId, text, analysis);
      }

      // Generate response with Claude
      const response = await this.generateResponse(
        systemPrompt,
        context.getMessages(),
        userData,
        analysis
      );

      // Add assistant response to context
      context.addMessage('assistant', response.content, {
        emotion: analysis.emotion,
        intent: analysis.intent
      });

      // Save conversation to database
      await this.saveConversation(userId, context, response);

      return {
        response: response.content,
        emotion: analysis.emotion,
        intent: analysis.intent,
        crisis: analysis.crisis,
        manipulation: analysis.manipulation,
        conversationId: context.conversationId || this.generateConversationId(),
        suggestions: response.suggestions,
        actions: response.actions
      };

    } catch (error) {
      console.error('Claude voice processing error:', error);
      return {
        response: "I'm having trouble processing that. Could you try again?",
        error: true
      };
    }
  }

  /**
   * Build system prompt with user context
   */
  buildSystemPrompt(userData) {
    return VOICE_PROMPTS.SYSTEM_PROMPT({
      userName: userData.name || 'mate',
      cleanDays: userData.cleanDays || 0,
      currentStreak: userData.currentStreak || 0,
      hasGuardian: userData.hasGuardian || false,
      guardianName: userData.guardianName || null,
      riskLevel: userData.riskLevel || 'medium',
      gamblingType: userData.gamblingType || 'general',
      timezone: userData.timezone || 'Australia/Sydney',
      preferences: userData.preferences || {}
    });
  }

  /**
   * Analyze user input for intent, emotion, and urgency
   */
  async analyzeInput(text, context) {
    const analysisPrompt = `Analyze this user message for:
1. Intent (what does the user want?)
2. Emotion (how is the user feeling?)
3. Crisis level (0-10, where 10 is immediate danger)
4. Manipulation attempt (is the user trying to manipulate the system?)

User message: "${text}"

Recent context: ${context.history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Respond in JSON format:
{
  "intent": "string",
  "emotion": "string",
  "crisis_level": number,
  "manipulation": boolean,
  "manipulation_type": "string or null",
  "recommended_action": "string"
}`;

    try {
      const response = await anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      });

      const analysis = JSON.parse(response.content[0].text);

      return {
        intent: analysis.intent,
        emotion: analysis.emotion,
        crisis: analysis.crisis_level >= 7,
        crisisLevel: analysis.crisis_level,
        manipulation: analysis.manipulation,
        manipulationType: analysis.manipulation_type,
        recommendedAction: analysis.recommended_action
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        intent: 'unknown',
        emotion: 'neutral',
        crisis: false,
        crisisLevel: 0,
        manipulation: false
      };
    }
  }

  /**
   * Generate response with Claude
   */
  async generateResponse(systemPrompt, messages, userData, analysis) {
    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      temperature: 0.7
    });

    const content = response.content[0].text;

    // Extract actions and suggestions from response
    const actions = this.extractActions(content);
    const suggestions = this.extractSuggestions(content);

    return {
      content: this.formatForVoice(content),
      actions,
      suggestions,
      usage: response.usage
    };
  }

  /**
   * Handle crisis situations
   */
  async handleCrisis(userId, text, analysis) {
    // Log crisis event
    await supabase.from('crisis_events').insert({
      user_id: userId,
      message: text,
      crisis_level: analysis.crisisLevel,
      emotion: analysis.emotion,
      timestamp: new Date().toISOString()
    });

    // Notify guardian immediately if available
    await this.notifyGuardian(userId, 'crisis', text);

    // Generate crisis response
    const crisisResponse = await anthropic.messages.create({
      model: this.model,
      max_tokens: 512,
      system: VOICE_PROMPTS.CRISIS_PROMPT,
      messages: [{
        role: 'user',
        content: text
      }]
    });

    return {
      response: this.formatForVoice(crisisResponse.content[0].text),
      crisis: true,
      crisisLevel: analysis.crisisLevel,
      actions: [
        { type: 'call_lifeline', data: { number: '13 11 14' } },
        { type: 'notify_guardian', data: { urgent: true } },
        { type: 'show_crisis_resources', data: {} }
      ]
    };
  }

  /**
   * Handle manipulation attempts
   */
  async handleManipulation(userId, text, analysis) {
    // Log manipulation attempt
    await supabase.from('manipulation_attempts').insert({
      user_id: userId,
      message: text,
      manipulation_type: analysis.manipulationType,
      timestamp: new Date().toISOString()
    });

    const manipulationResponse = await anthropic.messages.create({
      model: this.model,
      max_tokens: 512,
      system: VOICE_PROMPTS.MANIPULATION_PROMPT,
      messages: [{
        role: 'user',
        content: text
      }]
    });

    return {
      response: this.formatForVoice(manipulationResponse.content[0].text),
      manipulation: true,
      manipulationType: analysis.manipulationType,
      actions: [
        { type: 'log_attempt', data: { type: analysis.manipulationType } }
      ]
    };
  }

  /**
   * Get or create conversation context
   */
  getOrCreateContext(userId, conversationId) {
    const key = conversationId || `${userId}_current`;

    if (!this.conversations.has(key)) {
      const context = new ConversationContext(userId);
      context.conversationId = conversationId || this.generateConversationId();
      this.conversations.set(key, context);

      // Clean up old conversations after 30 minutes
      setTimeout(() => {
        this.conversations.delete(key);
      }, 30 * 60 * 1000);
    }

    return this.conversations.get(key);
  }

  /**
   * Get user data for personalization
   */
  async getUserData(userId) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: guardian } = await supabase
      .from('guardians')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      name: user?.name,
      cleanDays: progress?.clean_days || 0,
      currentStreak: progress?.current_streak || 0,
      hasGuardian: !!guardian,
      guardianName: guardian?.name,
      riskLevel: user?.risk_level,
      gamblingType: user?.gambling_type,
      timezone: user?.timezone,
      preferences: user?.preferences || {}
    };
  }

  /**
   * Format response for voice output
   */
  formatForVoice(text) {
    // Remove markdown formatting
    let formatted = text.replace(/\*\*/g, '');
    formatted = formatted.replace(/\*/g, '');
    formatted = formatted.replace(/\n\n/g, '. ');
    formatted = formatted.replace(/\n/g, '. ');

    // Ensure Australian English spelling in common words
    formatted = formatted.replace(/color/g, 'colour');
    formatted = formatted.replace(/behavior/g, 'behaviour');
    formatted = formatted.replace(/favor/g, 'favour');

    return formatted.trim();
  }

  /**
   * Extract actionable items from response
   */
  extractActions(content) {
    const actions = [];

    // Check for common action patterns
    if (content.includes('check your balance') || content.includes('check the balance')) {
      actions.push({ type: 'check_balance', data: {} });
    }

    if (content.includes('talk to your guardian') || content.includes('contact your guardian')) {
      actions.push({ type: 'contact_guardian', data: {} });
    }

    if (content.includes('emergency') || content.includes('crisis')) {
      actions.push({ type: 'show_crisis_resources', data: {} });
    }

    return actions;
  }

  /**
   * Extract suggestions from response
   */
  extractSuggestions(content) {
    const suggestions = [];

    // Extract numbered or bulleted suggestions
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.match(/^[\d\-\*]\s/)) {
        suggestions.push(line.replace(/^[\d\-\*]\s/, '').trim());
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Save conversation to database
   */
  async saveConversation(userId, context, response) {
    await supabase.from('voice_conversations').insert({
      user_id: userId,
      conversation_id: context.conversationId,
      messages: context.history,
      metadata: context.metadata,
      tokens_used: response.usage?.total_tokens || 0,
      started_at: context.startTime.toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Notify guardian
   */
  async notifyGuardian(userId, type, message) {
    const { data: guardian } = await supabase
      .from('guardians')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (guardian) {
      // Send notification (implementation depends on notification service)
      console.log(`Notifying guardian: ${type} - ${message}`);
      // TODO: Implement actual notification sending
    }
  }

  /**
   * Generate conversation ID
   */
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId, limit = 10) {
    const { data, error } = await supabase
      .from('voice_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * End conversation
   */
  async endConversation(conversationId) {
    this.conversations.delete(conversationId);

    await supabase
      .from('voice_conversations')
      .update({
        ended_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('conversation_id', conversationId);
  }
}

// Export singleton instance
const claudeVoiceService = new ClaudeVoiceService();

module.exports = {
  claudeVoiceService,
  ClaudeVoiceService,
  ConversationContext
};
