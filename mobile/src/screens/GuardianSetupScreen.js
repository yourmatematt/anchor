/**
 * Guardian Setup Screen
 *
 * Onboarding flow to add a financial guardian
 * Collects guardian details and sends invitation SMS
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { USER_ID } from '../constants';

const GuardianSetupScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Guardian details
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationship, setRelationship] = useState('friend');
  const [commitmentMonths, setCommitmentMonths] = useState(12);

  // Notification preferences
  const [notifyPaymentRequests, setNotifyPaymentRequests] = useState(true);
  const [notifyDeclined, setNotifyDeclined] = useState(true);
  const [notifyGambling, setNotifyGambling] = useState(true);
  const [notifyPaydayLoans, setNotifyPaydayLoans] = useState(true);
  const [notifyRelapse, setNotifyRelapse] = useState(true);
  const [notifyMilestones, setNotifyMilestones] = useState(true);

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      if (!guardianName.trim()) {
        Alert.alert('Error', 'Please enter your guardian\'s name');
        return;
      }
      if (!guardianPhone.trim()) {
        Alert.alert('Error', 'Please enter your guardian\'s phone number');
        return;
      }
      // Validate phone number format
      const phoneRegex = /^(\+61|0)[4-9]\d{8}$/;
      if (!phoneRegex.test(guardianPhone.replace(/\s/g, ''))) {
        Alert.alert('Error', 'Please enter a valid Australian mobile number');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Calculate commitment dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + commitmentMonths);

      // Create guardian record
      const guardianData = {
        user_id: USER_ID,
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.replace(/\s/g, ''),
        guardian_email: guardianEmail.trim() || null,
        relationship,
        notify_on_payment_requests: notifyPaymentRequests,
        notify_on_declined_requests: notifyDeclined,
        notify_on_gambling_triggers: notifyGambling,
        notify_on_payday_loans: notifyPaydayLoans,
        notify_on_relapse: notifyRelapse,
        notify_on_clean_milestones: notifyMilestones,
        active: true,
        commitment_start_date: startDate.toISOString().split('T')[0],
        commitment_end_date: endDate.toISOString().split('T')[0],
        invite_status: 'pending'
      };

      // Save to database via API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/guardian/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guardianData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create guardian');
      }

      // Send invitation SMS
      const inviteResponse = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/guardian/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardian_id: result.guardian.id
        })
      });

      if (!inviteResponse.ok) {
        console.warn('Failed to send invite SMS, but guardian created');
      }

      setLoading(false);

      Alert.alert(
        'Guardian Added!',
        `${guardianName} has been added as your guardian. An invitation SMS has been sent to their phone.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );

    } catch (error) {
      console.error('Error setting up guardian:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to set up guardian. Please try again.');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Who's your guardian?</Text>
      <Text style={styles.subtitle}>
        Choose someone you trust to receive notifications about your spending and recovery progress.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Guardian's Name"
        value={guardianName}
        onChangeText={setGuardianName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 0412 345 678)"
        value={guardianPhone}
        onChangeText={setGuardianPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Email (Optional)"
        value={guardianEmail}
        onChangeText={setGuardianEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Relationship:</Text>
      <View style={styles.relationshipButtons}>
        {['friend', 'family', 'sponsor', 'other'].map((rel) => (
          <TouchableOpacity
            key={rel}
            style={[
              styles.relationshipButton,
              relationship === rel && styles.relationshipButtonActive
            ]}
            onPress={() => setRelationship(rel)}
          >
            <Text style={[
              styles.relationshipButtonText,
              relationship === rel && styles.relationshipButtonTextActive
            ]}>
              {rel.charAt(0).toUpperCase() + rel.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Commitment Period</Text>
      <Text style={styles.subtitle}>
        How long will {guardianName} be your guardian?
      </Text>

      <View style={styles.commitmentButtons}>
        {[6, 12, 18, 24].map((months) => (
          <TouchableOpacity
            key={months}
            style={[
              styles.commitmentButton,
              commitmentMonths === months && styles.commitmentButtonActive
            ]}
            onPress={() => setCommitmentMonths(months)}
          >
            <Text style={[
              styles.commitmentButtonText,
              commitmentMonths === months && styles.commitmentButtonTextActive
            ]}>
              {months} months
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.dateInfo}>
        Start: {new Date().toLocaleDateString()}
      </Text>
      <Text style={styles.dateInfo}>
        End: {new Date(Date.now() + commitmentMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Notification Settings</Text>
      <Text style={styles.subtitle}>
        What should {guardianName} be notified about?
      </Text>

      <View style={styles.notificationsList}>
        <NotificationToggle
          label="Payment Requests"
          description="When you request money"
          value={notifyPaymentRequests}
          onValueChange={setNotifyPaymentRequests}
        />
        <NotificationToggle
          label="Declined Requests"
          description="When AI denies a payment"
          value={notifyDeclined}
          onValueChange={setNotifyDeclined}
        />
        <NotificationToggle
          label="Gambling Triggers"
          description="Non-whitelisted transactions"
          value={notifyGambling}
          onValueChange={setNotifyGambling}
        />
        <NotificationToggle
          label="Payday Loans"
          description="CRITICAL: Predatory lending detected"
          value={notifyPaydayLoans}
          onValueChange={setNotifyPaydayLoans}
        />
        <NotificationToggle
          label="Relapse Events"
          description="When clean streak ends"
          value={notifyRelapse}
          onValueChange={setNotifyRelapse}
        />
        <NotificationToggle
          label="Clean Milestones"
          description="30/60/90 day achievements"
          value={notifyMilestones}
          onValueChange={setNotifyMilestones}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Send Invitation</Text>
      <Text style={styles.subtitle}>
        We'll send an SMS to {guardianName} asking them to accept being your guardian.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Guardian:</Text>
        <Text style={styles.summaryValue}>{guardianName}</Text>

        <Text style={styles.summaryLabel}>Phone:</Text>
        <Text style={styles.summaryValue}>{guardianPhone}</Text>

        {guardianEmail && (
          <>
            <Text style={styles.summaryLabel}>Email:</Text>
            <Text style={styles.summaryValue}>{guardianEmail}</Text>
          </>
        )}

        <Text style={styles.summaryLabel}>Relationship:</Text>
        <Text style={styles.summaryValue}>{relationship.charAt(0).toUpperCase() + relationship.slice(1)}</Text>

        <Text style={styles.summaryLabel}>Commitment:</Text>
        <Text style={styles.summaryValue}>{commitmentMonths} months</Text>
      </View>

      <Text style={styles.invitePreview}>
        They'll receive:{'\n\n'}
        "Hi {guardianName},{'\n\n'}
        Matt has chosen you as his financial guardian for the next {commitmentMonths} months through Anchor, a gambling accountability app.{'\n\n'}
        You'll receive occasional SMS/email alerts when he requests money or shows risky patterns.{'\n\n'}
        Reply YES to accept."
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive
              ]}
            />
          ))}
        </View>

        {/* Render current step */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={step === 4 ? handleSubmit : handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 4 ? 'Send Invite' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const NotificationToggle = ({ label, description, value, onValueChange }) => (
  <View style={styles.notificationItem}>
    <View style={styles.notificationInfo}>
      <Text style={styles.notificationLabel}>{label}</Text>
      <Text style={styles.notificationDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
      thumbColor="#FFF"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  relationshipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  relationshipButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  relationshipButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  relationshipButtonTextActive: {
    color: '#FFF',
  },
  commitmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  commitmentButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  commitmentButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  commitmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  commitmentButtonTextActive: {
    color: '#FFF',
  },
  dateInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryBox: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  invitePreview: {
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default GuardianSetupScreen;
