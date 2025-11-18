/**
 * Voice Assistant Service - Mobile
 *
 * Handles speech recognition, text-to-speech, and communication with backend.
 * Integrates with React Native Voice and Expo Speech APIs.
 */

import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class VoiceAssistantService {
  constructor() {
    this.isListening = false;
    this.conversationId = null;
    this.initializeVoice();
  }

  /**
   * Initialize voice recognition
   */
  initializeVoice() {
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
  }

  /**
   * Start listening
   */
  async startListening(callback) {
    this.resultsCallback = callback;

    try {
      await Voice.start('en-AU'); // Australian English
      this.isListening = true;
      return {success: true};
    } catch (error) {
      console.error('Start listening error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Stop listening
   */
  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;
      return {success: true};
    } catch (error) {
      console.error('Stop listening error:', error);
      return {success: false, error: error.message};
    }
  }

  /**
   * Cancel listening
   */
  async cancelListening() {
    try {
      await Voice.cancel();
      this.isListening = false;
      return {success: true};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  /**
   * Process voice input
   */
  async processInput(text, userId) {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          text,
          conversationId: this.conversationId
        })
      });

      const result = await response.json();

      // Update conversation ID
      if (result.conversationId) {
        this.conversationId = result.conversationId;
      }

      return result;
    } catch (error) {
      console.error('Process input error:', error);
      return {
        response: "Sorry, I couldn't process that right now.",
        error: true
      };
    }
  }

  /**
   * Speak response
   */
  async speak(text, options = {}) {
    const {rate = 0.9, pitch = 1.0, language = 'en-AU'} = options;

    return new Promise((resolve) => {
      Speech.speak(text, {
        language,
        pitch,
        rate,
        onDone: () => resolve({success: true}),
        onError: (error) => {
          console.error('Speech error:', error);
          resolve({success: false, error});
        }
      });
    });
  }

  /**
   * Stop speaking
   */
  async stopSpeaking() {
    await Speech.stop();
  }

  /**
   * Check if speaking
   */
  async isSpeaking() {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Get suggestions
   */
  async getSuggestions(userId) {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/voice/suggestions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * End conversation
   */
  async endConversation() {
    if (this.conversationId) {
      try {
        const token = await AsyncStorage.getItem('authToken');

        await fetch(`${API_URL}/api/voice/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId: this.conversationId
          })
        });
      } catch (error) {
        console.error('End conversation error:', error);
      }

      this.conversationId = null;
    }
  }

  /**
   * Voice event handlers
   */
  onSpeechStart(event) {
    console.log('Speech started');
  }

  onSpeechEnd(event) {
    console.log('Speech ended');
    this.isListening = false;
  }

  onSpeechResults(event) {
    const results = event.value;
    if (results && results.length > 0 && this.resultsCallback) {
      this.resultsCallback(results[0]); // Best result
    }
  }

  onSpeechError(event) {
    console.error('Speech error:', event.error);
    this.isListening = false;

    if (this.resultsCallback) {
      this.resultsCallback(null, event.error);
    }
  }

  /**
   * Cleanup
   */
  async destroy() {
    await this.stopListening();
    await this.stopSpeaking();
    Voice.destroy().then(Voice.removeAllListeners);
  }
}

// Export singleton
const voiceAssistant = new VoiceAssistantService();

export default voiceAssistant;
export {VoiceAssistantService};
