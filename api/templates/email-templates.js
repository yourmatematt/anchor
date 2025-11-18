/**
 * Email Templates for Anchor
 *
 * Australian tone, direct, facts-based
 * HTML templates with plain text alternatives
 */

/**
 * Base email layout
 */
const baseLayout = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #000; color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
    .content { padding: 32px 24px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .stat-box { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; }
    .stat-box strong { color: #1f2937; display: block; font-size: 24px; margin-bottom: 4px; }
    .stat-box span { color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; color: #991b1b; }
    .success { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; color: #065f46; }
    h2 { color: #1f2937; font-size: 22px; margin-top: 24px; }
    p { margin: 12px 0; }
    ul { margin: 12px 0; padding-left: 24px; }
    li { margin: 8px 0; }
    .emergency { background: #dc2626; color: white; padding: 16px; margin: 24px 0; border-radius: 8px; text-align: center; }
    .emergency a { color: white; font-weight: 700; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚓ ANCHOR</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Anchor</strong> - Financial Accountability System</p>
      <p>This is an automated message. Replies are not monitored.</p>
      <p><a href="{{unsubscribe_url}}" style="color: #6b7280;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Welcome Series - Email 1
 */
const WELCOME_01_LOCKED_IN = {
  subject: "You've locked in. Here's what happens now.",
  html: (data) => baseLayout(`
    <h2>Commitment Confirmed</h2>

    <p>You're locked in for <strong>${data.commitmentDays} days</strong>. No turning back.</p>

    <div class="stat-box">
      <strong>Guardian: ${data.guardianName}</strong>
      <span>${data.guardianPhone}</span>
    </div>

    <div class="stat-box">
      <strong>Daily allowance: $${data.dailyAllowance}</strong>
      <span>Resets 6am daily</span>
    </div>

    <h2>What happens next:</h2>

    <ul>
      <li><strong>6am daily:</strong> Your allowance resets. You'll get an SMS.</li>
      <li><strong>Non-whitelisted purchase:</strong> App opens. AI conversation required. Guardian notified.</li>
      <li><strong>Payday:</strong> Money automatically moved to vault. You can't access it.</li>
      <li><strong>Sunday 6pm:</strong> Weekly report. Facts, not feelings.</li>
    </ul>

    <h2>Your whitelisted merchants:</h2>
    <ul>
      ${data.whitelist.map(item => `<li>${item}</li>`).join('')}
    </ul>

    <p>Everything else triggers intervention.</p>

    <div class="alert">
      <strong>Important:</strong> You can't disable AI interventions, guardian notifications, or emergency protocols. This is the system working.
    </div>

    <h2>Emergency contacts (24/7):</h2>
    <ul>
      <li>Gambling Help: <a href="tel:1800858858">1800 858 858</a></li>
      <li>Lifeline: <a href="tel:131114">13 11 14</a></li>
    </ul>

    <p>Day 1 starts now.</p>
  `),
  text: (data) => `
COMMITMENT CONFIRMED

You're locked in for ${data.commitmentDays} days. No turning back.

Guardian: ${data.guardianName} (${data.guardianPhone})
Daily allowance: $${data.dailyAllowance}

WHAT HAPPENS NEXT:
- 6am daily: Allowance resets. You'll get an SMS.
- Non-whitelisted purchase: App opens. AI conversation required. Guardian notified.
- Payday: Money moved to vault. You can't access it.
- Sunday 6pm: Weekly report. Facts, not feelings.

YOUR WHITELISTED MERCHANTS:
${data.whitelist.map(item => `- ${item}`).join('\n')}

Everything else triggers intervention.

IMPORTANT: You can't disable AI interventions, guardian notifications, or emergency protocols.

EMERGENCY CONTACTS (24/7):
Gambling Help: 1800 858 858
Lifeline: 13 11 14

Day 1 starts now.
  `,
  variables: ['commitmentDays', 'guardianName', 'guardianPhone', 'dailyAllowance', 'whitelist']
};

/**
 * Welcome Series - Email 2
 */
const WELCOME_02_DAY_3 = {
  subject: "Day 3: The system is working. Here's your data.",
  html: (data) => baseLayout(`
    <h2>Day 3 Complete</h2>

    <div class="stat-box">
      <strong>${data.cleanDays} days clean</strong>
      <span>Streak active</span>
    </div>

    <div class="stat-box">
      <strong>$${data.savedTotal}</strong>
      <span>Estimated savings so far</span>
    </div>

    <h2>Transactions monitored:</h2>
    <ul>
      <li>Total: ${data.totalTransactions}</li>
      <li>Whitelisted: ${data.whitelistedTransactions}</li>
      <li>Flagged: ${data.flaggedTransactions}</li>
      <li>Interventions: ${data.interventions}</li>
    </ul>

    ${data.patterns.length > 0 ? `
      <h2>Patterns detected:</h2>
      <ul>
        ${data.patterns.map(p => `<li><strong>${p.trigger}:</strong> ${p.count} times</li>`).join('')}
      </ul>
    ` : ''}

    <p>The system learns your triggers. We're building your baseline.</p>

    <p><strong>Guardian activity:</strong></p>
    <ul>
      <li>Messages sent: ${data.guardianMessages}</li>
      <li>Alerts triggered: ${data.guardianAlerts}</li>
    </ul>

    ${data.upcomingRisks.length > 0 ? `
      <div class="alert">
        <strong>Upcoming risks identified:</strong>
        <ul>
          ${data.upcomingRisks.map(r => `<li>${r}</li>`).join('')}
        </ul>
        <p>Your guardian has been notified.</p>
      </div>
    ` : ''}

    <p>Keep going. One day at a time.</p>
  `),
  text: (data) => `
DAY 3 COMPLETE

${data.cleanDays} days clean
$${data.savedTotal} saved

TRANSACTIONS MONITORED:
Total: ${data.totalTransactions}
Whitelisted: ${data.whitelistedTransactions}
Flagged: ${data.flaggedTransactions}
Interventions: ${data.interventions}

${data.patterns.length > 0 ? `
PATTERNS DETECTED:
${data.patterns.map(p => `${p.trigger}: ${p.count} times`).join('\n')}
` : ''}

GUARDIAN ACTIVITY:
Messages: ${data.guardianMessages}
Alerts: ${data.guardianAlerts}

${data.upcomingRisks.length > 0 ? `
UPCOMING RISKS:
${data.upcomingRisks.join('\n')}
Guardian notified.
` : ''}

Keep going. One day at a time.
  `,
  variables: ['cleanDays', 'savedTotal', 'totalTransactions', 'whitelistedTransactions', 'flaggedTransactions', 'interventions', 'patterns', 'guardianMessages', 'guardianAlerts', 'upcomingRisks']
};

/**
 * Welcome Series - Email 3
 */
const WELCOME_03_WEEK_1 = {
  subject: "Week 1: Patterns we've detected.",
  html: (data) => baseLayout(`
    <h2>First Week Complete</h2>

    <div class="success">
      <strong>7 days clean</strong>
      <p>You made it through the first week. $${data.savedTotal} saved.</p>
    </div>

    <h2>Your pattern profile:</h2>

    <div class="stat-box">
      <strong>Primary trigger: ${data.primaryTrigger}</strong>
      <span>Most common pattern detected</span>
    </div>

    <div class="stat-box">
      <strong>High-risk times:</strong>
      <ul>
        ${data.highRiskTimes.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>

    <h2>What we learned:</h2>
    <ul>
      ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>

    <h2>Coming week risks:</h2>
    <div class="alert">
      ${data.upcomingWeekRisks.map(r => `<p><strong>${r.day}:</strong> ${r.risk}</p>`).join('')}
    </div>

    <p><strong>Pre-emptive support scheduled:</strong></p>
    <ul>
      <li>Guardian check-ins: ${data.scheduledCheckins}</li>
      <li>High-risk warnings: ${data.scheduledWarnings}</li>
    </ul>

    <h2>Week 2 starts now.</h2>
    <p>The system adapts to your patterns. Stay committed.</p>
  `),
  text: (data) => `
FIRST WEEK COMPLETE

7 days clean
$${data.savedTotal} saved

YOUR PATTERN PROFILE:
Primary trigger: ${data.primaryTrigger}

High-risk times:
${data.highRiskTimes.join('\n')}

WHAT WE LEARNED:
${data.insights.join('\n')}

COMING WEEK RISKS:
${data.upcomingWeekRisks.map(r => `${r.day}: ${r.risk}`).join('\n')}

PRE-EMPTIVE SUPPORT SCHEDULED:
Guardian check-ins: ${data.scheduledCheckins}
High-risk warnings: ${data.scheduledWarnings}

Week 2 starts now.
  `,
  variables: ['savedTotal', 'primaryTrigger', 'highRiskTimes', 'insights', 'upcomingWeekRisks', 'scheduledCheckins', 'scheduledWarnings']
};

/**
 * Weekly Report
 */
const WEEKLY_REPORT = {
  subject: (data) => `Week ${data.weekNumber}: Facts, not feelings`,
  html: (data) => baseLayout(`
    <h2>Week ${data.weekNumber} Report</h2>

    <div class="stat-box">
      <strong>${data.cleanDays}/7 days clean</strong>
      <span>${data.cleanPercentage}% clean rate</span>
    </div>

    <div class="stat-box">
      <strong>$${data.savedWeek}</strong>
      <span>Saved this week</span>
    </div>

    <div class="stat-box">
      <strong>$${data.savedTotal}</strong>
      <span>Total saved (${data.totalDays} days)</span>
    </div>

    <h2>This week's data:</h2>
    <ul>
      <li>Transactions: ${data.totalTransactions}</li>
      <li>Interventions: ${data.interventions}</li>
      <li>Guardian messages: ${data.guardianMessages}</li>
      ${data.relapses > 0 ? `<li>Relapses: ${data.relapses}</li>` : ''}
    </ul>

    ${data.triggers.length > 0 ? `
      <h2>Triggers activated:</h2>
      <ul>
        ${data.triggers.map(t => `<li>${t.name}: ${t.count} times</li>`).join('')}
      </ul>
    ` : ''}

    ${data.improvements.length > 0 ? `
      <h2>Improvements noted:</h2>
      <ul>
        ${data.improvements.map(i => `<li>${i}</li>`).join('')}
      </ul>
    ` : ''}

    ${data.concerns.length > 0 ? `
      <div class="alert">
        <strong>Concerns:</strong>
        <ul>
          ${data.concerns.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <h2>Next week:</h2>
    <p>${data.commitmentDaysRemaining} days remaining on commitment.</p>

    ${data.upcomingRisks.length > 0 ? `
      <p><strong>Predicted risks:</strong></p>
      <ul>
        ${data.upcomingRisks.map(r => `<li>${r}</li>`).join('')}
      </ul>
    ` : ''}
  `),
  text: (data) => `
WEEK ${data.weekNumber} REPORT

${data.cleanDays}/7 days clean (${data.cleanPercentage}%)
$${data.savedWeek} saved this week
$${data.savedTotal} total saved (${data.totalDays} days)

THIS WEEK'S DATA:
Transactions: ${data.totalTransactions}
Interventions: ${data.interventions}
Guardian messages: ${data.guardianMessages}
${data.relapses > 0 ? `Relapses: ${data.relapses}` : ''}

${data.triggers.length > 0 ? `
TRIGGERS ACTIVATED:
${data.triggers.map(t => `${t.name}: ${t.count} times`).join('\n')}
` : ''}

${data.improvements.length > 0 ? `
IMPROVEMENTS:
${data.improvements.join('\n')}
` : ''}

${data.concerns.length > 0 ? `
CONCERNS:
${data.concerns.join('\n')}
` : ''}

NEXT WEEK:
${data.commitmentDaysRemaining} days remaining on commitment.

${data.upcomingRisks.length > 0 ? `
PREDICTED RISKS:
${data.upcomingRisks.join('\n')}
` : ''}
  `,
  variables: ['weekNumber', 'cleanDays', 'cleanPercentage', 'savedWeek', 'savedTotal', 'totalDays', 'totalTransactions', 'interventions', 'guardianMessages', 'relapses', 'triggers', 'improvements', 'concerns', 'commitmentDaysRemaining', 'upcomingRisks']
};

/**
 * Relapse Response
 */
const RELAPSE_RESPONSE = {
  subject: "Day 0. Start again.",
  html: (data) => baseLayout(`
    <h2>Relapse Recorded</h2>

    <p>Your streak has been reset. Previous streak: <strong>${data.lastStreak} days</strong>.</p>

    <div class="stat-box">
      <strong>What happened:</strong>
      <p>Date: ${data.relapseDate}</p>
      ${data.triggers.length > 0 ? `<p>Triggers: ${data.triggers.join(', ')}</p>` : ''}
      ${data.voiceMemo ? `<p>Voice memo recorded: Yes</p>` : ''}
    </div>

    <h2>Facts:</h2>
    <ul>
      <li>Relapses happen. This is data, not failure.</li>
      <li>You had ${data.lastStreak} clean days. That's real progress.</li>
      <li>Average person relapses 3-4 times before sustained recovery.</li>
      <li>Your guardian has been notified (no judgment, just support).</li>
    </ul>

    <h2>What you learned:</h2>
    ${data.voiceMemo ? `
      <div class="stat-box">
        <p><em>"${data.voiceMemoTranscript}"</em></p>
        <span>— Your voice memo</span>
      </div>
      <p>Listen to this before your next high-risk moment.</p>
    ` : `
      <p>No voice memo recorded. Next time, document what happened while it's fresh.</p>
    `}

    <h2>Pattern analysis:</h2>
    <ul>
      ${data.patternAnalysis.map(p => `<li>${p}</li>`).join('')}
    </ul>

    <h2>Adjustments made:</h2>
    <ul>
      <li>High-risk alerts increased for: ${data.identifiedRisks.join(', ')}</li>
      <li>Guardian check-ins scheduled for next ${data.scheduledCheckins} days</li>
      ${data.allowanceAdjusted ? `<li>Daily allowance temporarily reduced to $${data.newAllowance}</li>` : ''}
    </ul>

    <div class="emergency">
      <p><strong>If you're in crisis:</strong></p>
      <p>Gambling Help: <a href="tel:1800858858">1800 858 858</a></p>
      <p>Lifeline: <a href="tel:131114">13 11 14</a></p>
    </div>

    <h2>Day 0 starts now.</h2>
    <p>${data.commitmentDaysRemaining} days left on commitment. Keep going.</p>
  `),
  text: (data) => `
RELAPSE RECORDED

Streak reset. Previous: ${data.lastStreak} days.

WHAT HAPPENED:
Date: ${data.relapseDate}
${data.triggers.length > 0 ? `Triggers: ${data.triggers.join(', ')}` : ''}
${data.voiceMemo ? 'Voice memo: Recorded' : 'Voice memo: None'}

FACTS:
- Relapses happen. This is data, not failure.
- You had ${data.lastStreak} clean days. That's real progress.
- Average: 3-4 relapses before sustained recovery.
- Guardian notified (support, not judgment).

${data.voiceMemo ? `
WHAT YOU LEARNED:
"${data.voiceMemoTranscript}"
Listen to this before your next high-risk moment.
` : ''}

PATTERN ANALYSIS:
${data.patternAnalysis.join('\n')}

ADJUSTMENTS MADE:
- High-risk alerts for: ${data.identifiedRisks.join(', ')}
- Guardian check-ins: next ${data.scheduledCheckins} days
${data.allowanceAdjusted ? `- Allowance reduced to $${data.newAllowance}` : ''}

CRISIS SUPPORT:
Gambling Help: 1800 858 858
Lifeline: 13 11 14

Day 0 starts now.
${data.commitmentDaysRemaining} days left on commitment.
  `,
  variables: ['lastStreak', 'relapseDate', 'triggers', 'voiceMemo', 'voiceMemoTranscript', 'patternAnalysis', 'identifiedRisks', 'scheduledCheckins', 'allowanceAdjusted', 'newAllowance', 'commitmentDaysRemaining']
};

/**
 * Milestone email
 */
const MILESTONE_REACHED = {
  subject: (data) => `${data.days} days clean`,
  html: (data) => baseLayout(`
    <h2>${data.days} Days Clean</h2>

    <div class="success">
      <strong>${data.days} days</strong>
      <p>That's ${data.weeks} weeks. ${data.months > 0 ? `${data.months} month${data.months > 1 ? 's' : ''}.` : ''}</p>
    </div>

    <div class="stat-box">
      <strong>$${data.savedTotal}</strong>
      <span>Total saved</span>
    </div>

    <div class="stat-box">
      <strong>$${data.projectedYearly}</strong>
      <span>Projected yearly savings if you keep going</span>
    </div>

    <h2>What you've achieved:</h2>
    <ul>
      <li>Interventions completed: ${data.interventionsCompleted}</li>
      <li>Triggers successfully avoided: ${data.triggersAvoided}</li>
      <li>Guardian support messages: ${data.guardianSupport}</li>
    </ul>

    ${data.comparisons.length > 0 ? `
      <h2>You're not alone:</h2>
      <ul>
        ${data.comparisons.map(c => `<li>${c}</li>`).join('')}
      </ul>
    ` : ''}

    <p>${data.commitmentDaysRemaining} days remaining on commitment.</p>

    <p>This is real progress. Keep going.</p>
  `),
  text: (data) => `
${data.days} DAYS CLEAN

${data.days} days = ${data.weeks} weeks${data.months > 0 ? ` = ${data.months} month${data.months > 1 ? 's' : ''}` : ''}

$${data.savedTotal} saved
$${data.projectedYearly} projected yearly if you keep going

WHAT YOU'VE ACHIEVED:
- Interventions completed: ${data.interventionsCompleted}
- Triggers avoided: ${data.triggersAvoided}
- Guardian support: ${data.guardianSupport} messages

${data.comparisons.length > 0 ? `
YOU'RE NOT ALONE:
${data.comparisons.join('\n')}
` : ''}

${data.commitmentDaysRemaining} days remaining on commitment.

This is real progress. Keep going.
  `,
  variables: ['days', 'weeks', 'months', 'savedTotal', 'projectedYearly', 'interventionsCompleted', 'triggersAvoided', 'guardianSupport', 'comparisons', 'commitmentDaysRemaining']
};

/**
 * Get template
 */
function getTemplate(templateId) {
  const templates = {
    WELCOME_01_LOCKED_IN,
    WELCOME_02_DAY_3,
    WELCOME_03_WEEK_1,
    WEEKLY_REPORT,
    RELAPSE_RESPONSE,
    MILESTONE_REACHED
  };

  if (!templates[templateId]) {
    throw new Error(`Email template not found: ${templateId}`);
  }

  return templates[templateId];
}

/**
 * Render email
 */
function renderEmail(templateId, data) {
  const template = getTemplate(templateId);

  // Validate variables
  const missingVars = template.variables.filter(v => !(v in data));
  if (missingVars.length > 0) {
    throw new Error(`Missing variables: ${missingVars.join(', ')}`);
  }

  // Add unsubscribe URL to data if not present
  if (!data.unsubscribe_url) {
    data.unsubscribe_url = process.env.APP_URL + '/preferences/unsubscribe';
  }

  const subject = typeof template.subject === 'function'
    ? template.subject(data)
    : template.subject;

  return {
    subject,
    html: template.html(data),
    text: template.text(data)
  };
}

module.exports = {
  WELCOME_01_LOCKED_IN,
  WELCOME_02_DAY_3,
  WELCOME_03_WEEK_1,
  WEEKLY_REPORT,
  RELAPSE_RESPONSE,
  MILESTONE_REACHED,
  getTemplate,
  renderEmail
};
