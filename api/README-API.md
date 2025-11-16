# Anchor REST API Documentation

Complete backend API for the Anchor gambling intervention system.

## Base URL

```
Development: http://localhost:3000
Production: https://api.anchor.app (to be configured)
```

## Authentication

All routes (except webhooks) require JWT authentication via Bearer token:

```
Authorization: Bearer <token>
```

**Token Types**:
- User Token: Generated on login/onboarding
- Guardian Token: Generated for guardian portal access

**Token Expiry**: 7 days

## Rate Limiting

- **100 requests per minute** per IP address
- Returns `429 Too Many Requests` if exceeded

## Response Format

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... } // Optional
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | No auth token provided |
| `INVALID_TOKEN` | Invalid or malformed token |
| `TOKEN_EXPIRED` | Token has expired |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `SERVER_ERROR` | Internal server error |

---

## Payment Routes

### POST /api/payment/request

Create payment request and trigger AI evaluation.

**Auth**: User

**Body**:
```json
{
  "amount": 100.50,
  "reason": "Need money for electricity bill",
  "is_voice": false
}
```

**Response** (201):
```json
{
  "success": true,
  "payment_request_id": "uuid",
  "conversation_id": "uuid",
  "status": "evaluating",
  "message": "Payment request created, AI evaluation started"
}
```

---

### GET /api/payment/history

Get payment request history with pagination.

**Auth**: User

**Query Params**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 100.00,
      "reason": "...",
      "status": "approved",
      "requested_at": "2025-11-16T10:00:00Z",
      "completed": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### POST /api/payment/confirm/:id

Confirm manual payment completion (after approved).

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "message": "Payment confirmed"
}
```

---

### GET /api/payment/pending

Get pending payment requests (evaluating or approved but not completed).

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /api/payment/stats

Payment statistics.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "approved": 30,
    "denied": 12,
    "evaluating": 3,
    "total_requested": 4500.00,
    "total_approved": 3200.00,
    "approval_rate": "66.7"
  }
}
```

---

## Guardian Routes

### POST /api/guardian/invite

Send SMS invite to guardian.

**Auth**: User

**Body**:
```json
{
  "name": "Sarah Jones",
  "phone": "+61412345678",
  "email": "sarah@example.com",
  "relationship": "Partner"
}
```

**Response** (201):
```json
{
  "success": true,
  "guardian_id": "uuid",
  "message": "SMS invite sent to +61412345678"
}
```

---

### POST /api/guardian/accept/:token

Accept guardian invitation (from SMS link).

**Auth**: None (token in URL)

**Response** (200):
```json
{
  "success": true,
  "guardian_token": "jwt-token",
  "user_name": "Matt",
  "message": "Guardian role accepted"
}
```

---

### GET /api/guardian/status

Get guardian status and info.

**Auth**: Guardian

**Response** (200):
```json
{
  "success": true,
  "guardian": {
    "id": "uuid",
    "name": "Sarah Jones",
    "relationship": "Partner",
    "status": "active"
  },
  "user": {
    "name": "Matt",
    "clean_streak_days": 47,
    "commitment_end_date": "2026-05-16"
  }
}
```

---

### GET /api/guardian/view

What guardian sees (clean streak, patterns, NO amounts).

**Auth**: Guardian

**Response** (200):
```json
{
  "success": true,
  "data": {
    "clean_streak_days": 47,
    "current_status": "stable",
    "recent_events": [...],
    "money_saved_description": "Has saved significant amount",
    "next_check_in": null
  }
}
```

---

### POST /api/guardian/emergency

Guardian triggers emergency check-in.

**Auth**: Guardian

**Body**:
```json
{
  "reason": "Haven't heard from them in 3 days, worried about relapse"
}
```

**Response** (200):
```json
{
  "success": true,
  "conversation_id": "uuid",
  "message": "Emergency check-in triggered, user will be notified"
}
```

---

## Vault Routes

### GET /api/vault/balance

Current vault balance.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "balance": 2150.50,
  "locked_until": "2026-05-16",
  "days_remaining": 318
}
```

---

### GET /api/vault/growth

Vault growth since clean date.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "growth": {
    "start_balance": 0,
    "current_balance": 2150.50,
    "total_deposits": 2150.50,
    "clean_streak_days": 47,
    "average_per_day": 45.75
  }
}
```

---

### GET /api/vault/projections

Calculate 6/12/24 month projections.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "projections": {
    "6_months": 8235.00,
    "12_months": 16470.00,
    "24_months": 32940.00,
    "assumptions": "Based on current saving rate of $45.75/day"
  }
}
```

---

## Allowance Routes

### GET /api/allowance/balance

Current daily allowance remaining.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "balance": 23.50,
  "daily_limit": 30.00,
  "used_today": 6.50,
  "resets_at": "2025-11-17T00:00:00Z"
}
```

---

### GET /api/allowance/history

Allowance usage history (7/30 days).

**Auth**: User

**Query Params**:
- `days` (default: 7, max: 90)

**Response** (200):
```json
{
  "success": true,
  "history": [
    {
      "date": "2025-11-16",
      "used": 6.50,
      "limit": 30.00,
      "percentage": 21.7
    }
  ]
}
```

---

## Pattern Routes

### POST /api/patterns/detect

Analyze transaction for patterns (called by webhook handler).

**Auth**: Service (internal)

**Body**:
```json
{
  "user_id": "uuid",
  "transaction": {
    "description": "Sportsbet Pty Ltd",
    "amount": -150.00,
    "timestamp": "2025-11-16T21:45:00Z"
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "pattern_detected": true,
  "pattern": {
    "type": "GAMBLING_VENUE",
    "risk": "CRITICAL",
    "trigger_ai": true,
    "trigger_guardian": true
  }
}
```

---

### GET /api/patterns/user/:userId

Get user's detected patterns.

**Auth**: User or Guardian

**Query Params**:
- `days` (default: 30, max: 365)

**Response** (200):
```json
{
  "success": true,
  "patterns": [
    {
      "pattern_type": "SUSPICIOUS_TRANSFER",
      "detected_at": "2025-11-16T19:30:00Z",
      "severity": "HIGH",
      "details": {}
    }
  ]
}
```

---

### GET /api/patterns/timeline

Pattern timeline for calendar view.

**Auth**: User

**Query Params**:
- `start_date` (ISO 8601)
- `end_date` (ISO 8601)

**Response** (200):
```json
{
  "success": true,
  "timeline": [
    {
      "date": "2025-11-16",
      "has_patterns": true,
      "pattern_count": 2,
      "highest_severity": "CRITICAL"
    }
  ]
}
```

---

## Bills Routes

### GET /api/bills/upcoming

Bills due in next 7 days.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "bills": [
    {
      "id": "uuid",
      "payee_name": "Telstra",
      "amount": 75.00,
      "due_date": "2025-11-20",
      "priority": "critical",
      "status": "pending"
    }
  ]
}
```

---

### POST /api/bills/add

Add bill to whitelist.

**Auth**: User

**Body**:
```json
{
  "payee_name": "Electricity Provider",
  "amount": 120.00,
  "frequency": "monthly",
  "priority": "critical",
  "due_date": "2025-11-20",
  "notes": "Average $120/month"
}
```

**Response** (201):
```json
{
  "success": true,
  "bill_id": "uuid"
}
```

---

### PUT /api/bills/update/:id

Update bill details.

**Auth**: User

**Body**:
```json
{
  "amount": 130.00,
  "notes": "Increased to $130"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Bill updated"
}
```

---

### DELETE /api/bills/remove/:id

Remove bill from whitelist.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "message": "Bill removed"
}
```

---

## User Routes

### POST /api/user/onboard

Complete user onboarding.

**Auth**: None (creates initial token)

**Body**:
```json
{
  "name": "Matt",
  "phone": "+61412345678",
  "commitment_period_months": 12,
  "gambling_type": ["pokies", "online"],
  "known_triggers": ["tuesday_night", "payday"],
  "up_bank_token": "up:yeah:..."
}
```

**Response** (201):
```json
{
  "success": true,
  "user_id": "uuid",
  "token": "jwt-token",
  "message": "Onboarding complete"
}
```

---

### GET /api/user/profile

Get user profile and settings.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "name": "Matt",
    "phone": "+61412345678",
    "commitment_period_months": 12,
    "commitment_start_date": "2025-05-16",
    "commitment_end_date": "2026-05-16",
    "gambling_type": ["pokies", "online"],
    "known_triggers": ["tuesday_night"]
  }
}
```

---

### GET /api/user/streak

Get clean streak details.

**Auth**: User

**Response** (200):
```json
{
  "success": true,
  "streak": {
    "days": 47,
    "start_date": "2025-10-01",
    "last_relapse_date": null,
    "total_relapses": 0,
    "longest_streak": 47
  }
}
```

---

### POST /api/user/relapse

Record relapse (called by pattern detector).

**Auth**: Service (internal)

**Body**:
```json
{
  "user_id": "uuid",
  "pattern_type": "GAMBLING_VENUE",
  "transaction_id": "txn-id"
}
```

**Response** (200):
```json
{
  "success": true,
  "new_streak_days": 0,
  "total_relapses": 1
}
```

---

## Cron Jobs

### Scheduled Tasks

**EVERY MINUTE**:
- Check for timed-out AI conversations (10+ minutes inactive)
- Process pending webhook retries

**DAILY at midnight AEST**:
- Reset daily allowance to $30
- Update clean streaks
- Check for overdue bills
- Send daily summary to guardians (if enabled)

**HOURLY**:
- Sync Up Bank transactions (backup to webhooks)
- Calculate vault interest
- Check pattern violations

**WEEKLY (Sunday 6pm)**:
- Send progress report to guardian
- Calculate money saved vs gambling baseline
- Generate weekly insights

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxxx

# Security
JWT_SECRET=your-secret-key-change-in-production
ALLOWED_ORIGINS=https://app.anchor.app,https://guardian.anchor.app

# Up Bank
UP_WEBHOOK_SECRET=xxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+61412345678

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# ElevenLabs
ELEVENLABS_API_KEY=xxxxx
TTS_VOICE_ID=xxxxx
```

---

## Setup

```bash
cd api
npm install
npm run dev
```

Server runs on `http://localhost:3000`

---

## Testing

```bash
npm test
```

Runs Jest test suite with coverage reports.

---

## Deployment

Deploy to Vercel as serverless functions or to any Node.js hosting:

```bash
npm run build
npm start
```

---

## Files Created

```
api/
├── index.js              # Main Express server
├── package.json          # Dependencies
├── utils/
│   └── supabase.js      # Supabase client + error logging
├── middleware/
│   ├── auth.js          # JWT authentication
│   └── validation.js    # Joi validation schemas
├── routes/
│   ├── payment.js       # Payment requests
│   ├── guardian.js      # Guardian management
│   ├── vault.js         # Vault operations
│   ├── allowance.js     # Daily allowance
│   ├── patterns.js      # Pattern detection
│   ├── bills.js         # Bill management
│   └── user.js          # User management
├── services/
│   ├── cron-jobs.js     # Scheduled tasks
│   └── ai-conversation.js # AI conversation engine
├── webhooks/
│   └── up-bank.js       # Up Bank webhook handler
└── README-API.md        # This file
```

---

## Security Features

- ✅ JWT authentication
- ✅ Rate limiting (100 req/min)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation (Joi)
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ Request size limits (10MB)
- ✅ HMAC webhook signatures
- ✅ Error logging to database

---

## Error Logging

All errors logged to `error_logs` table:

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_message TEXT,
  error_stack TEXT,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

**Total API Implementation**: ~2,000 lines of production-ready backend code
