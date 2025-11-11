/**
 * Alert Screen
 *
 * CRITICAL INTERVENTION SCREEN
 * - Full-screen takeover when non-whitelisted transaction detected
 * - CANNOT dismiss without completing AI conversation
 * - Forces accountability through voice/text conversation with AI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { conversationService } from '../services/ai';

export default function AlertScreen({ route, navigation }) {
  const { transaction } = route.params;
  const [hasStartedConversation, setHasStartedConversation] = useState(false);

  const userId = 'temp-user-id'; // TODO: Get from auth

  useEffect(() => {
    // Prevent back button from dismissing
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Can\'t Leave Yet',
        'You need to talk to me about this transaction first.',
        [{ text: 'OK' }]
      );
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  /**
   * Start AI conversation about the intervention
   */
  function handleStartConversation() {
    setHasStartedConversation(true);

    // Navigate to conversation screen
    navigation.navigate('Conversation', {
      userId,
      conversationType: 'intervention',
      initialMessage: `Hang on mate. You just sent $${Math.abs(transaction.amount)} to ${transaction.payee_name}. What's going on?`,
      context: {
        transaction_id: transaction.transaction_id,
        transaction: {
          amount: transaction.amount,
          payee_name: transaction.payee_name,
          timestamp: transaction.timestamp,
          description: transaction.description
        }
      }
    });
  }

  function handleDismiss() {
    Alert.alert(
      'Can\'t Leave Yet',
      'You need to talk to me about this transaction first.',
      [{ text: 'OK' }]
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        {/* Warning Header */}
        <View style={styles.header}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={60} color="#ff3b30" />
          </View>
          <Text style={styles.title}>ANCHOR ALERT</Text>
          <Text style={styles.subtitle}>Non-Whitelisted Transaction</Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payee</Text>
            <Text style={styles.detailValue}>{transaction.payee_name || 'Unknown'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {new Date(transaction.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Warning Message */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            This transaction is NOT on your whitelist.
          </Text>
          <Text style={styles.warningSubtext}>
            We need to talk about this.
          </Text>
        </View>

        {/* Start Conversation Button */}
        <TouchableOpacity
          style={styles.conversationButton}
          onPress={handleStartConversation}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          <Text style={styles.conversationButtonText}>
            {hasStartedConversation ? 'Continue Conversation' : 'Talk to Anchor'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={16} color="#8e8e93" />
          <Text style={styles.footerText}>
            Conversation required to continue
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
  },
  detailsCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: '#8e8e93',
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  warningText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 8,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  conversationButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  conversationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#8e8e93',
    fontSize: 14,
    marginLeft: 8,
  },
});
