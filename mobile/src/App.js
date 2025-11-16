/**
 * Anchor - Financial Accountability System
 * Main Application Entry Point
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, Text, StyleSheet } from 'react-native';

// Onboarding Screens
import WelcomeScreen from './screens/onboarding/WelcomeScreen';
import CreatorVideoScreen from './screens/onboarding/CreatorVideoScreen';
import CommitmentPeriodScreen from './screens/onboarding/CommitmentPeriodScreen';
import GuardianSetupScreen from './screens/onboarding/GuardianSetupScreen';
import GuardianInviteSentScreen from './screens/onboarding/GuardianInviteSentScreen';
import AIInterviewIntroScreen from './screens/onboarding/AIInterviewIntroScreen';
import AIInterviewScreen from './screens/onboarding/AIInterviewScreen';
import UpBankConnectionScreen from './screens/onboarding/UpBankConnectionScreen';
import AccountVerificationScreen from './screens/onboarding/AccountVerificationScreen';
import WhitelistConfigurationScreen from './screens/onboarding/WhitelistConfigurationScreen';
import FinalCommitmentScreen from './screens/onboarding/FinalCommitmentScreen';

// Main App Screens
import HomeScreen from './screens/HomeScreen';
import AlertScreen from './screens/AlertScreen';
import AIConversationScreen from './screens/AIConversationScreen';
import ConversationSummaryScreen from './screens/ConversationSummaryScreen';

// Payment Request Flow
import PaymentRequestScreen from './screens/PaymentRequestScreen';
import PaymentEvaluationScreen from './screens/PaymentEvaluationScreen';
import PaymentApprovedScreen from './screens/PaymentApprovedScreen';
import PaymentDeniedScreen from './screens/PaymentDeniedScreen';

// Secondary Screens
import BillsScreen from './screens/BillsScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProfileScreen from './screens/ProfileScreen';
import WhitelistScreen from './screens/WhitelistScreen';

// Services
import { registerForPushNotifications, addNotificationResponseListener } from './services/notifications';
import { tokenService } from './services/upBank';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Check if Up Bank token exists
      const tokenExists = await tokenService.hasToken();
      setHasToken(tokenExists);

      // TODO: Check if onboarding is complete from Supabase
      // For now, we'll use the token as a proxy (if they have a token, they've onboarded)
      // In production: Check users table for onboarding_completed flag
      setIsOnboarded(tokenExists);

      // Register for push notifications (only if onboarded)
      if (tokenExists) {
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

        // Clean up listener on unmount
        return () => {
          notificationSubscription.remove();
        };
      }

      setIsReady(true);
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
          initialRouteName={isOnboarded ? 'Home' : 'Welcome'}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000' },
            animation: 'slide_from_right'
          }}
        >
          {/* ONBOARDING FLOW */}
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="CreatorVideo"
            component={CreatorVideoScreen}
          />
          <Stack.Screen
            name="CommitmentPeriod"
            component={CommitmentPeriodScreen}
          />
          <Stack.Screen
            name="GuardianSetup"
            component={GuardianSetupScreen}
          />
          <Stack.Screen
            name="GuardianInviteSent"
            component={GuardianInviteSentScreen}
          />
          <Stack.Screen
            name="AIInterviewIntro"
            component={AIInterviewIntroScreen}
          />
          <Stack.Screen
            name="AIInterview"
            component={AIInterviewScreen}
          />
          <Stack.Screen
            name="UpBankConnection"
            component={UpBankConnectionScreen}
          />
          <Stack.Screen
            name="AccountVerification"
            component={AccountVerificationScreen}
          />
          <Stack.Screen
            name="WhitelistConfiguration"
            component={WhitelistConfigurationScreen}
          />
          <Stack.Screen
            name="FinalCommitment"
            component={FinalCommitmentScreen}
          />

          {/* MAIN APP SCREENS */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Bills"
            component={BillsScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Progress"
            component={ProgressScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Whitelist"
            component={WhitelistScreen}
          />

          {/* PAYMENT REQUEST FLOW */}
          <Stack.Screen
            name="PaymentRequest"
            component={PaymentRequestScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="PaymentEvaluation"
            component={PaymentEvaluationScreen}
            options={{
              gestureEnabled: false, // Cannot go back during evaluation
            }}
          />
          <Stack.Screen
            name="PaymentApproved"
            component={PaymentApprovedScreen}
            options={{
              gestureEnabled: false,
              animation: 'fade'
            }}
          />
          <Stack.Screen
            name="PaymentDenied"
            component={PaymentDeniedScreen}
            options={{
              gestureEnabled: false,
              animation: 'fade'
            }}
          />

          {/* AI CONVERSATION & ALERTS */}
          <Stack.Screen
            name="Alert"
            component={AlertScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Prevent swipe to dismiss
              animation: 'fade'
            }}
          />
          <Stack.Screen
            name="AIConversation"
            component={AIConversationScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Cannot dismiss
              animation: 'slide_from_bottom'
            }}
          />
          <Stack.Screen
            name="ConversationSummary"
            component={ConversationSummaryScreen}
            options={{
              gestureEnabled: false,
              animation: 'fade'
            }}
          />
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
