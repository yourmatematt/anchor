/**
 * API Translation Service
 *
 * Provides translations for API responses, SMS, emails, and notifications
 * Supports: English, Chinese, Vietnamese, Arabic
 */

// Language files
const translations = {
  en: require('./locales/en'),
  zh: require('./locales/zh'),
  vi: require('./locales/vi'),
  ar: require('./locales/ar')
};

class APITranslationService {
  constructor() {
    this.defaultLanguage = 'en';
  }

  /**
   * Translate a key
   */
  t(key, language = 'en', params = {}) {
    const locale = translations[language] || translations[this.defaultLanguage];

    const keys = key.split('.');
    let value = locale;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing: ${key} for language: ${language}`);
        return key;
      }
    }

    return this._replaceParams(value, params);
  }

  /**
   * Translate with pluralization
   */
  tc(key, count, language = 'en', params = {}) {
    const translation = this.t(key, language, { count, ...params });

    if (typeof translation === 'object') {
      return this._pluralize(translation, count, params);
    }

    return translation;
  }

  /**
   * Translate SMS message
   */
  translateSMS(templateKey, language, data) {
    return this.t(`sms.${templateKey}`, language, data);
  }

  /**
   * Translate email subject/body
   */
  translateEmail(templateKey, language, data) {
    return {
      subject: this.t(`email.${templateKey}.subject`, language, data),
      body: this.t(`email.${templateKey}.body`, language, data)
    };
  }

  /**
   * Translate notification
   */
  translateNotification(type, language, data) {
    return {
      title: this.t(`notifications.${type}.title`, language, data),
      body: this.t(`notifications.${type}.body`, language, data)
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'zh', name: 'Chinese', nativeName: '简体中文' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];
  }

  /**
   * Format currency based on language
   */
  formatCurrency(amount, language = 'en') {
    const locales = {
      en: 'en-AU',
      zh: 'zh-Hans',
      vi: 'vi-VN',
      ar: 'ar-SA'
    };

    return new Intl.NumberFormat(locales[language] || 'en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  }

  /**
   * Format number based on language
   */
  formatNumber(number, language = 'en') {
    const locales = {
      en: 'en-AU',
      zh: 'zh-Hans',
      vi: 'vi-VN',
      ar: 'ar-SA'
    };

    return new Intl.NumberFormat(locales[language] || 'en-AU').format(number);
  }

  /**
   * Format date based on language
   */
  formatDate(date, language = 'en', format = 'short') {
    const locales = {
      en: 'en-AU',
      zh: 'zh-Hans',
      vi: 'vi-VN',
      ar: 'ar-SA'
    };

    const formats = {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' }
    };

    return new Intl.DateTimeFormat(
      locales[language] || 'en-AU',
      formats[format] || formats.short
    ).format(new Date(date));
  }

  /**
   * Replace parameters in string
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
}

// Export singleton
module.exports = new APITranslationService();

// Stub locale files for API (simplified versions)
const apiLocales = {
  en: {
    sms: {
      daily_checkin: 'Day {cleanStreak} clean. ${savedTotal} saved. Stay strong.',
      high_risk: "It's {time}. Your {pattern} pattern. Make different choices.",
      guardian_alert: 'Guardian alert: {userName} needs support. High-risk detected.'
    },
    email: {
      welcome: {
        subject: "You've locked in. Here's what happens now.",
        body: 'Welcome to Anchor. Your commitment: {commitmentDays} days.'
      }
    },
    notifications: {
      intervention: {
        title: 'High Risk Detected',
        body: 'AI intervention activated. Take a break.'
      }
    }
  },
  zh: {
    sms: {
      daily_checkin: '第{cleanStreak}天戒赌。已节省${savedTotal}。保持坚强。',
      high_risk: '现在是{time}。这是您的{pattern}模式。做出不同的选择。',
      guardian_alert: '监护人警报：{userName}需要支持。检测到高风险。'
    }
  },
  vi: {
    sms: {
      daily_checkin: 'Ngày {cleanStreak} sạch. Đã tiết kiệm ${savedTotal}. Giữ vững.',
      high_risk: 'Bây giờ là {time}. Đây là mẫu {pattern} của bạn. Hãy chọn khác.',
      guardian_alert: 'Cảnh báo người giám hộ: {userName} cần hỗ trợ. Phát hiện rủi ro cao.'
    }
  },
  ar: {
    sms: {
      daily_checkin: 'اليوم {cleanStreak} نظيف. تم توفير ${savedTotal}. ابق قوياً.',
      high_risk: 'الوقت الآن {time}. هذا نمطك {pattern}. اتخذ خيارات مختلفة.',
      guardian_alert: 'تنبيه الوصي: {userName} يحتاج إلى الدعم. تم اكتشاف خطر عالٍ.'
    }
  }
};

// Override require for simple locale access
translations.en = apiLocales.en;
translations.zh = apiLocales.zh;
translations.vi = apiLocales.vi;
translations.ar = apiLocales.ar;
