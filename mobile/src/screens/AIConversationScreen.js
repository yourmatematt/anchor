/**
 * AI Conversation Screen
 * Unavoidable full-screen intervention
 *
 * CRITICAL RULES:
 * - Cannot exit until AI determines conversation complete
 * - Back button/gesture disabled
 * - Home button shows "Finish conversation first" if pressed
 * - Transcription visible (accountability - can't deny what you said)
 * - All responses auto-play as voice (harder to ignore)
 * - Full conversation saved and sent to guardian
 * - Dark overlay background (feels serious, focused)
 * - NO cute animations or friendly faces
 * - AI tone is direct peer, not therapist
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  BackHandler,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

export default function AIConversationScreen({ navigation, route }) {
  const { triggerType, triggerData } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingObject, setRecordingObject] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [canExit, setCanExit] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    startConversation();
    disableBackButton();

    return () => {
      // Cleanup
      if (recordingObject) {
        stopRecording();
      }
    };
  }, []);

  // Disable Android back button
  useEffect(() => {
    const backAction = () => {
      if (!canExit) {
        Alert.alert(
          'Finish conversation first',
          'You need to complete this conversation before you can leave.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default behavior
      }
      return false; // Allow back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canExit]);

  function disableBackButton() {
    // Prevent navigation back via gesture or button
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }

  async function startConversation() {
    // Initial AI message based on trigger type
    let initialMessage = '';

    switch (triggerType) {
      case 'payment_request':
        initialMessage = `Hang on. You just requested $${triggerData?.amount || '0'}. Where's this for?`;
        break;
      case 'payday_loan':
        initialMessage = `Hang on. You just got $${triggerData?.amount || '0'} from ${triggerData?.source || 'a payday lender'} at ${triggerData?.time || 'late night'}. Where's this from?`;
        break;
      case 'gambling_detection':
        initialMessage = `Mate, $${Math.abs(triggerData?.amount || 0)} to ${triggerData?.payee || 'unknown'} at ${triggerData?.time || 'late night'}? That's your gambling pattern.`;
        break;
      case 'cash_withdrawal':
        initialMessage = `$${triggerData?.amount || '0'} cash withdrawal at ${triggerData?.time || 'late night'}. You set this up so you couldn't access cash. What's going on?`;
        break;
      default:
        initialMessage = "Let's talk about what's happening.";
    }

    addMessage('ai', initialMessage);
    speakMessage(initialMessage);

    // Notify guardian
    notifyGuardian('Conversation started', initialMessage);
  }

  function addMessage(sender, text) {
    const newMessage = {
      id: Date.now(),
      sender, // 'ai' or 'user'
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  function speakMessage(text) {
    // Text-to-speech for AI responses
    Speech.speak(text, {
      language: 'en-AU', // Australian accent
      pitch: 1.0,
      rate: 0.9, // Slightly slower for clarity
    });
  }

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Microphone access is needed for voice recording.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      setRecordingObject(recording);
      setIsRecording(true);
      setTranscription(''); // Clear previous transcription
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }

  async function stopRecording() {
    if (!recordingObject) return;

    try {
      setIsRecording(false);
      await recordingObject.stopAndUnloadAsync();
      const uri = recordingObject.getURI();

      // In production, this would:
      // 1. Upload audio to Supabase Storage
      // 2. Send to speech-to-text API (e.g., OpenAI Whisper)
      // 3. Get transcription back
      // For MVP, using mock transcription

      const mockTranscription = getMockTranscription();
      setTranscription(mockTranscription);

      addMessage('user', mockTranscription);

      // Process user's response and generate AI reply
      processUserResponse(mockTranscription);

      setRecordingObject(null);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  function getMockTranscription() {
    // Mock transcription for MVP
    // In production, this comes from speech-to-text API
    const mockResponses = [
      "It's a loan",
      "I needed it for bills",
      "Just helping a mate out",
      "It's for work stuff",
      "None of your business",
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  async function processUserResponse(userText) {
    setIsAIThinking(true);

    // Simulate AI processing (2-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // In production, this would call AI API (e.g., OpenAI) with:
    // - Full conversation history
    // - User profile (gambling patterns, clean streak, etc.)
    // - Trigger context
    // - Instructions to be direct peer, not therapist

    const aiResponse = generateAIResponse(userText);

    setIsAIThinking(false);
    addMessage('ai', aiResponse);
    speakMessage(aiResponse);

    // Check if conversation should end
    if (shouldEndConversation(aiResponse)) {
      setTimeout(() => {
        endConversation(aiResponse);
      }, 1000);
    }
  }

  function generateAIResponse(userText) {
    // Mock AI responses for MVP
    // In production, this comes from AI API with full context

    const responses = [
      "When's the repayment due?",
      "How much interest are you paying on that?",
      "Who's this 'mate' you're helping?",
      "Be straight with me. Is this gambling-related?",
      "Your clean streak is 47 days. Don't throw that away.",
      "Alright, stay strong. Gutsy has been notified.", // Ending phrase
      "Not happening. This is your poker pattern.", // Ending phrase (denial)
      "You can send it, but I'm watching this closely.", // Ending phrase (approval with warning)
    ];

    // For MVP, return random response (in production, AI chooses based on context)
    return responses[Math.floor(Math.random() * responses.length)];
  }

  function shouldEndConversation(aiMessage) {
    // AI determines conversation is complete with specific ending phrases
    const endingPhrases = [
      'stay strong',
      'not happening',
      'you can send it',
      'i\'m watching this',
    ];

    return endingPhrases.some(phrase =>
      aiMessage.toLowerCase().includes(phrase)
    );
  }

  function endConversation(finalMessage) {
    setCanExit(true);

    // Save conversation to database
    saveConversation(messages);

    // Notify guardian with full transcript
    notifyGuardian('Conversation complete', finalMessage);

    // Show summary screen
    showSummaryScreen();
  }

  async function saveConversation(conversationMessages) {
    // In production, save to Supabase ai_conversations table
    console.log('Saving conversation:', conversationMessages);
  }

  function notifyGuardian(event, message) {
    // In production, send SMS/notification to guardian
    console.log(`Guardian notified: ${event} - ${message}`);
  }

  function showSummaryScreen() {
    // Determine outcome based on last AI message
    const lastAIMessage = messages.filter(m => m.sender === 'ai').pop();
    const outcome = determineeOutcome(lastAIMessage?.text || '');

    navigation.replace('ConversationSummary', {
      outcome,
      transcript: messages,
      triggerType,
    });
  }

  function determineOutcome(lastMessage) {
    if (lastMessage.toLowerCase().includes('not happening')) {
      return 'denied';
    } else if (lastMessage.toLowerCase().includes('you can send')) {
      return 'approved';
    } else if (lastMessage.toLowerCase().includes('clean streak')) {
      return 'warning';
    }
    return 'completed';
  }

  const handleTypeInstead = () => {
    // For MVP, show alert. In production, show text input
    Alert.alert('Coming Soon', 'Type mode is not yet implemented. Please use voice.');
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => {
        if (!canExit) {
          Alert.alert(
            'Finish conversation first',
            'You need to complete this conversation before you can leave.'
          );
        }
      }}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CONVERSATION</Text>
          <TouchableOpacity
            onPress={() => {
              if (!canExit) {
                Alert.alert(
                  'Finish conversation first',
                  'You need to complete this conversation before you can leave.'
                );
              } else {
                navigation.goBack();
              }
            }}
            disabled={!canExit}
          >
            <Ionicons
              name="close"
              size={28}
              color={canExit ? Colors.textPrimary : Colors.disabled}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'ai' ? styles.aiMessage : styles.userMessage,
              ]}
            >
              <Text style={styles.messageSender}>
                {message.sender === 'ai' ? 'AI' : 'YOU'}:
              </Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}

          {/* AI Thinking indicator */}
          {isAIThinking && (
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <Text style={styles.thinkingText}>...</Text>
              <Text style={styles.thinkingLabel}>Thinking...</Text>
            </View>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <View style={[styles.messageBubble, styles.userMessage]}>
              <Text style={styles.messageSender}>YOU:</Text>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
              {transcription.length > 0 && (
                <Text style={styles.transcriptionText}>{transcription}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Guardian notification footer */}
        <View style={styles.guardianNotice}>
          <Ionicons name="eye-outline" size={16} color={Colors.guardian} />
          <Text style={styles.guardianNoticeText}>
            {triggerData?.guardianName || 'Gutsy'} is being updated in real-time
          </Text>
        </View>

        {/* Input controls */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? 'mic' : 'mic-outline'}
              size={32}
              color={Colors.textPrimary}
            />
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Release to send' : 'Hold to Talk'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.typeButton} onPress={handleTypeInstead}>
            <Text style={styles.typeButtonText}>Type Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // Dark overlay
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h3,
    letterSpacing: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  messageBubble: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: '85%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentBackground,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  messageSender: {
    ...Typography.small,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  thinkingText: {
    ...Typography.h3,
    color: Colors.textSecondary,
  },
  thinkingLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.alert,
    marginRight: Spacing.sm,
  },
  recordingText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  transcriptionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  guardianNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.guardianBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.guardian,
  },
  guardianNoticeText: {
    ...Typography.caption,
    color: Colors.guardian,
    marginLeft: Spacing.sm,
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recordButton: {
    ...Components.buttonPrimary,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  recordButtonActive: {
    backgroundColor: Colors.alert,
    borderColor: Colors.alert,
  },
  recordButtonText: {
    ...Typography.button,
  },
  typeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  typeButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
});
