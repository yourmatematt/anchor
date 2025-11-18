# Anchor Partner Integration System

## Overview

The Anchor Partner Integration System manages relationships with external partners to provide meaningful rewards and support services to users. This non-gamified, milestone-based system focuses on practical assistance rather than entertainment.

## Architecture

### Core Components

1. **Partner Manager** (`api/services/partner-manager.js`)
   - Central orchestrator for all partner integrations
   - Manages partner registration, authentication, and lifecycle
   - Handles OAuth2 flows and credential encryption
   - Provides unified interface for all partner operations

2. **Reward Distributor** (`api/services/reward-distributor.js`)
   - Manages milestone-based reward distribution
   - Tracks user progress and clean days
   - Automatically issues rewards when milestones are reached
   - Handles reward selection for choice rewards

3. **Partner Integrations** (`api/integrations/`)
   - Individual integration modules for each partner type
   - Woolworths, Coles (retail)
   - Energy Australia, AGL, Origin (utilities)
   - Opal, Myki, Fuel Vouchers (transport)

4. **API Routes** (`api/routes/partners.js`)
   - RESTful API endpoints for partner operations
   - Webhook receivers for partner events
   - Reward claiming and balance checking

5. **Mobile UI** (`mobile/src/screens/RewardsScreen.js`)
   - User-facing rewards interface
   - Progress tracking and milestone visualization
   - Partner selection for choice rewards

## Partner Types

### Retail Partners

Provide grocery vouchers and gift cards to help with essential expenses.

**Supported Partners:**
- Woolworths
- Coles
- Aldi
- Kmart/Target

**Capabilities:**
- Issue digital vouchers
- Issue gift cards
- Check balance
- Transaction history
- Real-time redemption tracking

### Utility Partners

Provide bill credits to ease financial burden.

**Supported Partners:**
- Energy Australia
- AGL
- Origin Energy
- Telstra/Optus

**Capabilities:**
- Apply bill credits
- Check account balance
- Get billing history
- Credit history tracking
- Webhook notifications for billing events

### Transport Partners

Provide transport credits and fuel vouchers for mobility support.

**Supported Partners:**
- Transport NSW (Opal Card)
- Transport Victoria (Myki)
- Fuel Vouchers (7-Eleven, BP, Shell, Caltex, Ampol)

**Capabilities:**
- Add transport credits
- Issue fuel vouchers
- Check card/voucher balance
- Travel history (Opal/Myki)
- Top-up history

### Support Partners

Connect users with professional support services.

**Available Services:**
- Relationships Australia (counseling)
- Lifeline (24/7 crisis support)
- Financial Counsellors Australia
- Gambling Help services

## Milestone Structure

### Non-Gamified Approach

Anchor uses milestone-based rewards to provide meaningful support, not to gamify recovery. Each milestone represents genuine progress and provides practical assistance.

### Milestone Levels

| Milestone | Days | Reward Type | Amount | Partners |
|-----------|------|-------------|--------|----------|
| **30 Days** | 30 | Grocery Voucher | $20 | Woolworths, Coles |
| **90 Days** | 90 | Utility Credit | $50 | Energy Australia, AGL, Origin |
| **180 Days** | 180 | Transport Credit | $100 | Opal, Myki, Fuel Vouchers |
| **365 Days** | 365 | Choice Reward | $200 | User selects partner |

### Milestone Philosophy

- **30 Days**: Essential support during early progress
- **90 Days**: Bill assistance to reduce financial stress
- **180 Days**: Mobility support to maintain progress
- **365 Days**: Recognition with flexibility and choice

## Integration Patterns

### OAuth2 Authentication

All partner integrations use OAuth2 for secure authentication.

**Flow:**
1. Partner registers with Anchor
2. Anchor redirects user to partner's authorization page
3. User grants permission
4. Partner redirects back with authorization code
5. Anchor exchanges code for access/refresh tokens
6. Tokens stored encrypted in database

**Code Example:**
```javascript
const { partnerManager } = require('./services/partner-manager');

// Exchange authorization code for tokens
const tokens = await partnerManager.processOAuthCallback(
  'woolworths',
  authorizationCode,
  state
);
```

### Webhook Handling

Partners send webhook notifications for important events.

**Supported Events:**
- Voucher redeemed
- Voucher expired
- Bill generated
- Credit applied
- Payment received
- Low balance warnings

**Webhook Security:**
- HMAC-SHA256 signature validation
- Timing-safe comparison
- Request replay prevention

**Code Example:**
```javascript
// Validate webhook signature
const isValid = integration.validateWebhook(
  payload,
  signature,
  partnerId
);

if (isValid) {
  await integration.handleWebhook(eventType, payload, partnerId);
}
```

### Credential Encryption

All partner credentials and tokens are encrypted at rest using AES-256-GCM.

**Features:**
- Authenticated encryption
- Unique IV per encryption
- Auth tag verification
- Timing-safe decryption

**Environment Variables Required:**
```bash
ENCRYPTION_KEY=<64-character hex string>
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Reference

### Partner Endpoints

#### List Partners
```http
GET /api/partners
```

**Response:**
```json
{
  "partners": [
    {
      "id": "woolworths",
      "name": "Woolworths",
      "type": "retail",
      "capabilities": ["vouchers", "gift_cards", "balance_check"]
    }
  ],
  "total": 14
}
```

#### Get Partner Details
```http
GET /api/partners/:partnerId
```

**Response:**
```json
{
  "id": "woolworths",
  "name": "Woolworths",
  "type": "retail",
  "capabilities": ["vouchers", "gift_cards", "balance_check"],
  "status": "active",
  "available": true
}
```

#### Link Partner Account
```http
POST /api/partners/:partnerId/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountNumber": "1234567890",
  "securityCode": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "partnerId": "opal",
  "linked": true,
  "message": "Account linked successfully"
}
```

### Reward Endpoints

#### Get User Rewards
```http
GET /api/rewards
Authorization: Bearer <token>
```

**Response:**
```json
{
  "rewards": [
    {
      "id": "reward_123",
      "milestone_id": "month_1",
      "status": "issued",
      "reward_type": "grocery_voucher",
      "reward_amount": 20,
      "partner_used": "woolworths",
      "distribution_details": {
        "voucherId": "WW123456",
        "voucherCode": "XXXX-XXXX-XXXX",
        "expiresAt": "2024-06-01T00:00:00Z"
      }
    }
  ],
  "total": 1
}
```

#### Check for New Rewards
```http
POST /api/rewards/check
Authorization: Bearer <token>
```

**Response:**
```json
{
  "checked": true,
  "newRewards": [
    {
      "milestone": "month_1",
      "status": "issued",
      "rewardId": "reward_124"
    }
  ],
  "total": 1
}
```

#### Claim Reward
```http
POST /api/rewards/:rewardId/claim
Authorization: Bearer <token>
Content-Type: application/json

{
  "partnerId": "woolworths"
}
```

**Response:**
```json
{
  "success": true,
  "reward": {
    "milestone": "year_1",
    "status": "issued",
    "partnerId": "woolworths",
    "distributionResult": {
      "voucherId": "WW789012",
      "voucherCode": "YYYY-YYYY-YYYY",
      "amount": 200
    }
  }
}
```

## Partner Onboarding Guide

### For New Partners

#### Step 1: Initial Contact
Contact Anchor partnerships team at partnerships@anchor.com

#### Step 2: Technical Integration
1. Review API documentation
2. Set up OAuth2 application
3. Configure webhook endpoints
4. Obtain API credentials

#### Step 3: Testing
1. Use sandbox environment
2. Test voucher/credit issuance
3. Test webhook delivery
4. Verify reconciliation

#### Step 4: Go Live
1. Production credentials
2. Legal agreements
3. Marketing materials
4. Launch coordination

### Partner Requirements

**Technical:**
- OAuth2 support
- REST API with JSON
- Webhook capability (optional but recommended)
- HTTPS endpoints

**Business:**
- Ability to issue digital vouchers/credits
- Support for partner-funded rewards
- Reconciliation reporting
- Customer support integration

**Security:**
- PCI compliance (if handling payment cards)
- SOC 2 Type II (recommended)
- Webhook signature validation
- Rate limiting

## Database Schema

### Partners Table
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- retail, utility, transport, support
  status TEXT NOT NULL, -- active, inactive, pending, suspended
  config JSONB,
  api_credentials JSONB, -- encrypted
  capabilities TEXT[],
  webhook_url TEXT,
  oauth_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Partner Tokens Table
```sql
CREATE TABLE partner_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(partner_id),
  access_token JSONB NOT NULL, -- encrypted
  refresh_token JSONB NOT NULL, -- encrypted
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Rewards Table
```sql
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  milestone_id TEXT NOT NULL,
  milestone_days INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- pending, processing, issued, redeemed, expired, failed
  eligible_partners TEXT[],
  partner_used TEXT,
  distribution_details JSONB,
  message TEXT,
  error_message TEXT,
  issued_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Partner Accounts Table
```sql
CREATE TABLE user_partner_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_id TEXT NOT NULL,
  account_type TEXT NOT NULL, -- utility, transport, retail
  account_number TEXT,
  card_number TEXT,
  linked_at TIMESTAMP NOT NULL,
  verification_status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Partner Activity Log Table
```sql
CREATE TABLE partner_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  details JSONB,
  user_id UUID,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

### Required Configuration

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Encryption
ENCRYPTION_KEY=64-character-hex-string

# Woolworths
WOOLWORTHS_API_URL=https://api.woolworths.com.au/partner/v1
WOOLWORTHS_CLIENT_ID=your-client-id
WOOLWORTHS_CLIENT_SECRET=your-client-secret
WOOLWORTHS_REDIRECT_URI=https://anchor.com/oauth/woolworths
WOOLWORTHS_WEBHOOK_SECRET=your-webhook-secret

# Coles
COLES_API_URL=https://api.coles.com.au/partners/v1
COLES_CLIENT_ID=your-client-id
COLES_CLIENT_SECRET=your-client-secret
COLES_REDIRECT_URI=https://anchor.com/oauth/coles
COLES_WEBHOOK_SECRET=your-webhook-secret

# Energy Australia
ENERGY_AUSTRALIA_API_URL=https://api.energyaustralia.com.au/v2
ENERGY_AUSTRALIA_CLIENT_ID=your-client-id
ENERGY_AUSTRALIA_CLIENT_SECRET=your-client-secret
ENERGY_AUSTRALIA_WEBHOOK_SECRET=your-webhook-secret

# AGL
AGL_API_URL=https://api.agl.com.au/partner/v1
AGL_CLIENT_ID=your-client-id
AGL_CLIENT_SECRET=your-client-secret
AGL_WEBHOOK_SECRET=your-webhook-secret

# Origin Energy
ORIGIN_API_URL=https://api.originenergy.com.au/partners/v1
ORIGIN_CLIENT_ID=your-client-id
ORIGIN_CLIENT_SECRET=your-client-secret
ORIGIN_WEBHOOK_SECRET=your-webhook-secret

# Opal
OPAL_API_URL=https://api.transport.nsw.gov.au/v1
OPAL_CLIENT_ID=your-client-id
OPAL_CLIENT_SECRET=your-client-secret
OPAL_WEBHOOK_SECRET=your-webhook-secret

# Myki
MYKI_API_URL=https://api.ptv.vic.gov.au/v3
MYKI_CLIENT_ID=your-client-id
MYKI_CLIENT_SECRET=your-client-secret
MYKI_WEBHOOK_SECRET=your-webhook-secret

# Fuel Vouchers
FUEL_VOUCHER_API_URL=https://api.fuelvouchers.com.au/v1
FUEL_VOUCHER_CLIENT_ID=your-client-id
FUEL_VOUCHER_CLIENT_SECRET=your-client-secret
FUEL_VOUCHER_WEBHOOK_SECRET=your-webhook-secret
```

## Error Handling

### Common Error Scenarios

1. **Partner Unavailable**
   - Fallback to alternative partner
   - Retry with exponential backoff
   - Notify user of delay

2. **Token Expired**
   - Automatic refresh
   - Re-authenticate if refresh fails
   - Prompt user if needed

3. **Voucher Issuance Failed**
   - Retry up to 3 times
   - Mark reward as failed
   - Alert support team

4. **Webhook Signature Invalid**
   - Log security event
   - Return 401 Unauthorized
   - Monitor for patterns

## Fraud Prevention

### Multi-Layer Protection

1. **Idempotency Keys**
   - Prevent duplicate voucher issuance
   - UUID-based unique identifiers
   - 24-hour deduplication window

2. **Rate Limiting**
   - Max 10 reward checks per hour
   - Max 1 claim per reward
   - IP-based throttling

3. **Velocity Checks**
   - Monitor unusual patterns
   - Flag rapid account linking
   - Alert on suspicious activity

4. **Account Verification**
   - Require account linking before credits
   - Verification codes for high-value rewards
   - Two-factor authentication support

## Reconciliation

### Automated Reporting

Partners provide daily reconciliation reports including:
- Total vouchers/credits issued
- Total redeemed
- Outstanding liability
- Transaction details

**Schedule:**
- Daily: Transaction-level reconciliation
- Weekly: Summary reports
- Monthly: Financial reconciliation
- Quarterly: Compliance audits

## Support & Troubleshooting

### Common Issues

**Issue: Partner integration not loading**
- Check OAuth credentials
- Verify API endpoints
- Review network connectivity

**Issue: Reward not issued**
- Check user milestone progress
- Verify partner is active
- Review error logs

**Issue: Webhook not received**
- Verify webhook URL
- Check signature validation
- Review firewall rules

### Getting Help

- Documentation: https://docs.anchor.com/partners
- Support: support@anchor.com
- Emergency: +61 1800 ANCHOR (24/7)

## Roadmap

### Planned Features

- **Q2 2024**
  - Apple Pay integration for vouchers
  - Google Pay support
  - In-app voucher redemption

- **Q3 2024**
  - Additional retail partners
  - Pharmacy partners (medication support)
  - Childcare support partners

- **Q4 2024**
  - International expansion (NZ, UK)
  - Cryptocurrency rewards option
  - Partner marketplace

## License & Compliance

### Data Protection
- GDPR compliant
- Australian Privacy Act compliant
- PCI DSS compliant (where applicable)

### Partner Agreements
- All partners sign data sharing agreements
- User consent required for data sharing
- Right to revoke partner access

---

**Document Version:** 1.0
**Last Updated:** 2024
**Maintained By:** Anchor Engineering Team
