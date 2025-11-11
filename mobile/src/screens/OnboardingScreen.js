/**
 * Onboarding Screen
 *
 * AI-powered onboarding flow:
 * 1. Welcome + Connect Bank
 * 2. Transaction Analysis (loading)
 * 3. Voice Interview (5-7 questions)
 * 4. Profile Summary
 * 5. Contract Agreement
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onboardingService } from '../services/ai';
import { transactionService as upTransactionService } from '../services/upBank';
import voiceService from '../services/voice';

const STAGES = {
  WELCOME: 'welcome',
  ANALYZING: 'analyzing',
  INTERVIEW: 'interview',
  SUMMARY: 'summary',
  CONTRACT: 'contract',
  COMPLETE: 'complete'
};

export default function OnboardingScreen({ navigation, route }) {
  const [stage, setStage] = useState(STAGES.WELCOME);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const userId = route.params?.userId || 'temp-user-id'; // TODO: Get from auth

  useEffect(() => {
    return () => {
      // Cleanup voice service on unmount
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, []);

  /**
   * Start onboarding - analyze transaction history
   */
  async function handleStartOnboarding() {
    try {
      setStage(STAGES.ANALYZING);

      // Fetch transaction history from Up Bank
      const { transactions } = await upTransactionService.getTransactions({
        limit: 100 // Get last 100 transactions
      });

      if (!transactions || transactions.length === 0) {
        Alert.alert('No Transactions', 'We need some transaction history to help you. Please try again after you have some transactions.');
        setStage(STAGES.WELCOME);
        return;
      }

      // Start AI onboarding
      const response = await onboardingService.start(userId, transactions);

      setConversationId(response.conversation_id);
      setAnalysis(response.analysis);

      // Add AI's first question to messages
      const aiMessage = {
        role: 'assistant',
        content: response.next_question,
        timestamp: new Date().toISOString()
      };

      setMessages([aiMessage]);

      // Speak the first question
      await voiceService.speak(response.next_question);

      setStage(STAGES.INTERVIEW);

    } catch (error) {
      console.error('Error starting onboarding:', error);
      Alert.alert('Error', 'Failed to start onboarding. Please try again.');
      setStage(STAGES.WELCOME);
    }
  }

  /**
   * Handle voice input toggle
   */
  async function handleVoiceToggle() {
    if (isListening) {
      // Stop listening
      await voiceService.stopListening();
      setIsListening(false);
    } else {
      // Start listening
      setIsListening(true);
      await voiceService.startListening(
        (transcription) => {
          // On result
          setCurrentInput(transcription);
          setIsListening(false);
        },
        (error) => {
          // On error
          console.error('Voice error:', error);
          setIsListening(false);
          Alert.alert('Voice Error', 'Failed to recognize speech. Please try typing instead.');
        }
      );
    }
  }

  /**
   * Send message to AI
   */
  async function handleSendMessage() {
    if (!currentInput.trim() || isProcessing) return;

    try {
      setIsProcessing(true);

      // Add user message to messages
      const userMessage = {
        role: 'user',
        content: currentInput,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      setCurrentInput('');

      // Send to AI
      const response = await onboardingService.continueConversation(
        userId,
        conversationId,
        userMessage.content
      );

      // Add AI response to messages
      const aiMessage = {
        role: 'assistant',
        content: response.next_question,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speak AI response
      await voiceService.speak(response.next_question);

      // Check if onboarding is complete
      if (response.completed) {
        setProfile(response.profile);
        setStage(STAGES.SUMMARY);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * Accept contract and complete onboarding
   */
  function handleAcceptContract() {
    setStage(STAGES.COMPLETE);

    // Navigate to home screen
    setTimeout(() => {
      navigation.replace('Home');
    }, 2000);
  }

  /**
   * Render different stages
   */
  function renderStage() {
    switch (stage) {
      case STAGES.WELCOME:
        return (
          <View style={styles.stageContainer}>
            <Ionicons name="shield-checkmark" size={80} color="#007AFF" />
            <Text style={styles.title}>Welcome to Anchor</Text>
            <Text style={styles.subtitle}>
              Your financial guardian for gambling accountability
            </Text>
            <Text style={styles.description}>
              I'm going to ask you some questions to understand your situation.
              This isn't therapy - it's about setting up real protection.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartOnboarding}
            >
              <Text style={styles.primaryButtonText}>Let's Start</Text>
            </TouchableOpacity>
          </View>
        );

      case STAGES.ANALYZING:
        return (
          <View style={styles.stageContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.title}>Analyzing Your Transactions</Text>
            <Text style={styles.description}>
              Looking at your spending patterns...
            </Text>
          </View>
        );

      case STAGES.INTERVIEW:
        return (
          <View style={styles.interviewContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Onboarding Interview</Text>
              <Text style={styles.headerSubtitle}>
                {messages.filter(m => m.role === 'user').length} / ~5 questions
              </Text>
            </View>

            <ScrollView
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userText : styles.aiText
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your answer or use voice..."
                value={currentInput}
                onChangeText={setCurrentInput}
                multiline
                onSubmitEditing={handleSendMessage}
              />

              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && styles.voiceButtonActive
                ]}
                onPress={handleVoiceToggle}
              >
                <Ionicons
                  name={isListening ? "mic" : "mic-outline"}
                  size={24}
                  color={isListening ? "#FF3B30" : "#007AFF"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!currentInput.trim() || isProcessing) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!currentInput.trim() || isProcessing}
              >
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case STAGES.SUMMARY:
        return (
          <ScrollView style={styles.summaryContainer}>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.description}>
              Here's what we've learned about your situation:
            </Text>

            {profile && (
              <View style={styles.profileCard}>
                <ProfileItem
                  label="Why you gamble"
                  value={profile.why_gamble}
                />
                <ProfileItem
                  label="What you're chasing"
                  value={profile.gambling_feeling}
                />
                <ProfileItem
                  label="How you feel after"
                  value={profile.aftermath_feeling}
                />
                <ProfileItem
                  label="Root cause"
                  value={profile.root_cause}
                />
                {profile.savings_goal_amount && (
                  <ProfileItem
                    label="Savings goal"
                    value={`$${profile.savings_goal_amount} - ${profile.savings_goal_purpose}`}
                  />
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStage(STAGES.CONTRACT)}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case STAGES.CONTRACT:
        return (
          <ScrollView style={styles.contractContainer}>
            <Text style={styles.title}>The Agreement</Text>

            <View style={styles.contractBox}>
              <Text style={styles.contractText}>
                You're giving me control of your money to stop you from gambling.
              </Text>
              <Text style={styles.contractText}>
                I will intervene when you try to spend money outside your whitelist.
              </Text>
              <Text style={styles.contractText}>
                I will ask you hard questions. I won't let you off easy.
              </Text>
              <Text style={styles.contractText}>
                This isn't therapy. This is accountability.
              </Text>
              <Text style={styles.contractText}>
                You can stop this anytime, but when you're in, I'm in control.
              </Text>
            </View>

            <Text style={styles.contractQuestion}>
              Are you ready?
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAcceptContract}
            >
              <Text style={styles.primaryButtonText}>I'm Ready</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case STAGES.COMPLETE:
        return (
          <View style={styles.stageContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            <Text style={styles.title}>You're All Set</Text>
            <Text style={styles.description}>
              Anchor is now protecting your money.
            </Text>
          </View>
        );

      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      {renderStage()}
    </View>
  );
}

/**
 * Profile Item Component
 */
function ProfileItem({ label, value }) {
  return (
    <View style={styles.profileItem}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  stageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 16
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  interviewContainer: {
    flex: 1
  },
  header: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  messagesContent: {
    padding: 16
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF'
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  userText: {
    color: '#FFF'
  },
  aiText: {
    color: '#000'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  voiceButtonActive: {
    backgroundColor: '#FFE5E5'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  summaryContainer: {
    flex: 1,
    padding: 24
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  profileItem: {
    marginBottom: 16
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  profileValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500'
  },
  contractContainer: {
    flex: 1,
    padding: 24
  },
  contractBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24
  },
  contractText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 16
  },
  contractQuestion: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16
  }
});
