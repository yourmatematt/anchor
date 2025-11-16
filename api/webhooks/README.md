# Anchor Webhook System

Complete Up Bank webhook handler with pattern detection, AI triggering, and guardian notifications.

## Overview

This webhook system processes Up Bank `TRANSACTION_CREATED` events in real-time to detect gambling patterns and trigger interventions.

### Components

1. **up-bank.js** - Main webhook receiver
2. **pattern-detection.js** - Pattern analysis engine
3. **transaction-processor.js** - Transaction storage and streak management
4. **ai-trigger.js** - AI conversation triggers and push notifications
5. **guardian-notifier.js** - Guardian SMS notifications via Twilio

## Flow Diagram

```
Up Bank Transaction
       ↓
Webhook Receiver (up-bank.js)
       ↓
Validate Signature
       ↓
Check Whitelist → YES → Store & Exit
       ↓ NO
Pattern Detection Engine
       ↓
Detected Pattern?
       ↓ YES
┌──────┴──────┐
│   CRITICAL?  │ (Payday loan, gambling venue, crypto)
└──────┬──────┘
       ↓ YES
┌──────────────┬──────────────┬──────────────┐
│ Reset Streak │ Trigger AI   │ Notify Guardian│
└──────────────┴──────────────┴──────────────┘
       ↓
Mobile App Alert → Force AI Conversation
       ↓
Guardian SMS: "ANCHOR ALERT: [Pattern] detected"
```

## Pattern Detection

### CRITICAL Patterns (Immediate intervention + streak reset)

**1. PAYDAY_LOAN**
- Providers: Beforepay, MyPayNow, Nimble, Wagepay, etc.
- Keywords: "loan", "advance", "quick cash"
- Action: Reset streak, trigger AI, notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt triggered PAYDAY LOAN detection. Day 47 clean. Amount: $200. They're in a forced AI conversation now."`

**2. GAMBLING_VENUE**
- Online: Sportsbet, TAB, Ladbrokes, Bet365, etc.
- Venues: RSL, Crown Casino, Star Casino
- Late night + "hotel"/"club" = HIGH RISK
- Action: Reset streak, trigger AI, notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt detected at gambling venue (Sportsbet). Day 47 clean. Amount: $150. Intervention triggered."`

**3. CRYPTO_EXCHANGE**
- Exchanges: CoinSpot, Binance, Coinbase, Swyftx
- Keywords: "crypto", "bitcoin", "BTC"
- Action: Reset streak, trigger AI, notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt made crypto transaction. Day 47 clean. Amount: $300. Checking if gambling-related."`

### HIGH Patterns (Intervention without streak reset)

**4. CASH_WITHDRAWAL**
- Trigger: >$100 ATM or cash out
- Late night multiplier
- Action: Trigger AI (if >$100), notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt withdrew cash ($150) LATE NIGHT. Day 47 clean. Red flag - they set up Anchor to avoid cash."`

**5. SUSPICIOUS_TRANSFER**
- Risk factors:
  - Late night (after 10pm) = +30 points
  - Tuesday evening (poker pattern) = +40 points
  - Weekend night = +25 points
  - Round numbers ($50, $100, $200) = +15 points
  - Large amount (>$200) = +20 points
- Trigger threshold: 40+ points
- Action: Trigger AI (if 60+ points), notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt suspicious transfer detected. Day 47 clean. $200 on Tuesday late night. AI investigating."`

**6. MULTIPLE_WITHDRAWALS**
- Trigger: 3+ withdrawals <$100 totaling >$100 in one day
- Evasion detection (avoiding single withdrawal limits)
- Action: Trigger AI, notify guardian
- Guardian SMS: `"ANCHOR ALERT: Matt made 3 withdrawals today totaling $150. Day 47 clean. Pattern detected."`

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Up Bank
UP_WEBHOOK_SECRET=your-webhook-secret-from-up-bank
TEST_USER_ID=uuid-of-test-user

# Twilio (for Guardian SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+61412345678

# Environment
NODE_ENV=development # Set to 'production' for strict validation
```

## Testing

### 1. Local Testing with Test Payloads

Use the test payloads in `test-payloads.json`:

```bash
# Test whitelisted transaction (no intervention)
curl -X POST http://localhost:3000/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d @test-payloads.json#legitimate_whitelisted

# Test payday loan (CRITICAL)
curl -X POST http://localhost:3000/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d @test-payloads.json#payday_loan_beforepay

# Test gambling venue (CRITICAL)
curl -X POST http://localhost:3000/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d @test-payloads.json#gambling_sportsbet

# Test suspicious transfer (HIGH)
curl -X POST http://localhost:3000/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d @test-payloads.json#suspicious_transfer_tuesday_night
```

### 2. Testing with Individual Payloads

```bash
# Payday Loan Test
curl -X POST http://localhost:3000/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d '{
    "data": {
      "type": "webhook-events",
      "attributes": {
        "eventType": "TRANSACTION_CREATED",
        "createdAt": "2025-11-16T14:23:00+11:00",
        "amount": { "value": "200.00" },
        "description": "Beforepay Pty Ltd"
      },
      "relationships": {
        "transaction": { "data": { "id": "test-txn-1" } },
        "account": { "data": { "id": "acc-test-user" } }
      }
    }
  }'
```

### 3. Expected Console Output

**Whitelisted Transaction:**
```
=== UP BANK WEBHOOK RECEIVED ===
Event type: TRANSACTION_CREATED
Transaction ID: txn-001-whitelisted
User: Test User test-user-id
Transaction: Telstra Mobile $-75
Whitelisted: true
Whitelisted transaction - no intervention needed
```

**Payday Loan (CRITICAL):**
```
=== UP BANK WEBHOOK RECEIVED ===
Event type: TRANSACTION_CREATED
Transaction ID: txn-002-payday-loan
User: Test User test-user-id
Transaction: Beforepay Pty Ltd $200
Whitelisted: false
Pattern detected: PAYDAY_LOAN
=== INTERVENTION TRIGGERED ===
Pattern: PAYDAY_LOAN
Risk: CRITICAL
Trigger AI: true
Trigger Guardian: true
Reset Streak: true
Resetting clean streak. Previous: 47 days
Triggering AI conversation...
AI intervention result: { success: true, conversationId: '...' }
Notifying guardian...
Guardian notification result: { success: true, guardianName: 'Gutsy' }
```

### 4. Database Checks

After webhook processing, check these tables:

**transactions:**
```sql
SELECT * FROM transactions
WHERE transaction_id = 'txn-002-payday-loan';

-- Should show:
-- pattern_detected: 'PAYDAY_LOAN'
-- risk_level: 'CRITICAL'
-- intervention_required: true
-- guardian_notified: true
```

**ai_conversations:**
```sql
SELECT * FROM ai_conversations
WHERE transaction_id = 'txn-002-payday-loan';

-- Should show:
-- trigger_type: 'PAYDAY_LOAN'
-- status: 'pending'
-- is_unavoidable: true
```

**gambling_patterns:**
```sql
SELECT * FROM gambling_patterns
WHERE transaction_id = 'txn-002-payday-loan';

-- Should show:
-- pattern_type: 'PAYDAY_LOAN'
-- severity: 'CRITICAL'
```

**users:**
```sql
SELECT last_relapse_date, current_streak_days, total_relapses
FROM users
WHERE id = 'test-user-id';

-- Should show updated values for CRITICAL patterns
```

**guardian_notifications:**
```sql
SELECT * FROM guardian_notifications
WHERE user_id = 'test-user-id'
ORDER BY sent_at DESC
LIMIT 1;

-- Should show latest SMS sent to guardian
```

## Mobile App Integration

When intervention is triggered:

1. **Push Notification** sent via Expo:
   ```json
   {
     "to": "ExponentPushToken[xxxxx]",
     "title": "🚨 PAYDAY LOAN DETECTED",
     "body": "Mate, you just took a payday loan. We need to talk NOW.",
     "data": {
       "type": "INTERVENTION_REQUIRED",
       "conversationId": "uuid",
       "transactionId": "txn-id",
       "pattern": "PAYDAY_LOAN"
     }
   }
   ```

2. **Mobile app opens AlertScreen** (full-screen modal, cannot dismiss)

3. **User forced into AI conversation** (cannot skip)

4. **Guardian notified via SMS** simultaneously

## Pattern Examples

### Tuesday Poker Pattern
```javascript
// Tuesday night + transfer = HIGH RISK
{
  "description": "Transfer to John Smith",
  "amount": "-100.00",
  "timestamp": "2025-11-19T19:30:00+11:00" // Tuesday 7:30 PM
}

// Risk calculation:
// - Tuesday evening (18:00+) = +40 points
// - Round number ($100) = +15 points
// Total: 55 points → Triggers AI + Guardian
```

### Multiple Withdrawal Evasion
```javascript
// Three small withdrawals same day:
[
  { "amount": "-40.00", "time": "12:00" },  // ATM 1
  { "amount": "-50.00", "time": "14:30" },  // ATM 2
  { "amount": "-60.00", "time": "17:45" }   // ATM 3 → Triggers MULTIPLE_WITHDRAWALS
]

// Total: $150 in 3 transactions
// Pattern: Avoiding single $100+ threshold
// Action: Trigger AI + Guardian
```

## Error Handling

The webhook handles these error scenarios:

1. **Missing Signature** (production only):
   ```json
   { "error": "Missing signature" }
   ```
   Status: 401

2. **Invalid Signature** (production only):
   ```json
   { "error": "Invalid signature" }
   ```
   Status: 401

3. **User Not Found**:
   ```json
   { "error": "User not found" }
   ```
   Status: 404

4. **Missing Transaction Data**:
   ```json
   { "error": "Missing transaction data" }
   ```
   Status: 400

5. **Database Errors**:
   ```json
   {
     "error": "Internal server error",
     "message": "Failed to store transaction: ..."
   }
   ```
   Status: 500

All errors logged to console with full stack trace.

## Rate Limiting

Guardian notifications are rate-limited to prevent spam:
- **Max 1 notification per 5 minutes** per guardian
- Subsequent alerts within 5 minutes are logged but not sent
- Check `guardian_notifications` table for delivery status

## Production Deployment

1. **Set environment variables** in Vercel/hosting platform

2. **Configure Up Bank webhook**:
   ```bash
   # Set webhook URL to your production endpoint
   POST https://api.up.com.au/api/v1/webhooks
   {
     "data": {
       "attributes": {
         "url": "https://your-domain.com/api/webhooks/up-bank",
         "description": "Anchor intervention webhook"
       }
     }
   }
   ```

3. **Test with real Up Bank account** (Sandbox mode first)

4. **Monitor logs** for pattern detection accuracy

5. **Adjust thresholds** based on false positive rate

## Security

- ✅ HMAC-SHA256 signature validation (timing-safe comparison)
- ✅ Environment-based validation (strict in production)
- ✅ Service key for Supabase (not anon key)
- ✅ Encrypted Twilio credentials
- ✅ Rate limiting on guardian notifications
- ✅ Input validation on all transaction data
- ✅ SQL injection prevention via Supabase client

## Monitoring

Key metrics to track:

1. **Pattern Detection Accuracy**
   - True positives (confirmed gambling)
   - False positives (legitimate transactions flagged)
   - False negatives (gambling not detected)

2. **Intervention Success Rate**
   - Conversations completed
   - Conversations abandoned
   - Confirmed relapses vs false alarms

3. **Guardian Engagement**
   - SMS delivery rate
   - Response time
   - Support effectiveness

4. **System Health**
   - Webhook processing time
   - Database query performance
   - Push notification delivery rate

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify environment variables are set correctly
- Test with sample payloads first
- Check Supabase tables for data integrity

## Files

- `up-bank.js` - Main webhook handler (295 lines)
- `../services/pattern-detection.js` - Pattern engine (437 lines)
- `../services/transaction-processor.js` - Transaction storage (283 lines)
- `../services/ai-trigger.js` - AI triggering (244 lines)
- `../services/guardian-notifier.js` - Guardian SMS (321 lines)
- `test-payloads.json` - Sample webhook payloads (12 scenarios)
- `README.md` - This documentation

**Total: ~1,580 lines of production-ready code**
