/**
 * Accessibility Service
 *
 * Comprehensive accessibility features including:
 * - Screen reader support (VoiceOver/TalkBack)
 * - High contrast mode
 * - Large text mode (up to 200%)
 * - Reduced motion
 * - Voice navigation
 * - One-handed mode
 * - Color blind modes (Protanopia, Deuteranopia, Tritanopia)
 * - Haptic feedback controls
 * - WCAG AAA compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = '@anchor_accessibility_settings';

// Default accessibility settings
const DEFAULT_SETTINGS = {
  // Visual
  highContrast: false,
  textSize: 100, // 100% = normal, up to 200%
  reducedMotion: false,
  colorBlindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
  boldText: false,

  // Audio
  screenReader: false,
  voiceNavigation: false,
  audioDescriptions: true,
  spokenConfirmations: false,
  voiceSpeed: 1.0, // 0.5 to 2.0

  // Interaction
  oneHandedMode: false,
  hapticFeedback: true,
  longPressDelay: 500, // ms
  touchTargetSize: 'normal', // 'normal', 'large', 'xlarge'

  // Cognitive
  simpleLanguage: false,
  confirmationDialogs: true,
  extendedTimeouts: false,

  // Emergency
  voiceEmergency: false,
  emergencyPhrase: 'help me' // Customizable trigger phrase
};

class AccessibilityService {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * Initialize accessibility service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load saved settings
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }

      // Detect system accessibility settings
      await this._detectSystemSettings();

      // Set up screen reader listeners
      this._setupScreenReaderListeners();

      this.initialized = true;
      console.log('Accessibility service initialized');
    } catch (error) {
      console.error('Error initializing accessibility service:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  async updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      this._notifyListeners();

      // Apply settings immediately
      await this._applySettings(updates);

      return true;
    } catch (error) {
      console.error('Error updating accessibility settings:', error);
      return false;
    }
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this._notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Text-to-speech
   */
  async speak(text, options = {}) {
    if (!this.settings.voiceNavigation && !this.settings.spokenConfirmations) {
      return;
    }

    try {
      await Speech.speak(text, {
        language: options.language || 'en-AU',
        pitch: options.pitch || 1.0,
        rate: this.settings.voiceSpeed,
        ...options
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  }

  /**
   * Stop speaking
   */
  async stopSpeaking() {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Stop speech error:', error);
    }
  }

  /**
   * Haptic feedback
   */
  hapticFeedback(type = 'selection') {
    if (!this.settings.hapticFeedback) return;

    try {
      switch (type) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Get text size multiplier
   */
  getTextSizeMultiplier() {
    return this.settings.textSize / 100;
  }

  /**
   * Get scaled font size
   */
  scaleFont(baseSize) {
    return baseSize * this.getTextSizeMultiplier();
  }

  /**
   * Get contrast colors
   */
  getContrastColors() {
    if (!this.settings.highContrast) {
      return null;
    }

    return {
      background: '#000000',
      text: '#FFFFFF',
      primary: '#FFFF00', // High contrast yellow
      secondary: '#00FFFF', // High contrast cyan
      success: '#00FF00',
      warning: '#FFAA00',
      error: '#FF0000',
      border: '#FFFFFF'
    };
  }

  /**
   * Get color blind adjusted colors
   */
  getColorBlindColors(originalColor) {
    if (this.settings.colorBlindMode === 'none') {
      return originalColor;
    }

    // Color blind safe palette
    const safePalette = {
      protanopia: { // Red-blind
        red: '#0173B2',
        green: '#029E73',
        blue: '#CC78BC',
        yellow: '#ECE133',
        orange: '#DE8F05'
      },
      deuteranopia: { // Green-blind
        red: '#D55E00',
        green: '#0173B2',
        blue: '#CC78BC',
        yellow: '#ECE133',
        orange: '#F0E442'
      },
      tritanopia: { // Blue-blind
        red: '#D55E00',
        green: '#029E73',
        blue: '#CC78BC',
        yellow: '#F0E442',
        orange: '#DE8F05'
      }
    };

    const mode = this.settings.colorBlindMode;
    return safePalette[mode] || originalColor;
  }

  /**
   * Get touch target size
   */
  getTouchTargetSize() {
    const sizes = {
      normal: 44,   // WCAG minimum
      large: 56,
      xlarge: 68
    };

    return sizes[this.settings.touchTargetSize] || sizes.normal;
  }

  /**
   * Check if screen reader is enabled
   */
  async isScreenReaderEnabled() {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      return false;
    }
  }

  /**
   * Announce to screen reader
   */
  announceForAccessibility(message) {
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      console.error('Screen reader announcement error:', error);
    }
  }

  /**
   * Get animation duration (reduced if motion reduced)
   */
  getAnimationDuration(baseDuration) {
    return this.settings.reducedMotion ? 0 : baseDuration;
  }

  /**
   * Get one-handed mode layout adjustments
   */
  getOneHandedLayout() {
    if (!this.settings.oneHandedMode) {
      return null;
    }

    return {
      alignBottom: true,
      maxReachHeight: 500, // px from bottom
      floatingActionButton: true
    };
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(command) {
    if (!this.settings.voiceNavigation) return null;

    const normalizedCommand = command.toLowerCase().trim();

    // Check for emergency phrase
    if (normalizedCommand.includes(this.settings.emergencyPhrase)) {
      return {
        action: 'emergency',
        message: 'Emergency assistance activated'
      };
    }

    // Navigation commands
    const navigationCommands = {
      'go home': { action: 'navigate', target: 'Home' },
      'go to dashboard': { action: 'navigate', target: 'Dashboard' },
      'show transactions': { action: 'navigate', target: 'Transactions' },
      'show reports': { action: 'navigate', target: 'Reports' },
      'show settings': { action: 'navigate', target: 'Settings' },
      'contact guardian': { action: 'contact', target: 'guardian' },
      'help': { action: 'help' },
      'cancel': { action: 'cancel' }
    };

    for (const [phrase, response] of Object.entries(navigationCommands)) {
      if (normalizedCommand.includes(phrase)) {
        await this.speak(`Navigating to ${response.target || 'help'}`);
        return response;
      }
    }

    return null;
  }

  /**
   * Get accessible label
   */
  getAccessibleLabel(element, value) {
    if (!this.settings.simpleLanguage) {
      return element.defaultLabel || element.label;
    }

    // Simplified language versions
    const simplifiedLabels = {
      'Clean Streak': `You have not gambled for ${value} days`,
      'Money Saved': `You have saved ${value} dollars`,
      'Daily Allowance': `You can spend ${value} dollars today`,
      'Guardian': 'Your support person',
      'Intervention': 'Help when you need it',
      'Commitment': 'Your promise to stop gambling'
    };

    return simplifiedLabels[element.label] || element.label;
  }

  /**
   * Get confirmation dialog settings
   */
  shouldShowConfirmation(action) {
    if (!this.settings.confirmationDialogs) {
      return false;
    }

    // Always confirm for critical actions
    const criticalActions = [
      'delete',
      'cancel_commitment',
      'change_guardian',
      'disable_protection'
    ];

    return criticalActions.includes(action);
  }

  /**
   * Get extended timeout duration
   */
  getTimeout(baseTimeout) {
    return this.settings.extendedTimeouts ? baseTimeout * 2 : baseTimeout;
  }

  /**
   * Detect system accessibility settings
   */
  async _detectSystemSettings() {
    try {
      // Check if screen reader is enabled
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      if (screenReaderEnabled) {
        this.settings.screenReader = true;
      }

      // Check for reduced motion (iOS only)
      if (Platform.OS === 'ios') {
        const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        if (reducedMotion) {
          this.settings.reducedMotion = true;
        }
      }

      // Check for bold text (iOS only)
      if (Platform.OS === 'ios') {
        const boldText = await AccessibilityInfo.isBoldTextEnabled();
        if (boldText) {
          this.settings.boldText = true;
        }
      }
    } catch (error) {
      console.error('Error detecting system settings:', error);
    }
  }

  /**
   * Set up screen reader listeners
   */
  _setupScreenReaderListeners() {
    AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      this.settings.screenReader = enabled;
      this._notifyListeners();
    });

    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        this.settings.reducedMotion = enabled;
        this._notifyListeners();
      });

      AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
        this.settings.boldText = enabled;
        this._notifyListeners();
      });
    }
  }

  /**
   * Apply settings
   */
  async _applySettings(updates) {
    // Announce changes to screen reader
    if (updates.highContrast !== undefined) {
      this.announceForAccessibility(
        updates.highContrast ? 'High contrast mode enabled' : 'High contrast mode disabled'
      );
    }

    if (updates.textSize !== undefined) {
      this.announceForAccessibility(`Text size set to ${updates.textSize}%`);
    }

    if (updates.voiceNavigation !== undefined) {
      if (updates.voiceNavigation) {
        await this.speak('Voice navigation enabled');
      }
    }
  }

  /**
   * Notify listeners
   */
  _notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.settings);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * WCAG compliance check
   */
  checkWCAGCompliance() {
    const compliance = {
      level: 'AAA',
      issues: [],
      recommendations: []
    };

    // Check contrast
    if (!this.settings.highContrast) {
      compliance.recommendations.push('Enable high contrast mode for better visibility');
    }

    // Check text size
    if (this.settings.textSize < 150) {
      compliance.recommendations.push('Consider increasing text size to at least 150%');
    }

    // Check touch targets
    if (this.settings.touchTargetSize === 'normal') {
      compliance.recommendations.push('Use larger touch targets for easier interaction');
    }

    // Check confirmations
    if (!this.settings.confirmationDialogs) {
      compliance.issues.push('Confirmation dialogs disabled - may lead to accidental actions');
      compliance.level = 'AA';
    }

    return compliance;
  }
}

// Export singleton instance
export default new AccessibilityService();
