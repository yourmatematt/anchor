/**
 * Voice Recorder Component
 *
 * Handles voice memo recording for transaction accountability
 * Critical component for the intervention system
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export default function VoiceRecorder({ onRecordingComplete }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);

  async function startRecording() {
    try {
      console.log('Requesting permissions..');
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required to record voice memos');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      setRecordingUri(uri);
      setRecording(null);

      // In a real app, you would:
      // 1. Upload audio file to Supabase Storage
      // 2. Get public URL
      // 3. Optionally transcribe using a service like AssemblyAI or Whisper
      // For MVP, we'll just use a placeholder transcript

      // Placeholder: In production, integrate with speech-to-text service
      const placeholderTranscript = "Voice memo recorded at " + new Date().toLocaleString();

      if (onRecordingComplete) {
        onRecordingComplete(uri, placeholderTranscript);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record why you're making this transaction</Text>
      <Text style={styles.subtitle}>This helps you stay accountable</Text>

      {!isRecording && !recordingUri && (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={startRecording}
        >
          <View style={styles.recordButtonInner} />
          <Text style={styles.recordButtonText}>Tap to Record</Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <TouchableOpacity
          style={[styles.recordButton, styles.recordingButton]}
          onPress={stopRecording}
        >
          <View style={styles.stopButton} />
          <Text style={styles.recordButtonText}>Tap to Stop</Text>
        </TouchableOpacity>
      )}

      {recordingUri && (
        <View style={styles.completedContainer}>
          <Text style={styles.completedText}>✓ Recording Complete</Text>
          <Text style={styles.completedSubtext}>Thank you for your accountability</Text>
        </View>
      )}

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.pulse} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#ff453a',
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff0000',
    marginBottom: 8,
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingIndicator: {
    marginTop: 20,
    alignItems: 'center',
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginBottom: 8,
  },
  recordingText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    alignItems: 'center',
    padding: 30,
  },
  completedText: {
    fontSize: 24,
    color: '#34c759',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#aaa',
  },
});
