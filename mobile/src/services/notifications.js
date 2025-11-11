/**
 * Notifications Service
 *
 * Handles push notifications and alerts
 * Critical for real-time intervention when non-whitelisted transactions occur
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX
  }),
});

/**
 * Register for push notifications
 */
export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Transaction Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'alert-sound.wav',
      enableVibrate: true,
      showBadge: true
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Failed to get push notification permissions');
    }

    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId
    })).data;
  } else {
    console.warn('Must use physical device for push notifications');
  }

  return token;
}

/**
 * Send local notification for non-whitelisted transaction
 */
export async function sendTransactionAlert(transaction) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ ANCHOR ALERT',
      body: `You sent $${Math.abs(transaction.amount)} to ${transaction.payee_name}`,
      data: {
        transactionId: transaction.transaction_id,
        type: 'NON_WHITELISTED_TRANSACTION'
      },
      sound: 'alert-sound.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 250, 250, 250],
      badge: 1
    },
    trigger: null, // Send immediately
  });
}

/**
 * Listen for notification responses
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Listen for foreground notifications
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Schedule recurring check for pending interventions
 * Polls database every 5 minutes for transactions that need voice memos
 */
export async function scheduleInterventionCheck() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Pending Transaction',
      body: 'You have a transaction that needs a voice memo',
      data: { type: 'INTERVENTION_REMINDER' },
      sound: 'alert-sound.wav'
    },
    trigger: {
      seconds: 300, // 5 minutes
      repeats: true
    }
  });
}

export default {
  registerForPushNotifications,
  sendTransactionAlert,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  clearAllNotifications,
  scheduleInterventionCheck
};
