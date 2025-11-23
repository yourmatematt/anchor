# Quick Deploy Guide

Get Anchor deployed in production in under 30 minutes.

## Prerequisites

You'll need accounts for:
- ✅ **GitHub** (you have this)
- ⚡ **Vercel** - https://vercel.com (free tier)
- ⚡ **Supabase** - https://supabase.com (free tier)
- ⚡ **Expo** - https://expo.dev (free tier)

## Step 1: Database Setup (5 minutes)

1. Go to https://supabase.com and create a new project
2. Name it `anchor-production`
3. Choose region: **Sydney** (or closest to you)
4. Wait for project to be ready (~2 minutes)
5. Go to **SQL Editor**
6. Copy contents of `supabase/schema.sql` and paste → **RUN**
7. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)

## Step 2: Backend Deployment (10 minutes)

### A. Set up Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Name it: `Anchor GitHub Actions`
4. Copy the token

### B. Add GitHub Secret

1. Go to your GitHub repository
2. **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `VERCEL_TOKEN`
5. Value: [paste the token from above]
6. Click **Add secret**

### C. Deploy to Vercel

**Option 1: Via GitHub Actions (Recommended)**

Simply push to `main` branch:

```bash
# From your deployment branch
git push origin claude/deploy-app-016W2Fyieq2gEeaKGtcJof5d:main
```

GitHub Actions will automatically deploy to Vercel!

Watch progress: **Actions tab** in GitHub

**Option 2: Manual Deployment**

```bash
# Install Vercel CLI (if not already done)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### D. Configure Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your **anchor** project
3. **Settings → Environment Variables**
4. Add these for **Production** (click Add after each):

```
SUPABASE_URL = [your Supabase Project URL]
SUPABASE_ANON_KEY = [your Supabase anon key]
SUPABASE_SERVICE_KEY = [your Supabase service_role key]
ANTHROPIC_API_KEY = [get from https://console.anthropic.com]
CLAUDE_MODEL = claude-3-5-sonnet-20241022
UP_WEBHOOK_SECRET = (leave blank for now, will set later)
```

5. **Redeploy** after adding environment variables:
   - Go to **Deployments** tab
   - Click **•••** on latest deployment → **Redeploy**

### E. Get Your Deployment URL

From Vercel dashboard, copy your deployment URL:
```
https://anchor-[random].vercel.app
```

Test it:
```bash
curl https://your-deployment-url.vercel.app/health
```

Should see: `{"status":"ok",...}`

## Step 3: Mobile App Setup (10 minutes)

### A. Install EAS CLI

```bash
npm install -g eas-cli
```

### B. Configure Mobile App

1. Create `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-vercel-url.vercel.app
```

2. Login to Expo:

```bash
cd mobile
eas login
```

3. Initialize EAS:

```bash
eas init
```

This will create an EAS project and update `app.json` with your project ID.

### C. Build iOS App (TestFlight)

```bash
# Build for iOS
eas build --platform ios --profile production
```

This will:
- Prompt for Apple ID credentials
- Build the app in the cloud (~15 minutes)
- Provide a download URL

You'll need:
- **Apple Developer Account** ($99/year)
- **App-specific password** from https://appleid.apple.com

### D. Submit to TestFlight

```bash
eas submit --platform ios --latest
```

Follow the prompts to submit to TestFlight.

### E. Install on Your Phone

1. Download **TestFlight** from App Store
2. Check your email for TestFlight invite
3. Accept invite and install **Anchor**

## Step 4: Up Bank Integration (5 minutes)

### A. Get Up Bank API Token

1. Open **Up Bank** mobile app
2. Go to **Settings → Advanced → Personal Access Tokens**
3. **Create new token**: `Anchor Production`
4. Copy the token (you can only see this once!)

### B. Register Webhook

**Option 1: Using the mobile app** (easiest)

1. Open Anchor mobile app
2. When prompted, paste your Up Bank token
3. App will auto-register the webhook
4. Copy the webhook secret shown

**Option 2: Using cURL**

```bash
curl -X POST https://your-vercel-url.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer YOUR_UP_BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-vercel-url.vercel.app/api/webhooks/up-bank"}'
```

Response includes:
```json
{
  "webhook": {
    "id": "webhook_...",
    "secretKey": "wh_sec_..."
  }
}
```

Copy the `secretKey`.

### C. Add Webhook Secret to Vercel

1. Go to Vercel Dashboard → Project → **Settings → Environment Variables**
2. Find `UP_WEBHOOK_SECRET`
3. Click **Edit** → paste the webhook secret
4. Click **Save**
5. **Redeploy** (Deployments → ••• → Redeploy)

## Step 5: Test Everything! (5 minutes)

### Backend Health Check

```bash
curl https://your-vercel-url.vercel.app/health
```

Should return: `{"status":"ok"}`

### End-to-End Test

1. Open Anchor mobile app
2. Make a **small transaction** from your Up Bank account (e.g., $1 transfer)
3. Within 2-3 seconds, you should:
   - Get a push notification
   - See the Alert Screen appear
   - Be prompted to record a voice memo

4. Record a voice memo and dismiss the alert

5. Check Supabase:
   - Dashboard → Table Editor → `transactions`
   - Your transaction should be logged!

## ✅ Deployment Complete!

You now have:
- ✅ Backend API running on Vercel
- ✅ Database on Supabase
- ✅ Mobile app on TestFlight
- ✅ Up Bank webhook connected
- ✅ Real-time transaction alerts working

## Next Steps

### 1. Set Up Whitelist

Add your regular payees to avoid alerts:
- Rent/mortgage
- Utilities (electricity, water, internet)
- Groceries
- Essential subscriptions

### 2. Invite Support Person (Optional)

If you have someone helping with accountability, share access to the Supabase dashboard so they can:
- View transaction history
- Listen to voice memos
- Check compliance

### 3. Monitor for 24 Hours

Watch the system for the first day:
- Check Vercel logs: https://vercel.com/dashboard
- Check Supabase logs: Settings → Logs
- Test a few transactions

### 4. Deploy to App Store (Optional)

Once tested in TestFlight:
- App Store Connect → TestFlight → Submit for Review
- Add screenshots, description, etc.
- Submit to App Store

## Troubleshooting

### Webhook not firing?

Check:
1. Vercel logs for incoming requests
2. Webhook is registered:
   ```bash
   curl https://your-vercel-url.vercel.app/api/up/webhook-setup \
     -H "Authorization: Bearer YOUR_UP_TOKEN"
   ```
3. `UP_WEBHOOK_SECRET` is set in Vercel

### Mobile app can't connect?

Check:
1. `mobile/.env` has correct Vercel URL
2. Vercel deployment is live (not failed)
3. Supabase credentials are correct

### No push notifications?

Check:
1. iPhone Settings → Anchor → Notifications → **Allow**
2. TestFlight build includes notification permissions
3. Check Expo push notification setup

## 🎉 You're Live!

The intervention system is now active. Every non-whitelisted transaction will trigger an alert that requires a voice memo.

**Stay accountable. Stay in control.**

---

For detailed documentation, see:
- `README.md` - Project overview
- `DEPLOYMENT.md` - Complete deployment guide
- `SETUP.md` - Development setup

For issues, check Vercel and Supabase logs first.
