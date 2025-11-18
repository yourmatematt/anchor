# Anchor Security & Fraud Prevention

## Overview

Anchor implements defense-in-depth security with multiple layers of protection against attacks and fraud.

### Security Stack

- **Security Monitoring**: Failed logins, injection attacks, session hijacking
- **Fraud Detection**: Multiple accounts, account sharing, fake guardians
- **Rate Limiting**: Advanced sliding window with cost-based throttling
- **Encryption**: AES-256-GCM field-level encryption for PII
- **Audit Logging**: Comprehensive tamper-proof logs
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## Components

### 1. Security Monitor (`security-monitor.js`)

Detects and prevents security threats in real-time.

**Features**:
- Failed login tracking (5 attempts = lockout for 1 hour)
- Brute force detection (10 attempts from same IP = 24h block)
- Password spray detection (20+ different accounts = block)
- SQL injection pattern detection
- XSS attempt detection
- Geographic anomaly detection (impossible travel)
- Session hijacking detection (multiple IP changes)

**Thresholds**:
```javascript
FAILED_LOGIN_COUNT: 5        // Lock account after 5 failed attempts
FAILED_LOGIN_WINDOW: 15 min  // Within 15-minute window
BRUTE_FORCE_COUNT: 10        // Block IP after 10 attempts
GEO_DISTANCE_KM: 500         // 500km in <1hr is suspicious
API_CALL_THRESHOLD: 100      // Max 100 calls/min per user
```

**Usage**:
```javascript
const securityMonitor = require('./services/security-monitor');

// Track login attempt
const result = await securityMonitor.trackLoginAttempt(
  userId, ip, userAgent, success
);

if (result.blocked) {
  return res.status(403).json({
    error: 'Account locked',
    remainingAttempts: 0
  });
}

// Check SQL injection
if (securityMonitor.detectSQLInjection(input, userId, ip)) {
  // Block request
}

// Check XSS
if (securityMonitor.detectXSS(input, userId, ip)) {
  // Sanitize/block
}
```

### 2. Fraud Detector (`fraud-detector.js`)

Detects fraudulent patterns specific to gambling prevention.

**Fraud Types Detected**:

**Multiple Accounts**:
- Same device fingerprint (> 3 accounts)
- Same IP address (> 5 accounts in 24h)
- Device farm patterns (sequential device IDs)

**Account Sharing**:
- Simultaneous access from different locations (>100km apart)
- Too many devices (> 5 in 7 days)
- Sudden behavior pattern changes

**VPN/Proxy Usage**:
- Known VPN IP ranges
- Data center/hosting provider IPs
- IP intelligence service integration

**Fake Guardians**:
- Guardian manages too many users (> 5)
- Suspiciously fast responses (< 5 seconds)
- Guardian and user share same IP/device

**Payment Fraud**:
- Too many requests (> 10 per day)
- Unusual amounts (> 3 standard deviations)
- Rapid succession (< 1 minute apart)

**Bot Activity**:
- Bot-like user agents
- Perfect linear mouse movements
- Consistent keystroke timing (low variance)

**Usage**:
```javascript
const fraudDetector = require('./services/fraud-detector');

// Check for multiple accounts
const result = await fraudDetector.checkMultipleAccounts(
  userId, deviceId, ip, deviceFingerprint
);

if (result.fraud) {
  // Block registration or flag for review
  console.log('Fraud detected:', result.type, result.riskScore);
}

// Check account sharing
const sharing = await fraudDetector.checkAccountSharing(userId, {
  location: { lat: -33.8688, lon: 151.2093 },
  device: { deviceId: 'device_123' },
  timestamp: Date.now()
});

// Check for fake guardian
const fake = await fraudDetector.checkFakeGuardian(
  guardianId, userId, responseTime, interaction
);
```

**Risk Scoring**:
- 0-30: Low risk
- 31-60: Medium risk
- 61-85: High risk
- 86-100: Critical risk

### 3. Advanced Rate Limiter (`rate-limiter-advanced.js`)

Prevents API abuse with sophisticated rate limiting.

**Features**:
- Sliding window algorithm (precise counting)
- Per-user and per-endpoint limits
- Cost-based throttling (expensive operations cost more)
- Burst allowances (allow brief spikes)
- Distributed support (Redis-ready)
- Whitelist management

**Rate Limits**:
```javascript
LOGIN: 5 requests per 5 minutes (cost: 10)
REGISTRATION: 3 per hour (cost: 20)
API_CALL: 60 per minute (cost: 1)
AI_CONVERSATION: 20 per hour (cost: 5)
PAYMENT_REQUEST: 10 per day (cost: 15)
USER_API_CALLS: 1000 per hour (cost: 1)
```

**Usage**:
```javascript
const rateLimiter = require('./services/rate-limiter-advanced');

// As middleware
app.use('/api/login', rateLimiter.middleware('LOGIN'));

// Manual check
const result = await rateLimiter.checkLimit(
  `ratelimit:LOGIN:${userId}`,
  LIMITS.LOGIN,
  LIMITS.BURST_LOGIN
);

if (!result.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: result.retryAfter
  });
}

// Cost-based limiting
const costResult = await rateLimiter.checkCostLimit(
  userId, 'AI_CONVERSATION', customCost
);
```

### 4. Encryption Service (`encryption-service.js`)

Field-level encryption for sensitive PII.

**Features**:
- AES-256-GCM encryption
- Key rotation system
- Tokenization support
- Audit trail for decryption
- HSM/KMS integration ready

**Encrypted Fields**:
- User email
- Phone numbers
- Guardian contact information
- Bank account details
- Social security numbers

**Usage**:
```javascript
const encryptionService = require('./services/encryption-service');

// Encrypt single field
const encrypted = encryptionService.encrypt(email);
// Format: keyId:iv:authTag:ciphertext

// Decrypt with audit trail
const decrypted = encryptionService.decrypt(
  encrypted,
  userId,
  'user_profile_view' // reason
);

// Encrypt object fields
const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+61412345678'
};

const encrypted = encryptionService.encryptFields(user, ['email', 'phone']);

// Tokenize sensitive data
const token = encryptionService.tokenize(creditCardNumber);
const valid = encryptionService.verifyToken(token, creditCardNumber);

// Rotate encryption key
await encryptionService.rotateKey();
```

### 5. Audit Logger (`audit-logger.js`)

Tamper-proof comprehensive audit logging.

**Logged Events**:
- User actions (login, logout, profile changes)
- Admin actions (user modifications, system changes)
- API calls (all endpoints with parameters)
- Database changes (CREATE, UPDATE, DELETE)
- Security events (failed logins, blocks)
- Guardian actions (alerts sent, responses)
- System events (startups, shutdowns, errors)
- Data access (encryption/decryption)

**Log Format**:
```json
{
  "timestamp": "2025-01-19T10:30:45.123Z",
  "category": "security_event",
  "level": "critical",
  "event": "brute_force_detected",
  "userId": "user_123",
  "ip": "203.0.113.42",
  "details": { "attempts": 10 },
  "hostname": "api-server-1",
  "processId": 12345
}
```

**Usage**:
```javascript
const auditLogger = require('./services/audit-logger');

// Log user action
await auditLogger.logUserAction({
  userId: 'user_123',
  action: 'update_profile',
  changes: { email: 'new@example.com' }
});

// Log security event
await auditLogger.logSecurityEvent({
  event: 'failed_login',
  severity: 'medium',
  userId: 'user_123',
  ip: '203.0.113.42'
});

// Query logs
const logs = await auditLogger.queryLogs({
  userId: 'user_123',
  category: 'user_action',
  date: '2025-01-19'
});

// Get statistics
const stats = await auditLogger.getStatistics();
```

### 6. Security Headers Middleware

Implements OWASP security headers.

**Headers Set**:
- **Content-Security-Policy**: Prevents XSS, clickjacking
- **Strict-Transport-Security**: Forces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Browser XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

**Usage**:
```javascript
const { securityHeaders, customSecurityHeaders } = require('./middleware/security-headers');

app.use(securityHeaders());
app.use(customSecurityHeaders);
```

## Security API Endpoints

### Admin Endpoints

**GET /api/security/stats**
```json
{
  "security": {
    "blockedIPs": 12,
    "blockedUsers": 5,
    "activeFailedLoginAttempts": 23
  },
  "fraud": {
    "totalFlagged": 8,
    "byType": { "multiple_accounts": 3, "fake_guardian": 2 }
  }
}
```

**POST /api/security/unblock-ip**
```json
{ "ip": "203.0.113.42" }
```

**GET /api/security/fraud/flagged**
```json
{
  "flagged": [
    {
      "userId": "user_456",
      "fraudType": "multiple_accounts",
      "riskScore": 75,
      "indicators": [...]
    }
  ]
}
```

**GET /api/security/audit/logs?userId=user_123&category=security_event**

**POST /api/security/rate-limit/whitelist**
```json
{ "identifier": "user_789" }
```

## Penetration Testing Checklist

### Authentication & Session Management
- [ ] Test password policy enforcement
- [ ] Verify account lockout after failed attempts
- [ ] Test session timeout
- [ ] Verify secure session cookies (HttpOnly, Secure, SameSite)
- [ ] Test password reset flow for vulnerabilities
- [ ] Verify multi-factor authentication (if implemented)
- [ ] Test for session fixation
- [ ] Test for session hijacking
- [ ] Verify logout invalidates session

### Input Validation
- [ ] Test for SQL injection on all input fields
- [ ] Test for XSS (reflected, stored, DOM-based)
- [ ] Test for command injection
- [ ] Test for LDAP injection
- [ ] Test for XML injection
- [ ] Test for template injection
- [ ] Test file upload restrictions
- [ ] Verify input length limits

### Authorization
- [ ] Test horizontal privilege escalation (access other user's data)
- [ ] Test vertical privilege escalation (user → admin)
- [ ] Verify IDOR (Insecure Direct Object References)
- [ ] Test API endpoint access controls
- [ ] Verify guardian permission checks
- [ ] Test admin-only endpoint protections

### API Security
- [ ] Test rate limiting effectiveness
- [ ] Verify API authentication
- [ ] Test for mass assignment vulnerabilities
- [ ] Verify request/response encryption
- [ ] Test API version deprecation handling
- [ ] Verify CORS configuration

### Data Protection
- [ ] Verify encryption at rest (database)
- [ ] Verify encryption in transit (TLS 1.2+)
- [ ] Test for sensitive data exposure in logs
- [ ] Verify PII field-level encryption
- [ ] Test data retention policies
- [ ] Verify secure data deletion

### Infrastructure
- [ ] Scan for vulnerable dependencies
- [ ] Test for default credentials
- [ ] Verify security headers
- [ ] Test for information disclosure
- [ ] Verify error message sanitization
- [ ] Test for directory traversal
- [ ] Verify file inclusion vulnerabilities

### Business Logic
- [ ] Test payment fraud scenarios
- [ ] Verify guardian verification process
- [ ] Test transaction blocking bypass attempts
- [ ] Verify allowance reset integrity
- [ ] Test pattern detection manipulation
- [ ] Verify anti-automation controls

## Security Best Practices

### Development
1. **Never commit secrets** - Use environment variables
2. **Parameterize queries** - Prevent SQL injection
3. **Sanitize all inputs** - HTML encode outputs
4. **Use prepared statements** - For database queries
5. **Implement CSRF tokens** - For state-changing operations
6. **Validate on server side** - Never trust client input
7. **Use security linters** - ESLint security plugins
8. **Keep dependencies updated** - Run `npm audit` regularly

### Deployment
1. **Use HTTPS everywhere** - TLS 1.2 minimum
2. **Implement WAF** - Web Application Firewall
3. **Enable DDoS protection** - Cloudflare, AWS Shield
4. **Isolate databases** - Private subnets, no public access
5. **Use secrets manager** - AWS Secrets Manager, Vault
6. **Implement monitoring** - Real-time alerts
7. **Regular backups** - Encrypted, tested restores
8. **Penetration testing** - Annual third-party audits

### Operations
1. **Principle of least privilege** - Minimal permissions
2. **Rotate credentials** - Every 90 days
3. **Monitor audit logs** - Daily review
4. **Incident response plan** - Documented procedures
5. **Security training** - Regular team education
6. **Vulnerability disclosure** - Responsible disclosure program
7. **Compliance checks** - GDPR, PCI-DSS if applicable

## Incident Response

### Detection
1. Monitor security alerts (PagerDuty, Slack)
2. Review audit logs daily
3. Track unusual metrics (Grafana dashboards)

### Response
1. **Identify** - Determine scope and severity
2. **Contain** - Block affected users/IPs immediately
3. **Investigate** - Review logs, determine attack vector
4. **Eradicate** - Remove malicious access, patch vulnerability
5. **Recover** - Restore systems, verify integrity
6. **Document** - Write post-mortem, update runbooks

### Communication
- **Critical**: Page on-call engineer immediately
- **High**: Notify security team within 15 minutes
- **Medium**: Create ticket, notify in next standup
- **Low**: Log and monitor

## Compliance

### Data Privacy (GDPR/Privacy Act)
- ✅ User consent for data collection
- ✅ Right to access (data export)
- ✅ Right to deletion
- ✅ Data breach notification (72 hours)
- ✅ Privacy policy published
- ✅ Data minimization
- ✅ Encryption of PII

### Financial Regulations
- ✅ PCI-DSS compliance (if handling payments)
- ✅ AML/KYC verification
- ✅ Transaction monitoring
- ✅ Suspicious activity reporting

## Security Contacts

- **Security Team**: security@anchor.com
- **Bug Bounty**: bugbounty@anchor.com
- **Responsible Disclosure**: security-reports@anchor.com

## Tools & Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/
- **npm audit**: Built into npm
- **Snyk**: https://snyk.io/
- **Dependabot**: GitHub security alerts

---

**Last Updated**: 2025-01-19
**Security Team**: security@anchor.com
