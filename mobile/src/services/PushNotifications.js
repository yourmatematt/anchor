/**
 * Push Notifications Service
 * Expo Push Notifications for critical interventions
 * Critical notifications cannot be disabled
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import SecureStorage from './SecureStorage';

const PUSH_TOKEN_KEY = 'expo_push_token';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Notification categories
const CRITICAL_NOTIFICATIONS = [
  'AI_CONVERSATION_REQUIRED',
  'PATTERN_DETECTED',
  'GUARDIAN_EMERGENCY',
  'PAYDAY_LOAN_DETECTED',
];

const OPTIONAL_NOTIFICATIONS = [
  'DAILY_CHECK_IN',
  'WEEKLY_PROGRESS',
  'BILL_DUE',
];

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Initialize push notifications
   */
  async initialize() {
    try {
      // Register for push notifications
      const token = await this.registerForPushNotifications();

      if (token) {
        this.expoPushToken = token;
        await SecureStorage.set(PUSH_TOKEN_KEY, token);

        // Send token to backend
        await this.sendTokenToBackend(token);
      }

      // Set up notification listeners
      this.setupListeners();

      return token;
    } catch (error) {
      console.error('Push notification initialization error:', error);
      return null;
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;

      // Android-specific channel setup
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels() {
    // Critical channel (cannot be muted)
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      bypassDnd: true, // Bypass Do Not Disturb
    });

    // Standard channel
    await Notifications.setNotificationChannelAsync('standard', {
      name: 'Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFFFFF',
      sound: 'default',
    });
  }

  /**
   * Set up notification listeners
   */
  setupListeners() {
    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // User tapped notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification tap
   */
  handleNotificationResponse(response) {
    const { notification } = response;
    const { data } = notification.request.content;

    // Navigate based on notification type
    if (data.type === 'AI_CONVERSATION_REQUIRED') {
      // Navigate to AI conversation screen
      // navigation.navigate('AIConversation', { conversationId: data.conversation_id });
    } else if (data.type === 'PATTERN_DETECTED') {
      // Navigate to pattern alert screen
      // navigation.navigate('Alert', { patternId: data.pattern_id });
    } else if (data.type === 'GUARDIAN_EMERGENCY') {
      // Navigate to emergency check-in
      // navigation.navigate('EmergencyCheckIn', { triggerId: data.trigger_id });
    }
  }

  /**
   * Send push token to backend
   */
  async sendTokenToBackend(token) {
    try {
      const API_URL = 'https://api.anchor.app'; // TODO: Use env variable

      await fetch(`${API_URL}/api/user/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecureStorage.get('user_token')}`,
        },
        body: JSON.stringify({
          push_token: token,
          platform: Platform.OS,
        }),
      });
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleNotification(title, body, data, trigger = null) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null, // null = send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Send critical notification (cannot be disabled)
   */
  async sendCriticalNotification(type, title, body, data = {}) {
    if (!CRITICAL_NOTIFICATIONS.includes(type)) {
      throw new Error(`Invalid critical notification type: ${type}`);
    }

    return await this.scheduleNotification(title, body, {
      ...data,
      type,
      critical: true,
      channel: Platform.OS === 'android' ? 'critical' : undefined,
    });
  }

  /**
   * Send optional notification (user can disable)
   */
  async sendOptionalNotification(type, title, body, data = {}) {
    if (!OPTIONAL_NOTIFICATIONS.includes(type)) {
      throw new Error(`Invalid optional notification type: ${type}`);
    }

    // Check if user has disabled this type
    const settings = await this.getNotificationSettings();
    if (!settings[type]) {
      console.log(`Notification type ${type} is disabled by user`);
      return null;
    }

    return await this.scheduleNotification(title, body, {
      ...data,
      type,
      critical: false,
      channel: Platform.OS === 'android' ? 'standard' : undefined,
    });
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings() {
    const settingsJson = await SecureStorage.get(NOTIFICATION_SETTINGS_KEY);

    if (settingsJson) {
      return JSON.parse(settingsJson);
    }

    // Default: all optional notifications enabled
    return {
      DAILY_CHECK_IN: true,
      WEEKLY_PROGRESS: true,
      BILL_DUE: true,
    };
  }

  /**
   * Update notification settings
   * (Only for optional notifications)
   */
  async updateNotificationSettings(type, enabled) {
    if (CRITICAL_NOTIFICATIONS.includes(type)) {
      throw new Error('Cannot disable critical notifications');
    }

    const settings = await this.getNotificationSettings();
    settings[type] = enabled;

    await SecureStorage.set(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge count
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Singleton instance
const PushNotifications = new PushNotificationService();

export default PushNotifications;

// Notification message templates
export const NotificationMessages = {
  PAYDAY_LOAN_DETECTED: {
    title: '🚨 Payday Loan Detected',
    body: 'Payday loan transaction detected. Open app now.',
  },
  PATTERN_DETECTED: {
    title: '⚠️ Gambling Pattern Detected',
    body: 'Suspicious activity detected. Check in required.',
  },
  AI_CONVERSATION_REQUIRED: {
    title: '💬 AI Check-In Required',
    body: 'You need to complete an AI conversation. Open now.',
  },
  GUARDIAN_EMERGENCY: {
    title: '📍 Guardian Emergency Check',
    body: 'Your guardian triggered an emergency check-in. Respond now.',
  },
  TRIGGER_WARNING: (trigger, time) => ({
    title: `⚠️ ${trigger} - Your Risk Time`,
    body: `${trigger} at ${time}. Stay strong.`,
  }),
  DAILY_CHECK_IN: {
    title: '✓ Daily Check-In',
    body: 'How are you doing today? Take a moment to check in.',
  },
  WEEKLY_PROGRESS: (days, saved) => ({
    title: '📊 Weekly Progress',
    body: `${days} days clean. $${saved.toFixed(2)} saved this week.`,
  }),
  BILL_DUE: (billName, amount, days) => ({
    title: '💰 Bill Due Soon',
    body: `${billName} ($${amount.toFixed(2)}) due in ${days} day${days > 1 ? 's' : ''}.`,
  }),
};
