/**
 * AI Interview Screen
 * 10 questions about gambling history
 * Voice-first with AI responses after each answer
 * Cannot skip questions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Components, BorderRadius } from '../../theme';

const QUESTIONS = [
  {
    id: 1,
    text: "What type of gambling has hurt you most?",
    aiResponses: {
      pokies: "Pokies. The worst one. Designed to keep you playing.",
      sports: "Sports betting. Always one more bet to win it back.",
      crypto: "Crypto gambling. No closing time, no off switch.",
      poker: "Poker. Skill game, but the house always wins long-term.",
      default: "Yeah, that'll do damage."
    }
  },
  {
    id: 2,
    text: "How much have you lost in the last 12 months?",
    aiResponses: {
      default: "Fuck. That's real money."
    }
  },
  {
    id: 3,
    text: "What's your biggest trigger?",
    aiResponses: {
      default: "So that's when you're most vulnerable."
    }
  },
  {
    id: 4,
    text: "Have you used payday loans for gambling?",
    aiResponses: {
      yes: "Those are poison. 400% interest to chase losses.",
      no: "Good. They're a trap."
    }
  },
  {
    id: 5,
    text: "Who knows about your problem?",
    aiResponses: {
      nobody: "You've been hiding it. That ends today.",
      default: "At least someone knows the truth."
    }
  },
  {
    id: 6,
    text: "What's the most you've lost in one session?",
    aiResponses: {
      default: "One session. Gone."
    }
  },
  {
    id: 7,
    text: "Have you tried to stop before?",
    aiResponses: {
      yes: "What happened?",
      no: "This is your first real attempt."
    }
  },
  {
    id: 8,
    text: "Do you gamble online or in venues?",
    aiResponses: {
      online: "Online is 24/7. No closing time to protect you.",
      venues: "At least venues close. Online never stops.",
      both: "Everywhere. That's why we need hard limits."
    }
  },
  {
    id: 9,
    text: "What day/time are you weakest?",
    aiResponses: {
      default: "I'll watch for that pattern."
    }
  },
  {
    id: 10,
    text: "Are you ready to lose access to your money?",
    aiResponses: {
      yes: "Alright. Let's do this.",
      no: "You wouldn't be here if you weren't.",
      maybe: "There's no maybe. You're locked in or you're not."
    }
  }
];

export default function AIInterviewScreen({ navigation, route }) {
  const { commitmentMonths, useVoice, currentQuestion } = route.params || { currentQuestion: 1 };

  const [questionIndex, setQuestionIndex] = useState(currentQuestion - 1);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [aiResponse, setAIResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const currentQ = QUESTIONS[questionIndex];
  const totalQuestions = QUESTIONS.length;
  const isLastQuestion = questionIndex === totalQuestions - 1;

  const handleSubmitAnswer = () => {
    if (answer.trim().length === 0) return;

    // Get AI response based on answer
    const response = getAIResponse(currentQ, answer);

    // Save answer
    const newAnswers = [...answers, { question: currentQ.text, answer, aiResponse: response }];
    setAnswers(newAnswers);

    // Show AI response
    setAIResponse(response);
    setShowAIResponse(true);

    // In production: save to database, send to AI API for analysis
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Interview complete, navigate to next screen
      navigation.navigate('UpBankConnection', {
        commitmentMonths,
        interviewAnswers: answers,
      });
    } else {
      // Move to next question
      setQuestionIndex(prev => prev + 1);
      setAnswer('');
      setShowAIResponse(false);
      setAIResponse('');
    }
  };

  const getAIResponse = (question, userAnswer) => {
    const lowerAnswer = userAnswer.toLowerCase();

    // Question-specific responses
    if (question.id === 1) {
      if (lowerAnswer.includes('poki') || lowerAnswer.includes('slot')) return question.aiResponses.pokies;
      if (lowerAnswer.includes('sport') || lowerAnswer.includes('bet')) return question.aiResponses.sports;
      if (lowerAnswer.includes('crypto') || lowerAnswer.includes('bitcoin')) return question.aiResponses.crypto;
      if (lowerAnswer.includes('poker') || lowerAnswer.includes('cards')) return question.aiResponses.poker;
    }

    if (question.id === 4) {
      if (lowerAnswer.includes('yes') || lowerAnswer.includes('yeah')) return question.aiResponses.yes;
      if (lowerAnswer.includes('no')) return question.aiResponses.no;
    }

    if (question.id === 5) {
      if (lowerAnswer.includes('nobody') || lowerAnswer.includes('no one') || lowerAnswer.includes('noone')) {
        return question.aiResponses.nobody;
      }
    }

    if (question.id === 7) {
      if (lowerAnswer.includes('yes') || lowerAnswer.includes('yeah') || lowerAnswer.includes('tried')) {
        return question.aiResponses.yes;
      }
      if (lowerAnswer.includes('no') || lowerAnswer.includes('never')) return question.aiResponses.no;
    }

    if (question.id === 8) {
      if (lowerAnswer.includes('online')) return question.aiResponses.online;
      if (lowerAnswer.includes('venue') || lowerAnswer.includes('pub') || lowerAnswer.includes('casino')) {
        return question.aiResponses.venues;
      }
      if (lowerAnswer.includes('both')) return question.aiResponses.both;
    }

    if (question.id === 10) {
      if (lowerAnswer.includes('yes') || lowerAnswer.includes('ready')) return question.aiResponses.yes;
      if (lowerAnswer.includes('no')) return question.aiResponses.no;
      if (lowerAnswer.includes('maybe') || lowerAnswer.includes('think so')) return question.aiResponses.maybe;
    }

    return question.aiResponses.default;
  };

  const handleVoiceRecord = () => {
    // In production: start/stop voice recording
    setIsRecording(!isRecording);

    if (!isRecording) {
      // Started recording - simulate voice input
      setTimeout(() => {
        setIsRecording(false);
        setAnswer('Voice recorded answer placeholder');
      }, 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Question {questionIndex + 1} of {totalQuestions}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / totalQuestions) * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question */}
          <Text style={styles.question}>{currentQ.text}</Text>

          {/* Answer Input */}
          {!showAIResponse && (
            <>
              {useVoice ? (
                <View style={styles.voiceContainer}>
                  <TouchableOpacity
                    style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
                    onPress={handleVoiceRecord}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isRecording ? 'mic' : 'mic-outline'}
                      size={64}
                      color={Colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.voiceText}>
                    {isRecording ? 'Recording...' : 'Tap to answer'}
                  </Text>
                  {answer.length > 0 && (
                    <Text style={styles.transcription}>{answer}</Text>
                  )}
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Type your answer..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  autoFocus
                />
              )}
            </>
          )}

          {/* AI Response */}
          {showAIResponse && (
            <View style={styles.aiResponseContainer}>
              <View style={styles.aiResponseBubble}>
                <Text style={styles.aiResponseLabel}>AI:</Text>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </View>

              {/* User's answer shown above */}
              <View style={styles.userAnswerContainer}>
                <Text style={styles.userAnswerLabel}>YOU:</Text>
                <Text style={styles.userAnswerText}>{answer}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {!showAIResponse ? (
            <TouchableOpacity
              style={[styles.submitButton, answer.length === 0 && styles.disabledButton]}
              onPress={handleSubmitAnswer}
              disabled={answer.length === 0}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitButtonText, answer.length === 0 && styles.disabledButtonText]}>
                Submit Answer
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? 'Continue to Setup' : 'Next Question'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundModal,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  question: {
    ...Typography.h2,
    marginBottom: Spacing.xxl,
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  voiceButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accentBackground,
    borderWidth: 4,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  voiceButtonRecording: {
    backgroundColor: Colors.alert,
    borderColor: Colors.alert,
  },
  voiceText: {
    ...Typography.h4,
    color: Colors.textSecondary,
  },
  transcription: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  textInput: {
    ...Components.textArea,
    minHeight: 120,
  },
  aiResponseContainer: {
    gap: Spacing.lg,
  },
  userAnswerContainer: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: Colors.accentBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  userAnswerLabel: {
    ...Typography.small,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  userAnswerText: {
    ...Typography.body,
  },
  aiResponseBubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: Colors.backgroundCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiResponseLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  aiResponseText: {
    ...Typography.body,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    ...Components.buttonPrimary,
  },
  submitButtonText: {
    ...Typography.button,
  },
  nextButton: {
    ...Components.buttonSuccess,
  },
  nextButtonText: {
    ...Typography.button,
  },
  disabledButton: {
    backgroundColor: Colors.disabled,
  },
  disabledButtonText: {
    color: Colors.disabledText,
  },
});
