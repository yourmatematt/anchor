/**
 * AI Onboarding Endpoint
 *
 * Conducts conversational onboarding to build user's psychological and financial profile
 * Analyzes transaction history and asks questions to understand gambling triggers
 */

const { createClient } = require('@supabase/supabase-js');
const { getAIResponse, analyzeTransactionHistory } = require('../services/claude');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Onboarding flow states
 */
const ONBOARDING_STAGES = {
  ANALYZE_TRANSACTIONS: 'analyze_transactions',
  ASK_QUESTIONS: 'ask_questions',
  BUILD_PROFILE: 'build_profile',
  COMPLETE: 'complete'
};

/**
 * Main handler for onboarding endpoint
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
      transaction_history,
      stage
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    // STAGE 1: Analyze transaction history
    if (stage === ONBOARDING_STAGES.ANALYZE_TRANSACTIONS || !conversation_id) {
      if (!transaction_history || transaction_history.length === 0) {
        return res.status(400).json({
          error: 'transaction_history required for initial onboarding'
        });
      }

      // Analyze transactions with AI
      const analysis = await analyzeTransactionHistory(transaction_history);

      // Create initial conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id,
          conversation_type: 'onboarding',
          messages: [],
          trigger_context: { analysis, transaction_count: transaction_history.length }
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      // Get first AI question based on analysis
      const contextMessage = `I've analyzed ${transaction_history.length} transactions. Here's what I found:
- Average gambling spend: $${analysis.gambling_spend_average}/week
- High-risk times: ${JSON.stringify(analysis.high_risk_times)}
- Patterns: ${analysis.patterns_observed.join(', ')}

Start the onboarding conversation. Ask the first question.`;

      const aiResponse = await getAIResponse({
        conversationType: 'onboarding',
        conversationHistory: [],
        userMessage: contextMessage,
        context: { userProfile: analysis }
      });

      // Update conversation with first message
      const updatedMessages = [
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ];

      await supabase
        .from('conversations')
        .update({ messages: updatedMessages })
        .eq('id', conversation.id);

      return res.status(200).json({
        conversation_id: conversation.id,
        next_question: aiResponse,
        completed: false,
        stage: ONBOARDING_STAGES.ASK_QUESTIONS,
        analysis
      });
    }

    // STAGE 2: Continue conversation
    if (!user_message) {
      return res.status(400).json({ error: 'user_message required' });
    }

    // Get existing conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message to history
    const conversationHistory = conversation.messages || [];
    conversationHistory.push({
      role: 'user',
      content: user_message,
      timestamp: new Date().toISOString()
    });

    // Get AI response
    const aiResponse = await getAIResponse({
      conversationType: 'onboarding',
      conversationHistory,
      userMessage: user_message,
      context: {
        userProfile: conversation.trigger_context.analysis
      }
    });

    // Add AI response to history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    // Check if onboarding is complete (AI will indicate this in response)
    const isComplete = aiResponse.toLowerCase().includes('ready to give me control') ||
                       conversationHistory.length >= 12; // Max 6 exchanges

    if (isComplete) {
      // Extract profile information from conversation
      const profile = await extractProfileFromConversation(
        conversationHistory,
        conversation.trigger_context.analysis
      );

      // Create or update user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id,
          ...profile,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Update conversation as complete
      await supabase
        .from('conversations')
        .update({
          messages: conversationHistory,
          outcome: 'completed'
        })
        .eq('id', conversation_id);

      return res.status(200).json({
        conversation_id,
        completed: true,
        stage: ONBOARDING_STAGES.COMPLETE,
        profile: userProfile,
        next_question: aiResponse
      });
    }

    // Update conversation with new messages
    await supabase
      .from('conversations')
      .update({ messages: conversationHistory })
      .eq('id', conversation_id);

    return res.status(200).json({
      conversation_id,
      next_question: aiResponse,
      completed: false,
      stage: ONBOARDING_STAGES.ASK_QUESTIONS
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Extract structured profile from conversation using AI
 */
async function extractProfileFromConversation(conversationHistory, financialAnalysis) {
  // Use AI to extract psychological profile from conversation
  const conversationText = conversationHistory
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `
From this onboarding conversation, extract the psychological profile:

${conversationText}

Return ONLY a JSON object:
{
  "why_gamble": "summary of why they gamble",
  "gambling_feeling": "what feeling they're chasing",
  "aftermath_feeling": "how they feel after gambling",
  "root_cause": "underlying issue driving gambling",
  "savings_goal_amount": number or null,
  "savings_goal_purpose": "what they want to save for" or null,
  "days_clean_goal": number or null
}`;

  try {
    const { getAIResponse } = require('../services/claude');
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: 'You are a profile extractor. Return only valid JSON.',
      messages: [{
        role: 'user',
        content: extractionPrompt
      }]
    });

    const responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const psychological = JSON.parse(jsonMatch[0]);

      return {
        // Financial data from analysis
        average_income: financialAnalysis.average_income,
        income_frequency: financialAnalysis.income_frequency,
        fixed_expenses: financialAnalysis.fixed_expenses,
        gambling_spend_average: financialAnalysis.gambling_spend_average,
        high_risk_times: financialAnalysis.high_risk_times,
        gambling_triggers: financialAnalysis.gambling_triggers,

        // Psychological data from conversation
        why_gamble: psychological.why_gamble,
        gambling_feeling: psychological.gambling_feeling,
        aftermath_feeling: psychological.aftermath_feeling,
        root_cause: psychological.root_cause,
        savings_goal_amount: psychological.savings_goal_amount,
        savings_goal_purpose: psychological.savings_goal_purpose,
        days_clean_goal: psychological.days_clean_goal,
        clean_since_date: new Date().toISOString().split('T')[0] // Today
      };
    }
  } catch (error) {
    console.error('Error extracting profile:', error);
  }

  // Fallback profile
  return {
    average_income: financialAnalysis.average_income,
    income_frequency: financialAnalysis.income_frequency,
    fixed_expenses: financialAnalysis.fixed_expenses,
    gambling_spend_average: financialAnalysis.gambling_spend_average,
    high_risk_times: financialAnalysis.high_risk_times,
    gambling_triggers: financialAnalysis.gambling_triggers,
    why_gamble: 'Not specified',
    gambling_feeling: 'Not specified',
    aftermath_feeling: 'Not specified',
    root_cause: 'To be determined',
    clean_since_date: new Date().toISOString().split('T')[0]
  };
}
