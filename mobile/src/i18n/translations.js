/**
 * Translation System
 *
 * Multi-language support with:
 * - RTL language support (Arabic)
 * - Pluralization
 * - Number/date formatting
 * - Dynamic locale switching
 * - Fallback to English
 *
 * Supported languages:
 * - English (en)
 * - Simplified Chinese (zh)
 * - Vietnamese (vi)
 * - Arabic (ar)
 * - Greek (el)
 * - Italian (it)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

// Import locale files
import en from './locales/en.json';
import zh from './locales/zh.json';
import vi from './locales/vi.json';
import ar from './locales/ar.json';

const STORAGE_KEY = '@anchor_language';

// Available languages
const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false, locale: en },
  zh: { name: 'Chinese', nativeName: '简体中文', rtl: false, locale: zh },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, locale: vi },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, locale: ar }
};

class TranslationService {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = en;
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * Initialize translation service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load saved language
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES[saved]) {
        await this.setLanguage(saved);
      } else {
        // Detect system language
        const systemLanguage = this._detectSystemLanguage();
        if (systemLanguage && LANGUAGES[systemLanguage]) {
          await this.setLanguage(systemLanguage);
        }
      }

      this.initialized = true;
      console.log(`Translation service initialized: ${this.currentLanguage}`);
    } catch (error) {
      console.error('Error initializing translation service:', error);
    }
  }

  /**
   * Get translation
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing: ${key}`);
        return key;
      }
    }

    // Replace parameters
    if (typeof value === 'string') {
      return this._replaceParams(value, params);
    }

    return value;
  }

  /**
   * Get translation with pluralization
   */
  tc(key, count, params = {}) {
    const translation = this.t(key, { count, ...params });

    if (typeof translation === 'object') {
      return this._pluralize(translation, count, params);
    }

    return translation;
  }

  /**
   * Set current language
   */
  async setLanguage(code) {
    if (!LANGUAGES[code]) {
      console.error(`Language not supported: ${code}`);
      return false;
    }

    const language = LANGUAGES[code];

    // Set RTL if needed
    if (language.rtl && !I18nManager.isRTL) {
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    } else if (!language.rtl && I18nManager.isRTL) {
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }

    this.currentLanguage = code;
    this.translations = language.locale;

    // Save preference
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }

    // Notify listeners
    this._notifyListeners();

    return true;
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return Object.entries(LANGUAGES).map(([code, info]) => ({
      code,
      name: info.name,
      nativeName: info.nativeName,
      rtl: info.rtl
    }));
  }

  /**
   * Check if current language is RTL
   */
  isRTL() {
    return LANGUAGES[this.currentLanguage]?.rtl || false;
  }

  /**
   * Get language direction
   */
  getDirection() {
    return this.isRTL() ? 'rtl' : 'ltr';
  }

  /**
   * Format number based on locale
   */
  formatNumber(number, options = {}) {
    const locale = this._getLocaleCode();

    return new Intl.NumberFormat(locale, options).format(number);
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'AUD') {
    const locale = this._getLocaleCode();

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date, format = 'short') {
    const locale = this._getLocaleCode();

    const formats = {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    };

    return new Intl.DateTimeFormat(locale, formats[format] || formats.short).format(
      new Date(date)
    );
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    const locale = this._getLocaleCode();
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) {
      return this.formatDate(date, 'short');
    } else if (diffDays > 0) {
      return this.tc('common.days_ago', diffDays);
    } else if (diffHours > 0) {
      return this.tc('common.hours_ago', diffHours);
    } else if (diffMins > 0) {
      return this.tc('common.minutes_ago', diffMins);
    } else {
      return this.t('common.just_now');
    }
  }

  /**
   * Subscribe to language changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Replace parameters in translation
   */
  _replaceParams(text, params) {
    let result = text;

    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Pluralize translation
   */
  _pluralize(translations, count, params) {
    let key;

    if (count === 0 && translations.zero) {
      key = 'zero';
    } else if (count === 1) {
      key = 'one';
    } else {
      key = 'other';
    }

    const text = translations[key] || translations.other;
    return this._replaceParams(text, { count, ...params });
  }

  /**
   * Detect system language
   */
  _detectSystemLanguage() {
    try {
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const systemLang = locales[0].languageCode;

        // Map to supported languages
        const langMap = {
          'en': 'en',
          'zh': 'zh',
          'vi': 'vi',
          'ar': 'ar',
          'el': 'el',
          'it': 'it'
        };

        return langMap[systemLang] || 'en';
      }
    } catch (error) {
      console.error('Error detecting system language:', error);
    }

    return 'en';
  }

  /**
   * Get locale code for Intl
   */
  _getLocaleCode() {
    const localeCodes = {
      en: 'en-AU', // Australian English
      zh: 'zh-Hans', // Simplified Chinese
      vi: 'vi-VN', // Vietnamese
      ar: 'ar-SA' // Arabic
    };

    return localeCodes[this.currentLanguage] || 'en-AU';
  }

  /**
   * Notify listeners
   */
  _notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentLanguage);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

// Export singleton instance
const translationService = new TranslationService();

export default translationService;

// Export convenience functions
export const t = (key, params) => translationService.t(key, params);
export const tc = (key, count, params) => translationService.tc(key, count, params);
export const formatNumber = (number, options) => translationService.formatNumber(number, options);
export const formatCurrency = (amount, currency) => translationService.formatCurrency(amount, currency);
export const formatDate = (date, format) => translationService.formatDate(date, format);
export const formatRelativeTime = (date) => translationService.formatRelativeTime(date);
