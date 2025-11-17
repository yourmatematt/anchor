# Deployment Infrastructure Guide

Complete guide for deploying Anchor with Docker, CI/CD, monitoring, and automated backups.

## Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Railway Deployment](#railway-deployment)
3. [CI/CD with GitHub Actions](#cicd-with-github-actions)
4. [Database Migrations](#database-migrations)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Backup & Restore](#backup--restore)
7. [Production Checklist](#production-checklist)

---

## Docker Deployment

### Local Development with Docker Compose

Start complete local environment with all services:

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Services Included

- **API**: Node.js backend (port 3000)
- **PostgreSQL**: Database (port 5432)
- **Redis**: Caching and rate limiting (port 6379)
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Metrics visualization (port 3001)
- **Backup**: Automated database backups

### Access Services

- **API**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Docker Production Build

Build optimized production image:

```bash
# Build for production
docker build -t anchor-api:latest --target runner .

# Run production container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name anchor-api \
  anchor-api:latest

# Check health
curl http://localhost:3000/health
```

### Multi-stage Build Targets

The Dockerfile includes multiple targets:

- **deps**: Dependencies only
- **dev**: Development environment
- **runner**: Production server (Railway/Docker)
- **vercel**: Vercel serverless functions

---

## Railway Deployment

Railway provides always-on Docker deployments with simple configuration.

### Prerequisites

1. Railway account: https://railway.app
2. Railway CLI installed:
   ```bash
   npm install -g @railway/cli
   ```

### Deployment Steps

#### 1. Login to Railway

```bash
railway login
```

#### 2. Create New Project

```bash
# Initialize Railway project
railway init

# Link to existing project (if created via web)
railway link
```

#### 3. Set Environment Variables

```bash
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_KEY="your-service-key"
railway variables set ANTHROPIC_API_KEY="sk-ant-your-key"
railway variables set CLAUDE_MODEL="claude-3-opus-20240229"
railway variables set UP_WEBHOOK_SECRET="your-webhook-secret"
railway variables set NODE_ENV="production"
```

#### 4. Deploy

```bash
# Deploy from local
railway up

# Or connect GitHub repo for auto-deploy
railway connect
```

#### 5. Get Deployment URL

```bash
railway domain
```

Example: `anchor-api-production.up.railway.app`

### Railway Configuration

The `railway.toml` file configures:

- **Builder**: Docker using Dockerfile
- **Health Check**: `/health` endpoint
- **Restart Policy**: On failure, max 10 retries

### Railway Features

- ✅ Auto-scaling
- ✅ Zero-downtime deployments
- ✅ Automatic HTTPS
- ✅ Environment variable management
- ✅ Deployment history and rollbacks
- ✅ Metrics and logs

### Cost Estimate

- **Starter**: $5/month (500MB RAM, 1GB disk)
- **Pro**: $20/month (2GB RAM, 10GB disk)

First $5 of usage free each month.

---

## CI/CD with GitHub Actions

Automated testing, building, and deployment on every push.

### Workflows Included

#### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)

Runs on: Push to `main`, `develop`, `claude/**` branches

**Jobs:**
- **backend-test**: Lint and test backend code
- **docker-build**: Build and test Docker image
- **deploy-vercel**: Deploy to Vercel (production)
- **deploy-railway**: Deploy to Railway (optional)
- **mobile-check**: Validate mobile app
- **migration-check**: Test database migrations
- **security-scan**: Vulnerability scanning with Trivy

#### 2. Mobile Build (`.github/workflows/mobile-build.yml`)

Triggered: Manually via workflow_dispatch

**Jobs:**
- **build-ios**: Build iOS app with EAS
- **build-android**: Build Android app with EAS
- **submit-app**: Submit to TestFlight/Play Store

#### 3. Database Backup (`.github/workflows/backup.yml`)

Runs: Daily at 2 AM UTC (cron: `0 2 * * *`)

**Jobs:**
- **backup**: Create encrypted database backup
- Upload to S3 (optional)
- Upload to GitHub Artifacts (30 days retention)

### Required Secrets

Set in GitHub Repository → Settings → Secrets:

```bash
# Vercel Deployment
VERCEL_TOKEN          # Vercel API token
VERCEL_ORG_ID         # From .vercel/project.json
VERCEL_PROJECT_ID     # From .vercel/project.json

# Railway Deployment (optional)
RAILWAY_TOKEN         # Railway API token

# Expo Mobile Builds
EXPO_TOKEN            # Expo EAS token

# Database Backups
POSTGRES_HOST         # Supabase database host
POSTGRES_DB           # Database name
POSTGRES_USER         # Database user
POSTGRES_PASSWORD     # Database password
BACKUP_ENCRYPTION_KEY # GPG encryption key for backups

# AWS S3 (optional, for backups)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

### Required Variables

Set in GitHub Repository → Settings → Variables:

```bash
RAILWAY_ENABLED       # Set to 'true' to enable Railway deploys
S3_BACKUP_ENABLED     # Set to 'true' to enable S3 backups
S3_BUCKET             # S3 bucket name for backups
AWS_REGION            # AWS region (default: ap-southeast-2)
```

### Workflow Examples

#### Trigger Manual Mobile Build

```bash
# Via GitHub UI
Actions → Mobile App Build → Run workflow → Select platform (ios/android/all)
```

#### Trigger Manual Backup

```bash
# Via GitHub UI
Actions → Database Backup → Run workflow
```

#### Monitor Workflow Status

```bash
# Via GitHub CLI
gh run list
gh run view <run-id>
gh run watch
```

---

## Database Migrations

Manage database schema changes with migration scripts.

### Migration Files

Located in `supabase/migrations/`:

- `20240101000000_initial_schema.sql` - Initial tables
- `20240115000000_add_ai_conversations.sql` - AI features

### Running Migrations

#### Automatic (CI/CD)

Migrations run automatically in GitHub Actions on every deployment.

#### Manual (Local)

```bash
# Set database connection
export DATABASE_URL="postgresql://user:pass@host:5432/anchor"

# Run migrations
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

#### Manual (Supabase)

```bash
# Via psql
psql $SUPABASE_DB_URL -f supabase/migrations/20240101000000_initial_schema.sql
psql $SUPABASE_DB_URL -f supabase/migrations/20240115000000_add_ai_conversations.sql
```

### Migration Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

### Creating New Migrations

1. **Create migration file**:
   ```bash
   # Filename format: YYYYMMDDHHMMSS_description.sql
   touch supabase/migrations/20240120000000_add_new_feature.sql
   ```

2. **Write SQL**:
   ```sql
   -- Add your schema changes
   ALTER TABLE transactions ADD COLUMN new_field TEXT;

   -- Add indexes
   CREATE INDEX idx_transactions_new_field ON transactions(new_field);
   ```

3. **Test locally**:
   ```bash
   ./scripts/migrate.sh
   ```

4. **Commit and push**:
   ```bash
   git add supabase/migrations/
   git commit -m "Add new migration"
   git push
   ```

---

## Monitoring & Alerts

### Prometheus + Grafana (Docker)

Included in `docker-compose.yml` for local/self-hosted deployments.

#### Access Grafana

1. Open: http://localhost:3001
2. Login: admin / admin (change on first login)
3. Dashboard: Anchor - Financial Accountability System

#### Metrics Tracked

- API health and uptime
- Request rate and error rate
- Response time (p95, p99)
- Database performance
- System resources (CPU, memory, disk)
- Business metrics (webhooks, interventions)

#### Alert Rules

Configured in `monitoring/alerts.yml`:

- API Down (2+ minutes)
- High Error Rate (>5%)
- High Response Time (>1s)
- Database Connection Failure
- No Webhooks Received (2+ hours)
- AI API Errors

### Vercel Monitoring

Built-in analytics for serverless deployments:

1. **Vercel Dashboard** → Project → Analytics
2. **Metrics**:
   - Invocations
   - Error rate
   - Duration (p50, p95, p99)
   - Edge network performance

### Application Performance Monitoring (APM)

#### Sentry Integration (Optional)

```bash
# Install Sentry
npm install @sentry/node @sentry/integrations

# Configure in api/server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

### Uptime Monitoring

#### UptimeRobot (Free)

1. Sign up: https://uptimerobot.com
2. Add HTTP(S) monitor
3. URL: `https://your-app.vercel.app/health`
4. Interval: 5 minutes
5. Alert: Email/SMS on down

#### Better Uptime (Paid)

- Status page hosting
- Incident management
- On-call scheduling
- Multiple integrations

### Log Management

#### Vercel Logs

```bash
# Stream logs
vercel logs <deployment-url>

# Filter errors
vercel logs --filter error
```

#### Railway Logs

```bash
# Stream logs
railway logs

# Follow logs
railway logs -f
```

#### Log Aggregation (Optional)

Export logs to:
- **Datadog**: Application monitoring
- **Logtail**: Log aggregation and search
- **AWS CloudWatch**: Long-term storage

---

## Backup & Restore

Automated encrypted database backups.

### Automated Backups

#### GitHub Actions (Daily)

Runs daily at 2 AM UTC via `.github/workflows/backup.yml`.

**Features:**
- Encrypted with GPG (AES256)
- Uploaded to S3 (optional)
- Stored in GitHub Artifacts (30 days)
- Automatic cleanup (configurable retention)

#### Manual Backup

```bash
# Local backup
export POSTGRES_HOST="your-supabase-host"
export POSTGRES_DB="postgres"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="your-password"
export BACKUP_DIR="./backups"
export BACKUP_ENCRYPTION_KEY="your-secret-key"

./scripts/backup.sh
```

#### Backup to S3

```bash
# Configure S3
export S3_BUCKET="anchor-backups"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"

./scripts/backup.sh
# Automatically uploads to S3
```

### Restore from Backup

#### List Backups

```bash
ls -lh backups/
```

#### Restore Database

```bash
# Set database connection
export POSTGRES_HOST="your-host"
export POSTGRES_DB="postgres"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="your-password"
export BACKUP_DIR="./backups"

# If backup is encrypted
export BACKUP_ENCRYPTION_KEY="your-secret-key"

# Restore
./scripts/restore.sh anchor_backup_20240115_120000.sql.gpg
```

**⚠️ WARNING**: This replaces the current database!

### Backup Verification

Monthly verification process:

1. Download latest backup
2. Create test Supabase project
3. Restore backup to test project
4. Verify data integrity:
   ```sql
   SELECT COUNT(*) FROM whitelist;  -- Should match production
   SELECT COUNT(*) FROM transactions;  -- Should match production
   ```

### Backup Retention

Default: 30 days

Configure in backup script:
```bash
export RETENTION_DAYS=90  # Keep backups for 90 days
```

### Backup Security

- ✅ Encrypted with AES256
- ✅ Encryption key stored as GitHub Secret
- ✅ Backup files deleted after upload to S3
- ✅ S3 bucket versioning enabled
- ✅ S3 bucket encryption at rest

---

## Production Checklist

### Infrastructure Setup

- [ ] Deployment platform chosen (Vercel/Railway/Docker)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health check endpoint responding
- [ ] Error monitoring configured

### CI/CD Setup

- [ ] GitHub Actions workflows configured
- [ ] Secrets added to repository
- [ ] Automated tests passing
- [ ] Deployment pipeline tested
- [ ] Rollback procedure tested

### Monitoring Setup

- [ ] Uptime monitoring configured
- [ ] Error alerts configured
- [ ] Performance metrics tracked
- [ ] Log aggregation setup (optional)
- [ ] Dashboard created

### Backup Setup

- [ ] Automated backups scheduled
- [ ] Backup encryption configured
- [ ] S3 storage configured (optional)
- [ ] Restore procedure tested
- [ ] Backup verification scheduled

### Security Hardening

- [ ] API keys rotated
- [ ] HTTPS enforced
- [ ] CORS configured
- [ ] Rate limiting implemented
- [ ] Webhook signature validation enabled
- [ ] Database RLS enabled

### Documentation

- [ ] Deployment runbook created
- [ ] Incident response plan documented
- [ ] On-call rotation defined
- [ ] Escalation procedures defined

---

## Quick Start Commands

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy to Railway

```bash
railway up
```

### Local Docker Development

```bash
docker-compose up -d
```

### Run Migrations

```bash
./scripts/migrate.sh
```

### Create Backup

```bash
./scripts/backup.sh
```

### Monitor Logs

```bash
# Vercel
vercel logs

# Railway
railway logs -f

# Docker
docker-compose logs -f api
```

---

## Support & Troubleshooting

### Common Issues

#### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### Migration Fails

```bash
# Check current migrations
psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"

# Manually mark migration as applied
psql $DATABASE_URL -c "INSERT INTO schema_migrations (version) VALUES ('20240115000000');"
```

#### Backup Fails

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h

# Verify encryption key
echo $BACKUP_ENCRYPTION_KEY
```

### Getting Help

- **Documentation**: See README.md, SETUP.md, TESTING.md
- **Issues**: https://github.com/yourmatematt/anchor/issues
- **Logs**: Check Vercel/Railway dashboard

---

Built for recovery. Built for accountability. Built to scale.
