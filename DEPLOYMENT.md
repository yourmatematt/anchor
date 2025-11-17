# Anchor Deployment Guide

Complete deployment guide for production with Docker, CI/CD, monitoring, and backups.

## Deployment Architecture

```
Production Environment:
├── Supabase (Database + Realtime)
│   └── Free tier: Sufficient for single user
├── Vercel (Backend API - Primary)
│   └── Hobby tier: Sufficient for webhooks
├── Railway (Backend API - Alternative)
│   └── Docker container deployment
├── Expo/TestFlight (Mobile App)
│   └── iOS or Android
├── GitHub Actions (CI/CD)
│   └── Automated builds, tests, and deployments
└── Monitoring & Backups
    ├── Prometheus + Grafana (optional)
    └── Automated database backups
```

## Deployment Options

### Option 1: Vercel (Recommended)
- **Best for:** Serverless, zero-config deployment
- **Pros:** Auto-scaling, edge network, generous free tier
- **Cons:** 10s function timeout on free tier
- **See:** [Vercel Deployment](#part-2-backend-vercel)

### Option 2: Railway
- **Best for:** Always-on Docker deployments
- **Pros:** Full control, longer timeouts, WebSocket support
- **Cons:** $5/month minimum
- **See:** [Railway Deployment](#railway-deployment-alternative)

### Option 3: Docker Compose (Local/Self-hosted)
- **Best for:** Development and self-hosting
- **Pros:** Complete environment locally, full control
- **Cons:** Requires server management
- **See:** [Docker Deployment](#docker-deployment-local--self-hosted)

## Prerequisites

- [ ] All tests passing (see TESTING.md)
- [ ] Supabase project created
- [ ] Vercel account ready
- [ ] Up Bank account with API access
- [ ] Expo/EAS account (for mobile deployment)
- [ ] Apple Developer account (for iOS) OR Google Play account (for Android)

## Part 1: Database (Supabase)

### Production Setup

Already completed if you followed SETUP.md. Verify:

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM whitelist;  -- Should return 6 (default payees)
SELECT COUNT(*) FROM transactions;  -- May be 0 or have test data
```

### Backup Strategy

Enable Point-in-Time Recovery:
1. Supabase Dashboard → Database → Backups
2. Enable automatic backups (free tier: 7 days)

### Monitoring

1. Dashboard → Logs → Database
2. Watch for:
   - Slow queries (>100ms)
   - Failed inserts
   - Connection errors

### Production Checklist

- [x] Schema deployed (`supabase/schema.sql`)
- [x] Initial whitelist populated
- [x] Row Level Security enabled
- [x] API keys secured (not in git)
- [ ] Backups enabled
- [ ] Monitoring dashboard bookmarked

## Part 2: Backend (Vercel)

### Production Deployment

```bash
# From project root
vercel --prod
```

### Environment Variables

Verify all secrets are set:

```bash
vercel env ls
```

Should see:
- `SUPABASE_URL` (Production)
- `SUPABASE_ANON_KEY` (Production)
- `SUPABASE_SERVICE_KEY` (Production)
- `UP_WEBHOOK_SECRET` (Production)

### Custom Domain (Optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `anchor.yourdomain.com`
3. Update DNS records as shown
4. Update webhook URL in Up Bank
5. Update `EXPO_PUBLIC_API_URL` in mobile app

### Monitoring

1. Vercel Dashboard → Project → Logs
2. Enable log drains (optional):
   - Datadog
   - Logtail
   - Custom endpoint

### Performance Optimization

Vercel automatically:
- ✅ Enables edge caching
- ✅ Compresses responses
- ✅ Uses CDN for static assets

For webhooks (most critical):
- Cold start: ~500ms
- Warm: <50ms
- Target: Respond within 2 seconds

### Security Hardening

1. **Rate Limiting**:
   ```javascript
   // Add to api/webhooks/up-bank.js
   // Use Vercel Edge Config or Upstash Redis
   ```

2. **CORS**:
   ```javascript
   // Only allow mobile app origin
   headers: {
     'Access-Control-Allow-Origin': 'exp://...'
   }
   ```

3. **Webhook Signature Validation**:
   Already implemented ✅

### Production Checklist

- [x] Deployed to production
- [x] All endpoints working
- [x] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled
- [ ] Error alerts configured
- [ ] Webhook tested with ping

## Part 3: Mobile App

### Expo Build Configuration

```bash
cd mobile
eas login
eas init
```

### Configure EAS Build

Create `mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_API_URL": "https://your-vercel-app.vercel.app"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**⚠️ IMPORTANT**: Use environment secrets for production:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
eas secret:create --name EXPO_PUBLIC_API_URL --value "..."
```

### iOS Deployment (TestFlight)

#### Prerequisites

- Apple Developer Account ($99/year)
- Xcode installed (for provisioning)

#### Build

```bash
cd mobile

# Build for iOS
eas build --platform ios --profile production

# This takes ~15-20 minutes
# Watch progress: https://expo.dev/accounts/your-account/builds
```

#### Submit to TestFlight

```bash
eas submit --platform ios
```

Follow prompts:
- App Store Connect API Key (create in Apple Developer)
- App ID (bundle identifier from app.json)

#### TestFlight Access

1. App Store Connect → TestFlight
2. Add yourself as internal tester
3. Install TestFlight app on iPhone
4. Accept invite
5. Install Anchor

#### Go Live to App Store

1. App Store Connect → App Store
2. Fill out app metadata:
   - Name: "Anchor - Financial Accountability"
   - Subtitle: "Transaction Intervention System"
   - Description: (see below)
   - Keywords: "finance, accountability, banking, spending"
   - Category: Finance
   - Age Rating: 4+
3. Screenshots (required):
   - 6.5" display (iPhone 14 Pro Max)
   - 5.5" display (iPhone 8 Plus)
4. Submit for review

**App Description**:
```
Anchor is a financial accountability system that helps you stay in control of your spending.

HOW IT WORKS:
• Connect your Up Bank account
• Set up a whitelist of approved payees (rent, utilities, groceries)
• Any transaction to a non-whitelisted payee triggers an alert
• Record a voice memo explaining why you're making the transaction
• Build accountability and awareness around every spend

FEATURES:
• Real-time transaction monitoring via Up Bank webhooks
• Customizable whitelist of approved payees
• Mandatory voice memo intervention for non-whitelisted transactions
• Transaction history and accountability log
• Secure token storage (encrypted)

PRIVACY:
• Your data stays on your device and in your private database
• Voice memos are stored securely
• No sharing, no tracking, no ads
• Open source (view code on GitHub)

REQUIREMENTS:
• Up Bank account (Australia only)
• iOS 13 or later

Anchor is designed for personal financial accountability. Not a replacement for professional advice.
```

### Android Deployment (Google Play)

#### Prerequisites

- Google Play Developer Account ($25 one-time)

#### Build

```bash
cd mobile

# Build for Android
eas build --platform android --profile production
```

#### Submit to Google Play

```bash
eas submit --platform android
```

Follow prompts for service account key.

#### Google Play Console

1. Create new app
2. Fill out store listing
3. Upload APK/AAB
4. Complete content rating questionnaire
5. Submit for review

### Production Checklist

- [ ] EAS configured
- [ ] Production secrets set
- [ ] iOS build completed
- [ ] iOS submitted to TestFlight
- [ ] iOS app reviewed and approved
- [ ] Android build completed (optional)
- [ ] Android submitted to Google Play (optional)

## Part 4: Up Bank Integration

### Webhook Production Setup

Already done in SETUP.md, but verify:

```bash
# List webhooks
curl https://your-production-url.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN"
```

Should return webhook pointing to production URL.

### Webhook Monitoring

Check webhook delivery:
1. Make test transaction
2. Check Vercel logs immediately
3. Should see webhook event within 2 seconds

### Webhook Reliability

Up Bank webhooks are:
- ✅ Delivered once (not guaranteed)
- ✅ Retried on 5xx errors (up to 3 times)
- ✅ Signed with HMAC-SHA256

**Fallback**: If webhook fails:
- App polls Supabase every 30 seconds
- Checks for new transactions via Up Bank API
- Shows alert if any non-whitelisted transactions found

TODO: Implement polling fallback (not in MVP)

### Production Checklist

- [x] Webhook created
- [x] Points to production URL
- [x] Secret stored in Vercel
- [x] Signature validation working
- [ ] Tested with real transaction
- [ ] Verified <5 second latency

## Part 5: Monitoring & Alerts

### Application Monitoring

#### Vercel (Backend)

1. Dashboard → Analytics
2. Watch:
   - Request count
   - Error rate
   - Response time (p95 < 500ms)

#### Sentry (Optional)

```bash
npm install @sentry/node

# In api/webhooks/up-bank.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

#### Supabase

1. Dashboard → Logs → Database
2. Watch:
   - Failed queries
   - Slow queries (>100ms)
   - Connection pool exhaustion

### Uptime Monitoring

#### Uptime Robot (Free)

1. https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: `https://your-vercel-app.vercel.app/api/up/accounts`
   - Headers: `Authorization: Bearer $UP_TOKEN`
   - Interval: 5 minutes
3. Alert contacts: Your email

#### Better Uptime (Paid)

More features:
- Status page
- Incident management
- On-call scheduling

### Error Alerts

#### Vercel Integration

1. Dashboard → Settings → Notifications
2. Enable:
   - Deployment failed
   - Domain configuration changed
3. Add email/Slack

#### Email Alerts

Add to `api/webhooks/up-bank.js`:

```javascript
if (error) {
  // Send email alert
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: 'alerts@yourdomain.com' },
      to: { email: 'your-email@gmail.com' },
      subject: 'ANCHOR ERROR: Webhook Failed',
      text: `Error processing webhook: ${error.message}`
    })
  });
}
```

### Production Checklist

- [ ] Vercel analytics enabled
- [ ] Uptime monitoring configured
- [ ] Error alerts configured
- [ ] Sentry integrated (optional)
- [ ] Weekly health check scheduled

## Part 6: Maintenance

### Weekly Tasks

- [ ] Check Vercel logs for errors
- [ ] Check Supabase database size (free tier: 500MB)
- [ ] Verify webhook is still active
- [ ] Test alert with small transaction

### Monthly Tasks

- [ ] Review transaction logs for anomalies
- [ ] Clean up old test data
- [ ] Update dependencies:
  ```bash
  npm outdated
  npm update
  ```
- [ ] Review Supabase backups

### Quarterly Tasks

- [ ] Rotate Up Bank token (security best practice)
- [ ] Update webhook secret
- [ ] Review voice memo storage (if implemented)
- [ ] Audit whitelist

### Database Maintenance

Supabase free tier limits:
- 500MB database
- 1GB bandwidth/month
- 50,000 rows/month

Clean up old transactions:

```sql
-- Keep only last 90 days
DELETE FROM transactions
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM FULL;
```

### Backup Verification

Monthly, verify backups work:
1. Supabase → Database → Backups
2. Create manual backup
3. Download and verify file size
4. Test restore on development project

## Part 7: Incident Response

### Webhook Stops Working

**Symptoms**:
- No alerts for transactions
- Vercel logs show no webhook events

**Diagnosis**:
```bash
# Check webhook exists
curl https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN"

# Ping webhook
curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup?ping=true \
  -H "Authorization: Bearer $UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "..."}'
```

**Fix**:
1. Recreate webhook (see SETUP.md)
2. Update `UP_WEBHOOK_SECRET` in Vercel
3. Redeploy: `vercel --prod`

### App Crashes on Launch

**Diagnosis**:
- Check Expo logs in development
- Check Sentry errors (if integrated)

**Fix**:
1. Roll back to previous build in TestFlight
2. Fix bug locally
3. Test thoroughly
4. Rebuild and resubmit

### Database Quota Exceeded

**Symptoms**:
- Supabase errors: "quota exceeded"

**Fix**:
```sql
-- Clean up old data
DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '30 days';
VACUUM FULL;
```

Or upgrade to Supabase Pro ($25/month).

### Vercel Function Timeout

**Symptoms**:
- 504 Gateway Timeout errors

**Fix**:
- Free tier: 10 second timeout
- Upgrade to Pro for 60 seconds
- Optimize slow database queries

## Part 8: Scaling (Future)

When you're ready to:
- Add multiple users
- Support multiple banks
- Add advanced features

### Multi-User Setup

1. Add user authentication (Supabase Auth)
2. Update RLS policies
3. Add `user_id` to all tables
4. Update mobile app with login flow

### Multiple Banks

1. Abstract bank API (create `BankService` interface)
2. Implement adapters for each bank
3. Add bank selection in mobile app
4. Store multiple tokens per user

### Advanced Features

- Speech-to-text transcription (Whisper API)
- Pattern detection (spending analysis)
- Support person notifications
- Spending limits and budgets

## Production Checklist

Before declaring "production ready":

### Backend
- [x] Deployed to Vercel
- [x] All endpoints tested
- [x] Environment variables secured
- [ ] Error monitoring enabled
- [ ] Uptime monitoring configured

### Database
- [x] Schema deployed
- [x] Initial data populated
- [x] Backups enabled
- [ ] Maintenance plan scheduled

### Mobile
- [ ] Built with EAS
- [ ] Submitted to TestFlight/Play Store
- [ ] Approved and published
- [ ] Installed on your phone

### Integration
- [x] Webhook created
- [x] Webhook tested
- [ ] Alert latency < 5 seconds
- [ ] 24-hour reliability test passed

### Documentation
- [x] README.md complete
- [x] SETUP.md complete
- [x] TESTING.md complete
- [x] DEPLOYMENT.md complete

### Testing
- [ ] All test scenarios passed
- [ ] Security tests passed
- [ ] Performance tests passed
- [ ] 7-day stability test passed

## Go Live

When ALL checklists complete:

1. ✅ Remove test data from database
2. ✅ Finalize whitelist (only essential payees)
3. ✅ Make small test transaction ($1)
4. ✅ Verify alert works end-to-end
5. ✅ Enable notifications (max volume)
6. ✅ Inform support person (if applicable)

**You are now live.**

The financial intervention system is protecting your account.

Every non-whitelisted transaction will require a voice memo.

Stay accountable. Stay in control.

**Welcome to Anchor.**
