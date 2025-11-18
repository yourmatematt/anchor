# Anchor Communication System Guide

Complete reference for all SMS and email templates, scheduling, and preferences.

## Table of Contents

1. [SMS Templates](#sms-templates)
2. [Email Templates](#email-templates)
3. [Scheduled Communications](#scheduled-communications)
4. [Notification Preferences](#notification-preferences)
5. [API Endpoints](#api-endpoints)
6. [Integration Setup](#integration-setup)

---

## SMS Templates

### Guardian Notifications

#### PATTERN_DETECTED
**When:** User triggers a known gambling pattern
**Critical:** No
**Template:**
```
ANCHOR: {userName} triggered {pattern}. Day {cleanStreak} clean. AI conversation started.
```
**Example:**
```
ANCHOR: Matt triggered Tuesday evening. Day 14 clean. AI conversation started.
```

#### RELAPSE_CONFIRMED
**When:** Gambling transaction confirmed
**Critical:** YES
**Template:**
```
ANCHOR: Gambling detected. Streak reset. {userName} needs support, not judgment.
```

#### MILESTONE_REACHED
**When:** User hits day milestone (7, 14, 30, 60, 90)
**Critical:** No
**Template:**
```
ANCHOR: {userName} hit {days} days clean. Acknowledge it (no celebration).
```

#### EMERGENCY_TRIGGERED
**When:** Emergency protocol activated
**Critical:** YES
**Template:**
```
URGENT: {userName} triggered emergency protocol. Check in immediately.
```

### User Notifications

#### DAILY_CHECKIN
**When:** 6am daily
**Critical:** No
**Can Disable:** Yes
**Template:**
```
Day {cleanStreak} clean. ${savedTotal} saved. Stay strong.
```

#### HIGH_RISK_WARNING
**When:** Approaching high-risk pattern time
**Critical:** YES
**Can Disable:** Yes
**Template:**
```
It's {day} {time}. Your {pattern} pattern. Make different choices.
```

#### PAYDAY_REMINDER
**When:** Payday detected (15th or end of month)
**Critical:** YES
**Can Disable:** NO
**Template:**
```
Payday detected. Money moved to vault. You have ${dailyAllowance} for today.
```

#### INTERVENTION_REQUIRED
**When:** Non-whitelisted transaction detected
**Critical:** YES
**Can Disable:** NO
**Template:**
```
Open Anchor app now. AI conversation required.
```

### System Notifications

#### COMMITMENT_STARTED
**When:** User locks in commitment
**Critical:** YES
**Template:**
```
Commitment locked. {days} days. Guardian: {guardianName}. Daily allowance: ${allowance}.
```

#### VERIFICATION_CODE
**When:** SMS verification needed
**Critical:** YES
**Template:**
```
ANCHOR verification code: {code}. Valid for 10 minutes.
```

---

## Email Templates

### Welcome Series

#### Email 1: "You've locked in. Here's what happens now."
**When:** Immediately after commitment creation
**Can Disable:** NO (Mandatory)
**Content:**
- Commitment details (days, guardian, allowance)
- What happens next (daily resets, interventions, payday, weekly reports)
- Whitelisted merchants list
- Emergency contacts

#### Email 2: "Day 3: The system is working. Here's your data."
**When:** 3 days after commitment start
**Can Disable:** NO (Welcome series)
**Content:**
- Clean days and estimated savings
- Transactions monitored breakdown
- Patterns detected (if any)
- Guardian activity summary
- Upcoming risks

#### Email 3: "Week 1: Patterns we've detected."
**When:** 7 days after commitment start
**Can Disable:** NO (Welcome series)
**Content:**
- First week summary
- Pattern profile (primary trigger, high-risk times)
- What the system learned
- Coming week risks
- Pre-emptive support scheduled

### Weekly Report

**Subject:** "Week {X}: Facts, not feelings"
**When:** Every Sunday 6pm
**Can Disable:** Yes
**Content:**
- Clean days out of 7
- Money saved (week and total)
- Transactions, interventions, guardian messages
- Triggers activated
- Improvements noted
- Concerns flagged
- Upcoming risks predicted

### Relapse Response

**Subject:** "Day 0. Start again."
**When:** Gambling transaction confirmed
**Can Disable:** Yes (but highly recommended)
**Content:**
- Previous streak acknowledgment
- What happened (date, triggers, voice memo)
- Facts about relapses (3-4 average before sustained recovery)
- What was learned from voice memo
- Pattern analysis
- Adjustments made (high-risk alerts, guardian check-ins, allowance)
- Emergency contacts
- Days remaining on commitment

### Milestone Email

**Subject:** "{X} days clean"
**When:** Major milestones (7, 14, 30, 60, 90, 180, 365 days)
**Can Disable:** Yes
**Content:**
- Days/weeks/months clean
- Total money saved
- Projected yearly savings
- What you've achieved (interventions, triggers avoided, guardian support)
- Community comparisons
- Days remaining on commitment

---

## Scheduled Communications

### Daily Schedule

**6:00 AM (User Local Time)**
- `ALLOWANCE_RESET` SMS
- `DAILY_CHECKIN` SMS (if enabled)

### Weekly Schedule

**Sunday 6:00 PM**
- `WEEKLY_SUMMARY` SMS
- `WEEKLY_REPORT` Email

### Contextual (Runs Hourly)

**High-Risk Warning System:**
- Checks user's pattern database
- If current day/time matches historical gambling pattern:
  - Send `HIGH_RISK_WARNING` SMS to user
  - Send `HIGH_RISK_ALERT` SMS to guardian
  - Log pre-emptive intervention

**Payday Detection:**
- Runs daily at 9:00 AM
- Checks if day 15 or day 28-2 (payday range)
- Checks if user has payday gambling pattern
- Sends `PAYDAY_REMINDER` SMS

**Commitment Countdown:**
- Runs daily at 8:00 AM
- Checks days until commitment expiration
- At 7, 3, and 1 day(s) before end:
  - Send `COMMITMENT_ENDING` SMS
  - Send `COMMITMENT_EXPIRING` SMS to guardian

---

## Notification Preferences

### User Controllable (Can Disable)

**SMS:**
- `daily_checkin` - Daily check-in messages
- `weekly_summary` - Weekly summary SMS
- `high_risk_warnings` - High-risk time warnings
- `milestones` - Milestone achievements
- `guardian_messages` - Messages from guardian

**Email:**
- `daily_checkin` - Daily check-in emails
- `weekly_reports` - Weekly progress reports
- `high_risk_warnings` - High-risk warnings
- `milestones` - Milestone celebrations
- `relapse_response` - Relapse support emails

### Mandatory (CANNOT Disable)

**SMS:**
- `intervention_required` - AI intervention requirements
- `payday_confirmation` - Payday money vault confirmations
- `emergency` - Emergency protocol notifications

**Email:**
- `welcome_series` - Welcome email series (3 emails)
- `commitment_updates` - Commitment status updates

**Why Mandatory?**
- **AI Interventions:** Core functionality of the system
- **Payday Confirmations:** Financial protection mechanism
- **Emergency Protocols:** Safety and crisis management
- **Welcome Series:** Essential setup guidance
- **Commitment Updates:** Legal and functional requirement

---

## API Endpoints

### Get Notification Preferences
```
GET /api/communications/preferences?userId=xxx
```

**Response:**
```json
{
  "preferences": {
    "sms": { "daily_checkin": true, ... },
    "email": { "weekly_reports": true, ... }
  },
  "controllable": { ... },
  "mandatory": { ... }
}
```

### Update Notification Preferences
```
POST /api/communications/preferences
```

**Body:**
```json
{
  "userId": "xxx",
  "preferences": {
    "sms": {
      "daily_checkin": false,
      "weekly_summary": true
    }
  }
}
```

### Unsubscribe from All Optional
```
POST /api/communications/unsubscribe
```

**Body:**
```json
{
  "userId": "xxx"
}
```

**Result:** Disables all optional notifications, keeps mandatory ones active.

### Get Communication History
```
GET /api/communications/history?userId=xxx&type=sms&limit=50
```

**Response:**
```json
{
  "history": [
    {
      "type": "sms",
      "template_id": "DAILY_CHECKIN",
      "message": "Day 7 clean. $350 saved. Stay strong.",
      "status": "delivered",
      "sent_at": "2024-01-15T06:00:00Z"
    }
  ]
}
```

### Send Test Notification
```
POST /api/communications/test
```

**Body:**
```json
{
  "userId": "xxx",
  "type": "sms",
  "templateId": "DAILY_CHECKIN"
}
```

### Check Delivery Status
```
GET /api/communications/status?messageId=xxx
```

---

## Integration Setup

### SendGrid Setup

1. Create SendGrid account
2. Generate API key with send permissions
3. Set environment variables:
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=anchor@yourdomain.com
```

4. Configure webhook for delivery tracking:
```
POST https://your-domain.com/api/communications/webhook/email
```

5. Enable event tracking:
- Delivered
- Bounced
- Dropped
- Opened
- Clicked

### AWS SES Setup

1. Verify sender email in AWS SES
2. Move out of sandbox mode (for production)
3. Set environment variables:
```bash
EMAIL_PROVIDER=ses
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
FROM_EMAIL=anchor@yourdomain.com
```

### Twilio SMS Setup

1. Create Twilio account
2. Purchase Australian phone number
3. Set environment variables:
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+61xxx
```

4. Configure status callback:
```
POST https://your-domain.com/api/communications/webhook/sms
```

### Scheduled Jobs Setup

Use cron jobs or serverless scheduled functions:

```yaml
# Daily 6am (allowance reset)
0 6 * * * node api/scripts/send-daily-checkins.js

# Sunday 6pm (weekly reports)
0 18 * * 0 node api/scripts/send-weekly-reports.js

# Hourly (high-risk warnings)
0 * * * * node api/scripts/check-high-risk.js

# Daily 9am (payday check)
0 9 * * * node api/scripts/check-payday.js

# Daily 8am (commitment countdown)
0 8 * * * node api/scripts/check-commitment.js
```

---

## Bounce Handling

### Email Bounces

**Hard Bounces** (permanent failures):
- Invalid email address
- Domain doesn't exist
- Email account deleted

**Action:**
- Flag `email_invalid = true` in user record
- Stop sending emails to that address
- Notify guardian via SMS
- Display warning in app to update email

**Soft Bounces** (temporary failures):
- Mailbox full
- Server temporarily unavailable

**Action:**
- Retry up to 3 times over 24 hours
- If still failing, treat as hard bounce

### SMS Failures

**Delivery Failures:**
- Invalid phone number
- Phone number no longer in service
- SMS blocked by carrier

**Action:**
- Flag `phone_invalid = true`
- Notify via email (if valid)
- Display urgent warning in app

---

## Unsubscribe Compliance

### Requirements

1. **Unsubscribe Link:** Every email must include unsubscribe link
2. **Honor Immediately:** Process unsubscribe requests within 10 business days (aim for instant)
3. **Keep Mandatory:** Never unsubscribe from mandatory notifications
4. **Confirmation:** Show confirmation page after unsubscribe

### Implementation

**Unsubscribe URL Format:**
```
https://app.anchor.com/preferences/unsubscribe?user={userId}&email={email}&token={hmac}
```

**Token Generation:**
```javascript
const crypto = require('crypto');
const token = crypto
  .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
  .update(`${userId}:${email}`)
  .digest('hex');
```

**Unsubscribe Page:**
- Shows which notifications will be disabled
- Lists mandatory notifications that will continue
- Option to manage preferences instead of unsubscribe all
- Confirmation button

---

## Testing

### Test Notifications

```bash
# Test SMS
curl -X POST https://api.anchor.com/communications/test \
  -H "Content-Type: application/json" \
  -d '{"userId":"xxx","type":"sms","templateId":"DAILY_CHECKIN"}'

# Test Email
curl -X POST https://api.anchor.com/communications/test \
  -H "Content-Type: application/json" \
  -d '{"userId":"xxx","type":"email","templateId":"WEEKLY_REPORT"}'
```

### Scheduled Job Testing

```bash
# Test daily check-ins
node api/scripts/send-daily-checkins.js

# Test weekly reports
node api/scripts/send-weekly-reports.js

# Test high-risk warnings
node api/scripts/check-high-risk.js
```

---

## Monitoring

### Key Metrics

1. **Delivery Rate:** % of messages successfully delivered
2. **Open Rate:** % of emails opened (typical: 20-30%)
3. **Click Rate:** % of emails with link clicks
4. **Bounce Rate:** % of bounced messages (aim: < 2%)
5. **Unsubscribe Rate:** % of unsubscribes (aim: < 0.5%)
6. **Response Time:** Time from trigger to delivery

### Alerts

Set up alerts for:
- Bounce rate > 5%
- Delivery rate < 95%
- SMS failures > 10 per hour
- Email failures > 50 per hour

---

## Troubleshooting

### Messages Not Sending

1. **Check environment variables** - Are API keys set?
2. **Check user record** - Does user have valid phone/email?
3. **Check preferences** - Is notification disabled by user?
4. **Check logs** - What error is being thrown?
5. **Check provider dashboard** - Any account issues?

### Wrong Template Data

1. **Check template variables** - All required variables provided?
2. **Check data types** - Numbers as strings for formatting?
3. **Check template rendering** - Test with renderSMS/renderEmail functions

### Scheduling Not Working

1. **Check cron syntax** - Correct timezone?
2. **Check script execution** - Running with correct permissions?
3. **Check database connection** - Can scripts access Supabase?
4. **Check logs** - Any errors during execution?

---

## Best Practices

1. **Test thoroughly** before production
2. **Monitor delivery rates** daily
3. **Respect user preferences** (except mandatory)
4. **Keep messages concise** (< 160 chars for SMS)
5. **Use Australian phone numbers** for Australian users
6. **Include unsubscribe** in all emails
7. **Handle bounces** immediately
8. **Rate limit** to avoid provider throttling
9. **Log everything** for debugging
10. **Regular audits** of preferences and delivery

---

For questions or issues, see main documentation or contact the development team.
