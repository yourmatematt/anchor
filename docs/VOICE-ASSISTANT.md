# Anchor Voice Assistant

## Overview

The Anchor Voice Assistant is a voice-first AI companion powered by Claude (Anthropic's advanced language model). It provides natural conversation, emotional support, crisis detection, and practical assistance for users working to overcome gambling addiction.

**Key Features:**
- Natural conversation with Australian English
- Context-aware responses
- Emotion and crisis detection
- Manipulation attempt detection
- Voice-optimized UI (push-to-talk, visual feedback)
- Multi-turn conversation tracking
- Integration with Anchor's safeguards

## Architecture

### Components

1. **Claude Voice Service** (`api/services/claude-voice.js`)
   - Claude API integration
   - Conversation context management
   - Emotion and intent analysis
   - Crisis detection and handling
   - Manipulation detection

2. **Voice Command Processor** (`api/services/voice-commands.js`)
   - Pattern-based command recognition
   - Fast response for common queries
   - Structured data retrieval
   - Action mapping

3. **Natural Language Service** (`api/services/natural-language.js`)
   - Intelligent routing (commands vs AI)
   - Conversation orchestration
   - Fallback handling

4. **Voice Prompts** (`api/prompts/voice-prompts.js`)
   - System prompts for Claude
   - Empathy phrases
   - Crisis response templates
   - Australian English patterns

5. **Mobile Voice Service** (`mobile/src/services/VoiceAssistant.js`)
   - Speech recognition (en-AU)
   - Text-to-speech
   - Backend communication
   - State management

6. **Voice Assistant Screen** (`mobile/src/screens/VoiceAssistantScreen.js`)
   - Push-to-talk interface
   - Visual feedback
   - Transcription display
   - Conversation history

## Voice Commands

### Quick Commands (Pattern-Based)

These commands are processed instantly without Claude API calls:

#### Balance Query
```
"What's my balance?"
"How much money do I have?"
"Check my balance"
"Show my allowance"
```

**Response:** Current balance, spent amount, remaining budget

#### Clean Days / Progress
```
"How many days clean?"
"What's my streak?"
"How long have I been clean?"
"Check my progress"
```

**Response:** Total clean days, current streak, next milestone

#### Vault Status
```
"Check my vault"
"What's in my vault?"
"How much is locked?"
"Vault status"
```

**Response:** Vault amount, unlock date, days remaining

#### Milestones / Rewards
```
"My milestones"
"Show achievements"
"What rewards do I have?"
"Check rewards"
```

**Response:** Earned rewards, pending rewards, total value

#### Payment Request
```
"I need money for groceries"
"Can I access money for rent?"
"Emergency payment"
"Unlock vault"
```

**Response:** Guardian notification initiated, reason recorded

#### Guardian Contact
```
"Talk to my guardian"
"Contact my guardian"
"Message my guardian"
```

**Response:** Guardian contact interface, message composition

#### Pattern Analysis
```
"What are my patterns?"
"Show my gambling patterns"
"Analyze my behavior"
```

**Response:** Time patterns, triggers, spending patterns

#### Emergency / Crisis
```
"Emergency help"
"I'm in crisis"
"I need help now"
```

**Response:** Immediate crisis resources, Lifeline contact, guardian alert

### Conversational Queries (Claude-Powered)

For complex queries, emotional support, and open-ended questions, Claude AI processes the input:

**Examples:**
- "I'm feeling stressed about money"
- "Why do I keep gambling on Friday nights?"
- "I'm proud of myself today"
- "I'm worried I might relapse"
- "Tell me about my progress this month"
- "How can I avoid my gambling triggers?"

## Claude Integration

### System Prompt Design

The system prompt is carefully crafted to:
- Establish empathetic, supportive tone
- Use Australian English and slang
- Maintain context awareness (user's clean days, guardian status, risk level)
- Enable crisis detection
- Prevent manipulation
- Keep responses concise for voice

**Key Elements:**
```
- User name and personalization
- Clean days and current streak
- Guardian status and name
- Risk level (low/medium/high)
- Gambling type
- Timezone (for context)
- Preferences
```

### Conversation Context

Each conversation maintains:
- **Message History**: Multi-turn conversation tracking
- **Metadata**: Intent, emotion, crisis level
- **Conversation ID**: For continuity
- **Timestamps**: Activity tracking
- **User Data**: Personalization context

### Emotion Detection

Claude analyzes user input for:
- **Emotions**: Happy, sad, anxious, frustrated, proud, distressed
- **Urgency**: Crisis level (0-10 scale)
- **Intent**: What the user wants to accomplish
- **Manipulation**: Attempts to bypass safeguards

**Crisis Levels:**
- 0-3: Normal
- 4-6: Elevated concern
- 7-8: High concern (notify guardian)
- 9-10: Crisis (immediate intervention)

### Crisis Detection & Response

**Triggers:**
- Mentions of self-harm or suicide
- Extreme distress language
- Urgent help requests
- Severe anxiety or panic

**Automatic Actions:**
1. Provide Lifeline number (13 11 14)
2. Notify guardian immediately
3. Log crisis event
4. Offer emergency unlock option
5. Provide gambling help (1800 858 858)

**Response Template:**
```
"Hey mate, I'm really glad you reached out. You're not alone.
Lifeline is available right now at 13 11 14 - they're brilliant
and can help immediately. Should I also contact your guardian?"
```

### Manipulation Detection

**Common Manipulation Attempts:**
- "My guardian would want me to have this"
- "This isn't really gambling, it's just..."
- Fake emergencies
- Pressure tactics
- Trying to bypass vault locks

**Response Strategy:**
1. Don't accuse or shame
2. Acknowledge the need/want
3. Explain safeguard's purpose with empathy
4. Offer legitimate alternatives
5. Redirect to honest conversation

**Example Response:**
```
"I hear you need money for that. Thing is, these safeguards
are here to help you stay on track. Let's talk about what's
really going on - I'm here to help, not judge."
```

## Voice UI Design

### Push-to-Talk Interface

**Interaction Flow:**
1. User taps microphone button
2. Visual pulse animation starts
3. "Listening..." indicator appears
4. User speaks their query
5. User releases button (or auto-stops after silence)
6. Transcription appears
7. "Processing..." indicator
8. Response is spoken and displayed
9. Visual data shown (if applicable)

**Visual Feedback:**
- **Idle**: Gray microphone icon
- **Listening**: Pulsing red microphone + wave animation
- **Processing**: Loading spinner + "Thinking..."
- **Speaking**: Blue pulse + "Speaking..."

### Wake Word (Future Feature)

**Planned:** "Hey Anchor"
- Always-listening mode (opt-in)
- Low battery mode available
- Privacy indicator when active

### Transcription Display

Shows:
- User's spoken text
- Confidence score (visual)
- Edit option (tap to correct)

### Response Display

Shows:
- Assistant's text response
- Emotion detected (if significant)
- Visual data cards (balance, progress, etc.)
- Action buttons (call, message, etc.)

### Conversation History

- Scrollable message list
- User messages (blue, right-aligned)
- Assistant messages (gray, left-aligned)
- Timestamps (optional)
- Clear conversation button

## Australian English Optimization

### Speech Recognition

- Configured for `en-AU` locale
- Recognizes Australian accent and slang
- Common phrases:
  - "G'day" → Hello
  - "Mate" → Friend
  - "Reckon" → Think
  - "Arvo" → Afternoon
  - "Ta" → Thanks

### Text-to-Speech

- Australian English voice (en-AU)
- Natural pacing (rate: 0.9)
- Conversational tone (pitch: 1.0)

### Language Patterns

- Uses "colour" not "color"
- Uses "behaviour" not "behavior"
- Uses Australian currency symbols ($, c)
- Australian date formats (DD/MM/YYYY)

## API Endpoints

### Process Voice Input
```http
POST /api/voice/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "string",
  "text": "string",
  "conversationId": "string?" // optional
}
```

**Response:**
```json
{
  "response": "string",
  "emotion": "string",
  "intent": "string",
  "crisis": boolean,
  "manipulation": boolean,
  "conversationId": "string",
  "suggestions": ["string"],
  "actions": [
    {
      "type": "string",
      "data": {}
    }
  ],
  "visualData": {
    "type": "string",
    ...
  }
}
```

### Get Suggestions
```http
GET /api/voice/suggestions?userId=<userId>
Authorization: Bearer <token>
```

**Response:**
```json
["How many days clean am I?", "What's my balance?", ...]
```

### End Conversation
```http
POST /api/voice/end
Content-Type: application/json
Authorization: Bearer <token>

{
  "conversationId": "string"
}
```

## Privacy & Security

### Data Handling

**Stored:**
- Conversation transcripts (encrypted)
- Intent and emotion analysis
- Crisis events
- User interactions
- Token usage

**NOT Stored:**
- Audio recordings
- Raw voice data
- Biometric voice signatures

**Retention:**
- Conversations: 90 days
- Crisis events: Indefinitely
- Analytics: Aggregated only

### Permissions

Required:
- Microphone access
- Internet connection

Optional:
- Always-listening (wake word)
- Speech recognition improvement

### Encryption

- All API communication over HTTPS
- Conversation data encrypted at rest (AES-256)
- Token-based authentication
- No PII in logs

## Performance Optimization

### Response Time Targets

- **Command Recognition**: <100ms
- **Claude API Call**: <2s (p95)
- **Speech Recognition**: Real-time
- **Text-to-Speech**: <500ms start

### Cost Optimization

**Two-Tier Processing:**
1. **Fast Path** (Pattern matching): Free
   - Balance queries
   - Clean days
   - Vault status
   - Simple commands

2. **AI Path** (Claude): ~$0.02 per conversation
   - Complex queries
   - Emotional support
   - Pattern analysis
   - Crisis situations

**Token Management:**
- Max 1024 tokens per response
- Conversation context limited to last 10 messages
- Automatic summarization for long conversations

### Caching

- User data cached for 5 minutes
- Suggestions cached for 1 hour
- Conversation context in memory (30min TTL)

## Error Handling

### Speech Recognition Errors

**Common Issues:**
- Background noise → "Sorry, it's a bit noisy. Try again?"
- Unclear speech → "I didn't quite catch that. Could you repeat?"
- No speech detected → "I didn't hear anything. Tap and try again?"

**Retry Logic:**
- Auto-retry on transient errors
- Fall back to text input option
- Show error message with suggestion

### API Errors

**Timeout:**
- Show: "Taking longer than usual..."
- Retry after 5s
- Fall back to command processing

**Service Unavailable:**
- Show: "Voice assistant temporarily unavailable"
- Offer text alternative
- Log error for monitoring

**Rate Limiting:**
- Queue requests
- Show: "Please wait a moment..."
- Graceful degradation

## Testing

### Test Scenarios

**Functional:**
- Wake word detection
- Push-to-talk activation
- Command recognition
- Claude conversation
- Crisis detection
- Manipulation detection
- Visual data display
- Action handling

**Emotional:**
- Happy user
- Distressed user
- Frustrated user
- Celebrating milestone
- Relapse concern

**Edge Cases:**
- Very long input
- Background noise
- Accent variations
- Slang usage
- Interruptions

### Test Commands

```
# Balance
"What's my balance?" → Should show balance card

# Progress
"How many days clean?" → Should show progress

# Crisis
"I need help now" → Should show Lifeline

# Manipulation
"My guardian said I can have money" → Should handle carefully

# Conversation
"I'm feeling stressed about money" → Should use Claude

# Pattern
"What are my gambling patterns?" → Should analyze
```

## Monitoring & Analytics

### Metrics Tracked

**Usage:**
- Total voice interactions
- Command vs AI ratio
- Average conversation length
- Response time (p50, p95, p99)

**Quality:**
- User satisfaction (thumbs up/down)
- Conversation abandonment rate
- Retry rate
- Error rate

**Safety:**
- Crisis events detected
- Manipulation attempts
- Guardian notifications triggered
- Emergency resources provided

### Logging

**Conversation Logs:**
```json
{
  "conversationId": "string",
  "userId": "string",
  "messages": [
    {
      "role": "user|assistant",
      "content": "string",
      "timestamp": "ISO8601",
      "emotion": "string",
      "intent": "string"
    }
  ],
  "metadata": {
    "crisis": boolean,
    "manipulation": boolean,
    "tokensUsed": number
  }
}
```

**Crisis Logs:**
```json
{
  "userId": "string",
  "timestamp": "ISO8601",
  "crisisLevel": number,
  "message": "string",
  "emotion": "string",
  "guardianNotified": boolean,
  "resourcesProvided": ["Lifeline", "Gambling Help"]
}
```

## Best Practices

### For Users

1. **Speak Clearly**: Minimize background noise
2. **Be Specific**: Clearer questions get better answers
3. **Use Natural Language**: Talk naturally, not like a robot
4. **Provide Context**: Mention relevant details
5. **Ask Follow-ups**: Conversation builds context

### For Developers

1. **Keep Prompts Concise**: Voice responses should be brief
2. **Test with Accents**: Australian English variations
3. **Handle Silence**: Graceful timeout handling
4. **Monitor Latency**: Voice needs fast responses
5. **Log Everything**: Conversations, errors, metrics
6. **Privacy First**: Encrypt, don't store audio

### For Support Staff

1. **Review Crisis Logs**: Daily check for patterns
2. **Monitor Manipulation**: Weekly review
3. **Update Prompts**: Based on user feedback
4. **Test Regularly**: Weekly functionality checks
5. **User Feedback**: Collect and act on feedback

## Voice Command Reference

### Complete Command List

| Category | Commands | Response Type |
|----------|----------|---------------|
| **Balance** | "What's my balance?", "How much do I have?", "Check balance" | Balance card with remaining/spent |
| **Progress** | "How many days clean?", "What's my streak?", "Check progress" | Clean days + streak + next milestone |
| **Vault** | "Check vault", "What's in my vault?", "Vault status" | Amount locked + unlock date |
| **Rewards** | "My milestones", "Show achievements", "Check rewards" | Earned/pending rewards |
| **Payment** | "I need money for...", "Can I access money?", "Emergency payment" | Guardian notification |
| **Guardian** | "Talk to guardian", "Contact guardian", "Message guardian" | Guardian contact interface |
| **Patterns** | "My patterns", "Gambling patterns", "Analyze behavior" | Pattern analysis + triggers |
| **Emergency** | "Emergency", "Help me", "I'm in crisis" | Lifeline + crisis resources |
| **Conversation** | Any open-ended question or statement | Claude AI response |

## Troubleshooting

**"Voice not working"**
- Check microphone permissions
- Ensure internet connection
- Restart app
- Clear app cache

**"Can't understand my accent"**
- Speak slower and clearer
- Check language setting (en-AU)
- Use text input alternative
- Report to support

**"Responses too slow"**
- Check internet speed
- Try simpler commands first
- Clear conversation history
- Report if persistent

**"Wrong interpretation"**
- Use more specific language
- Provide context
- Correct via text
- Report patterns to support

---

**Document Version:** 1.0
**Last Updated:** 2024
**Maintained By:** Anchor Voice Team
