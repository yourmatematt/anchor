/**
 * SMS Templates for Anchor
 *
 * Australian tone, direct, no fluff
 * Facts over feelings approach
 */

/**
 * Guardian Notifications
 */
const GUARDIAN_TEMPLATES = {
  PATTERN_DETECTED: {
    template: (data) =>
      `ANCHOR: ${data.userName} triggered ${data.pattern}. Day ${data.cleanStreak} clean. AI conversation started.`,
    variables: ['userName', 'pattern', 'cleanStreak'],
    category: 'guardian_alert',
    critical: false
  },

  RELAPSE_CONFIRMED: {
    template: (data) =>
      `ANCHOR: Gambling detected. Streak reset. ${data.userName} needs support, not judgment.`,
    variables: ['userName'],
    category: 'guardian_alert',
    critical: true
  },

  MILESTONE_REACHED: {
    template: (data) =>
      `ANCHOR: ${data.userName} hit ${data.days} days clean. Acknowledge it (no celebration).`,
    variables: ['userName', 'days'],
    category: 'guardian_milestone',
    critical: false
  },

  EMERGENCY_TRIGGERED: {
    template: (data) =>
      `URGENT: ${data.userName} triggered emergency protocol. Check in immediately.`,
    variables: ['userName'],
    category: 'guardian_emergency',
    critical: true
  },

  HIGH_RISK_ALERT: {
    template: (data) =>
      `ANCHOR: ${data.userName} approaching high-risk period (${data.trigger}). Be available.`,
    variables: ['userName', 'trigger'],
    category: 'guardian_alert',
    critical: false
  },

  INTERVENTION_COMPLETED: {
    template: (data) =>
      `ANCHOR: ${data.userName} completed voice memo. Listen when you can.`,
    variables: ['userName'],
    category: 'guardian_update',
    critical: false
  },

  COMMITMENT_EXPIRING: {
    template: (data) =>
      `ANCHOR: ${data.userName}'s commitment expires in ${data.daysLeft} days. Discuss renewal.`,
    variables: ['userName', 'daysLeft'],
    category: 'guardian_update',
    critical: false
  },

  CLEAN_WEEK: {
    template: (data) =>
      `ANCHOR: ${data.userName} - full week clean. $${data.saved} saved. Progress confirmed.`,
    variables: ['userName', 'saved'],
    category: 'guardian_milestone',
    critical: false
  }
};

/**
 * User Notifications
 */
const USER_TEMPLATES = {
  DAILY_CHECKIN: {
    template: (data) =>
      `Day ${data.cleanStreak} clean. $${data.savedTotal} saved. Stay strong.`,
    variables: ['cleanStreak', 'savedTotal'],
    category: 'user_checkin',
    critical: false
  },

  HIGH_RISK_WARNING: {
    template: (data) =>
      `It's ${data.day} ${data.time}. Your ${data.pattern} pattern. Make different choices.`,
    variables: ['day', 'time', 'pattern'],
    category: 'user_warning',
    critical: true
  },

  PAYDAY_REMINDER: {
    template: (data) =>
      `Payday detected. Money moved to vault. You have $${data.dailyAllowance} for today.`,
    variables: ['dailyAllowance'],
    category: 'user_payday',
    critical: true
  },

  INTERVENTION_REQUIRED: {
    template: () =>
      `Open Anchor app now. AI conversation required.`,
    variables: [],
    category: 'user_intervention',
    critical: true
  },

  ALLOWANCE_RESET: {
    template: (data) =>
      `New day. $${data.dailyAllowance} allowance reset. Day ${data.cleanStreak}.`,
    variables: ['dailyAllowance', 'cleanStreak'],
    category: 'user_checkin',
    critical: false
  },

  STREAK_MILESTONE: {
    template: (data) =>
      `${data.days} days clean. That's ${data.weeks} weeks. $${data.savedTotal} saved.`,
    variables: ['days', 'weeks', 'savedTotal'],
    category: 'user_milestone',
    critical: false
  },

  COMMITMENT_ENDING: {
    template: (data) =>
      `${data.daysLeft} days left on commitment. Total saved: $${data.savedTotal}.`,
    variables: ['daysLeft', 'savedTotal'],
    category: 'user_update',
    critical: false
  },

  RELAPSE_RESET: {
    template: (data) =>
      `Day 0. Last streak: ${data.lastStreak} days. Start again.`,
    variables: ['lastStreak'],
    category: 'user_relapse',
    critical: true
  },

  TRIGGER_APPROACHING: {
    template: (data) =>
      `${data.trigger} in ${data.hours} hours. Your guardian has been notified.`,
    variables: ['trigger', 'hours'],
    category: 'user_warning',
    critical: true
  },

  WEEKLY_SUMMARY: {
    template: (data) =>
      `Week ${data.weekNumber}: ${data.cleanDays}/7 clean. $${data.savedWeek} saved this week.`,
    variables: ['weekNumber', 'cleanDays', 'savedWeek'],
    category: 'user_report',
    critical: false
  },

  EMERGENCY_CONTACT: {
    template: () =>
      `Gambling Help 1800 858 858. Lifeline 13 11 14. Both 24/7.`,
    variables: [],
    category: 'user_emergency',
    critical: true
  },

  GUARDIAN_MESSAGE: {
    template: (data) =>
      `From ${data.guardianName}: ${data.message}`,
    variables: ['guardianName', 'message'],
    category: 'user_support',
    critical: false
  }
};

/**
 * System Notifications
 */
const SYSTEM_TEMPLATES = {
  COMMITMENT_STARTED: {
    template: (data) =>
      `Commitment locked. ${data.days} days. Guardian: ${data.guardianName}. Daily allowance: $${data.allowance}.`,
    variables: ['days', 'guardianName', 'allowance'],
    category: 'system_setup',
    critical: true
  },

  VERIFICATION_CODE: {
    template: (data) =>
      `ANCHOR verification code: ${data.code}. Valid for 10 minutes.`,
    variables: ['code'],
    category: 'system_auth',
    critical: true
  },

  WHITELIST_UPDATED: {
    template: (data) =>
      `Whitelist updated. ${data.payeeName} ${data.action}. Total whitelisted: ${data.total}.`,
    variables: ['payeeName', 'action', 'total'],
    category: 'system_update',
    critical: false
  },

  GUARDIAN_ADDED: {
    template: (data) =>
      `${data.guardianName} is now your guardian. They can see patterns (not amounts).`,
    variables: ['guardianName'],
    category: 'system_setup',
    critical: true
  },

  IMPORT_COMPLETE: {
    template: (data) =>
      `Import complete. ${data.total} transactions analysed. ${data.gamblingCount} gambling patterns found.`,
    variables: ['total', 'gamblingCount'],
    category: 'system_update',
    critical: false
  }
};

/**
 * Get template by ID
 */
function getTemplate(category, templateId) {
  const categories = {
    guardian: GUARDIAN_TEMPLATES,
    user: USER_TEMPLATES,
    system: SYSTEM_TEMPLATES
  };

  const templates = categories[category];
  if (!templates || !templates[templateId]) {
    throw new Error(`Template not found: ${category}.${templateId}`);
  }

  return templates[templateId];
}

/**
 * Render SMS message
 */
function renderSMS(category, templateId, data) {
  const template = getTemplate(category, templateId);

  // Validate required variables
  const missingVars = template.variables.filter(v => !(v in data));
  if (missingVars.length > 0) {
    throw new Error(`Missing variables: ${missingVars.join(', ')}`);
  }

  // Render template
  const message = template.template(data);

  // Validate length (SMS limit is 160 chars for single, 1600 for concatenated)
  if (message.length > 160) {
    console.warn(`SMS message exceeds 160 chars (${message.length}). Will be sent as concatenated.`);
  }

  return {
    message,
    category: template.category,
    critical: template.critical,
    length: message.length
  };
}

/**
 * Get all templates for documentation
 */
function getAllTemplates() {
  return {
    guardian: GUARDIAN_TEMPLATES,
    user: USER_TEMPLATES,
    system: SYSTEM_TEMPLATES
  };
}

module.exports = {
  GUARDIAN_TEMPLATES,
  USER_TEMPLATES,
  SYSTEM_TEMPLATES,
  getTemplate,
  renderSMS,
  getAllTemplates
};
