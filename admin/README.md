# Anchor Admin Dashboard

Internal analytics dashboard for monitoring system health and user success metrics.

## Overview

Real-time dashboard for the Anchor team to track:
- System health (active users, vault balances, conversations)
- Success metrics (clean streaks, money saved, relapses)
- Intervention effectiveness (AI conversations, approval rates)
- Risk indicators (high-risk users, payday loan trends)
- User management (search, view details, intervention history)
- Pattern analysis (frequency, time-of-day heatmaps)
- System monitoring (webhooks, errors, third-party services)

## Pages

### 1. Dashboard (`/dashboard`)
Main overview with key metrics:
- **System Health:** Active users, total vault, allowance disbursed, active conversations
- **Success Metrics:** Average streak, longest streak, relapses this week, money saved
- **Intervention Effectiveness:** Conversations today, approval rate, pattern accuracy, guardian response
- **Risk Indicators:** High-risk users, payday loan trends

### 2. Users (`/users`)
User management and search:
- Search by name, email, or phone
- View individual user dashboards
- Clean streak history
- Recent patterns and interventions
- Guardian details
- Manual intervention trigger (emergency only)

### 3. Patterns (`/patterns`)
Pattern detection analysis:
- Pattern frequency (all-time)
- Time-of-day heatmap (24 hours)
- Day-of-week analysis
- Most common patterns
- Peak detection times

### 4. Interventions (`/interventions`)
AI conversation analytics:
- Average conversation duration
- Conversation outcomes (approved/denied/follow-up)
- Manipulation attempt frequency
- Voice vs text usage
- Drop-off points

### 5. System (`/system`)
System health monitoring:
- Webhook success rate (last 24 hours)
- Recent error log
- Third-party service status (Up Bank, Supabase, OpenAI, Twilio)
- API response times
- Database query performance

## Tech Stack

**Framework:** Next.js 14
**Database:** Supabase (PostgreSQL)
**Charts:** Custom SVG components (no dependencies)
**Real-time:** Supabase Realtime subscriptions
**Authentication:** Supabase Auth (role-based)

## Setup

### Prerequisites

- Node.js 18+
- Access to Supabase service key (admin access)

### Installation

```bash
cd admin
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
```

**IMPORTANT:** The service key provides full database access. Never commit it to git.

### Development

```bash
npm run dev
```

Dashboard available at: `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Components

### MetricCard

Reusable metric display component:

```jsx
<MetricCard
  title="Active Users"
  value={124}
  subtitle="Currently locked in"
  icon="👥"
  status="good" // good | warning | alert
  trend={5} // percentage change
  loading={false}
/>
```

### Charts

Custom SVG charts (no external dependencies):

**LineChart:**
```jsx
<LineChart
  data={[{ value: 10 }, { value: 20 }, { value: 15 }]}
  label="Daily Active Users"
  width={400}
  height={200}
  color="#16A34A"
/>
```

**BarChart:**
```jsx
<BarChart
  data={[
    { label: 'Mon', value: 5 },
    { label: 'Tue', value: 8 },
  ]}
  label="Patterns by Day"
  width={400}
  height={200}
  color="#DC2626"
/>
```

**Heatmap:**
```jsx
<Heatmap
  data={Array(24).fill(0).map((_, i) => ({
    label: `${i}h`,
    value: Math.random() * 100,
  }))}
  label="Time of Day Heatmap"
  width={600}
  height={100}
/>
```

**DonutChart:**
```jsx
<DonutChart
  data={[
    { label: 'Approved', value: 65, color: '#16A34A' },
    { label: 'Denied', value: 30, color: '#DC2626' },
    { label: 'Pending', value: 5, color: '#6B7280' },
  ]}
  label="Conversation Outcomes"
  size={200}
/>
```

## Analytics Service

All database queries centralized in `services/analytics.js`:

```javascript
import * as analytics from '../services/analytics';

// System health
const activeUsers = await analytics.getActiveUsersCount();
const vaultBalance = await analytics.getTotalVaultBalance();

// Success metrics
const avgStreak = await analytics.getAverageCleanStreak();
const longestStreak = await analytics.getLongestCurrentStreak();

// User management
const results = await analytics.searchUsers('john');
const user = await analytics.getUserDetails(userId);

// Pattern analysis
const patterns = await analytics.getPatternFrequency();
const heatmap = await analytics.getPatternTimeOfDayHeatmap();

// System monitoring
const webhookRate = await analytics.getWebhookSuccessRate();
const errors = await analytics.getRecentErrors();
```

## Role-Based Access

### Roles

**Admin:** Full access to all pages and data
**Support:** Read-only access, can view users but not trigger interventions
**View-Only:** Dashboard and aggregated metrics only

### Implementation

```javascript
// Check user role in page
import { useAuth } from '../contexts/AuthContext';

const { user, role } = useAuth();

if (role !== 'admin') {
  return <div>Access Denied</div>;
}
```

### Role Configuration

Set user roles in Supabase `admin_users` table:

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'support', 'view_only')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add admin user
INSERT INTO admin_users (email, role)
VALUES ('admin@anchor.app', 'admin');
```

## Real-Time Updates

Dashboard auto-refreshes every 30 seconds:

```javascript
useEffect(() => {
  loadMetrics();

  // Refresh every 30 seconds
  const interval = setInterval(loadMetrics, 30000);
  return () => clearInterval(interval);
}, []);
```

For real-time updates using Supabase Realtime:

```javascript
const channel = supabase
  .channel('admin_dashboard')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'gambling_patterns',
  }, payload => {
    // Update metrics
    loadMetrics();
  })
  .subscribe();

return () => {
  supabase.removeChannel(channel);
};
```

## Export Functionality

Export user reports and system reports:

```javascript
// Export individual user report
const report = await analytics.exportUserReport(userId);
downloadJSON(report, `user-${userId}-report.json`);

// Export system report for date range
const systemReport = await analytics.exportSystemReport(
  '2025-01-01',
  '2025-01-31'
);
downloadJSON(systemReport, 'system-report-jan-2025.json');
```

## Security

### Service Key Protection

- **Never commit** `.env.local` to git
- Use environment variables in production
- Rotate service key regularly
- Monitor admin access logs

### Admin Authentication

Require authentication for all admin pages:

```javascript
// middleware.js
export function middleware(request) {
  const token = request.cookies.get('admin_token');

  if (!token) {
    return NextResponse.redirect('/login');
  }

  // Verify token and role
  const { role } = verifyToken(token);

  if (!['admin', 'support', 'view_only'].includes(role)) {
    return NextResponse.redirect('/unauthorized');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/users/:path*', '/patterns/:path*'],
};
```

### Audit Logging

Log all admin actions:

```javascript
async function logAdminAction(action, userId, details) {
  await supabase.from('admin_audit_log').insert({
    action,
    admin_user_id: userId,
    details,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });
}

// Example usage
await logAdminAction('view_user_details', adminId, {
  target_user_id: userId,
});
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd admin
vercel
```

Add environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### Self-Hosted

```bash
# Build
npm run build

# Start production server
npm start
```

Use PM2 for process management:

```bash
pm2 start npm --name "anchor-admin" -- start
pm2 save
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker build -t anchor-admin .
docker run -p 3000:3000 anchor-admin
```

## Monitoring

### Performance

Monitor dashboard performance:
- Page load times
- Query execution times
- API response times
- Real-time subscription lag

### Alerts

Set up alerts for:
- Webhook success rate < 90%
- Error rate > 10 per hour
- Active conversations > 20
- High-risk users > 10

### Metrics to Track

- Admin dashboard usage (page views, active admins)
- Average response time for user searches
- Export frequency
- Most viewed metrics

## Troubleshooting

### Metrics not loading

Check Supabase service key:
```javascript
console.log('Service key set:', !!process.env.SUPABASE_SERVICE_KEY);
```

Verify database connection:
```javascript
const { error } = await supabase.from('users').select('count');
if (error) console.error('DB Error:', error);
```

### Real-time updates not working

Check Supabase Realtime is enabled:
1. Supabase Dashboard → Database → Replication
2. Enable realtime for tables: `gambling_patterns`, `ai_conversations`, `users`

### Charts not rendering

Charts use inline SVG. Check browser console for errors.

Verify data format:
```javascript
console.log('Chart data:', data);
// Should be array of objects with required fields
```

## Roadmap

**Phase 2:**
- [ ] Mobile admin app
- [ ] Push notifications for critical alerts
- [ ] Automated reporting (weekly emails)
- [ ] Advanced filtering and date ranges
- [ ] Comparison views (week-over-week)
- [ ] Cohort analysis
- [ ] Retention metrics
- [ ] A/B testing for AI prompts

**Phase 3:**
- [ ] Predictive analytics (relapse prediction)
- [ ] Guardian effectiveness scoring
- [ ] Pattern detection improvements
- [ ] ML-based anomaly detection

## Support

For issues with the admin dashboard:
1. Check error logs in browser console
2. Verify Supabase connection
3. Check service key permissions
4. Review recent database schema changes

**Internal contact:** admin-dashboard@anchor.app

---

**Remember:** This is an internal tool. Data shown is sensitive. Never share screenshots or exports externally.
