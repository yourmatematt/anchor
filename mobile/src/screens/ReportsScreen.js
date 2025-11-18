import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { generateReport, listReports, downloadReport, updateConsent } from '../services/api';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [hasConsent, setHasConsent] = useState(false);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    loadReports();
    checkConsent();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await listReports(user.id);
      setReports(response.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const checkConsent = async () => {
    try {
      const response = await getConsentStatus(user.id);
      setHasConsent(response.hasConsent);
    } catch (error) {
      console.error('Error checking consent:', error);
    }
  };

  const handleGenerateReport = async (reportType, options = {}) => {
    if (!hasConsent) {
      Alert.alert(
        'Consent Required',
        'Please enable report generation in Privacy Settings first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setGenerating(reportType);

      const result = await generateReport({
        userId: user.id,
        reportType,
        options: {
          ...options,
          email: false // Don't email by default
        }
      });

      Alert.alert(
        'Success',
        'Report generated successfully!',
        [
          { text: 'View Now', onPress: () => handleDownloadReport(result.reportId) },
          { text: 'Later', style: 'cancel' }
        ]
      );

      // Refresh reports list
      await loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', error.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const report = await downloadReport(reportId);

      // Open PDF or share
      Alert.alert(
        'Report Ready',
        'How would you like to access this report?',
        [
          { text: 'Open PDF', onPress: () => openPDF(report.pdfUrl) },
          { text: 'Share', onPress: () => shareReport(report) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const openPDF = (url) => {
    // TODO: Implement PDF viewer
    Alert.alert('Info', 'PDF viewer not implemented yet');
  };

  const shareReport = async (report) => {
    try {
      await Share.share({
        message: `Anchor Report: ${report.reportType}`,
        url: report.pdfUrl
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const handleEnableConsent = async () => {
    try {
      await updateConsent(user.id, true);
      setHasConsent(true);
      Alert.alert('Success', 'Report generation enabled');
    } catch (error) {
      console.error('Error enabling consent:', error);
      Alert.alert('Error', 'Failed to enable report generation');
    }
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>
          Generate tax, financial counseling, and debt reports
        </Text>
      </View>

      {/* Consent Status */}
      {!hasConsent && (
        <View style={styles.consentBox}>
          <Icon name="lock" size={24} color="#E74C3C" />
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>Report Generation Disabled</Text>
            <Text style={styles.consentDescription}>
              Enable report generation in Privacy Settings to continue
            </Text>
          </View>
          <TouchableOpacity style={styles.enableButton} onPress={handleEnableConsent}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate New Report</Text>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => handleGenerateReport('tax_report', {
            financialYear: new Date().getFullYear(),
            digitalSignature: true,
            csvExport: true
          })}
          disabled={!hasConsent || generating !== null}
        >
          <View style={styles.reportIcon}>
            <Icon name="file-document" size={32} color="#3498DB" />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportName}>Tax Report</Text>
            <Text style={styles.reportDescription}>
              ATO-compliant gambling losses summary
            </Text>
            <Text style={styles.reportDetails}>
              Includes: CSV export, digital signature, FY breakdown
            </Text>
          </View>
          {generating === 'tax_report' && (
            <ActivityIndicator size="small" color="#3498DB" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => handleGenerateReport('counselor_report', {
            comprehensive: true,
            includePatterns: true
          })}
          disabled={!hasConsent || generating !== null}
        >
          <View style={styles.reportIcon}>
            <Icon name="account-supervisor" size={32} color="#9B59B6" />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportName}>Financial Counselor Report</Text>
            <Text style={styles.reportDescription}>
              Comprehensive 10-page assessment
            </Text>
            <Text style={styles.reportDetails}>
              Includes: Debt analysis, recovery metrics, recommendations
            </Text>
          </View>
          {generating === 'counselor_report' && (
            <ActivityIndicator size="small" color="#9B59B6" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => handleGenerateReport('debt_summary', {
            includeProjections: true,
            includeStrategies: true
          })}
          disabled={!hasConsent || generating !== null}
        >
          <View style={styles.reportIcon}>
            <Icon name="credit-card-outline" size={32} color="#E74C3C" />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportName}>Debt Summary</Text>
            <Text style={styles.reportDescription}>
              Payoff projections and strategies
            </Text>
            <Text style={styles.reportDetails}>
              Includes: Avalanche vs snowball, interest savings
            </Text>
          </View>
          {generating === 'debt_summary' && (
            <ActivityIndicator size="small" color="#E74C3C" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => handleGenerateReport('monthly_summary')}
          disabled={!hasConsent || generating !== null}
        >
          <View style={styles.reportIcon}>
            <Icon name="calendar-month" size={32} color="#2ECC71" />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportName}>Monthly Summary</Text>
            <Text style={styles.reportDescription}>
              This month's financial overview
            </Text>
            <Text style={styles.reportDetails}>
              Includes: Transactions, savings, recovery progress
            </Text>
          </View>
          {generating === 'monthly_summary' && (
            <ActivityIndicator size="small" color="#2ECC71" />
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyText}>No reports generated yet</Text>
            <Text style={styles.emptySubtext}>
              Generate your first report using the options above
            </Text>
          </View>
        ) : (
          reports.map(report => (
            <TouchableOpacity
              key={report.id}
              style={styles.historyCard}
              onPress={() => handleDownloadReport(report.id)}
            >
              <View style={styles.historyIcon}>
                <Icon name="file-pdf-box" size={24} color="#E74C3C" />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>
                  {formatReportType(report.report_type)}
                </Text>
                <Text style={styles.historyDate}>
                  Generated: {new Date(report.generated_at).toLocaleDateString('en-AU')}
                </Text>
                <Text style={styles.historyExpiry}>
                  Expires: {new Date(report.expires_at).toLocaleDateString('en-AU')}
                </Text>
              </View>
              <Icon name="download" size={20} color="#3498DB" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Icon name="information" size={20} color="#3498DB" />
        <Text style={styles.infoText}>
          Reports are securely stored for 7 years for tax compliance. All reports are encrypted and watermarked.
        </Text>
      </View>
    </ScrollView>
  );
}

function formatReportType(type) {
  const types = {
    'tax_report': 'Tax Report',
    'counselor_report': 'Financial Counselor Report',
    'debt_summary': 'Debt Summary',
    'monthly_summary': 'Monthly Summary',
    'quarterly_report': 'Quarterly Report',
    'annual_report': 'Annual Report'
  };
  return types[type] || type;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D'
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D'
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C'
  },
  consentText: {
    flex: 1,
    marginLeft: 12
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4
  },
  consentDescription: {
    fontSize: 14,
    color: '#7F8C8D'
  },
  enableButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  reportInfo: {
    flex: 1
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4
  },
  reportDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4
  },
  reportDetails: {
    fontSize: 12,
    color: '#95A5A6'
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  historyIcon: {
    marginRight: 12
  },
  historyInfo: {
    flex: 1
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4
  },
  historyDate: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 2
  },
  historyExpiry: {
    fontSize: 12,
    color: '#95A5A6'
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 12,
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center'
  },
  infoBox: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB'
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20
  }
});
