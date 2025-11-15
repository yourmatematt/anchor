/**
 * Creator Video Screen
 * Matt's face talking directly - showing actual screenshots, hard truths
 * Cannot skip for minimum 60 seconds
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Colors, Typography, Spacing, Components } from '../../theme';

const { width } = Dimensions.get('window');
const MINIMUM_WATCH_TIME = 60; // 60 seconds minimum

export default function CreatorVideoScreen({ navigation }) {
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const videoRef = useRef(null);

  const handlePlaybackStatusUpdate = (status) => {
    if (status.isLoaded && status.positionMillis) {
      const seconds = Math.floor(status.positionMillis / 1000);
      setWatchedSeconds(seconds);

      if (seconds >= MINIMUM_WATCH_TIME && !canContinue) {
        setCanContinue(true);
      }
    }
  };

  const handleYesThatsMme = () => {
    navigation.navigate('CommitmentPeriod');
  };

  const handleImDifferent = () => {
    // In a real app, might show a message like:
    // "You think you're different. That's what we all thought."
    // For now, still proceed to next screen
    navigation.navigate('CommitmentPeriod');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Video player - full width */}
        <View style={styles.videoContainer}>
          {/* In production, this would be Matt's actual video */}
          {/* For MVP, showing placeholder */}
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>
              MATT'S VIDEO{'\n\n'}
              Showing actual screenshots:{'\n'}
              • $12 CoinSpot balance{'\n'}
              • $0 bank account{'\n'}
              • Desperate texts{'\n\n'}
              "I tried BetStop. Gamban.{'\n'}
              Self-exclusion.{'\n'}
              All had escape hatches."
            </Text>
          </View>

          {/* Real video implementation (uncomment in production) */}
          {/* <Video
            ref={videoRef}
            source={{ uri: 'https://anchor-app.com/videos/creator-story.mp4' }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            shouldPlay
          /> */}
        </View>

        {/* Watch timer */}
        <View style={styles.timerContainer}>
          {!canContinue ? (
            <Text style={styles.timerText}>
              Watch for {MINIMUM_WATCH_TIME - watchedSeconds} more seconds
            </Text>
          ) : (
            <Text style={[styles.timerText, { color: Colors.success }]}>
              ✓ Watched {watchedSeconds}s
            </Text>
          )}
        </View>

        {/* Question */}
        <Text style={styles.question}>Does this sound familiar?</Text>
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canContinue && styles.disabledButton,
          ]}
          onPress={handleYesThatsMme}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.primaryButtonText,
            !canContinue && styles.disabledButtonText,
          ]}>
            Yes, that's me
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            !canContinue && styles.disabledButton,
          ]}
          onPress={handleImDifferent}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.secondaryButtonText,
            !canContinue && styles.disabledButtonText,
          ]}>
            No, I'm different
          </Text>
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
    paddingTop: Spacing.xl,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  placeholderText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  timerContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  timerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  question: {
    ...Typography.h3,
    marginTop: Spacing.lg,
    textAlign: 'center',
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
  },
  secondaryButton: {
    ...Components.buttonSecondary,
  },
  secondaryButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
    borderColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
