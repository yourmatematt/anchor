/**
 * Payment Request Screen
 *
 * User requests to send money to non-whitelisted payee
 * AI evaluates and either approves, denies, or requires conversation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentRequestService } from '../services/ai';

export default function PaymentRequestScreen({ navigation, route }) {
  const [amount, setAmount] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [reason, setReason] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const userId = route.params?.userId || 'temp-user-id'; // TODO: Get from auth

  /**
   * Submit payment request for AI evaluation
   */
  async function handleSubmitRequest() {
    // Validate inputs
    if (!amount || !payeeName) {
      Alert.alert('Missing Information', 'Please enter amount and payee name.');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      setIsEvaluating(true);

      // Evaluate payment request with AI
      const evaluation = await paymentRequestService.evaluate(
        userId,
        amountValue,
        payeeName.trim(),
        reason.trim()
      );

      console.log('Payment evaluation:', evaluation);

      // Handle decision
      if (evaluation.decision === 'approved') {
        // Approved!
        Alert.alert(
          'Request Approved',
          evaluation.reason || 'Your payment request has been approved.',
          [
            {
              text: 'OK',
              onPress: () => {
                // TODO: Execute payment or add to queue
                navigation.goBack();
              }
            }
          ]
        );
      } else if (evaluation.decision === 'denied') {
        // Denied
        Alert.alert(
          'Request Denied',
          evaluation.reason || 'Your payment request has been denied.',
          [{ text: 'OK' }]
        );
      } else if (evaluation.requires_conversation) {
        // Requires conversation
        navigation.navigate('Conversation', {
          userId,
          paymentRequestId: evaluation.payment_request_id,
          conversationType: 'payment_request',
          initialMessage: evaluation.conversation_starter,
          context: {
            amount: amountValue,
            payee_name: payeeName,
            reason
          }
        });
      }

    } catch (error) {
      console.error('Error evaluating payment:', error);
      Alert.alert('Error', 'Failed to evaluate payment request. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Request</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            This payee is not on your whitelist. I'll need to evaluate this request.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payee Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Who are you sending to?"
              value={payeeName}
              onChangeText={setPayeeName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Why do you need to send this money?"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isEvaluating && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitRequest}
          disabled={isEvaluating}
        >
          {isEvaluating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 24
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    lineHeight: 20
  },
  form: {
    flex: 1
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
    marginRight: 8
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 16
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  textArea: {
    height: 100,
    paddingTop: 14
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto'
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  }
});
