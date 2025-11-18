# Anchor Monitoring & Alerting Guide

## Overview

Anchor uses a comprehensive monitoring stack built on **Prometheus**, **Grafana**, and **Alertmanager** to track system health, user behavior, and AI performance in real-time.

### Stack Components

- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notifications
- **PagerDuty**: Critical alert escalation
- **prom-client**: Node.js Prometheus client library

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Anchor    │─────▶│  Prometheus  │─────▶│   Grafana    │
│  API Server │      │   (Scrape)   │      │ (Dashboards) │
└─────────────┘      └──────────────┘      └──────────────┘
                            │
                            │ Alert Rules
                            ▼
                     ┌──────────────┐      ┌──────────────┐
                     │ Alertmanager │─────▶│  PagerDuty   │
                     │              │      │    / Slack   │
                     └──────────────┘      └──────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install prom-client

# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# Copy config
cp monitoring/prometheus-config.yml prometheus.yml

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

### 2. Install Grafana

```bash
# Using Docker
docker run -d \
  -p 3001:3000 \
  --name=grafana \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana

# Access Grafana at http://localhost:3001
# Default credentials: admin/admin
```

### 3. Configure Metrics in API

```javascript
// In your Express app (app.js or server.js)
const express = require('express');
const metricsRouter = require('./api/routes/metrics');
const PerformanceMonitor = require('./api/services/performance-monitor');

const app = express();

// Add metrics middleware
app.use(PerformanceMonitor.requestTracker());

// Mount metrics endpoint
app.use('/metrics', metricsRouter);

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Metrics available at http://localhost:3000/metrics');
});
```

### 4. Import Grafana Dashboards

1. Open Grafana (http://localhost:3001)
2. Go to **Dashboards** → **Import**
3. Upload JSON files:
   - `monitoring/grafana-dashboards/system.json`
   - `monitoring/grafana-dashboards/user-metrics.json`
   - `monitoring/grafana-dashboards/ai-performance.json`

### 5. Configure Alertmanager

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname', 'severity']
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: pagerduty

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#anchor-alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

## Metrics Overview

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | API response times (p50, p95, p99) |
| `http_requests_total` | Counter | Total HTTP requests by endpoint/status |
| `database_query_duration_seconds` | Histogram | Database query performance |
| `cache_hits_total` | Counter | Cache hits by type |
| `cache_misses_total` | Counter | Cache misses by type |
| `webhook_attempts_total` | Counter | Webhook delivery attempts |
| `webhook_success_total` | Counter | Successful webhook deliveries |
| `sync_queue_size` | Gauge | Current sync queue depth |
| `third_party_api_duration_seconds` | Histogram | Third-party API latency |

### User Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `user_activity_total` | Gauge | Active users (DAU/WAU/MAU) |
| `user_registrations_total` | Counter | New user registrations |
| `user_clean_streak_days` | Gauge | Clean streak distribution |
| `intervention_attempts_total` | Counter | Intervention attempts |
| `intervention_success_total` | Counter | Successful interventions |
| `pattern_detection_total` | Counter | Pattern detections |
| `user_relapses_total` | Counter | User relapses by phase |
| `guardian_engagement` | Gauge | Guardian engagement levels |
| `transactions_blocked_total` | Counter | Blocked transactions |
| `gambling_amount_saved_total` | Counter | Total amount saved (AUD) |
| `user_satisfaction_score` | Gauge | User satisfaction (1-5) |

### AI Performance Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ai_conversation_duration_seconds` | Histogram | Conversation duration |
| `ai_conversation_total` | Counter | Total conversations |
| `ai_manipulation_detected_total` | Counter | Manipulation attempts |
| `voice_transcription_accuracy_percent` | Gauge | Transcription accuracy |
| `ai_response_generation_duration_seconds` | Histogram | Response time |
| `ai_conversation_outcome_total` | Counter | Conversation outcomes |
| `ai_cost_total` | Counter | AI cost in USD |
| `ai_sentiment_total` | Counter | Sentiment analysis results |
| `ai_crisis_detected_total` | Counter | Crisis situations detected |
| `ml_model_inference_duration_seconds` | Histogram | ML inference time |

## Dashboards

### 1. System Health Dashboard

**URL**: `/dashboards/system`

Monitors infrastructure and API performance.

**Key Panels**:
- API Response Time (p50, p95, p99)
- Request Rate (req/sec)
- Error Rate by Endpoint
- Database Query Performance
- CPU/Memory/Disk Usage
- Cache Hit Rate
- Webhook Success Rate
- Queue Depth

**Alerts**:
- High response time (> 5s)
- High error rate (> 5%)
- High CPU/memory (> 90%)
- Low webhook success (< 90%)

### 2. User Metrics Dashboard

**URL**: `/dashboards/user-metrics`

Tracks user behavior and recovery progress.

**Key Panels**:
- Active Users (DAU/WAU/MAU)
- Clean Streak Distribution
- Intervention Success Rate
- Pattern Detection Accuracy
- Relapse Rate by Phase
- Guardian Engagement
- Feature Usage Statistics
- Gambling Amount Saved

**Business KPIs**:
- Average clean streak: 45.3 days
- Intervention success: 78.5%
- Pattern accuracy: 97.2%
- Total saved: $1.2M AUD

### 3. AI Performance Dashboard

**URL**: `/dashboards/ai-performance`

Monitors AI conversation quality and cost.

**Key Panels**:
- Conversation Duration
- Manipulation Detection Rate
- Voice Transcription Accuracy (96.5%)
- Response Generation Time
- Conversation Outcomes
- AI Cost per Conversation
- Sentiment Distribution
- ML Model Inference Time

**Cost Tracking**:
- Cost per conversation: $0.08
- Daily AI cost: $150
- Monthly projection: $4,500

## Alerting

### Alert Severity Levels

| Severity | Response Time | Notification | Example |
|----------|--------------|--------------|---------|
| **CRITICAL** | Immediate (page) | PagerDuty | API down > 1 min |
| **HIGH** | 15 minutes | SMS + Slack | Response time > 5s |
| **WARNING** | 1 hour | Slack | Cache hit < 70% |
| **INFO** | N/A | Log only | User milestone |

### Critical Alerts

#### 1. API Down
```yaml
alert: APIDown
expr: up{job="anchor-api"} == 0
for: 1m
severity: critical
action: Check server logs, restart service
```

**Response**:
1. Check Prometheus `/targets` to see which instance is down
2. SSH to affected server
3. Check logs: `journalctl -u anchor-api -n 100`
4. Restart if needed: `systemctl restart anchor-api`

#### 2. Database Connection Failed
```yaml
alert: DatabaseConnectionFailed
expr: pg_up == 0
for: 30s
severity: critical
action: Check database server, connection pool
```

**Response**:
1. Verify PostgreSQL is running: `systemctl status postgresql`
2. Check connections: `SELECT count(*) FROM pg_stat_activity`
3. Check for locks: `SELECT * FROM pg_locks WHERE NOT granted`

#### 3. High Webhook Failure Rate
```yaml
alert: HighWebhookFailureRate
expr: webhook_failures / webhook_attempts > 0.10
for: 5m
severity: critical
action: Check Up Bank API status
```

**Response**:
1. Check Up Bank API status
2. Verify webhook endpoint configuration
3. Review webhook logs for error details

#### 4. Daily Allowance Reset Failed
```yaml
alert: DailyAllowanceResetFailed
expr: daily_allowance_reset_failures_total > 0
for: 1m
severity: critical
action: Manually trigger reset
```

**Response**:
1. Check cron job logs
2. Run manual reset: `npm run reset-allowances`
3. Verify affected users

### High Priority Alerts

#### 5. Slow API Response
```yaml
alert: SlowAPIResponse
expr: http_request_duration_seconds{quantile="0.95"} > 5
for: 5m
severity: high
action: Check database query performance
```

**Response**:
1. Identify slow endpoint in Grafana
2. Check database query performance
3. Review recent code deployments
4. Check for N+1 queries

#### 6. High Queue Depth
```yaml
alert: HighQueueDepth
expr: sync_queue_size > 1000
for: 10m
severity: high
action: Increase queue workers
```

**Response**:
1. Check queue processor health
2. Increase worker count if needed
3. Review failed items in queue

## API Endpoints

### Prometheus Metrics

```bash
# Get all metrics (Prometheus format)
curl http://localhost:3000/metrics

# Get metrics in JSON format
curl http://localhost:3000/metrics/json

# Health check
curl http://localhost:3000/metrics/health
```

### Custom Metrics Endpoints

```bash
# User metrics
curl http://localhost:3000/metrics/users

# Business KPIs
curl http://localhost:3000/metrics/business

# Queue metrics
curl http://localhost:3000/metrics/queues

# ML model metrics
curl http://localhost:3000/metrics/ml

# Webhook metrics
curl http://localhost:3000/metrics/webhooks

# Third-party API health
curl http://localhost:3000/metrics/third-party
```

## Usage Examples

### Track HTTP Request

```javascript
const PerformanceMonitor = require('./services/performance-monitor');

// In Express middleware
app.use(PerformanceMonitor.requestTracker());

// The middleware automatically tracks:
// - Request duration
// - Status codes
// - Endpoint hits
```

### Track Database Query

```javascript
const PerformanceMonitor = require('./services/performance-monitor');

const users = await PerformanceMonitor.trackDatabaseQuery(
  'SELECT',
  'users',
  async () => {
    return await db.query('SELECT * FROM users WHERE active = true');
  }
);
```

### Track Third-Party API Call

```javascript
const PerformanceMonitor = require('./services/performance-monitor');

const bankData = await PerformanceMonitor.trackThirdPartyApi(
  'up_bank',
  '/accounts',
  async () => {
    return await upBankClient.getAccounts();
  }
);
```

### Track AI Conversation

```javascript
const metricsCollector = require('./services/metrics-collector');

const result = await handleAIConversation(message, userId);

metricsCollector.trackAIConversation(
  'text',  // or 'voice'
  conversationDuration,
  result.outcome  // 'helpful', 'intervention_triggered', 'crisis_detected'
);
```

### Track Custom Metric

```javascript
const metricsCollector = require('./services/metrics-collector');

// Track transaction block
metricsCollector.trackTransaction(
  true,  // blocked
  50.00  // amount saved
);

// Track intervention
metricsCollector.trackIntervention(
  'payment_block',
  true  // success
);

// Track pattern detection
metricsCollector.trackPatternDetection(
  'high_risk_time',
  true,  // correct
  0.97   // confidence
);
```

## Querying Metrics

### PromQL Examples

```promql
# Average API response time (p95)
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# Cache hit rate
sum(rate(cache_hits_total[5m])) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100

# Active users (last 24 hours)
count(user_activity_total{period="1d"})

# AI cost per conversation
sum(increase(ai_cost_total[1h])) / sum(increase(ai_conversation_total[1h]))

# Pattern detection accuracy
sum(pattern_detection_correct_total) / sum(pattern_detection_total) * 100
```

## Performance Benchmarks

### API Response Times (Target SLAs)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /api/users/:id | < 50ms | < 150ms | < 300ms |
| GET /api/transactions | < 100ms | < 300ms | < 500ms |
| POST /api/ai/conversation | < 1s | < 3s | < 5s |
| POST /api/patterns/detect | < 200ms | < 500ms | < 1s |

### Database Query Times

| Query Type | Target p95 |
|------------|-----------|
| SELECT (indexed) | < 10ms |
| SELECT (full scan) | < 100ms |
| INSERT | < 5ms |
| UPDATE (indexed) | < 10ms |

### Cache Performance

| Metric | Target |
|--------|--------|
| Hit rate | > 90% |
| Miss penalty | < 50ms |

### ML Model Performance

| Model | Inference Time (p95) | Accuracy |
|-------|---------------------|----------|
| Gambling Classifier | < 100ms | 97% |
| Pattern Detector | < 200ms | 92% |
| Sentiment Analyzer | < 50ms | 88% |

## Troubleshooting

### High Memory Usage

**Symptoms**: Memory > 90%, slow responses, OOM errors

**Diagnosis**:
```bash
# Check memory usage
curl http://localhost:3000/metrics/health

# Check Node.js heap
node --max-old-space-size=4096 server.js
```

**Solutions**:
1. Increase heap size
2. Check for memory leaks with `heapdump`
3. Review cache size limits
4. Scale horizontally

### Slow Database Queries

**Symptoms**: Database query duration > 1s

**Diagnosis**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY abs(correlation) DESC;
```

**Solutions**:
1. Add indexes
2. Optimize queries
3. Use connection pooling
4. Enable query caching

### High Queue Depth

**Symptoms**: Queue > 1000 items, slow sync

**Diagnosis**:
```bash
curl http://localhost:3000/metrics/queues
```

**Solutions**:
1. Increase queue workers
2. Check for failed items
3. Batch process old items
4. Clear stale items

### Alert Fatigue

**Symptoms**: Too many alerts, important alerts missed

**Solutions**:
1. Adjust alert thresholds
2. Add `for` duration to rules
3. Group similar alerts
4. Use alert inhibition
5. Review and tune weekly

## Best Practices

### 1. Metric Naming

Follow Prometheus naming conventions:
- Use `_total` suffix for counters: `http_requests_total`
- Use `_seconds` for durations: `http_request_duration_seconds`
- Use `_percent` for percentages: `cache_hit_rate_percent`
- Use `_bytes` for sizes: `memory_used_bytes`

### 2. Label Cardinality

Keep label cardinality low:
- ✅ Good: `{endpoint="/api/users/:id", method="GET"}`
- ❌ Bad: `{endpoint="/api/users/12345", method="GET"}` (high cardinality)

### 3. Alert Design

- **Set appropriate thresholds**: Not too sensitive, not too lenient
- **Use `for` duration**: Avoid flapping alerts
- **Include runbooks**: Link to resolution steps
- **Test alerts**: Regularly verify alert rules work

### 4. Dashboard Design

- **Group related metrics**: System, User, AI dashboards
- **Use consistent time ranges**: 1h, 6h, 24h, 7d
- **Add annotations**: Mark deployments, incidents
- **Set thresholds**: Color code warnings/errors

## Maintenance

### Daily
- Review critical alerts
- Check dashboard for anomalies
- Verify backup jobs completed

### Weekly
- Review alert trends
- Tune alert thresholds
- Clean up old data
- Performance optimization

### Monthly
- Update dashboards
- Review SLA compliance
- Capacity planning
- Security audit

## Integration with CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Create deployment annotation
  run: |
    curl -X POST http://prometheus:9090/api/v1/admin/tsdb/snapshot \
      -d "start_time=$(date -u +%s)&end_time=$(date -u +%s)" \
      -d "name=deployment-$(date +%Y%m%d-%H%M%S)"
```

## Cost Monitoring

Track infrastructure and AI costs:

```promql
# Daily infrastructure cost
sum(node_instance_count) * 0.10  # $0.10/instance/day

# Daily AI cost
sum(increase(ai_cost_total[1d]))

# Total daily cost
(sum(node_instance_count) * 0.10) + sum(increase(ai_cost_total[1d]))
```

## Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Alert Best Practices**: https://prometheus.io/docs/practices/alerting/
- **Runbooks**: https://docs.anchor.com/runbooks/

---

**Built with ❤️ for reliability and observability.**
