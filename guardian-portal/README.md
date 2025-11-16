# Anchor Guardian Portal

Mobile-first web portal for guardians to monitor (not control) their loved one's recovery journey.

## Philosophy

**Monitor, Don't Control**

Guardians can:
- ✅ See clean streak and progress
- ✅ View AI conversation transcripts in real-time
- ✅ Understand behavioral patterns
- ✅ Trigger emergency check-ins
- ✅ Receive notifications

Guardians cannot:
- ❌ See specific transaction amounts
- ❌ Approve or deny transactions
- ❌ Access bank details
- ❌ Change user settings
- ❌ Cancel the commitment

This is about **accountability, not control**.

## Features

### Dashboard
- Large clean streak display (days clean)
- Current status: Stable / AI Conversation Active / High Risk
- Recent activity timeline (last 7 days)
- Money saved (vague - "significant amount")
- Emergency button to trigger check-in

### AI Conversations
- Real-time view of active conversations
- Full transcript history (last 30 days)
- Manipulation/evasion flags highlighted
- Cannot intervene - only observe
- Updates live via Supabase Realtime

### Behavioral Patterns
- Pattern detection insights (7/30/90 day views)
- Most common patterns
- Time-based analysis (late night, specific days)
- Trending indicators (increasing/decreasing)
- Privacy-focused (no specific amounts)

### Emergency Button
- Large red button: "User May Be In Crisis"
- Requires reason for concern
- Triggers immediate AI check-in
- Sends push notification to user
- Logs emergency trigger

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Auth**: Supabase Auth (magic link via SMS)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Styling**: Vanilla CSS (mobile-first, dark theme)
- **Deployment**: Vercel

## Setup

### 1. Install Dependencies

```bash
cd guardian-portal
npm install
```

### 2. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

Portal will be available at `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
npm start
```

## Authentication

Guardians log in using **magic link via SMS**:

1. Enter mobile number (Australian format: 0412 345 678)
2. Receive 6-digit code via SMS
3. Enter code to verify
4. Session persists until sign out

The phone number must match the guardian's phone in the database (`guardians` table).

## Pages

### `/` (Login)
- Magic link SMS authentication
- No passwords
- Clean, simple interface

### `/dashboard` (Main)
- Clean streak display (72pt number)
- Current status badge
- Recent timeline
- Financial progress (vague)
- Emergency button

### `/conversations` (Transcripts)
- List of all conversations (last 30 days)
- Real-time updates for active conversations
- Full message history with timestamps
- Manipulation flags highlighted
- Cannot send messages (read-only)

### `/patterns` (Insights)
- Timeframe selector (7/30/90 days)
- Total detections and critical count
- Most common pattern type
- Time-based pattern analysis
- Trending indicators
- Privacy-focused (behavioral, not financial)

## Mobile-First Design

Optimized for phone browsers:
- Large touch targets (min 44px)
- High contrast for readability
- Quick loading (<2 seconds)
- Works offline (shows banner)
- Bottom navigation (thumb-friendly)
- Safe area support (iOS notch)

## Dark Theme

Consistent with main Anchor app:
- Background: `#000000`
- Cards: `#1C1C1E`
- Text: `#FFFFFF` / `#EBEBF5` / `#8E8E93`
- Status colors: Green (stable), Yellow (warning), Red (crisis)
- Guardian purple: `#5856D6`

## Real-Time Updates

Uses Supabase Realtime for live updates:

```javascript
const channel = supabase
  .channel('ai_conversations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ai_conversations',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Update conversation in real-time
  })
  .subscribe();
```

Guardians see conversations as they happen.

## Notifications

Guardians receive SMS notifications for:
- AI conversation started (pattern detected)
- Payment request denied
- Clean streak milestones (30, 60, 90 days)
- High risk pattern detected
- Emergency check-in completed

## Privacy

Guardian portal respects user privacy:

**Visible**:
- Clean streak (days)
- Status (stable/conversation/high-risk)
- Conversation transcripts
- Pattern types and timing
- General progress ("has saved significant amount")

**Not Visible**:
- Specific transaction amounts
- Bank account details
- Vault/allowance balances (exact numbers)
- Full transaction history
- Merchant names (except gambling-related)

## Emergency Button

Large red button triggers:
1. Creates `GUARDIAN_EMERGENCY` AI conversation
2. Sends push notification to user's app
3. Forces immediate check-in
4. Logs reason for concern
5. Notifies guardian when completed

Use cases:
- Haven't heard from user in days
- Noticed concerning behavior
- User mentioned gambling urges
- Family concerns about relapse

**Not for**:
- Immediate danger (call 000)
- Medical emergencies (call ambulance)
- Routine check-ins (wait for scheduled)

## Accessibility

- Keyboard navigation supported
- Screen reader friendly
- High contrast mode
- Large text options
- Touch-friendly for arthritis/limited mobility
- Works with iOS VoiceOver and Android TalkBack

## Offline Support

When connection lost:
- Shows offline banner
- Displays last loaded data
- Queues emergency triggers for when reconnected
- Prevents confusion about outdated information

## Testing

### Test Accounts

Create test guardian:
```sql
INSERT INTO guardians (user_id, name, phone, email, relationship, status)
VALUES (
  'user-uuid',
  'Test Guardian',
  '+61412345678',
  'guardian@test.com',
  'Partner',
  'active'
);
```

### Test Conversations

Create test conversation:
```sql
INSERT INTO ai_conversations (user_id, trigger_type, status, transcript)
VALUES (
  'user-uuid',
  'PAYDAY_LOAN',
  'completed',
  '{
    "messages": [
      {
        "role": "assistant",
        "content": "Hang on. You just got $200 from Beforepay. Where''s this from?",
        "timestamp": "2025-11-16T10:00:00Z"
      },
      {
        "role": "user",
        "content": "Bills",
        "timestamp": "2025-11-16T10:00:30Z",
        "metadata": {"flags": ["VAGUE_RESPONSE"]}
      }
    ]
  }'::jsonb
);
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

Vercel automatically:
- Serves from CDN
- Enables automatic HTTPS
- Provides preview deployments
- Handles serverless functions

### Custom Server

```bash
npm run build
npm start
```

Run behind reverse proxy (nginx/Caddy) for HTTPS.

## Browser Support

Tested on:
- iOS Safari 14+
- Android Chrome 90+
- Desktop Chrome/Firefox/Safari

Required features:
- CSS Grid
- CSS Custom Properties
- Fetch API
- LocalStorage
- WebSockets (Supabase Realtime)

## Performance

Target metrics:
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: 90+
- Mobile-optimized bundle: <200KB
- Real-time latency: <500ms

## Security

- No passwords (magic link only)
- HTTPS enforced
- CORS configured
- Row Level Security in Supabase
- Guardian can only see their assigned user
- Session timeout after 7 days
- No financial data exposed

## Support

For guardians having trouble:
1. Check mobile number matches database
2. Ensure SMS can receive codes
3. Try different browser if issues persist
4. Contact user to verify guardian details

## Future Enhancements

Potential additions:
- Push notifications via web push API
- Export conversation transcripts (PDF)
- Pattern trend graphs (charts)
- Multiple users per guardian
- Guardian-to-guardian support groups
- Guided intervention suggestions

## Files

```
guardian-portal/
├── pages/
│   ├── index.js           # Login (magic link)
│   ├── dashboard.js       # Main dashboard
│   ├── conversations.js   # AI transcripts
│   └── patterns.js        # Pattern insights
├── components/
│   ├── BottomNav.js       # Mobile navigation
│   └── EmergencyButton.js # Crisis trigger
├── lib/
│   └── supabaseClient.js  # Supabase helpers
├── styles/
│   └── guardian.css       # Dark theme, mobile-first
├── package.json
├── next.config.js
└── README.md
```

## License

Part of Anchor - Gambling Intervention System

---

**Remember**: This portal is for monitoring, not controlling. The goal is accountability and support, not surveillance or restriction.
