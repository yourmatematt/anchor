/**
 * Deep Linking Service
 * Handles deep links for guardian invites, conversations, and emergency triggers
 *
 * Supported URLs:
 * - anchor://guardian-invite/[token] - Accept guardian invitation
 * - anchor://ai-conversation/[id] - Open specific conversation
 * - anchor://emergency - Emergency check-in
 */

import * as Linking from 'expo-linking';

class DeepLinkingService {
  constructor() {
    this.listeners = [];
    this.subscription = null;
  }

  /**
   * Initialize deep linking
   */
  async initialize(navigation) {
    this.navigation = navigation;

    // Get initial URL (if app was opened from a link)
    const initialUrl = await Linking.getInitialURL();

    if (initialUrl) {
      this.handleUrl(initialUrl);
    }

    // Listen for URL changes
    this.subscription = Linking.addEventListener('url', ({ url }) => {
      this.handleUrl(url);
    });

    return initialUrl;
  }

  /**
   * Handle deep link URL
   */
  handleUrl(url) {
    if (!url) return;

    console.log('Deep link received:', url);

    const parsed = Linking.parse(url);
    const { hostname, path, queryParams } = parsed;

    // Handle different deep link types
    if (hostname === 'guardian-invite') {
      this.handleGuardianInvite(path, queryParams);
    } else if (hostname === 'ai-conversation') {
      this.handleAIConversation(path, queryParams);
    } else if (hostname === 'emergency') {
      this.handleEmergency(queryParams);
    } else if (hostname === 'payment-request') {
      this.handlePaymentRequest(path, queryParams);
    } else {
      console.warn('Unknown deep link hostname:', hostname);
    }

    // Notify listeners
    this._notifyListeners({ url, parsed });
  }

  /**
   * Handle guardian invitation link
   * anchor://guardian-invite/[token]
   */
  handleGuardianInvite(path, queryParams) {
    const token = path?.replace('/', '') || queryParams?.token;

    if (!token) {
      console.error('Guardian invite token missing');
      return;
    }

    // Navigate to guardian invite acceptance screen
    if (this.navigation) {
      this.navigation.navigate('GuardianInviteAccept', { token });
    }
  }

  /**
   * Handle AI conversation link
   * anchor://ai-conversation/[conversationId]
   */
  handleAIConversation(path, queryParams) {
    const conversationId = path?.replace('/', '') || queryParams?.id;

    if (!conversationId) {
      console.error('Conversation ID missing');
      return;
    }

    // Navigate to AI conversation screen
    if (this.navigation) {
      this.navigation.navigate('AIConversation', { conversationId });
    }
  }

  /**
   * Handle emergency check-in link
   * anchor://emergency?reason=...
   */
  handleEmergency(queryParams) {
    const reason = queryParams?.reason || 'Guardian triggered emergency check-in';

    // Navigate to emergency check-in screen
    if (this.navigation) {
      this.navigation.navigate('EmergencyCheckIn', { reason });
    }
  }

  /**
   * Handle payment request link
   * anchor://payment-request/[requestId]
   */
  handlePaymentRequest(path, queryParams) {
    const requestId = path?.replace('/', '') || queryParams?.id;

    if (!requestId) {
      console.error('Payment request ID missing');
      return;
    }

    // Navigate to payment request screen
    if (this.navigation) {
      this.navigation.navigate('PaymentEvaluation', { paymentRequestId: requestId });
    }
  }

  /**
   * Create guardian invite deep link
   */
  createGuardianInviteLink(token) {
    return Linking.createURL('guardian-invite', {
      queryParams: { token },
    });
  }

  /**
   * Create AI conversation deep link
   */
  createConversationLink(conversationId) {
    return Linking.createURL('ai-conversation', {
      queryParams: { id: conversationId },
    });
  }

  /**
   * Create emergency check-in deep link
   */
  createEmergencyLink(reason) {
    return Linking.createURL('emergency', {
      queryParams: { reason },
    });
  }

  /**
   * Create payment request deep link
   */
  createPaymentRequestLink(requestId) {
    return Linking.createURL('payment-request', {
      queryParams: { id: requestId },
    });
  }

  /**
   * Open external URL (for crisis resources)
   */
  async openExternalUrl(url) {
    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
    }
  }

  /**
   * Open phone dialer
   */
  async callPhoneNumber(phoneNumber) {
    const url = `tel:${phoneNumber}`;
    await this.openExternalUrl(url);
  }

  /**
   * Open SMS
   */
  async sendSMS(phoneNumber, message) {
    const url = `sms:${phoneNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
    await this.openExternalUrl(url);
  }

  /**
   * Register listener for deep link events
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  _notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.subscription) {
      this.subscription.remove();
    }
  }
}

// Singleton instance
const DeepLinking = new DeepLinkingService();

export default DeepLinking;

// Crisis resource numbers (quick access)
export const CRISIS_NUMBERS = {
  GAMBLING_HELP: '1800858858',
  LIFELINE: '131114',
};
