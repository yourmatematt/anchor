import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Slider,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AccessibilityService from '../services/accessibility';
import translationService, { t } from '../i18n/translations';

export default function AccessibilityScreen() {
  const [settings, setSettings] = useState(AccessibilityService.getSettings());

  useEffect(() => {
    const unsubscribe = AccessibilityService.subscribe(setSettings);
    return unsubscribe;
  }, []);

  const updateSetting = async (key, value) => {
    await AccessibilityService.updateSettings({ [key]: value });
    AccessibilityService.hapticFeedback('selection');
  };

  const handleReset = () => {
    Alert.alert(
      t('accessibility.reset_defaults'),
      t('confirmations.are_you_sure'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.ok'),
          onPress: async () => {
            await AccessibilityService.resetToDefaults();
            Alert.alert(t('common.success'), 'Settings reset successfully');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{t('accessibility.title')}</Text>

      {/* Visual Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accessibility.visual')}</Text>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.high_contrast')}</Text>
          <Switch
            value={settings.highContrast}
            onValueChange={v => updateSetting('highContrast', v)}
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.sliderContainer}>
            <Text style={styles.label}>{t('accessibility.text_size')}: {settings.textSize}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={200}
              step={10}
              value={settings.textSize}
              onValueChange={v => updateSetting('textSize', v)}
            />
          </View>
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.reduced_motion')}</Text>
          <Switch
            value={settings.reducedMotion}
            onValueChange={v => updateSetting('reducedMotion', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.color_blind_mode')}</Text>
          <View style={styles.pickerButtons}>
            {['none', 'protanopia', 'deuteranopia', 'tritanopia'].map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.pickerButton,
                  settings.colorBlindMode === mode && styles.pickerButtonActive
                ]}
                onPress={() => updateSetting('colorBlindMode', mode)}
              >
                <Text style={styles.pickerButtonText}>{t(`accessibility.${mode}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Audio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accessibility.audio')}</Text>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.voice_navigation')}</Text>
          <Switch
            value={settings.voiceNavigation}
            onValueChange={v => updateSetting('voiceNavigation', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.spoken_confirmations')}</Text>
          <Switch
            value={settings.spokenConfirmations}
            onValueChange={v => updateSetting('spokenConfirmations', v)}
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.sliderContainer}>
            <Text style={styles.label}>{t('accessibility.voice_speed')}: {settings.voiceSpeed}x</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={settings.voiceSpeed}
              onValueChange={v => updateSetting('voiceSpeed', v)}
            />
          </View>
        </View>
      </View>

      {/* Interaction Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accessibility.interaction')}</Text>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.one_handed_mode')}</Text>
          <Switch
            value={settings.oneHandedMode}
            onValueChange={v => updateSetting('oneHandedMode', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.haptic_feedback')}</Text>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={v => updateSetting('hapticFeedback', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.touch_target_size')}</Text>
          <View style={styles.pickerButtons}>
            {['normal', 'large', 'xlarge'].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.pickerButton,
                  settings.touchTargetSize === size && styles.pickerButtonActive
                ]}
                onPress={() => updateSetting('touchTargetSize', size)}
              >
                <Text style={styles.pickerButtonText}>
                  {t(`accessibility.${size === 'xlarge' ? 'extra_large' : size}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Cognitive Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accessibility.cognitive')}</Text>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.simple_language')}</Text>
          <Switch
            value={settings.simpleLanguage}
            onValueChange={v => updateSetting('simpleLanguage', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.confirmation_dialogs')}</Text>
          <Switch
            value={settings.confirmationDialogs}
            onValueChange={v => updateSetting('confirmationDialogs', v)}
          />
        </View>

        <View style={styles.setting}>
          <Text style={styles.label}>{t('accessibility.extended_timeouts')}</Text>
          <Switch
            value={settings.extendedTimeouts}
            onValueChange={v => updateSetting('extendedTimeouts', v)}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Icon name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.resetButtonText}>{t('accessibility.reset_defaults')}</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Icon name="information" size={20} color="#3498DB" />
        <Text style={styles.infoText}>
          These settings ensure Anchor is accessible to all users. WCAG AAA compliant.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA'
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1'
  },
  label: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1
  },
  sliderContainer: {
    flex: 1
  },
  slider: {
    width: '100%',
    marginTop: 8
  },
  pickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BDC3C7'
  },
  pickerButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB'
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#2C3E50'
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  info: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
    gap: 12
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20
  }
});
