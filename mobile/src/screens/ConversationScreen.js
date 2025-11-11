/**
 * Conversation Screen
 *
 * AI conversation interface with voice support
 * Used for:
 * - Payment request discussions
 * - Interventions
 * - Daily check-ins
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { conversationService } from '../services/ai';
import voiceService from '../services/voice';

export default function ConversationScreen({ navigation, route }) {
  const {
    userId,
    conversationId: initialConversationId,
    conversationType,
    initialMessage,
    context,
    paymentRequestId
  } = route.params;

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const scrollViewRef = useRef();

  useEffect(() => {
    // Add initial AI message if provided
    if (initialMessage) {
      const aiMessage = {
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date().toISOString()
      };
      setMessages([aiMessage]);

      // Speak initial message
      voiceService.speak(initialMessage);
    }

    return () => {
      // Cleanup
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  /**
   * Handle voice input toggle
   */
  async function handleVoiceToggle() {
    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      await voiceService.startListening(
        (transcription) => {
          setCurrentInput(transcription);
          setIsListening(false);
        },
        (error) => {
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

      // Prepare conversation context
      const conversationContext = {
        ...context
      };

      if (paymentRequestId) {
        conversationContext.payment_request_id = paymentRequestId;
      }

      // Send to AI
      const response = await conversationService.sendMessage(
        userId,
        userMessage.content,
        {
          conversationId,
          conversationType,
          context: conversationContext
        }
      );

      // Update conversation ID if this was the first message
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      // Add AI response to messages
      const aiMessage = {
        role: 'assistant',
        content: response.assistant_message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Speak AI response
      await voiceService.speak(response.assistant_message);

      // Check if conversation ended
      if (!response.should_continue) {
        setCanDismiss(true);
        setOutcome(response.outcome);

        // Show outcome alert
        showOutcomeAlert(response.outcome);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * Show outcome alert based on conversation result
   */
  function showOutcomeAlert(outcome) {
    let title = '';
    let message = '';

    switch (outcome) {
      case 'approved':
        title = 'Request Approved';
        message = 'Your payment request has been approved.';
        break;
      case 'denied':
        title = 'Request Denied';
        message = 'Your payment request has been denied.';
        break;
      case 'completed':
        title = 'Conversation Complete';
        message = 'Thanks for talking with me.';
        break;
      default:
        title = 'Conversation Ended';
        message = '';
    }

    if (title) {
      setTimeout(() => {
        Alert.alert(title, message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      }, 1000);
    }
  }

  /**
   * Attempt to dismiss conversation
   */
  function handleDismissAttempt() {
    if (canDismiss) {
      navigation.goBack();
    } else {
      Alert.alert(
        'Can\'t Leave Yet',
        'You need to finish this conversation first.',
        [{ text: 'OK' }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleDismissAttempt}
          style={styles.backButton}
        >
          <Ionicons
            name={canDismiss ? "close" : "lock-closed"}
            size={24}
            color={canDismiss ? "#000" : "#666"}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {conversationType === 'payment_request' && 'Payment Discussion'}
          {conversationType === 'intervention' && 'We Need to Talk'}
          {conversationType === 'check_in' && 'Daily Check-in'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
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

        {isProcessing && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <Text style={styles.aiText}>...</Text>
          </View>
        )}
      </ScrollView>

      {!canDismiss && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your response or use voice..."
            value={currentInput}
            onChangeText={setCurrentInput}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.voiceButton,
              isListening && styles.voiceButtonActive
            ]}
            onPress={handleVoiceToggle}
            disabled={isProcessing}
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
      )}

      {canDismiss && outcome && (
        <View style={styles.outcomeContainer}>
          <Ionicons
            name={outcome === 'approved' ? "checkmark-circle" : outcome === 'denied' ? "close-circle" : "information-circle"}
            size={32}
            color={outcome === 'approved' ? "#34C759" : outcome === 'denied' ? "#FF3B30" : "#007AFF"}
          />
          <Text style={styles.outcomeText}>
            {outcome === 'approved' && 'Request Approved'}
            {outcome === 'denied' && 'Request Denied'}
            {outcome === 'completed' && 'Conversation Complete'}
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  messagesContainer: {
    flex: 1
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24
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
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA'
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
  outcomeContainer: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center'
  },
  outcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 16
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
