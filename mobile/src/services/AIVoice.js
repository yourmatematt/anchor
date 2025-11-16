/**
 * AI Voice Service - Mobile Client
 *
 * Handles AI voice interventions on the mobile app using Claude API.
 * Integrates with Expo's native audio capabilities for speech recognition and synthesis.
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.apiUrl || process.env.EXPO_PUBLIC_API_URL;

/**
 * Voice configuration
 */
const VOICE_CONFIG = {
  // Australian English voice settings
  language: 'en-AU',
  pitch: 1.0,
  rate: 0.95, // Slightly slower for clarity

  // Voice profiles
  urgent: {
    pitch: 1.1,
    rate: 1.0,
    voice: 'en-AU'
  },
  casual: {
    pitch: 1.0,
    rate: 0.95,
    voice: 'en-AU'
  },
  supportive: {
    pitch: 0.95,
    rate: 0.9,
    voice: 'en-AU'
  }
};

/**
 * AIVoice class - handles voice-based AI interactions
 */
class AIVoice {
  constructor() {
    this.recording = null;
    this.isSpeaking = false;
    this.audioQueue = [];
  }

  /**
   * Initialize audio session
   */
  async initialize() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  /**
   * Start recording voice memo
   *
   * @returns {Promise<Object>} Recording object
   */
  async startRecording() {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.recordingStartTime = Date.now();

      return {
        success: true,
        recording
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop recording and get audio data
   *
   * @returns {Promise<Object>} Audio data and metadata
   */
  async stopRecording() {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const duration = (Date.now() - this.recordingStartTime) / 1000;

      const status = await this.recording.getStatusAsync();

      this.recording = null;

      return {
        success: true,
        uri,
        duration,
        metadata: {
          durationMillis: status.durationMillis,
          metering: status.metering
        }
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transcribe recorded audio
   *
   * Note: This uses a backend endpoint that processes audio with appropriate STT service.
   * For MVP, can use simple local transcription or send to backend.
   *
   * @param {string} audioUri - Local audio file URI
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioUri) {
    try {
      // For MVP: Return placeholder
      // In production: Send audio to backend for transcription
      // Backend can use Whisper API or similar STT service

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice-memo.m4a'
      });

      const response = await fetch(`${API_URL}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = await response.json();

      return {
        success: true,
        transcript: result.transcript,
        confidence: result.confidence || 1.0
      };
    } catch (error) {
      console.error('Transcription error:', error);

      // Fallback: Return indication that manual entry is needed
      return {
        success: false,
        error: error.message,
        transcript: '',
        requiresManualEntry: true
      };
    }
  }

  /**
   * Get AI response for intervention conversation
   *
   * @param {Object} params - Conversation parameters
   * @param {Array} params.messages - Message history
   * @param {string} params.trigger - Intervention trigger type
   * @param {Object} params.userData - User context
   * @param {boolean} params.streaming - Enable streaming
   * @returns {Promise<Object>} AI response
   */
  async getAIResponse({ messages, trigger, userData, streaming = false }) {
    try {
      const response = await fetch(`${API_URL}/api/ai/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          trigger,
          userData,
          streaming
        })
      });

      const result = await response.json();

      return {
        success: true,
        text: result.text,
        voiceConfig: result.voiceConfig
      };
    } catch (error) {
      console.error('AI response error:', error);

      return {
        success: false,
        error: error.message,
        text: "Let's talk about what happened, mate."
      };
    }
  }

  /**
   * Speak AI response using text-to-speech
   *
   * @param {string} text - Text to speak
   * @param {Object} voiceConfig - Voice configuration
   * @returns {Promise<void>}
   */
  async speak(text, voiceConfig = VOICE_CONFIG.casual) {
    try {
      // Stop any current speech
      if (this.isSpeaking) {
        await Speech.stop();
      }

      this.isSpeaking = true;

      await Speech.speak(text, {
        language: voiceConfig.voice || VOICE_CONFIG.language,
        pitch: voiceConfig.pitch || VOICE_CONFIG.pitch,
        rate: voiceConfig.rate || VOICE_CONFIG.rate,
        onDone: () => {
          this.isSpeaking = false;
        },
        onStopped: () => {
          this.isSpeaking = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isSpeaking = false;
        }
      });
    } catch (error) {
      console.error('TTS error:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Stop current speech
   */
  async stopSpeaking() {
    try {
      await Speech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  /**
   * Get AI voice intervention response and speak it
   *
   * @param {Object} params - Conversation parameters
   * @returns {Promise<Object>} Response with audio
   */
  async getAndSpeakResponse(params) {
    try {
      const response = await this.getAIResponse(params);

      if (response.success && response.text) {
        await this.speak(response.text, response.voiceConfig);
      }

      return response;
    } catch (error) {
      console.error('Failed to get and speak response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process voice memo and get AI analysis
   *
   * @param {string} audioUri - Audio file URI
   * @param {Object} context - Transaction context
   * @returns {Promise<Object>} Analysis result
   */
  async processVoiceMemo(audioUri, context) {
    try {
      // Transcribe audio
      const transcription = await this.transcribeAudio(audioUri);

      if (!transcription.success) {
        return transcription;
      }

      // Send to backend for Claude analysis
      const response = await fetch(`${API_URL}/api/voice/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: transcription.transcript,
          context
        })
      });

      const analysis = await response.json();

      return {
        success: true,
        transcript: transcription.transcript,
        analysis: analysis.analysis,
        concernLevel: analysis.concernLevel,
        flags: analysis.flags
      };
    } catch (error) {
      console.error('Voice memo processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if device supports required audio features
   *
   * @returns {Promise<Object>} Capability check results
   */
  async checkCapabilities() {
    try {
      const audioPermissions = await Audio.getPermissionsAsync();
      const voices = await Speech.getAvailableVoicesAsync();

      // Check for Australian English voice
      const hasAustralianVoice = voices.some(
        voice => voice.language === 'en-AU' || voice.language === 'en-au'
      );

      return {
        recording: audioPermissions.granted,
        speech: Speech.isSpeakingAsync !== undefined,
        australianVoice: hasAustralianVoice,
        availableVoices: voices.filter(v => v.language.startsWith('en'))
      };
    } catch (error) {
      console.error('Capability check error:', error);
      return {
        recording: false,
        speech: false,
        australianVoice: false,
        error: error.message
      };
    }
  }

  /**
   * Get voice configuration based on intervention type
   *
   * @param {string} trigger - Intervention trigger type
   * @returns {Object} Voice configuration
   */
  getVoiceConfig(trigger) {
    switch (trigger) {
      case 'immediate':
        return VOICE_CONFIG.urgent;
      case 'encouragement':
        return VOICE_CONFIG.supportive;
      default:
        return VOICE_CONFIG.casual;
    }
  }
}

// Export singleton instance
const aiVoice = new AIVoice();
export default aiVoice;

// Also export class for testing
export { AIVoice, VOICE_CONFIG };
