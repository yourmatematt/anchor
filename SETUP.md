# Anchor Setup Guide

Step-by-step guide to get Anchor running on your phone and bank account.

## Prerequisites Checklist

- [ ] Up Bank account (must be Australian)
- [ ] iPhone (iOS 13+) or Android phone
- [ ] Computer with Node.js 18+ installed
- [ ] GitHub account (optional, for deployment)

## Part 1: Database Setup (15 minutes)

### Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create new organization (name it anything, e.g., "Anchor")

### Step 2: Create Supabase Project

1. Click "New Project"
2. Name: `anchor-production`
3. Database Password: Generate strong password (save it!)
4. Region: Choose closest to Australia
5. Pricing Plan: Free
6. Click "Create new project" (takes ~2 minutes)

### Step 3: Run Database Schema

1. Wait for project to finish setting up
2. Go to "SQL Editor" in left sidebar
3. Click "New query"
4. Copy entire contents of `supabase/schema.sql` from this repo
5. Paste into SQL editor
6. Click "Run" (bottom right)
7. Should see "Success. No rows returned"

### Step 4: Get Supabase Credentials

1. Go to Project Settings (gear icon, bottom left)
2. Click "API" in settings menu
3. Copy these values (you'll need them):
   - Project URL (e.g., `https://abcdefgh.supabase.co`)
   - `anon` `public` key (long string starting with `eyJ...`)
   - `service_role` `secret` key (click "Reveal" first)

**⚠️ IMPORTANT**: Save these in a password manager. Never commit to git.

## Part 2: Backend Setup (20 minutes)

### Step 1: Install Dependencies

```bash
cd anchor
npm install
```

### Step 2: Create Environment Variables

Create `.env` file in root directory:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
UP_WEBHOOK_SECRET=temporary-will-update-later
```

Replace with your actual Supabase credentials.

### Step 3: Test Backend Locally

```bash
npm install -g vercel
vercel dev
```

Should see:
```
Ready! Available at http://localhost:3000
```

Test it:
```bash
curl http://localhost:3000/api/up/accounts
```

Should return error (expected, no token yet):
```json
{"error": "Missing or invalid authorization header"}
```

### Step 4: Deploy to Vercel

```bash
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name? `anchor-production`
- In which directory? `.` (current)
- Override settings? **N**

Takes ~30 seconds. Copy the deployment URL!

Example: `https://anchor-production-abc123.vercel.app`

### Step 5: Add Environment Variables to Vercel

```bash
vercel env add SUPABASE_URL
# Paste value, select Production, press Enter

vercel env add SUPABASE_ANON_KEY
# Paste value, select Production, press Enter

vercel env add SUPABASE_SERVICE_KEY
# Paste value, select Production, press Enter

vercel env add UP_WEBHOOK_SECRET
# Type "temporary" for now, select Production, press Enter
```

Deploy to production:
```bash
vercel --prod
```

Copy the production URL (e.g., `https://anchor-production.vercel.app`)

## Part 3: Up Bank Setup (10 minutes)

### Step 1: Generate Personal Access Token

1. Open Up Bank app on your phone
2. Tap profile icon (bottom right)
3. Scroll to "Developer"
4. Tap "Personal Access Tokens"
5. Tap "Create Token"
6. Name: "Anchor Financial System"
7. Copy the token (starts with `up:yeah:...`)

**⚠️ CRITICAL**: Save this token immediately. You cannot view it again.

### Step 2: Test Connection

```bash
export UP_TOKEN="your-token-here"

curl https://your-vercel-app.vercel.app/api/up/accounts \
  -H "Authorization: Bearer $UP_TOKEN"
```

Should return your accounts:
```json
{
  "accounts": [
    {
      "id": "...",
      "displayName": "Spending",
      "balance": { "value": "1234.56" }
    }
  ]
}
```

### Step 3: Create Webhook

```bash
curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"webhookUrl\": \"https://your-vercel-app.vercel.app/api/webhooks/up-bank\"}"
```

Response will include:
```json
{
  "webhook": {
    "id": "...",
    "secretKey": "abcd1234..."
  }
}
```

**⚠️ CRITICAL**: Copy the `secretKey`!

### Step 4: Update Webhook Secret

```bash
vercel env add UP_WEBHOOK_SECRET
# Paste the secretKey from webhook response
# Select Production
# Press Enter
```

Redeploy:
```bash
vercel --prod
```

### Step 5: Test Webhook

```bash
curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup?ping=true \
  -H "Authorization: Bearer $UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"webhookId\": \"your-webhook-id\"}"
```

Should return:
```json
{
  "message": "Webhook ping sent successfully"
}
```

## Part 4: Mobile App Setup (15 minutes)

### Step 1: Install Expo CLI

```bash
npm install -g expo-cli eas-cli
```

### Step 2: Install Mobile Dependencies

```bash
cd mobile
npm install
```

### Step 3: Configure Environment Variables

Create `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-vercel-app.vercel.app
```

### Step 4: Update app.json

Edit `mobile/app.json`:

Find this line:
```json
"projectId": "your-project-id-here"
```

Create Expo account and get project ID:
```bash
eas login
eas init
```

This will create a project and add the ID to app.json automatically.

### Step 5: Start Development Server

```bash
npx expo start
```

You should see QR code in terminal.

### Step 6: Install Expo Go on Phone

- **iOS**: https://apps.apple.com/app/expo-go/id982107779
- **Android**: https://play.google.com/store/apps/details?id=host.exp.exponent

### Step 7: Run App on Phone

1. Open Expo Go app
2. Scan QR code from terminal
3. App should load in ~30 seconds
4. When prompted, enter your Up Bank token
5. App will save it securely

## Part 5: Testing (10 minutes)

### Test 1: View Balance

1. Open app
2. Should see your current Up Bank balance
3. Should see today's transactions (if any)

### Test 2: Whitelist Management

1. Tap settings icon (top right)
2. Should see default whitelisted payees:
   - Optus
   - Starlink
   - Red Energy
   - Mallacoota Real Estate
   - Petbarn
   - Mallacoota Foodworks
3. Tap + to add new payee
4. Add yourself (for testing)
5. Should appear in list

### Test 3: Alert System (CRITICAL)

**⚠️ WARNING**: This will make a real transaction!

1. Remove yourself from whitelist (tap trash icon)
2. Make small transaction from Up Bank app ($1 to friend or $1 to savings)
3. Within 5 seconds, Anchor app should:
   - Show push notification
   - Open Alert Screen automatically
4. Alert Screen should:
   - Show transaction details
   - Prevent dismissal
   - Show record button
5. Record voice memo:
   - Tap record button
   - Say "This is a test transaction"
   - Tap stop
6. After 2 seconds, Continue button appears
7. Tap Continue
8. Should return to Home Screen

### Test 4: Verify Database

1. Go to Supabase dashboard
2. Click "Table Editor"
3. Select `transactions` table
4. Should see your test transaction:
   - `is_whitelisted`: false
   - `intervention_completed`: true
   - `voice_memo_transcript`: "Voice memo recorded at..."

## Part 6: Production Deployment (Optional)

### Deploy to TestFlight (iOS)

```bash
cd mobile

# Configure iOS build
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Wait ~15 minutes for build to complete

# Submit to TestFlight
eas submit --platform ios
```

Follow prompts to sign in with Apple Developer account.

TestFlight build will be available in ~24 hours.

### Deploy to Google Play (Android)

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

## Troubleshooting

### Backend won't start
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Mobile app crashes
```bash
cd mobile

# Clear cache
npx expo start --clear

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Webhook not firing

1. Check Vercel logs:
   ```bash
   vercel logs
   ```

2. Verify webhook exists:
   ```bash
   curl https://your-vercel-app.vercel.app/api/up/webhook-setup \
     -H "Authorization: Bearer $UP_TOKEN"
   ```

3. Ping webhook:
   ```bash
   curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup?ping=true \
     -H "Authorization: Bearer $UP_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"webhookId\": \"your-webhook-id\"}"
   ```

### Alert not showing

1. Check notification permissions (Settings → Anchor → Notifications)
2. Check Supabase `transactions` table - transaction should be there
3. Kill and restart app
4. Make another test transaction

## Success!

You now have:
- ✅ Supabase database running
- ✅ Backend deployed to Vercel
- ✅ Webhook receiving Up Bank transactions
- ✅ Mobile app running on your phone
- ✅ Alert system forcing accountability

**Next step**: Start using it for real. Remove test payees from whitelist and make a real transaction. The intervention system is now live.

## Support

- Check logs in Vercel dashboard
- Check data in Supabase Table Editor
- Check mobile app logs in Expo

## What's Next?

See README.md for:
- How the system works
- Database schema details
- API documentation
- Roadmap for future features
