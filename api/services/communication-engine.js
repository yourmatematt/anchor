/**
 * Communication Engine
 *
 * Main orchestrator for all SMS and email communications
 * Handles delivery, tracking, preferences, and scheduling
 */

const { renderSMS } = require('../templates/sms-templates');
const { renderEmail } = require('../templates/email-templates');
const emailSender = require('./email-sender');
const { checkPreferences, MANDATORY_NOTIFICATIONS } = require('./notification-preferences');

class CommunicationEngine {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.deliveryQueue = [];
  }

  /**
   * Send SMS to user
   */
  async sendUserSMS(userId, templateId, data, options = {}) {
    try {
      // Get user phone and preferences
      const { data: user } = await this.supabase
        .from('users')
        .select('phone, notification_preferences')
        .eq('id', userId)
        .single();

      if (!user || !user.phone) {
        throw new Error('User phone not found');
      }

      // Check if notification is allowed (unless mandatory)
      const category = templateId.toLowerCase();
      const isMandatory = MANDATORY_NOTIFICATIONS.includes(category);

      if (!isMandatory) {
        const allowed = checkPreferences(user.notification_preferences, 'sms', category);
        if (!allowed) {
          console.log(`SMS blocked by user preferences: ${templateId}`);
          return { blocked: true, reason: 'user_preferences' };
        }
      }

      // Render SMS
      const rendered = renderSMS('user', templateId, data);

      // Send via SMS service (Twilio/AWS SNS)
      const result = await this._sendSMS(user.phone, rendered.message, {
        critical: rendered.critical,
        userId,
        templateId,
        ...options
      });

      // Log delivery
      await this._logCommunication({
        user_id: userId,
        type: 'sms',
        template_id: templateId,
        recipient: user.phone,
        message: rendered.message,
        status: result.status,
        message_id: result.messageId,
        critical: rendered.critical,
        metadata: { ...data, ...options }
      });

      return result;
    } catch (error) {
      console.error('Error sending user SMS:', error);
      throw error;
    }
  }

  /**
   * Send SMS to guardian
   */
  async sendGuardianSMS(userId, guardianId, templateId, data, options = {}) {
    try {
      // Get guardian phone
      const { data: guardian } = await this.supabase
        .from('guardians')
        .select('phone, name')
        .eq('id', guardianId)
        .eq('user_id', userId)
        .single();

      if (!guardian || !guardian.phone) {
        throw new Error('Guardian phone not found');
      }

      // Render SMS
      const rendered = renderSMS('guardian', templateId, data);

      // Guardian notifications are always sent (no preference checking)
      const result = await this._sendSMS(guardian.phone, rendered.message, {
        critical: rendered.critical,
        userId,
        guardianId,
        templateId,
        ...options
      });

      // Log delivery
      await this._logCommunication({
        user_id: userId,
        guardian_id: guardianId,
        type: 'sms',
        template_id: templateId,
        recipient: guardian.phone,
        message: rendered.message,
        status: result.status,
        message_id: result.messageId,
        critical: rendered.critical,
        metadata: { ...data, ...options }
      });

      return result;
    } catch (error) {
      console.error('Error sending guardian SMS:', error);
      throw error;
    }
  }

  /**
   * Send email to user
   */
  async sendUserEmail(userId, templateId, data, options = {}) {
    try {
      // Get user email and preferences
      const { data: user } = await this.supabase
        .from('users')
        .select('email, name, notification_preferences')
        .eq('id', userId)
        .single();

      if (!user || !user.email) {
        throw new Error('User email not found');
      }

      // Check preferences
      const category = templateId.toLowerCase();
      const isMandatory = MANDATORY_NOTIFICATIONS.includes(category);

      if (!isMandatory) {
        const allowed = checkPreferences(user.notification_preferences, 'email', category);
        if (!allowed) {
          console.log(`Email blocked by user preferences: ${templateId}`);
          return { blocked: true, reason: 'user_preferences' };
        }
      }

      // Render email
      const rendered = renderEmail(templateId, {
        ...data,
        userName: user.name,
        unsubscribe_url: `${process.env.APP_URL}/preferences/unsubscribe?user=${userId}`
      });

      // Send via email service
      const result = await emailSender.send({
        to: user.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        userId,
        templateId,
        ...options
      });

      // Log delivery
      await this._logCommunication({
        user_id: userId,
        type: 'email',
        template_id: templateId,
        recipient: user.email,
        subject: rendered.subject,
        status: result.status,
        message_id: result.messageId,
        metadata: { ...data, ...options }
      });

      return result;
    } catch (error) {
      console.error('Error sending user email:', error);
      throw error;
    }
  }

  /**
   * Send system SMS (verification, etc.)
   */
  async sendSystemSMS(phone, templateId, data, options = {}) {
    try {
      const rendered = renderSMS('system', templateId, data);

      const result = await this._sendSMS(phone, rendered.message, {
        critical: rendered.critical,
        templateId,
        ...options
      });

      await this._logCommunication({
        type: 'sms',
        template_id: templateId,
        recipient: phone,
        message: rendered.message,
        status: result.status,
        message_id: result.messageId,
        critical: rendered.critical,
        metadata: { ...data, ...options }
      });

      return result;
    } catch (error) {
      console.error('Error sending system SMS:', error);
      throw error;
    }
  }

  /**
   * Send SMS (internal - uses configured SMS provider)
   */
  async _sendSMS(phone, message, options = {}) {
    // TODO: Integrate with Twilio or AWS SNS
    // For now, log to console
    console.log('SMS TO:', phone);
    console.log('MESSAGE:', message);
    console.log('OPTIONS:', options);

    // Simulate successful send
    return {
      status: 'sent',
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    /* Example Twilio integration:
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const result = await client.messages.create({
      body: message,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return {
      status: 'sent',
      messageId: result.sid,
      timestamp: new Date().toISOString()
    };
    */
  }

  /**
   * Log communication to database
   */
  async _logCommunication(data) {
    try {
      await this.supabase
        .from('communications_log')
        .insert({
          ...data,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging communication:', error);
      // Don't throw - logging failure shouldn't block delivery
    }
  }

  /**
   * Get communication history
   */
  async getHistory(userId, options = {}) {
    try {
      let query = this.supabase
        .from('communications_log')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false });

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting communication history:', error);
      throw error;
    }
  }

  /**
   * Check delivery status
   */
  async checkDeliveryStatus(messageId) {
    try {
      const { data, error } = await this.supabase
        .from('communications_log')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error checking delivery status:', error);
      throw error;
    }
  }

  /**
   * Handle bounces/failures
   */
  async handleBounce(messageId, reason) {
    try {
      await this.supabase
        .from('communications_log')
        .update({
          status: 'bounced',
          bounce_reason: reason,
          bounced_at: new Date().toISOString()
        })
        .eq('message_id', messageId);

      // TODO: Implement bounce handling logic
      // - Flag user email/phone as invalid
      // - Notify guardians if critical message bounced
      // - Retry with alternative channel
    } catch (error) {
      console.error('Error handling bounce:', error);
    }
  }

  /**
   * Batch send (for scheduled communications)
   */
  async batchSend(communications) {
    const results = [];

    for (const comm of communications) {
      try {
        let result;

        if (comm.type === 'sms') {
          if (comm.recipient === 'user') {
            result = await this.sendUserSMS(comm.userId, comm.templateId, comm.data, comm.options);
          } else if (comm.recipient === 'guardian') {
            result = await this.sendGuardianSMS(comm.userId, comm.guardianId, comm.templateId, comm.data, comm.options);
          }
        } else if (comm.type === 'email') {
          result = await this.sendUserEmail(comm.userId, comm.templateId, comm.data, comm.options);
        }

        results.push({
          ...comm,
          result,
          success: true
        });

        // Rate limiting - wait 100ms between sends
        await this._sleep(100);
      } catch (error) {
        console.error(`Batch send error for ${comm.templateId}:`, error);
        results.push({
          ...comm,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CommunicationEngine;
