# Anchor - Financial Accountability System

> **Patient Zero MVP** - A financial intervention system for spending addiction recovery

Anchor sits between you and your bank account, forcing accountability through mandatory voice memos for non-whitelisted transactions. Every unauthorized spend triggers an intervention you cannot dismiss.

## 🎯 Core Concept

**The Problem**: Impulsive spending bypasses rational decision-making
**The Solution**: A strangler pattern that intercepts transactions and forces conscious accountability

## 🏗️ Architecture

```
┌─────────────┐
│  Up Bank    │
│   Account   │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────────┐     ┌──────────────┐
│ Vercel Backend  │────▶│  Supabase    │
│  (Node.js API)  │     │  (Database)  │
└────────┬────────┘     └──────────────┘
         │
         │ push notification
         ▼
┌─────────────────┐
│  Mobile App     │
│ (React Native)  │
│                 │
│ ┌─────────────┐ │
│ │Alert Screen │ │ ← CANNOT DISMISS
│ │ (Voice Memo)│ │   WITHOUT RECORDING
│ └─────────────┘ │
└─────────────────┘
```

## 📦 Tech Stack

- **Backend**: Node.js/Express on Vercel (serverless)
- **Database**: Supabase (PostgreSQL)
- **Mobile**: React Native + Expo (iOS priority)
- **Bank**: Up Bank API (webhooks + read-only)
- **Voice**: Expo AV for recording

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Up Bank account (Australian)
- Supabase account (free tier)
- Vercel account (free tier)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd anchor

# Install backend dependencies
npm install

# Install mobile app dependencies
cd mobile
npm install
cd ..
```

### 2. Set Up Supabase

1. Create new Supabase project at https://supabase.com
2. Go to SQL Editor and run `supabase/schema.sql`
3. Copy your Project URL and API keys

### 3. Configure Backend

Create `.env` in root:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
UP_WEBHOOK_SECRET=will-be-generated-later
```

### 4. Deploy Backend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Project Settings → Environment Variables
# Add all variables from .env
```

Copy your Vercel deployment URL (e.g., `https://anchor-xyz.vercel.app`)

### 5. Set Up Up Bank Integration

1. Open Up Bank app
2. Go to Settings → API → Create New Token
3. Copy the Personal Access Token
4. Save it securely (you'll enter it in the mobile app)

### 6. Configure Mobile App

Create `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-vercel-app.vercel.app
```

### 7. Run Mobile App

```bash
cd mobile
npx expo start

# Scan QR code with Expo Go app (iOS/Android)
# Or press 'i' for iOS Simulator
```

### 8. Register Webhook

In the mobile app:
1. Enter your Up Bank token when prompted
2. The app will register a webhook pointing to your Vercel backend
3. Save the webhook secret to Vercel environment variables

Alternatively, use curl:

```bash
curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer YOUR_UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-vercel-app.vercel.app/api/webhooks/up-bank"}'
```

Copy the `secretKey` from response and add to Vercel as `UP_WEBHOOK_SECRET`.

## 🔒 How It Works

### 1. Transaction Occurs

You make a payment from your Up Bank account.

### 2. Webhook Fires

Up Bank sends webhook to `/api/webhooks/up-bank` within ~1 second.

### 3. Whitelist Check

Backend checks if payee is in `whitelist` table:

```sql
SELECT * FROM whitelist WHERE payee_name ILIKE 'Payee Name';
```

### 4. Log Transaction

All transactions logged to `transactions` table:

```sql
INSERT INTO transactions (transaction_id, amount, payee_name, is_whitelisted, ...);
```

### 5. Alert (If Not Whitelisted)

- Push notification sent to mobile app
- App opens Alert Screen (full-screen modal)
- **CANNOT DISMISS** without voice memo

### 6. Forced Accountability

User must:
1. See transaction details
2. Press record button
3. Speak why they're making this transaction
4. Stop recording
5. Only then can dismiss alert

### 7. Voice Memo Saved

```sql
UPDATE transactions
SET voice_memo_url = '...',
    voice_memo_transcript = '...',
    intervention_completed = true
WHERE transaction_id = '...';
```

## 📱 Mobile App Screens

### Home Screen
- Current balance
- Today's transactions
- Pending interventions badge
- Quick access to whitelist

### Alert Screen (CRITICAL)
- Full-screen takeover
- Cannot dismiss without recording
- Shows transaction amount, payee, time
- Voice recorder component
- Records audio locally
- Saves transcript to database

### Whitelist Screen
- View all whitelisted payees
- Add new payees
- Remove existing payees
- Category organization

## 🗄️ Database Schema

### `whitelist`
```sql
id              UUID PRIMARY KEY
payee_name      TEXT UNIQUE NOT NULL
category        TEXT
notes           TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### `transactions`
```sql
id                      UUID PRIMARY KEY
transaction_id          TEXT UNIQUE NOT NULL
amount                  DECIMAL
payee_name              TEXT
description             TEXT
is_whitelisted          BOOLEAN
timestamp               TIMESTAMP
voice_memo_url          TEXT
voice_memo_transcript   TEXT
intervention_completed  BOOLEAN
created_at              TIMESTAMP
```

## 🔧 API Endpoints

### Backend (Vercel)

#### `POST /api/webhooks/up-bank`
Receives Up Bank transaction webhooks
- Validates signature
- Checks whitelist
- Logs transaction
- Triggers alert if needed

#### `GET /api/up/accounts`
Fetches account balances from Up Bank
- Requires: `Authorization: Bearer <UP_TOKEN>`
- Returns: Account list with balances

#### `GET /api/up/transactions`
Fetches recent transactions
- Requires: `Authorization: Bearer <UP_TOKEN>`
- Query params: `accountId`, `limit`, `since`, `until`
- Returns: Transaction list

#### `POST /api/up/webhook-setup`
Creates webhook with Up Bank
- Requires: `Authorization: Bearer <UP_TOKEN>`
- Body: `{ "webhookUrl": "..." }`
- Returns: Webhook details + secret key

#### `GET /api/up/webhook-setup`
Lists existing webhooks

#### `DELETE /api/up/webhook-setup`
Deletes webhook
- Body: `{ "webhookId": "..." }`

## 🧪 Testing

### Test Webhook Locally

Use Vercel dev server + ngrok:

```bash
# Terminal 1: Start Vercel dev server
vercel dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use ngrok URL for webhook setup
```

### Test Transaction Flow

1. Add test payee to whitelist
2. Make small transaction (e.g., $1 transfer to friend)
3. Remove from whitelist
4. Make another transaction
5. Alert should trigger immediately

### Test Voice Recording

Alert Screen has voice recorder component:
1. Press record button
2. Speak test message
3. Press stop
4. Check Supabase `transactions` table for transcript

## 📊 Success Criteria

- [x] Backend receives webhooks in real-time
- [x] Whitelist check works correctly
- [x] All transactions logged to database
- [x] Non-whitelisted transactions trigger alerts
- [x] Alert screen cannot be dismissed without voice memo
- [x] Voice recordings save to database
- [ ] Deployed to TestFlight (manual step)
- [ ] Running on actual bank account (manual step)

## 🚨 Critical Features

### Cannot Dismiss Alert
```javascript
// AlertScreen prevents dismissal
useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (!hasRecorded) {
      Alert.alert('Voice Memo Required', '...');
      return true; // Prevent back
    }
    return false;
  });
}, [hasRecorded]);
```

### Mandatory Voice Memo
```javascript
// Only enabled after recording
{isDismissing && (
  <TouchableOpacity
    style={[styles.dismissButton, hasRecorded && styles.dismissButtonEnabled]}
    onPress={handleDismiss}
  >
    <Text>Continue</Text>
  </TouchableOpacity>
)}
```

## 📝 Initial Whitelist

Default whitelisted payees (see `supabase/schema.sql`):
- Optus (utilities)
- Starlink (utilities)
- Red Energy (utilities)
- Mallacoota Real Estate (rent)
- Petbarn (pet)
- Mallacoota Foodworks (groceries)

Modify in Supabase or mobile app.

## 🔐 Security

- Up Bank token stored in Expo SecureStore (encrypted)
- Webhook signature validation (HMAC-SHA256)
- Supabase Row Level Security enabled
- Service key only in backend (not mobile app)
- No sensitive data in client code

## 🚀 Deployment

### Backend (Vercel)
```bash
vercel --prod
```

### Mobile (TestFlight)
```bash
cd mobile

# Build for iOS
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

## 🐛 Troubleshooting

### Webhook not firing
- Check Vercel deployment logs
- Verify webhook URL in Up Bank dashboard
- Test with webhook ping: `POST /api/up/webhook-setup?ping=true`

### Alert not showing
- Check mobile app permissions (notifications)
- Verify Supabase realtime subscriptions
- Check transaction logged with `is_whitelisted=false`

### Voice recording failing
- Check microphone permissions
- iOS: Requires Info.plist entry (see `app.json`)
- Android: Requires `RECORD_AUDIO` permission

## 📚 Resources

- [Up Bank API Docs](https://developer.up.com.au/)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Vercel Docs](https://vercel.com/docs)

## 🎯 Roadmap

### Week 1 (MVP) ✅
- [x] Backend webhook receiver
- [x] Database schema
- [x] Mobile app with alert system
- [x] Voice memo recording
- [ ] Deploy to production

### Week 2
- [ ] Speech-to-text transcription (Whisper API)
- [ ] Audio storage in Supabase Storage
- [ ] 48-hour cooling period for whitelist additions
- [ ] Transaction history view
- [ ] Voice memo playback

### Week 3
- [ ] Daily/weekly spending reports
- [ ] Pattern analysis (unusual spending alerts)
- [ ] Support person notifications
- [ ] Manual transaction flagging

### Future
- [ ] Multi-user support
- [ ] Support for other banks
- [ ] ML-powered spending insights
- [ ] Gamification/streak tracking

## 📄 License

MIT - This is for personal use (Patient Zero MVP)

## ⚠️ Disclaimer

This system is designed for personal financial accountability. It is not a replacement for professional financial advice or addiction treatment. Seek professional help if needed.

## 🙏 Acknowledgments

Built for recovery. Built for accountability. Built to break the cycle.

---

**Patient Zero**: You are not alone. This is your intervention system. Use it.
