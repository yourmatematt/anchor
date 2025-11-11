/**
 * Alert Screen
 *
 * CRITICAL INTERVENTION SCREEN
 * - Full-screen takeover when non-whitelisted transaction detected
 * - CANNOT dismiss without recording voice memo
 * - Forces accountability through voice recording
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
import VoiceRecorder from '../components/VoiceRecorder';
import { transactionService } from '../services/supabase';

export default function AlertScreen({ route, navigation }) {
  const { transaction } = route.params;
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Prevent back button from dismissing
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasRecorded) {
        Alert.alert(
          'Voice Memo Required',
          'You must record a voice memo explaining this transaction before continuing.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [hasRecorded]);

  async function handleRecordingComplete(voiceMemoUri, transcript) {
    setHasRecorded(true);

    try {
      // In production, you would:
      // 1. Upload audio file to Supabase Storage
      // 2. Get public URL
      // For MVP, we'll use a placeholder URL

      const placeholderUrl = `file://${voiceMemoUri}`;

      // Update transaction with voice memo
      await transactionService.updateVoiceMemo(
        transaction.transaction_id,
        placeholderUrl,
        transcript
      );

      // Allow dismissal after 2 seconds
      setTimeout(() => {
        setIsDismissing(true);
      }, 2000);

    } catch (error) {
      console.error('Error saving voice memo:', error);
      Alert.alert('Error', 'Failed to save voice memo. Please try again.');
      setHasRecorded(false);
    }
  }

  function handleDismiss() {
    if (!hasRecorded) {
      Alert.alert(
        'Voice Memo Required',
        'You must record a voice memo explaining this transaction before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isDismissing) {
      navigation.goBack();
    }
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
            You must record a voice memo explaining why you're making this transaction.
          </Text>
        </View>

        {/* Voice Recorder */}
        <View style={styles.recorderContainer}>
          <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
        </View>

        {/* Dismiss Button (only enabled after recording) */}
        {isDismissing && (
          <TouchableOpacity
            style={[styles.dismissButton, hasRecorded && styles.dismissButtonEnabled]}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissButtonText}>Continue</Text>
          </TouchableOpacity>
        )}

        {!hasRecorded && (
          <View style={styles.footer}>
            <Ionicons name="lock-closed" size={16} color="#8e8e93" />
            <Text style={styles.footerText}>
              Recording required to continue
            </Text>
          </View>
        )}
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
  recorderContainer: {
    marginBottom: 32,
  },
  dismissButton: {
    backgroundColor: '#2c2c2e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonEnabled: {
    backgroundColor: '#007AFF',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
