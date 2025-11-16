/**
 * AI Interview Introduction Screen
 * Explains the 10-question interview process
 * Voice preferred (more honest)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

export default function AIInterviewIntroScreen({ navigation, route }) {
  const { commitmentMonths } = route.params || {};

  const handleStartVoice = () => {
    navigation.navigate('AIInterview', {
      commitmentMonths,
      useVoice: true,
      currentQuestion: 1,
    });
  };

  const handleTypeInstead = () => {
    navigation.navigate('AIInterview', {
      commitmentMonths,
      useVoice: false,
      currentQuestion: 1,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>NOW LET'S GET REAL</Text>

        {/* Explanation */}
        <Text style={styles.body}>
          I'm going to ask 10 questions.{'\n\n'}
          Voice is best (more honest), but you can type.{'\n\n'}
          No bullshit answers. I can tell.
        </Text>

        {/* Microphone Icon */}
        <View style={styles.microphoneContainer}>
          <View style={styles.microphoneCircle}>
            <Ionicons name="mic" size={80} color={Colors.accent} />
          </View>
        </View>

        {/* What to Expect */}
        <View style={styles.expectCard}>
          <Text style={styles.expectTitle}>What to expect:</Text>
          <View style={styles.expectList}>
            <View style={styles.expectItem}>
              <Text style={styles.expectBullet}>•</Text>
              <Text style={styles.expectText}>10 questions about your gambling</Text>
            </View>
            <View style={styles.expectItem}>
              <Text style={styles.expectBullet}>•</Text>
              <Text style={styles.expectText}>Voice recording or text answers</Text>
            </View>
            <View style={styles.expectItem}>
              <Text style={styles.expectBullet}>•</Text>
              <Text style={styles.expectText}>AI responds after each answer</Text>
            </View>
            <View style={styles.expectItem}>
              <Text style={styles.expectBullet}>•</Text>
              <Text style={styles.expectText}>Takes about 5-10 minutes</Text>
            </View>
            <View style={styles.expectItem}>
              <Text style={styles.expectBullet}>•</Text>
              <Text style={styles.expectText}>Cannot skip questions</Text>
            </View>
          </View>
        </View>

        {/* Why Voice */}
        <View style={styles.whyVoiceCard}>
          <Ionicons name="information-circle" size={24} color={Colors.warning} />
          <Text style={styles.whyVoiceText}>
            Voice is preferred because it's harder to lie when you're speaking out loud.
            Your answers help the AI understand your patterns.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleStartVoice}
          activeOpacity={0.8}
        >
          <Ionicons name="mic" size={24} color={Colors.textPrimary} />
          <Text style={styles.voiceButtonText}>Start Voice Interview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.typeButton}
          onPress={handleTypeInstead}
          activeOpacity={0.8}
        >
          <Text style={styles.typeButtonText}>I'll Type Instead</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heading: {
    ...Typography.h1,
    marginBottom: Spacing.xl,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginBottom: Spacing.xxl,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  microphoneCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accentBackground,
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expectCard: {
    ...Components.card,
    marginBottom: Spacing.xl,
  },
  expectTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  expectList: {
    gap: Spacing.sm,
  },
  expectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expectBullet: {
    ...Typography.body,
    color: Colors.accent,
    marginRight: Spacing.sm,
    width: 20,
  },
  expectText: {
    ...Typography.body,
    flex: 1,
  },
  whyVoiceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.warningBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  whyVoiceText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  voiceButton: {
    ...Components.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  voiceButtonText: {
    ...Typography.button,
  },
  typeButton: {
    ...Components.buttonSecondary,
  },
  typeButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
});
