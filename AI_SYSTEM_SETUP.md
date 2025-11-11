# Anchor AI System - Setup & Deployment Guide

## Overview

The Anchor AI system adds a conversational AI layer powered by Anthropic's Claude that acts as a financial guardian. This system conducts onboarding, evaluates payment requests, and intervenes during gambling triggers using "hard love" accountability.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Mobile    │────────▶│  Vercel API  │────────▶│   Claude    │
│     App     │         │  (Node.js)   │         │     API     │
│  (React     │         └──────────────┘         └─────────────┘
│  Native)    │                │
└─────────────┘                │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│   Voice     │         │   Supabase   │
│  Services   │         │  (Database)  │
│  (STT/TTS)  │         └──────────────┘
└─────────────┘
```

## Database Setup

### 1. Create AI Tables in Supabase

Run the SQL script `supabase/schema-ai.sql` in your Supabase SQL editor:

```bash
# Copy the schema
cat supabase/schema-ai.sql

# Then run it in Supabase SQL Editor
# Dashboard -> SQL Editor -> New Query -> Paste -> Run
```

This creates:
- `user_profiles` - Psychological & financial profiles
- `conversations` - AI conversation logs
- `payment_requests` - Payment evaluation records
- `daily_allowances` - Daily allowance tracking
- `interventions` - Intervention events

### 2. Verify Tables

Check that all tables were created:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see:
- `conversations`
- `daily_allowances`
- `interventions`
- `payment_requests`
- `transactions`
- `user_clean_streak` (view)
- `user_profiles`
- `whitelist`

## Backend API Setup

### 1. Install Dependencies

```bash
cd /path/to/anchor
npm install
```

This installs:
- `@anthropic-ai/sdk` - Claude API client
- `@supabase/supabase-js` - Database client
- `crypto` - Signature validation

### 2. Environment Variables

Create or update `.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# Up Bank Configuration
UP_WEBHOOK_SECRET=your-webhook-secret-here
UP_PERSONAL_ACCESS_TOKEN=your-up-token-here

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Cron Job Security
CRON_SECRET=your-random-secret-here
```

**Getting API Keys:**

**Anthropic API Key:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create new key
5. Copy `sk-ant-...` key

**Cron Secret:**
```bash
# Generate random secret
openssl rand -hex 32
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel Dashboard
# Settings -> Environment Variables
```

**Add these in Vercel Dashboard:**
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `UP_WEBHOOK_SECRET`
- `UP_PERSONAL_ACCESS_TOKEN`
- `CRON_SECRET`

### 4. Configure Cron Job

The daily allowance top-up runs at midnight via Vercel Cron.

Configuration is in `vercel.json`:
```json
"crons": [
  {
    "path": "/api/allowance/top-up",
    "schedule": "0 0 * * *"
  }
]
```

Verify in Vercel Dashboard:
- Settings -> Cron Jobs
- Should show daily job at midnight

## Mobile App Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

New dependencies:
- `@react-native-voice/voice` - Speech-to-text
- `expo-speech` - Text-to-speech (already included)

### 2. Configure Environment Variables

Update `mobile/app.json`:

```json
"extra": {
  "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
  "EXPO_PUBLIC_API_BASE_URL": "https://your-app.vercel.app"
}
```

Or create `.env` in mobile directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=https://your-app.vercel.app
```

### 3. iOS Permissions

Already configured in `app.json`:
- Microphone access for voice input
- Speech recognition for transcription

### 4. Android Permissions

Already configured in `app.json`:
- `RECORD_AUDIO` for voice input

### 5. Run the App

```bash
# Start Expo
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## API Endpoints

All endpoints are deployed to Vercel as serverless functions:

### Onboarding

**POST** `/api/ai/onboarding`

Start or continue onboarding conversation.

```javascript
// Start
{
  "user_id": "uuid",
  "transaction_history": [...],
  "stage": "analyze_transactions"
}

// Continue
{
  "user_id": "uuid",
  "conversation_id": "uuid",
  "user_message": "text response",
  "stage": "ask_questions"
}
```

### Payment Evaluation

**POST** `/api/ai/evaluate-payment`

Evaluate a payment request.

```javascript
{
  "user_id": "uuid",
  "amount": 150,
  "payee_name": "Dave",
  "reason": "Paying back Dave",
  "timestamp": "2025-11-11T23:00:00Z"
}
```

Response:
```javascript
{
  "decision": "denied" | "approved" | "conversation_required",
  "reason": "explanation",
  "risk_score": 0-100,
  "requires_conversation": boolean,
  "conversation_starter": "opening line"
}
```

### Conversation

**POST** `/api/ai/conversation`

Handle back-and-forth conversations.

```javascript
{
  "user_id": "uuid",
  "conversation_id": "uuid", // optional
  "user_message": "text",
  "conversation_type": "intervention" | "payment_request" | "check_in",
  "context": {
    "payment_request_id": "uuid",
    "transaction_id": "uuid"
  }
}
```

### Daily Check-in

**POST** `/api/ai/daily-check-in`

Get daily check-in message.

```javascript
{
  "user_id": "uuid",
  "time_of_day": "morning" | "evening"
}
```

### Allowance Top-up

**POST** `/api/allowance/top-up`

Automated cron job (runs at midnight).

Requires header: `x-vercel-cron-secret: your-cron-secret`

## Testing

### Test Onboarding

1. Open mobile app
2. Navigate to OnboardingScreen
3. Should analyze transactions and start voice interview
4. Answer 5-7 questions
5. Verify profile created in Supabase

### Test Payment Request

1. Go to HomeScreen
2. Tap "Request Payment"
3. Enter:
   - Amount: $150
   - Payee: Dave
   - Reason: "Pay back Dave"
4. Should trigger AI evaluation
5. If denied/conversation required, navigate to ConversationScreen

### Test Intervention

1. Make a non-whitelisted transaction via Up Bank
2. Webhook triggers AlertScreen
3. Tap "Talk to Anchor"
4. Navigate to ConversationScreen
5. Complete conversation

### Test Daily Allowance

Manual test:

```bash
curl -X POST https://your-app.vercel.app/api/allowance/top-up \
  -H "x-vercel-cron-secret: your-cron-secret"
```

Check logs in Vercel Dashboard.

## Voice Features

### Speech-to-Text (User Input)

Using `@react-native-voice/voice`:

```javascript
import voiceService from './services/voice';

// Start listening
await voiceService.startListening(
  (transcription) => {
    console.log('User said:', transcription);
  },
  (error) => {
    console.error('Voice error:', error);
  }
);

// Stop listening
await voiceService.stopListening();
```

### Text-to-Speech (AI Output)

Using `expo-speech`:

```javascript
import voiceService from './services/voice';

// Speak AI response
await voiceService.speak("Hang on mate. What's going on?");

// Stop speaking
await voiceService.stopSpeaking();
```

## AI Prompt Engineering

All prompts are in `api/services/claude.js`.

### Onboarding Prompt

Gets to the root cause of gambling quickly. Direct, not therapeutic.

### Payment Evaluation Prompt

Analyzes against user profile, patterns, triggers. Returns structured JSON.

### Intervention Prompt

Hard love approach. Points out patterns, asks tough questions.

### Check-in Prompt

Supportive but direct. Reviews spending, acknowledges wins.

## Customization

### Adjust AI Tone

Edit prompts in `api/services/claude.js`:

```javascript
const PROMPTS = {
  onboarding: `You are Anchor...`,
  intervention: `You are Anchor, intervening...`,
  // etc.
};
```

### Change Claude Model

Default: `claude-sonnet-4-20250514`

To change:

```javascript
// In claude.js
const response = await anthropic.messages.create({
  model: 'claude-opus-4-20250514', // More powerful
  // or
  model: 'claude-haiku-4-20250301', // Faster, cheaper
  ...
});
```

### Adjust Daily Allowance Cap

Edit `api/allowance/top-up.js`:

```javascript
const DAILY_ALLOWANCE_CAP = 30.00; // Change this
```

## Troubleshooting

### "Failed to start onboarding"

**Cause:** Transaction history empty or API error

**Fix:**
1. Check user has transactions in Up Bank
2. Verify Anthropic API key in Vercel
3. Check logs: `vercel logs`

### Voice recognition not working

**iOS:**
- Check microphone permission granted
- Verify `NSMicrophoneUsageDescription` in app.json

**Android:**
- Check `RECORD_AUDIO` permission
- May need to request at runtime

### "Conversation not found"

**Cause:** Conversation ID doesn't exist

**Fix:**
1. Check Supabase `conversations` table
2. Verify user_id matches
3. Start new conversation if needed

### Cron job not running

**Check:**
1. Vercel Dashboard -> Cron Jobs
2. Verify schedule `0 0 * * *`
3. Check logs for execution
4. Verify `CRON_SECRET` environment variable set

### Claude API rate limits

**Anthropic Rate Limits:**
- Sonnet: 50 requests/min
- Opus: 40 requests/min

**If hitting limits:**
1. Add retry logic with exponential backoff
2. Cache common responses
3. Upgrade API tier

## Production Checklist

- [ ] Database schema deployed
- [ ] All environment variables set in Vercel
- [ ] Cron job configured and tested
- [ ] Mobile app environment variables set
- [ ] Voice permissions configured
- [ ] Anthropic API key active
- [ ] Up Bank webhook connected
- [ ] Test onboarding flow end-to-end
- [ ] Test payment request flow
- [ ] Test intervention flow
- [ ] Test daily allowance top-up
- [ ] Monitor logs for errors
- [ ] Set up error tracking (Sentry, etc.)

## Cost Estimates

**Anthropic Claude API:**
- Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Typical conversation: 500-1000 tokens
- Estimate: ~$0.01-0.02 per conversation

**For 100 users:**
- Daily check-ins: 100 * $0.01 = $1/day
- Payment requests: ~10/day * $0.02 = $0.20/day
- Onboarding: one-time $0.02 per user
- **Total: ~$40-50/month**

**Vercel:**
- Hobby plan: Free (suitable for MVP)
- Pro plan: $20/month (for production)

**Supabase:**
- Free tier: Up to 500MB database, 2GB bandwidth
- Pro plan: $25/month (recommended for production)

**Total Monthly Cost (Production):**
- API: ~$50
- Vercel: $20
- Supabase: $25
- **Total: ~$95/month**

## Security Considerations

1. **API Keys:** Never commit to git. Use environment variables.
2. **Cron Secret:** Validate on every cron job request
3. **Webhook Signatures:** Verify Up Bank webhook signatures
4. **Row Level Security:** Enable RLS on all Supabase tables
5. **Voice Data:** Encrypt voice recordings if storing long-term
6. **User Data:** Follow privacy regulations (GDPR, etc.)

## Support

For issues or questions:
- Check logs: `vercel logs`
- Review Supabase dashboard for database issues
- Test API endpoints with Postman/Insomnia
- Check Anthropic API status: https://status.anthropic.com

## License

MIT
