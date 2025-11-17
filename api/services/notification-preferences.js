/**
 * Notification Preferences Service
 *
 * Manages user notification preferences
 * Some notifications CANNOT be disabled (mandatory for system functionality)
 */

/**
 * Mandatory notifications that CANNOT be disabled
 */
const MANDATORY_NOTIFICATIONS = [
  'ai_intervention',
  'intervention_required',
  'guardian_alert',
  'guardian_emergency',
  'emergency_protocol',
  'payday_confirmation',
  'commitment_started',
  'commitment_ending',
  'system_auth'
];

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES = {
  sms: {
    daily_checkin: true,
    weekly_summary: true,
    high_risk_warnings: true,
    milestones: true,
    guardian_messages: true,
    // Mandatory (always true)
    intervention_required: true,
    payday_confirmation: true,
    emergency: true
  },
  email: {
    daily_checkin: false, // Usually disabled by default (prefer SMS)
    weekly_reports: true,
    high_risk_warnings: false, // SMS preferred for time-sensitive
    milestones: true,
    relapse_response: true,
    // Mandatory (always true)
    welcome_series: true,
    commitment_updates: true
  },
  push: {
    daily_checkin: true,
    interventions: true,
    high_risk_warnings: true,
    guardian_messages: true,
    milestones: true
  }
};

/**
 * Get user preferences
 */
async function getPreferences(userId, supabaseClient) {
  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Merge with defaults
    return mergeWithDefaults(user?.notification_preferences);
  } catch (error) {
    console.error('Error getting preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences
 */
async function updatePreferences(userId, preferences, supabaseClient) {
  try {
    // Ensure mandatory notifications remain enabled
    const sanitized = sanitizePreferences(preferences);

    const { data, error } = await supabaseClient
      .from('users')
      .update({
        notification_preferences: sanitized,
        preferences_updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return sanitized;
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
}

/**
 * Check if a notification is allowed
 */
function checkPreferences(preferences, channel, category) {
  const prefs = mergeWithDefaults(preferences);

  // Always allow mandatory notifications
  if (MANDATORY_NOTIFICATIONS.includes(category)) {
    return true;
  }

  // Check channel-specific preference
  if (prefs[channel] && category in prefs[channel]) {
    return prefs[channel][category];
  }

  // Default to true if not specified
  return true;
}

/**
 * Sanitize preferences (ensure mandatory notifications stay enabled)
 */
function sanitizePreferences(preferences) {
  const sanitized = { ...preferences };

  // Ensure SMS mandatory notifications
  if (!sanitized.sms) sanitized.sms = {};
  sanitized.sms.intervention_required = true;
  sanitized.sms.payday_confirmation = true;
  sanitized.sms.emergency = true;

  // Ensure email mandatory notifications
  if (!sanitized.email) sanitized.email = {};
  sanitized.email.welcome_series = true;
  sanitized.email.commitment_updates = true;

  return sanitized;
}

/**
 * Merge user preferences with defaults
 */
function mergeWithDefaults(userPreferences) {
  if (!userPreferences) {
    return DEFAULT_PREFERENCES;
  }

  return {
    sms: {
      ...DEFAULT_PREFERENCES.sms,
      ...userPreferences.sms
    },
    email: {
      ...DEFAULT_PREFERENCES.email,
      ...userPreferences.email
    },
    push: {
      ...DEFAULT_PREFERENCES.push,
      ...userPreferences.push
    }
  };
}

/**
 * Get preference categories that can be controlled
 */
function getControllableCategories() {
  return {
    sms: [
      { id: 'daily_checkin', name: 'Daily check-in messages', default: true },
      { id: 'weekly_summary', name: 'Weekly summary', default: true },
      { id: 'high_risk_warnings', name: 'High-risk warnings', default: true },
      { id: 'milestones', name: 'Milestone achievements', default: true },
      { id: 'guardian_messages', name: 'Messages from guardian', default: true }
    ],
    email: [
      { id: 'daily_checkin', name: 'Daily check-in emails', default: false },
      { id: 'weekly_reports', name: 'Weekly progress reports', default: true },
      { id: 'high_risk_warnings', name: 'High-risk period warnings', default: false },
      { id: 'milestones', name: 'Milestone celebrations', default: true },
      { id: 'relapse_response', name: 'Relapse support emails', default: true }
    ],
    push: [
      { id: 'daily_checkin', name: 'Daily check-in notifications', default: true },
      { id: 'interventions', name: 'Intervention reminders', default: true },
      { id: 'high_risk_warnings', name: 'High-risk warnings', default: true },
      { id: 'guardian_messages', name: 'Guardian messages', default: true },
      { id: 'milestones', name: 'Milestones', default: true }
    ]
  };
}

/**
 * Get mandatory categories (for display purposes)
 */
function getMandatoryCategories() {
  return {
    sms: [
      { id: 'intervention_required', name: 'AI intervention requirements', reason: 'Core functionality' },
      { id: 'payday_confirmation', name: 'Payday money vault confirmations', reason: 'Financial protection' },
      { id: 'emergency', name: 'Emergency protocol notifications', reason: 'Safety' }
    ],
    email: [
      { id: 'welcome_series', name: 'Welcome email series', reason: 'Setup guidance' },
      { id: 'commitment_updates', name: 'Commitment status updates', reason: 'Core functionality' }
    ]
  };
}

/**
 * Unsubscribe from all optional notifications
 */
async function unsubscribeAll(userId, supabaseClient) {
  try {
    const preferences = {
      sms: {
        daily_checkin: false,
        weekly_summary: false,
        high_risk_warnings: false,
        milestones: false,
        guardian_messages: false,
        // Mandatory remain true
        intervention_required: true,
        payday_confirmation: true,
        emergency: true
      },
      email: {
        daily_checkin: false,
        weekly_reports: false,
        high_risk_warnings: false,
        milestones: false,
        relapse_response: false,
        // Mandatory remain true
        welcome_series: true,
        commitment_updates: true
      },
      push: {
        daily_checkin: false,
        interventions: true, // Keep interventions on
        high_risk_warnings: false,
        guardian_messages: false,
        milestones: false
      }
    };

    await updatePreferences(userId, preferences, supabaseClient);

    return {
      success: true,
      message: 'Unsubscribed from all optional notifications. Mandatory notifications remain active.'
    };
  } catch (error) {
    console.error('Error unsubscribing:', error);
    throw error;
  }
}

/**
 * Re-subscribe to defaults
 */
async function resubscribeDefaults(userId, supabaseClient) {
  try {
    await updatePreferences(userId, DEFAULT_PREFERENCES, supabaseClient);

    return {
      success: true,
      message: 'Re-subscribed to default notifications.'
    };
  } catch (error) {
    console.error('Error resubscribing:', error);
    throw error;
  }
}

module.exports = {
  MANDATORY_NOTIFICATIONS,
  DEFAULT_PREFERENCES,
  getPreferences,
  updatePreferences,
  checkPreferences,
  sanitizePreferences,
  mergeWithDefaults,
  getControllableCategories,
  getMandatoryCategories,
  unsubscribeAll,
  resubscribeDefaults
};
