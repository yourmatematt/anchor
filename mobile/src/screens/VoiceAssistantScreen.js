/**
 * Voice Assistant Screen
 *
 * Voice-first UI for Anchor assistant powered by Claude.
 * Features push-to-talk, wake word, visual feedback, and transcription.
 */

import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import voiceAssistant from '../services/VoiceAssistant';

export default function VoiceAssistantScreen({route}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversation, setConversation] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [visualData, setVisualData] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const userId = route.params?.userId;

  useEffect(() => {
    loadSuggestions();

    return () => {
      voiceAssistant.destroy();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const loadSuggestions = async () => {
    const suggs = await voiceAssistant.getSuggestions(userId);
    setSuggestions(suggs);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      })
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
  };

  const handlePushToTalk = async () => {
    if (isListening) {
      // Stop listening
      await voiceAssistant.stopListening();
      setIsListening(false);
    } else {
      // Start listening
      setTranscript('');
      setResponse('');

      const result = await voiceAssistant.startListening((text, error) => {
        if (error) {
          console.error('Speech recognition error:', error);
          setIsListening(false);
          return;
        }

        if (text) {
          setTranscript(text);
          handleVoiceInput(text);
        }
      });

      if (result.success) {
        setIsListening(true);
      }
    }
  };

  const handleVoiceInput = async (text) => {
    setIsListening(false);
    setIsProcessing(true);

    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setConversation(prev => [...prev, userMessage]);

    try {
      // Process with backend
      const result = await voiceAssistant.processInput(text, userId);

      // Add assistant response to conversation
      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        emotion: result.emotion,
        intent: result.intent,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, assistantMessage]);

      setResponse(result.response);

      // Handle crisis situations
      if (result.crisis) {
        handleCrisis(result);
      }

      // Handle visual data
      if (result.visualData) {
        setVisualData(result.visualData);
      }

      // Handle actions
      if (result.actions) {
        handleActions(result.actions);
      }

      // Speak response
      setIsSpeaking(true);
      await voiceAssistant.speak(result.response);
      setIsSpeaking(false);

    } catch (error) {
      console.error('Voice processing error:', error);
      setResponse("Sorry, I had trouble with that.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCrisis = (result) => {
    // Show crisis resources immediately
    console.log('Crisis detected:', result);
    // TODO: Navigate to crisis resources screen
  };

  const handleActions = (actions) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'check_balance':
          // Navigate to balance screen
          break;
        case 'contact_guardian':
          // Open guardian contact
          break;
        case 'show_crisis_resources':
          // Show crisis resources
          break;
        default:
          console.log('Unknown action:', action);
      }
    });
  };

  const handleSuggestionTap = async (suggestion) => {
    setTranscript(suggestion);
    await handleVoiceInput(suggestion);
  };

  const handleEndConversation = async () => {
    await voiceAssistant.endConversation();
    setConversation([]);
    setResponse('');
    setVisualData(null);
  };

  const renderVisualData = () => {
    if (!visualData) return null;

    switch (visualData.type) {
      case 'balance':
        return (
          <View style={styles.visualCard}>
            <Text style={styles.visualTitle}>Your Balance</Text>
            <Text style={styles.visualValue}>${visualData.remaining.toFixed(2)}</Text>
            <Text style={styles.visualSubtext}>of ${visualData.total} remaining</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${(visualData.remaining / visualData.total) * 100}%`}]} />
            </View>
          </View>
        );

      case 'progress':
        return (
          <View style={styles.visualCard}>
            <Text style={styles.visualTitle}>Your Progress</Text>
            <Text style={styles.visualValue}>{visualData.cleanDays} days</Text>
            <Text style={styles.visualSubtext}>Current streak: {visualData.currentStreak} days</Text>
          </View>
        );

      case 'vault':
        return (
          <View style={styles.visualCard}>
            <Text style={styles.visualTitle}>Vault Status</Text>
            <Text style={styles.visualValue}>${visualData.amount}</Text>
            <Text style={styles.visualSubtext}>{visualData.daysRemaining} days remaining</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndConversation}>
          <Ionicons name="close" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
        <View style={{width: 28}} />
      </View>

      {/* Conversation */}
      <ScrollView style={styles.conversation} contentContainerStyle={styles.conversationContent}>
        {conversation.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.message,
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText
            ]}>
              {msg.content}
            </Text>
            {msg.emotion && (
              <Text style={styles.emotionTag}>{msg.emotion}</Text>
            )}
          </View>
        ))}

        {isProcessing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.processingText}>Thinking...</Text>
          </View>
        )}

        {renderVisualData()}
      </ScrollView>

      {/* Suggestions */}
      {suggestions.length > 0 && conversation.length === 0 && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Try saying:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionTap(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Transcript */}
      {transcript !== '' && (
        <View style={styles.transcript}>
          <Text style={styles.transcriptLabel}>You said:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {/* Push-to-Talk Button */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={handlePushToTalk}
          disabled={isProcessing || isSpeaking}
          style={[
            styles.micButton,
            isListening && styles.micButtonActive
          ]}
        >
          <Animated.View style={{transform: [{scale: isListening ? pulseAnim : 1}]}}>
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={48}
              color="#FFF"
            />
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Processing...' : 'Tap to speak'}
        </Text>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        {isListening && (
          <Animated.View style={[
            styles.waveBar,
            {
              opacity: waveAnim,
              transform: [{
                scaleX: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.5]
                })
              }]
            }
          ]} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'},
  headerTitle: {fontSize: 18, fontWeight: '600', color: '#111'},
  conversation: {flex: 1},
  conversationContent: {padding: 20},
  message: {marginBottom: 16, maxWidth: '80%', padding: 12, borderRadius: 16},
  userMessage: {alignSelf: 'flex-end', backgroundColor: '#007AFF'},
  assistantMessage: {alignSelf: 'flex-start', backgroundColor: '#E5E7EB'},
  messageText: {fontSize: 16, lineHeight: 22},
  userMessageText: {color: '#FFF'},
  assistantMessageText: {color: '#111'},
  emotionTag: {fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic'},
  processingIndicator: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  processingText: {marginLeft: 8, fontSize: 14, color: '#666'},
  visualCard: {backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3},
  visualTitle: {fontSize: 14, color: '#666', marginBottom: 8},
  visualValue: {fontSize: 36, fontWeight: 'bold', color: '#007AFF', marginBottom: 4},
  visualSubtext: {fontSize: 14, color: '#999'},
  progressBar: {width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 12, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: '#007AFF'},
  suggestions: {padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB'},
  suggestionsTitle: {fontSize: 14, color: '#666', marginBottom: 12},
  suggestionChip: {backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8},
  suggestionText: {fontSize: 14, color: '#111'},
  transcript: {padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB'},
  transcriptLabel: {fontSize: 12, color: '#666', marginBottom: 4},
  transcriptText: {fontSize: 16, color: '#111'},
  controlsContainer: {alignItems: 'center', padding: 32, backgroundColor: '#FFF'},
  micButton: {width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8},
  micButtonActive: {backgroundColor: '#DC2626'},
  instructionText: {marginTop: 16, fontSize: 14, color: '#666'},
  statusBar: {height: 4, backgroundColor: '#E5E7EB'},
  waveBar: {height: '100%', backgroundColor: '#007AFF'}
});
