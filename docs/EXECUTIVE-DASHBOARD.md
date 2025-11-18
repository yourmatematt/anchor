# Anchor Executive Dashboard

## Overview

The Anchor Executive Dashboard provides leadership with real-time business intelligence, comprehensive metrics tracking, and predictive analytics. Built for data-driven decision-making at the highest level.

## Dashboard Components

### 1. Main Dashboard (`/executive/dashboard`)
High-level overview of all key metrics with at-a-glance insights.

**Features:**
- Real-time KPI tracking
- Trend indicators
- Automated refresh every 5 minutes
- Export capabilities (PDF, CSV)
- Board report generation

**Key Metrics Displayed:**
- Total users and growth rate
- Vault locked (total commitment)
- Average clean streak
- Monthly active users
- Retention curves (D1, D7, D30, D90)
- Financial performance
- Success rates

### 2. Detailed Metrics (`/executive/metrics`)
Comprehensive drill-down into all business metrics with filtering and comparison.

**Categories:**
- **Growth Metrics**: Acquisition, activation, viral coefficient
- **Financial Metrics**: Revenue, CAC, LTV, margins
- **Success Metrics**: Clean streaks, milestones, interventions
- **Engagement Metrics**: DAU, MAU, session data
- **Retention Analysis**: Cohort retention matrices
- **Predictive Analytics**: Churn prediction, forecasts

### 3. Cohort Analysis (`/executive/cohorts`)
Advanced segmentation and cohort performance tracking.

**Dimensions:**
- Sign-up month/week
- Risk level (low, medium, high)
- Gambling type
- Commitment period
- Guardian status
- Geography (state/city)
- Acquisition channel

**Analysis Types:**
- Retention curves by cohort
- Success rate comparisons
- Financial performance
- Behavioral patterns
- Trend analysis

### 4. Revenue Tracking (`/executive/revenue`)
Financial performance, unit economics, and investor metrics.

**Sections:**
- **Revenue Metrics**: MRR, ARR, growth rates
- **Unit Economics**: CAC, LTV, payback periods
- **Forecasting**: 12-month projections
- **Investor Metrics**: Runway, burn rate, cash position
- **Revenue Attribution**: By channel, cohort, product

## Key Metrics Definitions

### Growth Metrics

**Total Users**
- Definition: Cumulative registered users
- Target: 15% MoM growth
- Status Indicators:
  - Green: >12% growth
  - Yellow: 8-12% growth
  - Red: <8% growth

**User Acquisition Rate**
- Definition: New users per day/week/month
- Formula: New sign-ups / Time period
- Benchmark: Industry average 10-15% MoM

**Activation Rate**
- Definition: % of users completing onboarding
- Formula: (Users completing onboarding / Total sign-ups) × 100
- Target: >75%
- Critical Steps:
  - Up Bank connection
  - Guardian addition
  - First vault creation
  - First intervention

**Retention (D1, D7, D30, D90)**
- D1: % of users active 1 day after sign-up
- D7: % of users active 7 days after sign-up
- D30: % of users active 30 days after sign-up
- D90: % of users active 90 days after sign-up
- Targets:
  - D1: >80%
  - D7: >60%
  - D30: >40%
  - D90: >30%

**Churn Rate**
- Definition: % of users becoming inactive
- Formula: (Users churned / Total active users) × 100
- Target: <5% monthly
- Churn Reasons:
  - Voluntary (user-initiated)
  - Involuntary (payment failure, etc.)
  - Natural (goal achieved)

**Guardian Attachment Rate**
- Definition: % of users with active guardian
- Formula: (Users with guardian / Total users) × 100
- Target: >60%
- Impact: 2.3x higher retention with guardian

### Financial Metrics

**Total Vault Locked**
- Definition: Sum of all active commitment vaults
- Metric: AUD total
- Significance: User commitment level indicator
- Trend: Should grow with user base

**Average Vault Per User**
- Definition: Mean vault amount across all users
- Formula: Total vault locked / Number of users
- Benchmark: $250-$400 AUD
- Variance: Significant by risk level

**Projected Annual Savings**
- Definition: Estimated yearly savings for users
- Formula: Clean days × Average daily gambling spend
- Metric: Total community impact
- Use Case: Social impact reporting

**Customer Acquisition Cost (CAC)**
- Definition: Cost to acquire one user
- Formula: Total marketing spend / New users acquired
- Target: <$50 AUD
- Channels: Varies significantly by source
- Components:
  - Paid advertising
  - Content marketing
  - Referral program
  - Partnership costs

**Lifetime Value (LTV)**
- Definition: Projected revenue from a user
- Formula: (ARPU × Avg lifetime months) - CAC
- Target: >$150 AUD
- Calculation Method: Cohort-based analysis
- Factors:
  - Subscription revenue
  - Partner revenue share
  - Average lifetime duration

**LTV:CAC Ratio**
- Definition: Return on customer acquisition
- Formula: LTV / CAC
- Target: >3:1 (ideal: >4:1)
- Interpretation:
  - <1: Unsustainable
  - 1-3: Risky
  - 3-5: Healthy
  - >5: Excellent

**Monthly Recurring Revenue (MRR)**
- Definition: Predictable monthly revenue
- Components:
  - Subscription fees
  - Partner commissions
  - Premium features
- Growth Target: >15% MoM

**Annual Run Rate (ARR)**
- Definition: Annualized revenue projection
- Formula: MRR × 12
- Use: Investor discussions, planning

### Success Metrics

**Average Clean Streak**
- Definition: Mean consecutive gambling-free days
- Target: Increasing trend
- Median: Often more meaningful than mean
- Segments: By risk level, cohort

**Clean Days**
- Definition: Total gambling-free days across all users
- Cumulative Metric: Community achievement
- Per User: Individual progress tracking

**Relapse Rate**
- Definition: % of users experiencing relapse
- By Cohort: Varies significantly
- By Commitment: Longer commitments = lower relapse
- Trend: Should decrease over time
- Intervention: Trigger support protocols

**Intervention Success Rate**
- Definition: % of interventions with voice memo
- Formula: (Interventions completed / Total interventions) × 100
- Target: >85%
- Quality Metric: Not just completion, but effectiveness

**Pattern Detection Accuracy**
- Definition: ML model precision
- Measurement: Predicted vs actual outcomes
- Target: >90%
- Use Cases:
  - Trigger prediction
  - Risk assessment
  - Personalization

**Guardian Engagement Score**
- Definition: Composite guardian activity metric
- Components:
  - Response time to alerts
  - Check-in frequency
  - Notification response rate
- Formula: Weighted average of components
- Target: >70%

**Milestone Achievement Rates**
- 30 Days: % of users reaching 30-day milestone
- 90 Days: % of users reaching 90-day milestone
- 180 Days: % of users reaching 180-day milestone
- 365 Days: % of users reaching 365-day milestone
- Funnel: Decreasing percentages expected
- Benchmarks: Industry comparisons

### Engagement Metrics

**Daily Active Users (DAU)**
- Definition: Unique users active per day
- Activity: Any meaningful interaction
- Trend: Should be stable or growing
- Seasonality: Account for weekly patterns

**Weekly Active Users (WAU)**
- Definition: Unique users active per week
- Calculation: Rolling 7-day window
- Use: Smoother than DAU

**Monthly Active Users (MAU)**
- Definition: Unique users active per month
- Standard Metric: Industry benchmark
- Cohort View: By sign-up month

**DAU/MAU Ratio (Stickiness)**
- Definition: % of monthly users active daily
- Formula: (DAU / MAU) × 100
- Target: >30%
- Interpretation:
  - <20%: Low engagement
  - 20-40%: Moderate
  - >40%: Highly sticky

**Voice Memo Completion Rate**
- Definition: % of interventions with voice recording
- Formula: (Interventions with memo / Total interventions) × 100
- Target: >80%
- Quality Indicator: User reflection depth

**Average Interventions Per User**
- Definition: Mean interventions per user per period
- Context: Higher isn't always better
- Ideal: Decreasing over time (improving behavior)
- Alert Threshold: Sudden spike indicates struggle

**Guardian Response Time**
- Definition: Time from alert to guardian action
- Target: <15 minutes median
- Critical Metric: Crisis support effectiveness
- Distribution: 90th percentile important

## Cohort Analysis Framework

### Cohort Dimensions

#### 1. Temporal Cohorts
**Sign-up Month**
- Group users by month of registration
- Track monthly cohort performance
- Compare across time periods
- Identify seasonal patterns

**Sign-up Week**
- More granular than monthly
- Useful for campaign analysis
- A/B test comparison
- Rapid iteration feedback

#### 2. Risk-Based Cohorts
**Risk Levels: Low, Medium, High**

**Low Risk Cohort:**
- Characteristics: Infrequent gambling, low amounts
- Expected: Higher retention, lower vault amounts
- Success Rate: 70-80% at 90 days
- Intervention Needs: Minimal

**Medium Risk Cohort:**
- Characteristics: Regular gambling, moderate amounts
- Expected: Moderate retention, average vault
- Success Rate: 55-65% at 90 days
- Intervention Needs: Regular check-ins

**High Risk Cohort:**
- Characteristics: Heavy gambling, high amounts
- Expected: Lower retention, higher vault
- Success Rate: 40-50% at 90 days
- Intervention Needs: Intensive support

#### 3. Behavioral Cohorts
**Gambling Type:**
- Pokies (slot machines)
- Sports betting
- Casino games
- Online gambling
- Racing
- Multiple types

**Analysis:**
- Retention by type
- Success rates by type
- Vault amounts by type
- Best practices by type

#### 4. Commitment Period Cohorts
**Periods: 7, 14, 30, 90 days**

**Analysis:**
- Completion rates by period
- Success after completion
- Relapse rates post-commitment
- Optimal commitment length

#### 5. Guardian Status Cohorts
**With Guardian vs Without**

**With Guardian:**
- Retention: 2.3x higher
- Success Rate: 1.8x higher
- Engagement: 2.1x higher
- Recommended: Encourage guardian addition

**Without Guardian:**
- Higher churn risk
- More frequent interventions needed
- Consider mandatory for high-risk

#### 6. Geographic Cohorts
**By State/Territory:**
- NSW, VIC, QLD, SA, WA, TAS, NT, ACT

**Analysis:**
- Regional performance differences
- Partner availability impact
- Support service access
- Marketing effectiveness

#### 7. Acquisition Channel Cohorts
**Channels:**
- Organic search
- Paid search
- Social media
- Referrals
- Partnerships
- PR/Media

**Metrics by Channel:**
- CAC
- LTV
- Quality (retention, success rate)
- ROI
- Scalability

### Cohort Comparison

**Best Performing Cohorts:**
- Identify common characteristics
- Replicate success factors
- Focus acquisition on similar profiles

**Underperforming Cohorts:**
- Identify challenges
- Implement interventions
- Consider product changes
- Adjust targeting

## Predictive Analytics

### Churn Prediction Model

**Input Features:**
- Declining engagement (app opens, interventions)
- Increasing relapse frequency
- Guardian disengagement
- Time between interactions
- Vault status changes
- Support ticket sentiment

**Output:**
- Churn probability (0-100%)
- Risk level (low, medium, high)
- Time to churn estimate
- Contributing factors

**Actions:**
- High Risk (>70%): Immediate outreach
- Medium Risk (40-70%): Proactive engagement
- Low Risk (<40%): Standard monitoring

**Model Performance:**
- Precision: >85%
- Recall: >80%
- F1 Score: >82%
- AUC-ROC: >0.90

### Success Probability Model

**Input Features:**
- Clean streak consistency
- Intervention completion rate
- Guardian engagement
- Milestone achievement pace
- Vault discipline
- Support utilization

**Output:**
- Success probability (0-100%)
- Projected clean days at 90 days
- Recommended support level
- Milestone predictions

**Use Cases:**
- Resource allocation
- Personalized support
- Reward optimization
- Success celebration timing

### Revenue Forecasting

**Methodology:**
- Cohort-based projection
- User growth assumptions
- Churn rate modeling
- ARPU trends
- Market saturation analysis

**Outputs:**
- Monthly MRR projection (12 months)
- Confidence intervals (conservative, expected, optimistic)
- Sensitivity analysis
- Assumption documentation

**Inputs:**
- Historical growth rates
- Planned marketing spend
- Product roadmap impact
- Market conditions
- Competitive landscape

### Capacity Planning

**Metrics:**
- Support ticket volume
- Guardian availability
- Intervention load
- System performance
- Partner capacity

**Forecasts:**
- Resource requirements
- Scaling timeline
- Hiring needs
- Infrastructure planning
- Partner expansion

## Report Generation

### Board Report

**Contents:**
1. Executive Summary
   - Key achievements
   - Major challenges
   - Strategic initiatives

2. User Growth
   - Total users
   - New user acquisition
   - Retention metrics
   - Cohort performance

3. Financial Performance
   - Revenue trends
   - Unit economics
   - Runway and burn rate
   - Fundraising status

4. Product Metrics
   - Success rates
   - Engagement metrics
   - Feature adoption
   - User feedback

5. Strategic Priorities
   - Next quarter objectives
   - Resource requirements
   - Key decisions needed
   - Risk mitigation

**Format:** PDF, auto-generated monthly

**Distribution:** Board members, key stakeholders

**Schedule:** First week of each month

### Investor Deck

**Slides:**
1. Company Overview
2. Market Opportunity
3. Product Demo (screenshots)
4. Business Model
5. Key Metrics
6. User Testimonials
7. Team
8. Financials
9. Roadmap
10. Ask

**Data Integration:**
- Auto-populated metrics
- Real-time charts
- Cohort analysis
- Financial projections

**Export:** PowerPoint, PDF

**Update Frequency:** Real-time before investor meetings

### Custom Reports

**Available Reports:**
- Weekly KPI snapshot
- Monthly performance review
- Quarterly business review
- Annual report
- Partner performance
- Channel attribution
- Cohort deep-dive
- A/B test results

**Customization:**
- Time range
- Metrics selection
- Cohort filters
- Comparison periods
- Export format

## API Endpoints

### Dashboard Metrics
```
GET /api/executive/dashboard?timeRange=30d
```

**Response:**
```json
{
  "growth": {
    "totalUsers": 12547,
    "newUsers": 1234,
    "activationRate": 78.5,
    "retention": {
      "day1": 85.2,
      "day7": 67.3,
      "day30": 45.8,
      "day90": 32.1
    },
    "churnRate": 4.2,
    "guardianAttachmentRate": 62.5
  },
  "financial": {
    "totalVaultLocked": 1247893.50,
    "averageVaultPerUser": 347.25,
    "costPerAcquisition": 42.50,
    "lifetimeValue": 187.40,
    "ltvCacRatio": 4.41,
    "revenue": {
      "mrr": 15410.00,
      "arr": 184920.00
    }
  },
  "success": {
    "averageCleanStreak": 47.3,
    "interventionSuccessRate": 87.4,
    "patternDetectionAccuracy": 91.2,
    "milestoneAchievementRates": {
      "30_days": 58.3,
      "90_days": 34.2,
      "180_days": 18.7,
      "365_days": 6.4
    }
  },
  "engagement": {
    "dailyActiveUsers": 3847,
    "weeklyActiveUsers": 7234,
    "monthlyActiveUsers": 9821,
    "dauMauRatio": 39.2
  }
}
```

### Cohort Analysis
```
GET /api/executive/cohorts?dimension=signup_month
```

### Revenue Forecast
```
GET /api/executive/revenue/forecast?months=12
```

### Export Report
```
POST /api/executive/reports/generate
{
  "type": "board_report",
  "format": "pdf",
  "period": "2024-11"
}
```

## Access Control

**Roles:**
- **Executive**: Full access to all dashboards
- **Board Member**: Board reports only
- **Investor**: Investor deck and key metrics
- **Manager**: Relevant department metrics

**Authentication:**
- OAuth2 with MFA required
- IP whitelist option
- Session timeout: 30 minutes
- Audit logging enabled

## Data Refresh

**Real-time Metrics:**
- Current users online
- Active interventions
- System health

**5-Minute Refresh:**
- DAU, WAU, MAU
- Active users
- Recent activity

**Hourly Refresh:**
- Cohort data
- Financial metrics
- Success metrics

**Daily Refresh:**
- Retention calculations
- Churn analysis
- Forecasts

**Weekly Refresh:**
- Trend analysis
- Cohort comparisons
- Long-term projections

## Best Practices

1. **Regular Review**: Check dashboard daily
2. **Trend Focus**: Look for patterns, not just point values
3. **Cohort Analysis**: Segment to understand behavior
4. **Action Items**: Metrics should drive decisions
5. **Communication**: Share insights with team
6. **Validation**: Cross-check data sources
7. **Context**: Consider external factors
8. **Documentation**: Record assumptions and decisions

## Troubleshooting

**Dashboard Not Loading:**
- Check authentication
- Verify API endpoint
- Review browser console
- Contact support

**Data Discrepancies:**
- Check time zone settings
- Verify filter selections
- Compare calculation methods
- Review data pipeline logs

**Export Failures:**
- File size limits
- Format compatibility
- Permission issues
- Network timeout

## Support

**Technical Support:**
- Email: tech@anchor.com
- Slack: #executive-dashboard
- On-call: +61 1800 ANCHOR

**Business Intelligence Team:**
- Email: analytics@anchor.com
- Slack: #data-analytics
- Office Hours: Mon-Fri 9am-5pm AEST

---

**Document Version:** 1.0
**Last Updated:** 2024
**Maintained By:** Anchor Analytics Team
