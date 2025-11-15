/**
 * Welcome Screen - First screen of onboarding
 * "This is your last shot. Let's not fuck it up."
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  const handleReady = () => {
    navigation.navigate('CreatorVideo');
  };

  const handleNotReady = () => {
    // In production, this might exit the app or show a confirmation
    // For now, just log
    console.log('User not ready yet');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Large heading */}
        <Text style={styles.logo}>ANCHOR</Text>

        {/* Subheading - Direct, no bullshit */}
        <Text style={styles.heading}>
          This is your last shot.{'\n'}
          Let's not fuck it up.
        </Text>

        {/* Brief explanation */}
        <Text style={styles.body}>
          Built by someone who lost $118k over 20 years. This isn't therapy. This is a lock.
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReady}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>I'm Ready</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleNotReady}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Not Ready Yet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  logo: {
    ...Typography.h1,
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: Spacing.xl,
    letterSpacing: 2,
  },
  heading: {
    ...Typography.h2,
    fontSize: 32,
    marginBottom: Spacing.xl,
    lineHeight: 40,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  primaryButton: {
    ...Components.buttonPrimary,
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    ...Typography.button,
    fontSize: 19,
  },
  secondaryButton: {
    ...Components.buttonSecondary,
  },
  secondaryButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
});
