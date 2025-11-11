/**
 * Voice Service
 *
 * Handles speech-to-text (user input) and text-to-speech (AI output)
 * Uses React Native Voice for STT and Expo Speech for TTS
 */

import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.transcription = '';

    // Bind event handlers
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
  }

  /**
   * Start listening for speech input
   */
  async startListening(onResult, onError) {
    try {
      this.onResultCallback = onResult;
      this.onErrorCallback = onError;

      await Voice.start('en-AU'); // Australian English
      this.isListening = true;

      console.log('Voice recognition started');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Stop listening for speech input
   */
  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;

      console.log('Voice recognition stopped');
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  /**
   * Cancel voice recognition
   */
  async cancelListening() {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (error) {
      console.error('Error cancelling voice recognition:', error);
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text, options = {}) {
    try {
      const defaultOptions = {
        language: 'en-AU', // Australian accent
        pitch: 1.0,
        rate: 0.9, // Slightly slower for clarity
        voice: options.voice || undefined // Can specify a specific voice
      };

      await Speech.speak(text, {
        ...defaultOptions,
        ...options
      });

      console.log('Speaking:', text);
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  }

  /**
   * Stop currently speaking text
   */
  async stopSpeaking() {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking() {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Error checking if speaking:', error);
      return false;
    }
  }

  // Event handlers
  onSpeechStart(e) {
    console.log('Speech started');
  }

  onSpeechEnd(e) {
    console.log('Speech ended');
    this.isListening = false;
  }

  onSpeechResults(e) {
    console.log('Speech results:', e.value);
    this.transcription = e.value[0];

    if (this.onResultCallback) {
      this.onResultCallback(this.transcription);
    }
  }

  onSpeechError(e) {
    console.error('Speech error:', e.error);
    this.isListening = false;

    if (this.onErrorCallback) {
      this.onErrorCallback(e.error);
    }
  }

  /**
   * Destroy the voice service (cleanup)
   */
  async destroy() {
    try {
      await Voice.destroy();
      this.isListening = false;
    } catch (error) {
      console.error('Error destroying voice service:', error);
    }
  }
}

// Export singleton instance
export default new VoiceService();
