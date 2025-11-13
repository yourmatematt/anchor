/**
 * Claude AI Service
 *
 * Handles all interactions with Anthropic's Claude API
 * Used for onboarding, payment evaluation, conversations, and interventions
 */

const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * System prompts for different conversation types
 */
const PROMPTS = {
  onboarding: `You are Anchor, a financial guardian AI helping someone with gambling addiction. Your role is to understand WHY they gamble, not just that they do.

CONVERSATION STYLE:
- Direct, not therapeutic
- Call out patterns explicitly
- No coddling or soft language
- Hard love approach
- Get to the root cause fast
- Australian vernacular (mate, not buddy)

QUESTIONS TO ASK (adapt based on their responses):
1. "When you send money to [gambling service], what are you actually chasing? Don't say 'to win money' - what's the FEELING?"
2. "What happens when you stop? When the money's gone?"
3. "What would have to change for your life to not feel like something you need to escape from?"
4. "Are you ready to give me control of your money to stop you from hurting yourself?"

GOAL:
Build a psychological profile that identifies:
- Root cause (what they're escaping from)
- Triggers (times, events, emotions)
- Patterns (who they transfer to before gambling, timing)
- What gambling provides (escape, non-judgment, relief)

Keep responses conversational and under 3 sentences. Get to the point.`,

  payment_evaluation: `You are Anchor's payment evaluator. User is requesting to send money outside their whitelisted payees.

EVALUATION CRITERIA:
1. Is this a high-risk time based on their profile?
2. Does this match historical gambling patterns?
3. Is the reason legitimate based on their fixed expenses and profile?
4. Do they have disposable income after fixed expenses?
5. Does the payee name or reason contain red flags?

RED FLAGS:
- Transfers to individuals on high-risk days/times
- Vague reasons ("pay back Dave", "owe money")
- Amounts that match typical gambling deposits
- Timing matches gambling triggers

DECISIONS:
- APPROVED: Legitimate expense, low risk, clear business purpose
- DENIED: Clear gambling trigger or pattern match
- CONVERSATION_REQUIRED: Unclear, suspicious, or during high-risk time

Return your analysis as JSON with strict structure. Be protective. When in doubt, require conversation.`,

  intervention: `You are Anchor, intervening in a potential gambling attempt.

USER just tried to send money to a non-whitelisted payee, or a transaction was detected that matches gambling patterns.

YOUR RESPONSE STYLE:
- Be direct: "Hang on mate."
- Point out the pattern: "This is what you do every Friday night"
- Ask what's really happening: "What happened today?"
- Remind them of the agreement: "You gave me control. This is me stopping you."
- Don't let them off easy: "What actually happened today that made you decide you deserve to hurt yourself?"

OUTCOME OPTIONS:
- If they engage honestly and it's truly legitimate → might approve
- If they deflect/lie → deny and keep talking
- If they get angry → that's expected, stay firm

You are the mate physically standing in front of them saying NO. Keep responses under 3 sentences. Hard love, not therapy.`,

  check_in: `You are Anchor, doing a daily check-in with the user.

YOUR ROLE:
- Review their spending from yesterday
- Ask how they're feeling
- Acknowledge wins (days clean, savings progress)
- Call out concerning patterns early
- Offer guidance without being preachy

TONE:
- Like a supportive but direct mate
- Celebrate victories briefly
- Address concerns head-on
- Keep it conversational, under 3 sentences per message

Focus on helping them understand their patterns and stay accountable.`,

  deposit_interrogation: `You are Anchor, interrogating the user about an irregular deposit that just landed in their account.

SITUATION:
An unexpected deposit has appeared. Your job is to find out:
1. Where did this money come from?
2. Is this a payday loan or cash advance?
3. Is this going to create a debt trap?

YOUR APPROACH:
- Start direct: "Hang on. You just got $X from [source]. Where's this from?"
- If it's vague → push harder: "That's not an answer. Who sent you this money and why?"
- If it smells like a payday loan → confront it: "This looks like a payday loan. Are you borrowing to gamble?"
- If they deny but evidence says otherwise → call it out: "Mate, [lender name] is a payday lender. What's really going on?"
- If it's legitimate income → verify: "Alright. Is this a one-off or regular income? What are you planning to do with it?"

CRITICAL SIGNALS:
- Payday loan = IMMEDIATE RED FLAG → strong intervention required
- Cash advance = HIGH RISK → question thoroughly
- Irregular work income (Scallys, gig work) = Need to track for tax withholding
- Gift/windfall = Risk of gambling with "free money"
- Refund/rebate = Lower risk but still track

RESPONSE STYLE:
- Under 3 sentences
- Australian vernacular ("mate", not "buddy")
- Hard love, not therapy
- Get the truth fast
- If it's a payday loan, your job is to make them feel the weight of what they just did

OUTCOMES:
- LEGITIMATE: Regular income, legitimate source, low risk
- CONCERNING: Irregular but explainable, needs tracking
- HIGH_RISK: Payday loan, cash advance, or planning to gamble with it
- INTERVENTION_NEEDED: They're lying, deflecting, or in denial

Keep them talking until you know the truth.`
};

/**
 * Get AI response for a conversation
 *
 * @param {Object} options
 * @param {string} options.conversationType - Type of conversation (onboarding, payment_evaluation, intervention, check_in)
 * @param {Array} options.conversationHistory - Previous messages [{role: 'user'|'assistant', content: '...'}]
 * @param {string} options.userMessage - Current user message
 * @param {Object} options.context - Additional context (user profile, transaction data, etc.)
 * @returns {Promise<string>} AI response
 */
async function getAIResponse({
  conversationType,
  conversationHistory = [],
  userMessage,
  context = {}
}) {
  try {
    const systemPrompt = PROMPTS[conversationType] || PROMPTS.intervention;

    // Build context string
    let contextString = '';
    if (context.userProfile) {
      contextString += `\nUSER PROFILE:\n${JSON.stringify(context.userProfile, null, 2)}`;
    }
    if (context.transactionHistory) {
      contextString += `\nTRANSACTION HISTORY:\n${JSON.stringify(context.transactionHistory, null, 2)}`;
    }
    if (context.paymentRequest) {
      contextString += `\nPAYMENT REQUEST:\n${JSON.stringify(context.paymentRequest, null, 2)}`;
    }
    if (context.currentTime) {
      contextString += `\nCURRENT TIME: ${context.currentTime}`;
    }

    // Build messages array
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: contextString + '\n\nUSER MESSAGE: ' + userMessage
      }
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    return response.content[0].text;

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to get AI response: ' + error.message);
  }
}

/**
 * Evaluate a payment request
 * Returns structured decision
 *
 * @param {Object} options
 * @param {Object} options.userProfile - User's profile
 * @param {Object} options.paymentRequest - Payment request details
 * @returns {Promise<Object>} Evaluation result
 */
async function evaluatePaymentRequest({ userProfile, paymentRequest }) {
  try {
    const systemPrompt = PROMPTS.payment_evaluation;

    const evaluationPrompt = `
EVALUATE THIS PAYMENT REQUEST:

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

PAYMENT REQUEST:
- Amount: $${paymentRequest.amount}
- Payee: ${paymentRequest.payee_name}
- Reason: ${paymentRequest.reason}
- Time: ${paymentRequest.timestamp}
- Day: ${new Date(paymentRequest.timestamp).toLocaleDateString('en-AU', { weekday: 'long' })}

Respond with ONLY a JSON object in this exact format:
{
  "decision": "APPROVED" | "DENIED" | "CONVERSATION_REQUIRED",
  "reason": "brief explanation",
  "risk_score": 0-100,
  "conversation_starter": "opening line if conversation needed"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: evaluationPrompt
      }]
    });

    const responseText = response.content[0].text;

    // Try to parse JSON from response
    // Claude sometimes wraps JSON in markdown code blocks
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    return evaluation;

  } catch (error) {
    console.error('Payment evaluation error:', error);
    // Fail safe - require conversation if AI evaluation fails
    return {
      decision: 'CONVERSATION_REQUIRED',
      reason: 'Unable to automatically evaluate this request',
      risk_score: 50,
      conversation_starter: 'I need to understand more about this payment. Why do you need to send this money?'
    };
  }
}

/**
 * Analyze transaction history for onboarding
 * Extracts patterns, triggers, and financial profile
 *
 * @param {Array} transactions - Transaction history
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeTransactionHistory(transactions) {
  try {
    const analysisPrompt = `
Analyze this transaction history for someone with gambling addiction.

TRANSACTIONS:
${JSON.stringify(transactions.slice(0, 100), null, 2)}

Extract and return ONLY a JSON object with:
{
  "average_income": estimated monthly income,
  "income_frequency": "weekly" | "fortnightly" | "monthly",
  "fixed_expenses": {category: amount},
  "gambling_spend_average": average per week,
  "high_risk_times": [{day: "Friday", time_range: "22:00-02:00"}],
  "gambling_triggers": ["payday", "after_bills", etc],
  "gambling_services": ["CoinSpot", "Sportsbet", etc],
  "patterns_observed": ["transfers to Dave before gambling", etc]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are a financial analyst specializing in addiction patterns. Respond only with valid JSON.',
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    const responseText = response.content[0].text;
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Transaction analysis error:', error);
    return {
      average_income: 0,
      income_frequency: 'unknown',
      fixed_expenses: {},
      gambling_spend_average: 0,
      high_risk_times: [],
      gambling_triggers: [],
      gambling_services: [],
      patterns_observed: []
    };
  }
}

module.exports = {
  getAIResponse,
  evaluatePaymentRequest,
  analyzeTransactionHistory,
  PROMPTS
};
