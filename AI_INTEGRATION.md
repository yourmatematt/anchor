# AI Integration - Claude API

> **Intervention conversations powered by Anthropic's Claude**

This document details the AI conversation and voice intervention system using Claude API instead of OpenAI and ElevenLabs.

## Overview

The Anchor app uses Claude API for:
- **Intervention conversations**: Empathetic, Australian-vernacular accountability
- **Voice memo analysis**: Detecting concerning patterns in spending justifications
- **Real-time responses**: Streaming support for natural conversation flow

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ POST /api/ai/conversation
         │ POST /api/voice/analyze
         ▼
┌─────────────────────┐
│  Vercel Backend     │
│  Serverless APIs    │
└────────┬────────────┘
         │
         │ Claude API calls
         ▼
┌─────────────────────┐
│  Anthropic Claude   │
│  - Text responses   │
│  - Analysis         │
│  - Streaming        │
└─────────────────────┘
```

## Setup

### 1. Get Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy the key (starts with `sk-ant-`)

### 2. Configure Environment

Add to your `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_MODEL=claude-3-opus-20240229
```

**Model Options:**
- `claude-3-opus-20240229` - Highest quality, best for complex interventions (recommended)
- `claude-3-sonnet-20240229` - Balanced speed/quality, good for analysis
- `claude-3-haiku-20240307` - Fastest/cheapest, suitable for simple responses

### 3. Install Dependencies

```bash
# Backend
npm install

# Mobile app (if not already installed)
cd mobile
npm install
```

The `@anthropic-ai/sdk` is already in `package.json`.

### 4. Deploy to Vercel

```bash
vercel --prod
```

Add environment variables in Vercel dashboard:
- Project Settings → Environment Variables
- Add `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`

## Features

### Intervention Conversations

The AI intervenes at key moments:

1. **Immediate** - Right after a non-whitelisted transaction
2. **Follow-up** - 24-hour check-in on previous transactions
3. **Pattern** - When spending patterns are detected
4. **Streak Risk** - User behavior threatens clean streak
5. **Encouragement** - Positive reinforcement for good choices

### Personality & Tone

Claude is configured with Australian vernacular and a tough-but-caring accountability mate persona:

- Direct but never cruel
- Unflinching honesty without judgment
- Calls out bullshit justifications gently but firmly
- Recognizes genuine struggle vs. manipulation
- Short, punchy responses (1-3 sentences)

Example responses:
```
"Alright mate, what's going on? You know this wasn't on the whitelist."

"Yeah nah, you don't believe that excuse any more than I do. What's really happening?"

"You've been clean 47 days. That's not nothing. Don't throw it away on autopilot."
```

### Voice Integration

The system uses native device capabilities for audio:

**Recording (Mobile)**
- Expo AV for high-quality audio recording
- Automatic metadata capture (duration, volume)

**Transcription**
- Placeholder for STT service integration
- Can use Whisper API or similar via backend
- Falls back to manual entry if transcription fails

**Text-to-Speech (Mobile)**
- Expo Speech for natural voice synthesis
- Australian English accent (en-AU)
- Voice profiles: Urgent, Casual, Supportive

**Analysis (Claude)**
- Detects rationalization patterns
- Identifies manipulation attempts
- Flags concerning language
- Provides supportive suggestions

## API Endpoints

### POST /api/ai/conversation

Get AI response for intervention conversation.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I just bought something" },
    { "role": "assistant", "content": "What was it?" },
    { "role": "user", "content": "Just a small thing from Amazon" }
  ],
  "trigger": "immediate",
  "userData": {
    "cleanStreak": 47,
    "totalSpend": 125.50,
    "lastTransaction": "$45.00 at Amazon"
  },
  "streaming": false
}
```

**Response:**
```json
{
  "success": true,
  "text": "Yeah nah, 'just a small thing' from Amazon - we both know how that goes. What was it actually?",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Streaming Mode:**

Set `"streaming": true` to get Server-Sent Events:

```javascript
const response = await fetch('/api/ai/conversation', {
  method: 'POST',
  body: JSON.stringify({ ...params, streaming: true })
});

const reader = response.body.getReader();
// Process chunks as they arrive
```

### POST /api/voice/analyze

Analyze voice memo transcript for concerning patterns.

**Request:**
```json
{
  "transcript": "Yeah I know I shouldn't have but it was on sale and I've been good lately so I deserve it",
  "context": {
    "amount": 89.99,
    "payee": "Kmart"
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "Watch the 'I deserve it' thinking - that's the slippery slope talking.",
  "concernLevel": "medium",
  "flags": ["rationalization", "entitlement"],
  "supportNeeded": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Code Examples

### Using AI Conversation Service (Backend)

```javascript
import { getAIResponse, TriggerType } from './api/services/ai-conversation.js';

// Get intervention response
const response = await getAIResponse({
  messages: conversationHistory,
  trigger: TriggerType.IMMEDIATE,
  userData: {
    cleanStreak: user.cleanStreak,
    totalSpend: todayTotal,
    lastTransaction: `$${amount} at ${payee}`
  }
});

console.log(response); // AI's response text
```

### Using AI Voice Service (Mobile)

```javascript
import aiVoice from './mobile/src/services/AIVoice.js';

// Initialize
await aiVoice.initialize();

// Record voice memo
await aiVoice.startRecording();
// ... user speaks ...
const { uri, duration } = await aiVoice.stopRecording();

// Process and analyze
const analysis = await aiVoice.processVoiceMemo(uri, {
  amount: 45.00,
  payee: 'Amazon'
});

console.log(analysis.concernLevel); // low, medium, high
console.log(analysis.flags); // ['rationalization', ...]

// Get AI response and speak it
await aiVoice.getAndSpeakResponse({
  messages: [],
  trigger: 'immediate',
  userData: { cleanStreak: 30 }
});
```

### Analyzing Transcripts

```javascript
import { analyzeTranscript } from './api/services/ai-conversation.js';

const analysis = await analyzeTranscript(
  "It was just $20 and everyone else has one",
  { amount: 20, payee: 'EB Games' }
);

console.log(analysis);
// {
//   concernLevel: 'high',
//   flags: ['minimization', 'social_comparison'],
//   supportNeeded: true,
//   suggestion: 'Talk to someone about why you're comparing yourself to others.'
// }
```

## Prompt Engineering

### System Prompts

Located in `/api/prompts/intervention-prompts.js`:

- **BASE_PERSONALITY**: Core traits and tone
- **Trigger-specific prompts**: Context for each intervention type
- **Scenario prompts**: Handling defensive, struggling, gaming behaviors

### Customizing Prompts

To adjust the AI's personality:

```javascript
// In intervention-prompts.js
const BASE_PERSONALITY = `You are Anchor's AI intervention coach...

TONE & STYLE:
- Speak with Australian vernacular (mate, yeah, nah, reckon)
- Be direct but never cruel
...
`;
```

To add new intervention types:

```javascript
export const TriggerType = {
  IMMEDIATE: 'immediate',
  CUSTOM_TYPE: 'custom_type', // Add new type
};

// Add corresponding prompt in getInterventionPrompt()
case TriggerType.CUSTOM_TYPE:
  return `${baseContext}

  SITUATION: Your custom scenario...
  YOUR JOB: What the AI should do...`;
```

## Best Practices

### 1. Keep Responses Concise

```javascript
max_tokens: 200, // Limit to 1-3 sentences
```

### 2. Maintain Context

Pass relevant user data:
```javascript
userData: {
  cleanStreak: 47,        // Days of awareness
  totalSpend: 125.50,     // Today's unwhitelisted total
  lastTransaction: "...", // Current transaction
  recentPatterns: []      // Detected spending patterns
}
```

### 3. Handle Failures Gracefully

```javascript
try {
  const response = await getAIResponse(...);
} catch (error) {
  // Use fallback response
  const fallback = "Let's talk about what happened.";
}
```

### 4. Rate Limiting

Claude API has rate limits. Implement caching for common responses:

```javascript
// Cache intervention responses by trigger type
const cache = new Map();
const cacheKey = `${trigger}-${cleanStreak}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

## Cost Optimization

### Model Selection

- **Opus** (~$15/1M input tokens): Complex interventions, high stakes
- **Sonnet** (~$3/1M input tokens): Analysis, follow-ups
- **Haiku** (~$0.25/1M input tokens): Simple acknowledgments

### Token Management

```javascript
// Keep conversation history limited
const recentMessages = messages.slice(-10); // Last 10 messages only

// Use shorter prompts for simple cases
if (trigger === TriggerType.ENCOURAGEMENT) {
  max_tokens: 50; // Quick acknowledgment
}
```

### Estimated Costs

Assuming 10 interventions/day per user:
- Average 100 tokens/intervention
- Using Opus: ~$0.015/day/user = ~$5.50/year/user
- Using Sonnet: ~$0.003/day/user = ~$1.10/year/user

## Testing

### Test Conversation Flow

```bash
curl -X POST https://your-app.vercel.app/api/ai/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "immediate",
    "userData": {
      "cleanStreak": 30,
      "totalSpend": 50,
      "lastTransaction": "$25 at Kmart"
    }
  }'
```

### Test Voice Analysis

```bash
curl -X POST https://your-app.vercel.app/api/voice/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I know I shouldnt have but it was on sale",
    "context": {
      "amount": 49.99,
      "payee": "Target"
    }
  }'
```

## Troubleshooting

### API Key Issues

```
Error: Invalid API key
```

Solution:
1. Check `.env` has correct key format (`sk-ant-...`)
2. Verify key in Vercel environment variables
3. Redeploy after adding environment variables

### Model Not Found

```
Error: Model not available
```

Solution:
1. Check `CLAUDE_MODEL` environment variable
2. Use valid model name (see Setup section)
3. Ensure Anthropic account has access to model

### Rate Limiting

```
Error: Rate limit exceeded
```

Solution:
1. Implement exponential backoff
2. Add caching for common responses
3. Upgrade Anthropic plan if needed

### Mobile Voice Issues

```
Error: Audio permissions denied
```

Solution:
1. Check `app.json` has microphone permissions
2. Request permissions in app: `await Audio.requestPermissionsAsync()`
3. iOS: Add `NSMicrophoneUsageDescription` to Info.plist

## Migration from OpenAI/ElevenLabs

### Removed Dependencies

```json
// OLD - Remove these
"openai": "^4.0.0",
"elevenlabs-api": "^1.0.0"

// NEW - Using this instead
"@anthropic-ai/sdk": "^0.20.0"
```

### Code Changes

**Before (OpenAI):**
```javascript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...]
});
```

**After (Claude):**
```javascript
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  messages: [...]
});
```

### Environment Variables

**Before:**
```bash
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

**After:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-opus-20240229
```

## Security

- API key stored in environment variables only
- Never exposed to mobile client
- All AI calls go through backend endpoints
- Input validation on all endpoints
- Rate limiting recommended for production

## Resources

- [Anthropic API Docs](https://docs.anthropic.com)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/)
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)

## Support

For issues with:
- **Claude API**: [Anthropic Support](https://support.anthropic.com)
- **Anchor App**: See main README.md
- **Expo Audio**: [Expo Forums](https://forums.expo.dev)

---

**Built for recovery. Built for accountability. Now powered by Claude.**
