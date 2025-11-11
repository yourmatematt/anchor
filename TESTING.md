# Anchor Testing Guide

How to test the financial intervention system safely.

## Safety First

**⚠️ IMPORTANT**: Testing involves REAL transactions on your REAL bank account.

### Safe Testing Practices

1. **Use small amounts**: Test with $1-2 transfers
2. **Use trusted contacts**: Transfer to yourself or friends who will return funds
3. **Test during daytime**: In case something goes wrong, support is available
4. **Have backup**: Ensure you can still access Up Bank app directly

## Test Scenarios

### Scenario 1: Whitelisted Transaction (No Alert)

**Expected**: Transaction goes through, NO alert triggered

**Steps**:
1. Open Anchor app
2. Tap Settings → Whitelist
3. Ensure "Mallacoota Foodworks" is whitelisted (or add any test payee)
4. Open Up Bank app
5. Make $1 transfer to whitelisted payee
6. Wait 5 seconds

**Pass Criteria**:
- ✅ No alert in Anchor app
- ✅ Transaction appears in Supabase `transactions` table with `is_whitelisted=true`
- ✅ No push notification

**Fail Actions**:
- Alert triggered → Check whitelist spelling (case-insensitive but must match)
- Transaction not logged → Check webhook logs in Vercel

---

### Scenario 2: Non-Whitelisted Transaction (Alert Required)

**Expected**: Alert triggered, CANNOT dismiss without voice memo

**Steps**:
1. Open Anchor app
2. Tap Settings → Whitelist
3. Ensure test payee is NOT in whitelist
4. Open Up Bank app
5. Make $1 transfer to non-whitelisted payee
6. Wait 5 seconds

**Pass Criteria**:
- ✅ Push notification received within 5 seconds
- ✅ Alert Screen opens automatically
- ✅ Shows transaction details (amount, payee, time)
- ✅ Cannot swipe down to dismiss
- ✅ Cannot press back button to dismiss
- ✅ "Continue" button is disabled/hidden

**Fail Actions**:
- No alert → Check webhook in Up Bank dashboard
- Can dismiss without recording → Bug in AlertScreen.js
- No push notification → Check notification permissions

---

### Scenario 3: Voice Memo Recording

**Expected**: Must record voice memo to dismiss alert

**Steps**:
1. Trigger alert (Scenario 2)
2. On Alert Screen, tap "Tap to Record" button
3. Speak: "This is a test transaction for $1 to verify the accountability system works"
4. Tap "Tap to Stop" button
5. Wait 2 seconds
6. Tap "Continue" button

**Pass Criteria**:
- ✅ Recording starts (shows "Recording..." indicator)
- ✅ Recording stops when tapped
- ✅ Shows "✓ Recording Complete"
- ✅ "Continue" button appears after 2 seconds
- ✅ Can dismiss alert
- ✅ Returns to Home Screen
- ✅ Transaction in Supabase has:
  - `intervention_completed=true`
  - `voice_memo_url` is set
  - `voice_memo_transcript` is set

**Fail Actions**:
- Recording fails → Check microphone permissions
- Cannot dismiss → Reload app
- Database not updated → Check Supabase service key

---

### Scenario 4: Multiple Pending Alerts

**Expected**: Can only have one alert at a time, but pending count shown

**Steps**:
1. Make 3 quick transactions to non-whitelisted payees ($1 each)
2. Open Anchor app
3. Dismiss first alert with voice memo
4. Check Home Screen

**Pass Criteria**:
- ✅ Shows "2 Pending Transactions" banner on Home Screen
- ✅ Tapping banner opens next alert
- ✅ Must complete all voice memos
- ✅ Banner disappears when all completed

---

### Scenario 5: Realtime Updates

**Expected**: Home Screen updates without refresh

**Steps**:
1. Have Anchor app open on Home Screen
2. Make transaction from Up Bank app
3. Watch Anchor app (don't refresh)

**Pass Criteria**:
- ✅ Transaction appears in "Today's Transactions" within 5 seconds
- ✅ If non-whitelisted, Alert Screen opens automatically
- ✅ Balance updates automatically

**Fail Actions**:
- No update → Check Supabase Realtime subscription
- Must manually refresh → Bug in realtime listener

---

### Scenario 6: Whitelist Management

**Expected**: Can add/remove payees from whitelist

**Steps**:
1. Tap Settings → Whitelist
2. Tap + button
3. Add:
   - Payee Name: "Test Payee"
   - Category: "test"
   - Notes: "For testing only"
4. Tap "Add to Whitelist"
5. Find "Test Payee" in list
6. Tap trash icon
7. Confirm removal

**Pass Criteria**:
- ✅ Payee appears in list immediately
- ✅ Shows category color dot
- ✅ Shows notes below name
- ✅ Removal requires confirmation
- ✅ Disappears from list after removal
- ✅ Database updated in Supabase

---

### Scenario 7: Offline Handling

**Expected**: Graceful failure when offline

**Steps**:
1. Turn on Airplane Mode
2. Open Anchor app
3. Try to refresh Home Screen

**Pass Criteria**:
- ✅ Shows error message
- ✅ App doesn't crash
- ✅ Can still view cached data
- ✅ Turn off Airplane Mode → automatic retry

---

### Scenario 8: Token Validation

**Expected**: Invalid token shows clear error

**Steps**:
1. In Up Bank app, delete the Personal Access Token
2. Force close Anchor app
3. Reopen Anchor app
4. Pull to refresh Home Screen

**Pass Criteria**:
- ✅ Shows "Failed to load data" alert
- ✅ Prompts to re-enter token
- ✅ Can enter new token
- ✅ App recovers and works normally

---

## Performance Tests

### Load Test: 100 Transactions

**Steps**:
1. Use Supabase to insert 100 test transactions
2. Open Anchor app
3. Navigate to Home Screen
4. Pull to refresh

**Pass Criteria**:
- ✅ Loads within 2 seconds
- ✅ Shows recent transactions
- ✅ No crashes
- ✅ Smooth scrolling

---

### Stress Test: Rapid Transactions

**Steps**:
1. Make 5 transactions within 30 seconds
2. Watch Anchor app

**Pass Criteria**:
- ✅ All transactions captured
- ✅ Alerts queue properly (one at a time)
- ✅ No crashes
- ✅ All logged to database

---

## Security Tests

### Test 1: Invalid Webhook Signature

**Steps**:
```bash
curl -X POST https://your-vercel-app.vercel.app/api/webhooks/up-bank \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: invalid-signature" \
  -d '{}'
```

**Expected**: `401 Invalid signature`

---

### Test 2: Token in SecureStore

**Steps**:
1. Enter Up Bank token in app
2. Close app
3. Reopen app
4. Check if still works (token persisted)

**Expected**:
- ✅ Token persists across app restarts
- ✅ Stored in encrypted SecureStore (not AsyncStorage)

---

### Test 3: SQL Injection Prevention

**Steps**:
```bash
curl https://your-vercel-app.vercel.app/api/up/accounts \
  -H "Authorization: Bearer '; DROP TABLE whitelist; --"
```

**Expected**:
- ✅ Returns 401 error
- ✅ Database unchanged
- ✅ No tables dropped

---

## Database Verification

After each test scenario, verify in Supabase:

### Check Transactions Table

```sql
SELECT
  transaction_id,
  amount,
  payee_name,
  is_whitelisted,
  intervention_completed,
  timestamp
FROM transactions
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected**:
- All test transactions present
- Correct `is_whitelisted` values
- Completed interventions have `intervention_completed=true`

### Check Whitelist Table

```sql
SELECT
  payee_name,
  category,
  notes,
  created_at
FROM whitelist
ORDER BY created_at DESC;
```

**Expected**:
- All whitelisted payees present
- No duplicates
- Correct categories

---

## Webhook Verification

### Check Webhook Status

```bash
curl https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN"
```

**Expected**:
```json
{
  "data": [{
    "id": "...",
    "attributes": {
      "url": "https://your-vercel-app.vercel.app/api/webhooks/up-bank",
      "description": "Anchor Financial Accountability System"
    }
  }]
}
```

### Ping Webhook

```bash
curl -X POST https://your-vercel-app.vercel.app/api/up/webhook-setup?ping=true \
  -H "Authorization: Bearer $UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "your-webhook-id"}'
```

**Expected**:
- Response: `"deliveryStatus": "DELIVERED"`
- Check Vercel logs for ping event

---

## Monitoring

### Vercel Logs

```bash
vercel logs --follow
```

Watch for:
- Webhook events
- Signature validation
- Database queries
- Errors

### Supabase Logs

Dashboard → Logs → API

Watch for:
- Transaction inserts
- Whitelist queries
- Realtime subscriptions

---

## Test Checklist

Before going live:

- [ ] Scenario 1: Whitelisted transaction (no alert)
- [ ] Scenario 2: Non-whitelisted transaction (alert)
- [ ] Scenario 3: Voice memo recording works
- [ ] Scenario 4: Multiple pending alerts
- [ ] Scenario 5: Realtime updates
- [ ] Scenario 6: Whitelist management
- [ ] Scenario 7: Offline handling
- [ ] Scenario 8: Token validation
- [ ] Performance: 100 transactions load fast
- [ ] Security: Invalid webhook rejected
- [ ] Security: Token persists securely
- [ ] Database: All transactions logged correctly
- [ ] Webhook: Pings successfully

---

## Rollback Plan

If something breaks in production:

### Disable Webhook

```bash
# List webhooks
curl https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN"

# Delete webhook
curl -X DELETE https://your-vercel-app.vercel.app/api/up/webhook-setup \
  -H "Authorization: Bearer $UP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "webhook-id-here"}'
```

This stops new alerts. You can still:
- Access Up Bank normally
- View Anchor app (read-only)
- Review past transactions

### Restore Webhook

Re-run webhook setup (see SETUP.md Part 3).

---

## Known Issues

### Issue: Alert shows old transaction

**Cause**: Realtime subscription lag
**Workaround**: Pull to refresh Home Screen
**Fix**: TODO - implement better queuing

### Issue: Voice memo doesn't save

**Cause**: Supabase storage not configured
**Workaround**: File saves locally, transcript saves
**Fix**: TODO - implement Supabase Storage upload

### Issue: Multiple alerts at once

**Cause**: Rapid transactions
**Workaround**: Complete each one sequentially
**Fix**: TODO - implement alert queue UI

---

## Success Metrics

After 1 week of testing:

- **100% webhook reliability**: All transactions captured
- **100% intervention rate**: Never dismissed alert without voice memo
- **<2 second latency**: Alert appears within 2 seconds of transaction
- **Zero data loss**: All transactions in database
- **Zero crashes**: App stable under normal use

If any metric fails, investigate before going fully live.

---

## Patient Zero Go-Live

When you're ready to use for real:

1. ✅ All tests passing
2. ✅ Webhook reliable for 24 hours
3. ✅ Mobile app stable (no crashes)
4. ✅ Voice memos saving correctly
5. ✅ Whitelist finalized (only essential payees)
6. ✅ Support person informed (optional)
7. ✅ Backup access to Up Bank confirmed

Then:
- Remove all test payees from whitelist
- Keep only essential payees (rent, utilities, groceries)
- Enable notifications (max volume, vibration)
- Keep phone charged and nearby
- Start living with accountability

**You're now protected by Anchor.**

Every unauthorized spend requires a voice memo. Every transaction is logged. Every impulse is interrupted.

The intervention system is live.
