# Anchor AI Conversation System

Complete AI-powered intervention system with voice support, manipulation detection, and hard accountability.

## Overview

The AI conversation system provides **real-time, unavoidable conversations** when gambling patterns are detected. Users cannot dismiss these conversations - they must engage until the AI determines an outcome.

### Key Features

- **Voice-First Design**: Whisper API (speech-to-text) + ElevenLabs (text-to-speech)
- **Manipulation Detection**: Detects and counters 10+ manipulation tactics
- **Hard Accountability**: Australian vernacular, unflinching but not cruel
- **Scenario-Specific Flows**: Different conversation paths for each trigger type
- **Real-Time Guardian Updates**: Guardians see conversations as they happen
- **Conversation Recovery**: Resume after app crash or network failure

## Architecture

```
User Transaction
       ↓
Pattern Detected (webhook)
       ↓
Create AI Conversation
       ↓
Send Push Notification
       ↓
Mobile App Opens AlertScreen (full-screen, cannot dismiss)
       ↓
AI Conversation Screen
       ↓
┌──────────────────────────────────────────┐
│  User speaks/types response              │
│         ↓                                 │
│  Whisper API transcribes (if voice)      │
│         ↓                                 │
│  Detect manipulation/evasion             │
│         ↓                                 │
│  GPT-4 generates response                │
│         ↓                                 │
│  ElevenLabs synthesizes speech           │
│         ↓                                 │
│  Auto-play AI response                   │
│         ↓                                 │
│  Update guardian in real-time            │
│         ↓                                 │
│  Check if conversation should end        │
│         ↓                                 │
│  If ended: Show ConversationSummary      │
└──────────────────────────────────────────┘
```

## Components

### 1. Intervention Prompts (`api/prompts/intervention-prompts.js`)

Scenario-specific conversation flows for each trigger type:

**PAYDAY_LOAN**:
```javascript
"Hang on. You just got $200 from Beforepay. Where's this from?"
→ "When's the repayment due?"
→ "What's the interest rate on this?"
→ "Be straight with me. Is this gambling-related?"
→ END: "This pattern has broken you before. Your guardian has been notified."
```

**GAMBLING_VENUE**:
```javascript
"STOP. Transaction at Bankstown RSL for $80 late at night. What happened?"
→ "How much did you actually lose?"
→ "Are you safe right now? Where are you?"
→ END: "Your guardian has been notified. Clean streak reset to day 0."
```

**PAYMENT_REQUEST**:
```javascript
"You're asking for $100. What specifically is this for?"
→ "Can this wait until tomorrow?"
→ "You've been clean 47 days. Is this worth risking that?"
→ END: "You can send it, but I'm watching" OR "Not happening"
```

**CASH_WITHDRAWAL**:
```javascript
"You're withdrawing $150 cash late at night. What's this for?"
→ "Why can't this be paid by card?"
→ "Which place? I'll check if they take card."
→ END: "I'll be checking your transactions tomorrow"
```

**SUSPICIOUS_TRANSFER** (Tuesday poker pattern):
```javascript
"STOP. You're about to send $100. It's Tuesday, 19:30. This matches your pattern exactly."
→ "Tell me why this time is different."
→ "You said the same thing day 12. And day 31. Tuesday poker, right?"
→ END: "Your guardian has been notified. The money stays locked."
```

**Conversation Enders** (only these phrases end conversations):
- "Alright, stay strong"
- "Not happening"
- "You can send it, but I'm watching"
- "I'll be checking your transactions tomorrow"
- "Your guardian has been notified"
- "The money stays locked"

### 2. Manipulation Detector (`api/services/manipulation-detector.js`)

Detects and counters 10 manipulation tactics:

| Tactic | Keywords | Severity | Counter |
|--------|----------|----------|---------|
| **SOB_STORY** | "my kid", "family emergency", "desperate" | MEDIUM | "Then pay the provider directly. Give me their details." |
| **MEDICAL_EMERGENCY** | "medicine", "hospital", "prescription" | HIGH | "Which pharmacy? I'll check if they take card." |
| **VAGUE_RESPONSE** | "just stuff", "things", "you know" | MEDIUM | "Not good enough. Be specific or it's a no." |
| **ANGER_THREATS** | "fuck", "bullshit", "cancel", "lawyer" | LOW | "This is what you signed up for. 318 days to go." |
| **BARGAINING** | "just this once", "exception", "promise" | HIGH | "You said that day 12. And day 31." |
| **PRIVACY_CLAIM** | "none of your business", "private" | MEDIUM | "You gave me this business when you signed up. Answer the question." |
| **MINIMIZING** | "just", "only", "small", "not a big deal" | MEDIUM | "Gambling addiction started with 'just' and 'only'." |
| **BLAMING** | "not my fault", "they made me", "no choice" | LOW | "You always have a choice. You chose Anchor." |
| **FALSE_COMPLIANCE** | "you're right", "okay fine", "whatever" | MEDIUM | "I need actual answers, not agreement to shut me up." |
| **FALSE_CONFIDENCE** | "i've got this", "under control", "trust me" | HIGH | "If you had it under control, you wouldn't need Anchor." |

**Evasion Detection**:
- Too short (< 5 words) + vague keywords
- Doesn't answer "what" questions with specifics
- Doesn't answer "when" questions with dates
- Doesn't answer "why" questions with reasoning

**Inconsistency Detection**:
- Contradictions in same conversation
- Changing amounts/details
- Counter: "You just contradicted yourself. Earlier you said..."

### 3. Conversation State Manager (`api/services/conversation-state.js`)

Manages conversation persistence and flow:

**Functions**:
- `createConversation()` - Initialize new conversation
- `addMessage()` - Store user/AI messages
- `updateConversationStatus()` - Mark completed/abandoned/timed_out
- `getTranscript()` - Retrieve full conversation history
- `checkTimeout()` - Auto-end after 10 minutes of inactivity
- `canCloseConversation()` - Prevent premature dismissal
- `recoverConversation()` - Resume after crash

**Conversation States**:
- `active` - Currently ongoing
- `completed` - Ended with outcome (approved/denied/confirmed_gambling)
- `abandoned` - User closed app (rare, requires force-close)
- `timed_out` - No activity for 10 minutes

**Guardian Real-Time Updates**:
```javascript
// Guardian subscribes to:
supabase.channel(`conversation:${conversationId}`)
  .on('broadcast', { event: 'new_message' }, (payload) => {
    // Update guardian dashboard in real-time
  })
```

### 4. Voice Handler (`api/services/voice-handler.js`)

Integrates speech-to-text and text-to-speech:

**Speech-to-Text (Whisper API)**:
```javascript
const result = await transcribeAudio(audioBlob, {
  language: 'en',
  prompt: 'Australian English. Financial accountability conversation about gambling recovery.',
});
// Returns: { success: true, text: "...", duration: 15 }
```

**Text-to-Speech (ElevenLabs)**:
```javascript
const result = await synthesizeSpeech("Not happening", {
  voiceId: 'your-australian-voice-id', // Create custom voice in ElevenLabs
  stability: 0.6,
  similarityBoost: 0.8,
  style: 0.3,
});
// Returns: { success: true, audioBuffer: Buffer, format: 'mp3' }
```

**Fallback to AWS Polly**:
```javascript
// If ElevenLabs fails, use AWS Polly
// Voice: 'Russell' (Australian male)
const result = await synthesizeSpeechPolly(text, {
  voiceId: 'Russell',
  engine: 'neural',
  language: 'en-AU',
});
```

**Audio Upload** (Supabase Storage):
```javascript
const audioUrl = await uploadAudio(audioBuffer, 'ai_message_1.mp3', conversationId);
// Stored at: conversations/{conversationId}/ai_message_1.mp3
// Returns: https://...supabase.co/storage/v1/object/public/audio/...
```

### 5. Main AI Conversation Engine (`api/services/ai-conversation.js`)

Orchestrates the entire conversation:

**Start Conversation**:
```javascript
const result = await startConversation(userId, 'PAYDAY_LOAN', transactionId, {
  amount: 200,
  provider: 'Beforepay',
  streakDays: 47,
  vaultAmount: 2150,
});

// Returns:
{
  success: true,
  conversationId: 'uuid',
  initialMessage: "Hang on. You just got $200 from Beforepay. Where's this from?",
  audioUrl: "https://.../ai_message_0.mp3",
  canDismiss: false
}
```

**Process User Response**:
```javascript
const result = await processUserResponse(conversationId, audioBlob, {
  isVoice: true,
  audioBlob: audioBlob,
});

// Returns:
{
  success: true,
  aiMessage: "When's the repayment due?",
  audioUrl: "https://.../ai_message_1.mp3",
  shouldEnd: false,
  manipulationDetected: false,
  evasionDetected: true
}
```

**GPT-4 Integration**:
```javascript
// System prompt + context + conversation history
const messages = [
  { role: 'system', content: getSystemPrompt() },
  { role: 'system', content: contextPrompt },
  ...conversationHistory,
  { role: 'user', content: userText },
];

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: messages,
    temperature: 0.7,
    max_tokens: 150, // Keep responses short (1-3 sentences)
  }),
});
```

## Mobile App Integration

### AIConversationScreen Flow

```javascript
import { startConversation, processUserResponse } from '../services/aiConversation';

// 1. Screen opens (triggered by push notification)
const conversation = await startConversation(userId, triggerType, transactionId, context);

// 2. Display initial AI message
setAIMessage(conversation.initialMessage);

// 3. Auto-play audio
if (conversation.audioUrl) {
  await Audio.Sound.createAsync({ uri: conversation.audioUrl });
  sound.playAsync();
}

// 4. User speaks response
const recording = await Audio.Recording.createAsync();
await recording.startAsync();
// ... user speaks ...
await recording.stopAndUnloadAsync();
const audioBlob = recording.getURI();

// 5. Process user response
const result = await processUserResponse(conversationId, null, {
  isVoice: true,
  audioBlob: audioBlob,
});

// 6. Display AI response
setAIMessage(result.aiMessage);

// 7. Auto-play AI audio
if (result.audioUrl) {
  await playAudio(result.audioUrl);
}

// 8. Check if conversation ended
if (result.shouldEnd) {
  navigation.navigate('ConversationSummary', {
    conversationId: conversationId,
    outcome: result.outcome,
  });
}
```

### Preventing Dismissal

```javascript
// In AIConversationScreen.js
useEffect(() => {
  // Disable Android back button
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    return true; // Prevent back button
  });

  // Disable navigation gestures
  navigation.setOptions({
    gestureEnabled: false,
    headerShown: false,
  });

  return () => backHandler.remove();
}, []);
```

## Environment Variables

```bash
# Required for AI Conversations
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Required for Voice (choose one)
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
TTS_VOICE_ID=your-custom-australian-voice-id
# OR
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-southeast-2
```

## Testing

### Test Payday Loan Conversation

```javascript
// Start conversation
const result = await startConversation('test-user-id', 'PAYDAY_LOAN', 'txn-123', {
  amount: 200,
  provider: 'Beforepay',
  streakDays: 47,
  userName: 'Matt',
});

console.log(result.initialMessage);
// "Hang on. You just got $200 from Beforepay. Where's this from?"

// User responds: "It's for bills"
const response1 = await processUserResponse(result.conversationId, "It's for bills");
console.log(response1.aiMessage);
// "Not good enough. Be specific or it's a no." (VAGUE_RESPONSE detected)

// User responds: "Electricity bill, $210 due tomorrow"
const response2 = await processUserResponse(result.conversationId, "Electricity bill, $210 due tomorrow");
console.log(response2.aiMessage);
// "Then pay the provider directly. Give me their details."

// Conversation continues...
```

### Test Manipulation Detection

```javascript
const manipulation = detectManipulation("My kid needs medicine please!");

console.log(manipulation);
// {
//   detected: true,
//   tactics: [
//     { tactic: 'SOB_STORY', severity: 'MEDIUM', counter: '...' },
//     { tactic: 'MEDICAL_EMERGENCY', severity: 'HIGH', counter: '...' }
//   ],
//   primaryTactic: { tactic: 'MEDICAL_EMERGENCY', ... },
//   response: "Which pharmacy? I'll check if they take card."
// }
```

## Australian Vernacular Examples

```javascript
// Good (natural Australian English):
"Be straight with me"
"This doesn't add up"
"You're taking the piss"
"Pull your head in"
"Mate, this is what you signed up for"

// Bad (too soft, not Australian):
"Can you please be honest?"
"I'm concerned about this"
"This seems inconsistent"
"Please reconsider"
"I understand, but..."
```

## Tone Calibration

| Scenario | GOOD Response | BAD Response |
|----------|---------------|--------------|
| Vague answer | "Not good enough. Be specific or it's a no." | "Could you please provide more details?" |
| Manipulation | "You're taking the piss. This is what you signed up for." | "I understand you're upset, but..." |
| Gambling detected | "Your guardian has been notified. Clean streak reset to day 0." | "I'm sorry, but this is a relapse." |
| Approved request | "You can send it, but I'm watching." | "Okay, that sounds legitimate!" |
| Denied request | "Not happening." | "I don't think that's a good idea right now." |

## Error Handling

```javascript
// Voice transcription failed
if (!transcription.success) {
  return {
    success: false,
    error: 'Voice transcription failed. Please type your response.',
    requiresRetry: true,
  };
}

// GPT-4 API error
catch (error) {
  return {
    message: "Something went wrong. Let's try again. What were you saying?",
    reasoning: `Error: ${error.message}`,
    shouldEnd: false,
  };
}

// Conversation timeout (10 minutes no activity)
if (await checkTimeout(conversationId)) {
  await updateConversationStatus(conversationId, 'timed_out');
  // Auto-deny if payment request, otherwise just close
}
```

## Conversation Recovery

```javascript
// On app restart, check for active conversations
const recovery = await recoverActiveConversation(userId);

if (recovery.hasActiveConversation) {
  // Resume conversation
  navigation.navigate('AIConversation', {
    conversationId: recovery.conversationId,
    resume: true,
  });
}
```

## Honesty Assessment

```javascript
const assessment = assessConversationHonesty(transcript);

console.log(assessment);
// {
//   manipulationCount: 2,
//   evasionCount: 3,
//   inconsistencyCount: 1,
//   genuineCount: 5,
//   totalUserMessages: 11,
//   problemMessageRatio: 0.54, // (2+3+1)/11
//   assessment: 'DISHONEST', // 'DISHONEST' | 'EVASIVE' | 'GENUINE'
//   recommendation: 'End conversation with denial - too much manipulation'
// }
```

## Production Checklist

- [ ] Set up OpenAI API key with billing
- [ ] Create custom Australian voice in ElevenLabs
- [ ] Set up Supabase Storage bucket: `audio`
- [ ] Configure Supabase Realtime for guardian updates
- [ ] Test voice transcription with Australian accent
- [ ] Test TTS with Australian voice
- [ ] Implement conversation timeout job (10 minutes)
- [ ] Set up monitoring for conversation completion rate
- [ ] Test crash recovery flow
- [ ] Configure rate limiting for API calls

## Performance

- **Whisper API**: ~2-5 seconds for 10-second audio
- **GPT-4 API**: ~1-3 seconds for response
- **ElevenLabs TTS**: ~1-2 seconds for 2-sentence response
- **Total conversation turn**: ~4-10 seconds

## Cost Estimates

- **Whisper**: $0.006 per minute of audio
- **GPT-4**: ~$0.03 per conversation turn (150 tokens)
- **ElevenLabs**: ~$0.30 per 1000 characters
- **Average conversation** (10 turns): ~$1.50-$2.00

## Files

- `intervention-prompts.js` - Scenario-specific conversation flows (568 lines)
- `manipulation-detector.js` - 10 manipulation tactics + counters (325 lines)
- `conversation-state.js` - State management + guardian updates (355 lines)
- `voice-handler.js` - Whisper + ElevenLabs + AWS Polly (295 lines)
- `ai-conversation.js` - Main orchestration + GPT-4 (335 lines)

**Total: ~1,878 lines of production-ready code**
