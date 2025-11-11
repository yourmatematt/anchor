/**
 * Anchor - Financial Accountability System
 * Main Application Entry Point
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, Text, StyleSheet } from 'react-native';

// Screens
import HomeScreen from './screens/HomeScreen';
import AlertScreen from './screens/AlertScreen';
import WhitelistScreen from './screens/WhitelistScreen';

// Services
import { registerForPushNotifications, addNotificationResponseListener } from './services/notifications';
import { tokenService } from './services/upBank';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Check if Up Bank token exists
      const tokenExists = await tokenService.hasToken();
      setHasToken(tokenExists);

      // Register for push notifications
      try {
        await registerForPushNotifications();
      } catch (error) {
        console.warn('Failed to register for push notifications:', error);
      }

      // Set up notification listeners
      const notificationSubscription = addNotificationResponseListener(response => {
        const data = response.notification.request.content.data;

        if (data.type === 'NON_WHITELISTED_TRANSACTION' && data.transactionId) {
          // Navigate to alert screen
          // This would need proper navigation ref setup for deep linking
          console.log('Navigate to alert for transaction:', data.transactionId);
        }
      });

      setIsReady(true);

      return () => {
        notificationSubscription.remove();
      };
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize app');
      setIsReady(true);
    }
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Anchor</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000' },
            animation: 'slide_from_bottom'
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Alert"
            component={AlertScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Prevent swipe to dismiss
            }}
          />
          <Stack.Screen name="Whitelist" component={WhitelistScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#8e8e93',
  },
});
