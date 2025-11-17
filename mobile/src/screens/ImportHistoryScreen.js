/**
 * Import History Screen
 *
 * Allows users to import their Up Bank transaction history
 * and analyze gambling patterns to establish baseline
 *
 * Features:
 * - Import 2 years of Up Bank history
 * - Real-time import progress
 * - Baseline analysis
 * - Risk profile generation
 * - Import statistics display
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenService } from '../services/upBank';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

export default function ImportHistoryScreen({ navigation }) {
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [stats, setStats] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [riskProfile, setRiskProfile] = useState(null);
  const [importYears, setImportYears] = useState('2');
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    loadStats();
    loadBaseline();
    loadRiskProfile();
  }, []);

  /**
   * Load import statistics
   */
  async function loadStats() {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/routes/import/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  /**
   * Load baseline analysis
   */
  async function loadBaseline() {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/routes/import/baseline`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBaseline(data);
      }
    } catch (error) {
      console.error('Error loading baseline:', error);
    }
  }

  /**
   * Load risk profile
   */
  async function loadRiskProfile() {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/routes/import/risk-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRiskProfile(data);
      }
    } catch (error) {
      console.error('Error loading risk profile:', error);
    }
  }

  /**
   * Start importing Up Bank history
   */
  async function startImport() {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        Alert.alert('Error', 'Please set up your Up Bank token first');
        return;
      }

      setImporting(true);
      setProgress('Connecting to Up Bank...');

      const response = await fetch(`${API_URL}/api/routes/import/up-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          upToken: token,
          years: parseInt(importYears)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();

      setProgress('Import complete!');
      await loadStats();

      Alert.alert(
        'Import Complete',
        `Imported ${result.stats.totalTransactions} transactions\nGambling transactions found: ${result.stats.gamblingTransactions}`,
        [
          {
            text: 'Analyze Baseline',
            onPress: () => analyzeBaseline()
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Import Failed', error.message);
    } finally {
      setImporting(false);
      setProgress('');
    }
  }

  /**
   * Analyze gambling baseline
   */
  async function analyzeBaseline() {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      setAnalyzing(true);
      setProgress('Analyzing gambling patterns...');

      const response = await fetch(`${API_URL}/api/routes/import/analyze-baseline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          months: 12
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Analysis failed');
      }

      const result = await response.json();
      setBaseline(result.baseline);
      setProgress('Analysis complete!');

      Alert.alert(
        'Baseline Analysis Complete',
        `Average weekly loss: $${result.baseline.averageWeekly.toFixed(2)}\nTotal transactions: ${result.baseline.transactionCount}`,
        [
          {
            text: 'Generate Risk Profile',
            onPress: () => generateProfile()
          },
          {
            text: 'View Details',
            onPress: () => {} // TODO: Navigate to detailed view
          }
        ]
      );
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  }

  /**
   * Generate risk profile
   */
  async function generateProfile() {
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      setGeneratingProfile(true);
      setProgress('Generating your personalized risk profile...');

      const response = await fetch(`${API_URL}/api/routes/import/generate-risk-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          months: 12
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Profile generation failed');
      }

      const result = await response.json();
      setRiskProfile(result.profile);
      setProgress('Profile generated!');

      Alert.alert(
        'Risk Profile Generated',
        `Risk Level: ${result.profile.riskLevel}\nSuccess Probability: ${result.profile.successProbability}%`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Profile generation error:', error);
      Alert.alert('Profile Generation Failed', error.message);
    } finally {
      setGeneratingProfile(false);
      setProgress('');
    }
  }

  /**
   * Get risk level color
   */
  function getRiskLevelColor(level) {
    switch (level) {
      case 'EXTREME': return '#ff3b30';
      case 'HIGH': return '#ff9500';
      case 'MEDIUM': return '#ffcc00';
      case 'LOW': return '#34c759';
      default: return '#8e8e93';
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import History</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Progress Banner */}
      {progress && (
        <View style={styles.progressBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      )}

      {/* Import Statistics */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Gambling Transactions</Text>
            <Text style={[styles.statValue, { color: '#ff3b30' }]}>
              {stats.gamblingTransactions} ({stats.gamblingPercentage}%)
            </Text>
          </View>
          {stats.oldestDate && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Date Range</Text>
              <Text style={styles.statValue}>
                {new Date(stats.oldestDate).toLocaleDateString()} - {new Date(stats.newestDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Baseline Analysis */}
      {baseline && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gambling Baseline</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Weekly Loss</Text>
            <Text style={[styles.statValue, { color: '#ff3b30' }]}>
              ${baseline.averageWeekly?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Monthly Loss</Text>
            <Text style={[styles.statValue, { color: '#ff3b30' }]}>
              ${baseline.averageMonthly?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Projected Yearly Savings</Text>
            <Text style={[styles.statValue, { color: '#34c759' }]}>
              ${baseline.projectedYearlySavings?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Primary Trigger</Text>
            <Text style={styles.statValue}>{baseline.primaryTrigger || 'Unknown'}</Text>
          </View>
        </View>
      )}

      {/* Risk Profile */}
      {riskProfile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk Profile</Text>
          <View style={styles.riskLevelContainer}>
            <View style={[styles.riskLevelBadge, { backgroundColor: getRiskLevelColor(riskProfile.riskLevel) }]}>
              <Text style={styles.riskLevelText}>{riskProfile.riskLevel}</Text>
            </View>
            <View style={styles.riskScoreContainer}>
              <Text style={styles.riskScoreLabel}>Risk Score</Text>
              <Text style={styles.riskScoreValue}>{riskProfile.riskScore}/100</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Primary Gambling Type</Text>
            <Text style={styles.statValue}>{riskProfile.primaryType}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Success Probability</Text>
            <Text style={[styles.statValue, { color: '#34c759' }]}>
              {riskProfile.successProbability}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Recommended Commitment</Text>
            <Text style={styles.statValue}>{riskProfile.commitmentPeriod?.days} days</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Guardian Importance</Text>
            <Text style={styles.statValue}>{riskProfile.guardianImportance?.importance}</Text>
          </View>
        </View>
      )}

      {/* Import Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={[styles.actionButton, importing && styles.actionButtonDisabled]}
          onPress={startImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {importing ? 'Importing...' : 'Import Up Bank History'}
          </Text>
        </TouchableOpacity>

        {stats && stats.totalTransactions > 0 && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, analyzing && styles.actionButtonDisabled]}
              onPress={analyzeBaseline}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="analytics-outline" size={24} color="#007AFF" />
              )}
              <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                {analyzing ? 'Analyzing...' : 'Analyze Baseline'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, generatingProfile && styles.actionButtonDisabled]}
              onPress={generateProfile}
              disabled={generatingProfile}
            >
              {generatingProfile ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="person-outline" size={24} color="#007AFF" />
              )}
              <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                {generatingProfile ? 'Generating...' : 'Generate Risk Profile'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Information */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>About Import</Text>
          <Text style={styles.infoDescription}>
            Import your Up Bank transaction history to analyze your gambling patterns.
            Anchor will identify gambling transactions with 95% accuracy and help you
            understand your triggers and patterns.
          </Text>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Import Period (years)</Text>
            <TextInput
              style={styles.input}
              value={importYears}
              onChangeText={setImportYears}
              keyboardType="numeric"
              placeholder="2"
              placeholderTextColor="#8e8e93"
            />
            <Text style={styles.inputHelp}>
              How many years of transaction history to import (max 2 years)
            </Text>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  progressBanner: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#1c1c1e',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    color: '#8e8e93',
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  riskLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  riskLevelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  riskScoreContainer: {
    flex: 1,
  },
  riskScoreLabel: {
    color: '#8e8e93',
    fontSize: 12,
  },
  riskScoreValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  inputHelp: {
    color: '#8e8e93',
    fontSize: 14,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
