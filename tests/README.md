# Anchor Testing Suite

Comprehensive testing for the Anchor gambling intervention system covering critical flows, edge cases, security, and performance.

## Test Structure

```
tests/
├── fixtures/
│   └── test-data.js            # Realistic test data and mocks
├── integration/
│   ├── onboarding.test.js      # Complete onboarding flow
│   ├── payment-request.test.js # Payment requests and allowance
│   ├── ai-conversation.test.js # AI interventions and manipulation detection
│   ├── pattern-detection.test.js # Gambling pattern accuracy
│   └── guardian-flow.test.js   # Guardian monitoring and emergency triggers
├── e2e/
│   └── critical-paths.test.js  # End-to-end user journeys
├── load/
│   └── webhook-stress.test.js  # Performance under concurrent load
├── security/
│   └── auth.test.js            # Authentication, authorization, and vulnerabilities
└── README.md                   # This file
```

## Setup

### Install Dependencies

```bash
npm install --save-dev jest supertest @jest/globals
```

### Environment Variables

Create a `.env.test` file:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_test_jwt_secret

# Up Bank (use test tokens)
UP_BANK_WEBHOOK_SECRET=test_webhook_secret

# Twilio (mocked in tests)
TWILIO_ACCOUNT_SID=test_account_sid
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_FROM_NUMBER=+61400000000

# OpenAI (mocked in tests)
OPENAI_API_KEY=test_openai_key

# ElevenLabs (mocked in tests)
ELEVENLABS_API_KEY=test_elevenlabs_key
```

### Database Setup

Run migrations on test database:

```bash
npm run db:migrate:test
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Load tests only
npm run test:load

# Security tests only
npm run test:security

# Watch mode for development
npm run test:watch
```

### Individual Test Files

```bash
# Onboarding tests
npm test -- tests/integration/onboarding.test.js

# Pattern detection tests
npm test -- tests/integration/pattern-detection.test.js

# With coverage
npm test -- --coverage tests/integration/payment-request.test.js
```

## Test Categories

### Integration Tests

Test complete flows with mocked external services but real database interactions.

**onboarding.test.js**
- Complete onboarding flow (7 steps)
- Guardian invitation and acceptance
- AI interview responses
- Up Bank token validation
- Account verification (Vault/Allowance savers)
- Whitelist configuration
- Commitment lock-in (cannot cancel)

**payment-request.test.js**
- Approved payment flow
- Denied payments with AI triggers
- Pattern detection on requests
- Voice payment transcription
- Allowance deduction tracking
- Vault protection
- Manual payment confirmation
- Edge cases (negative amounts, concurrent requests)

**ai-conversation.test.js**
- Payday loan interrogation
- Gambling venue confrontation
- Manipulation detection (10 tactics):
  - Minimization
  - Deflection
  - Rationalization
  - Blame shifting
  - False promises
  - Partial truth
  - Future focus
  - Appeal to pity
  - Attacking
  - Playing victim
- Conversation timeout (10 minutes)
- Voice transcription (Whisper)
- Voice generation (ElevenLabs)
- Guardian notifications
- Conversation ending conditions

**pattern-detection.test.js**
- Tuesday poker pattern (recurring time + transfer)
- Late night cash withdrawals
- Payday loan detection
- Multiple small withdrawals (escalation)
- Crypto exchange transfers (offshore gambling)
- Gambling venue transactions
- Confidence levels (high/medium/low)
- Severity levels (CRITICAL/HIGH/MEDIUM)
- False positive prevention

**guardian-flow.test.js**
- SMS invitation delivery
- Magic link authentication
- Real-time conversation monitoring (Supabase subscriptions)
- Pattern visibility (no amounts shown)
- Emergency check-in trigger
- Access restrictions (can't modify user settings)

### E2E Tests

Test complete user journeys from start to finish.

**critical-paths.test.js**
1. **New user flow**: Onboarding → first payment request → AI approval
2. **Relapse flow**: Gambling transaction → pattern detection → intervention → guardian notification
3. **Payday loan flow**: Payday loan → AI confrontation → denial → streak reset
4. **Allowance flow**: Daily reset → payment request → manual transfer
5. **Emergency flow**: Guardian trigger → push notification → forced check-in

### Load Tests

Test system performance under stress.

**webhook-stress.test.js**
- 1000 concurrent webhook calls
- Pattern detection under load (200 concurrent)
- AI conversation concurrency (50 concurrent)
- Database connection pooling (500 queries)
- Rate limiting verification (100 req/min per user)

**Performance Targets:**
- Webhook throughput: >30 req/sec
- Success rate: >95%
- Response time: <30 seconds for 1000 requests
- Database queries: <10 seconds for 500 queries

### Security Tests

Test authentication, authorization, and vulnerability protection.

**auth.test.js**
- **JWT validation**:
  - Missing authorization header
  - Invalid tokens
  - Expired tokens
  - Tampered signatures
- **Guardian access restrictions**:
  - Cannot access user-only endpoints
  - Cannot view other users' data
- **SQL injection prevention**:
  - Malicious user search
  - Transaction description sanitization
- **XSS prevention**:
  - Payment reason escaping
  - Guardian name sanitization
- **CORS configuration**:
  - Allowed origins
  - Unauthorized origin blocking
- **Rate limiting**:
  - Per-IP limits (100 req/min)
  - Per-user limits
- **Input validation**:
  - Email format
  - Phone number format
  - Payment amounts (negative, excessive)
- **Webhook security**:
  - Signature validation
  - Missing signature rejection
- **Sensitive data protection**:
  - Up Bank tokens not exposed
  - Internal IDs not leaked

## Test Coverage

Generate coverage report:

```bash
npm test -- --coverage
```

**Coverage Targets:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

**Critical Paths (100% coverage required):**
- Payment request flow
- AI conversation triggers
- Pattern detection
- Guardian notifications
- Webhook processing

## Mocking Strategy

### External Services (Always Mocked)

- **Twilio SMS**: Mock message sending, verify calls
- **OpenAI API**: Mock chat completions and Whisper transcriptions
- **ElevenLabs**: Mock voice generation
- **Up Bank API**: Mock transaction fetching and account validation

### Database (Real in Tests)

Use real Supabase test database to catch:
- Schema issues
- Row Level Security (RLS) policies
- Transaction conflicts
- Data integrity constraints

### Time-Dependent Tests

Use `jest.useFakeTimers()` for:
- Allowance reset (midnight AEST)
- Conversation timeouts (10 minutes)
- Late night detection (2am-4am)
- Rate limiting windows

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate:test

      - name: Run tests
        run: npm test -- --coverage
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
          JWT_SECRET: ${{ secrets.JWT_TEST_SECRET }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should complete full onboarding successfully"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach Chrome DevTools to `chrome://inspect`.

## Common Issues

### Database Connection Errors

```bash
# Reset test database
npm run db:reset:test

# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

### Mock Service Not Working

```bash
# Clear Jest cache
npx jest --clearCache

# Verify mocks are set up
npm test -- --listTests
```

### Timeout Issues

```bash
# Increase timeout for slow tests
jest.setTimeout(30000); // 30 seconds
```

## Test Data Management

### Creating Test Users

Use `generateUserId()` from test fixtures:

```javascript
const { generateUserId } = require('../fixtures/test-data');

const testUserId = generateUserId();
```

### Cleaning Up Test Data

Always clean up in `afterEach`:

```javascript
afterEach(async () => {
  await supabase.from('users').delete().eq('id', testUserId);
});
```

### Using Test Fixtures

```javascript
const { testUsers, testTransactions } = require('../fixtures/test-data');

await supabase.from('users').insert(testUsers.activeUser);
```

## Performance Benchmarks

Run load tests to verify performance:

```bash
npm run test:load -- --verbose
```

**Expected Results:**
- Webhook processing: <100ms per request
- Pattern detection: <200ms
- AI conversation trigger: <500ms
- Database queries: <50ms
- Total throughput: >30 req/sec

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `feature.test.js`
3. Use test fixtures from `fixtures/test-data.js`
4. Mock external services
5. Clean up test data in `afterEach`
6. Add documentation to this README

### Test Quality Checklist

- [ ] Tests are isolated (no dependencies between tests)
- [ ] External services are mocked
- [ ] Test data is cleaned up
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Performance is verified (for critical paths)
- [ ] Security is validated (for auth/input handling)

## Running in Production-Like Environment

### Docker Compose

```bash
docker-compose -f docker-compose.test.yml up -d
npm test
```

### Staging Environment

```bash
export NODE_ENV=staging
npm run test:e2e
```

## Support

For testing issues:
1. Check this README
2. Review test fixtures in `tests/fixtures/test-data.js`
3. Check CI/CD logs
4. Open an issue with test output

## License

Internal use only - Anchor gambling intervention system.
