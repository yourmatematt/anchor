/**
 * Partner Integration Manager
 *
 * Central orchestrator for all partner integrations in the Anchor system.
 * Manages partner registration, authentication, and integration lifecycle.
 *
 * Supports:
 * - Retail partners (Woolworths, Coles, Aldi, Kmart/Target)
 * - Utility partners (Energy Australia, AGL, Origin, Telstra/Optus)
 * - Transport partners (Opal, Myki, fuel vouchers)
 * - Support partners (counseling, crisis support, financial counseling)
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Partner Types and Categories
 */
const PARTNER_TYPES = {
  RETAIL: 'retail',
  UTILITY: 'utility',
  TRANSPORT: 'transport',
  SUPPORT: 'support'
};

const PARTNER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
};

/**
 * Partner Registry
 * Maps partner identifiers to their integration modules
 */
const PARTNER_REGISTRY = {
  woolworths: {
    name: 'Woolworths',
    type: PARTNER_TYPES.RETAIL,
    module: '../integrations/woolworths',
    capabilities: ['vouchers', 'gift_cards', 'balance_check']
  },
  coles: {
    name: 'Coles',
    type: PARTNER_TYPES.RETAIL,
    module: '../integrations/coles',
    capabilities: ['vouchers', 'gift_cards', 'balance_check']
  },
  aldi: {
    name: 'Aldi',
    type: PARTNER_TYPES.RETAIL,
    capabilities: ['gift_cards']
  },
  kmart: {
    name: 'Kmart',
    type: PARTNER_TYPES.RETAIL,
    capabilities: ['gift_cards']
  },
  energy_australia: {
    name: 'Energy Australia',
    type: PARTNER_TYPES.UTILITY,
    module: '../integrations/energy-providers',
    provider: 'energy_australia',
    capabilities: ['bill_credits', 'balance_check', 'webhook']
  },
  agl: {
    name: 'AGL',
    type: PARTNER_TYPES.UTILITY,
    module: '../integrations/energy-providers',
    provider: 'agl',
    capabilities: ['bill_credits', 'balance_check', 'webhook']
  },
  origin: {
    name: 'Origin Energy',
    type: PARTNER_TYPES.UTILITY,
    module: '../integrations/energy-providers',
    provider: 'origin',
    capabilities: ['bill_credits', 'balance_check', 'webhook']
  },
  telstra: {
    name: 'Telstra',
    type: PARTNER_TYPES.UTILITY,
    capabilities: ['mobile_credits']
  },
  optus: {
    name: 'Optus',
    type: PARTNER_TYPES.UTILITY,
    capabilities: ['mobile_credits']
  },
  opal: {
    name: 'Transport NSW (Opal)',
    type: PARTNER_TYPES.TRANSPORT,
    module: '../integrations/transport',
    provider: 'opal',
    capabilities: ['transport_credit', 'balance_check']
  },
  myki: {
    name: 'Transport Victoria (Myki)',
    type: PARTNER_TYPES.TRANSPORT,
    module: '../integrations/transport',
    provider: 'myki',
    capabilities: ['transport_credit', 'balance_check']
  },
  fuel_vouchers: {
    name: 'Fuel Vouchers',
    type: PARTNER_TYPES.TRANSPORT,
    module: '../integrations/transport',
    provider: 'fuel',
    capabilities: ['vouchers']
  },
  relationships_australia: {
    name: 'Relationships Australia',
    type: PARTNER_TYPES.SUPPORT,
    capabilities: ['counseling_referral']
  },
  lifeline: {
    name: 'Lifeline',
    type: PARTNER_TYPES.SUPPORT,
    capabilities: ['crisis_support_referral']
  },
  fca: {
    name: 'Financial Counsellors Australia',
    type: PARTNER_TYPES.SUPPORT,
    capabilities: ['financial_counseling_referral']
  },
  gambling_help: {
    name: 'Gambling Help',
    type: PARTNER_TYPES.SUPPORT,
    capabilities: ['gambling_support_referral']
  }
};

/**
 * Partner Manager Class
 */
class PartnerManager {
  constructor() {
    this.integrations = new Map();
  }

  /**
   * Initialize partner integration
   */
  async initializeIntegration(partnerId) {
    if (this.integrations.has(partnerId)) {
      return this.integrations.get(partnerId);
    }

    const partnerConfig = PARTNER_REGISTRY[partnerId];
    if (!partnerConfig) {
      throw new Error(`Unknown partner: ${partnerId}`);
    }

    // Load integration module if available
    if (partnerConfig.module) {
      try {
        const integration = require(partnerConfig.module);
        this.integrations.set(partnerId, integration);
        return integration;
      } catch (error) {
        console.error(`Failed to load integration for ${partnerId}:`, error);
        throw error;
      }
    }

    return null;
  }

  /**
   * Register a new partner in the system
   */
  async registerPartner(partnerData) {
    const { data, error } = await supabase
      .from('partners')
      .insert({
        partner_id: partnerData.partnerId,
        name: partnerData.name,
        type: partnerData.type,
        status: PARTNER_STATUS.PENDING,
        config: partnerData.config || {},
        api_credentials: this.encryptCredentials(partnerData.credentials),
        capabilities: partnerData.capabilities || [],
        webhook_url: partnerData.webhookUrl,
        oauth_config: partnerData.oauthConfig
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update partner status
   */
  async updatePartnerStatus(partnerId, status) {
    const { data, error } = await supabase
      .from('partners')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('partner_id', partnerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get partner configuration
   */
  async getPartnerConfig(partnerId) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('status', PARTNER_STATUS.ACTIVE)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Partner not found or not active
      }
      throw error;
    }

    // Decrypt credentials before returning
    if (data.api_credentials) {
      data.api_credentials = this.decryptCredentials(data.api_credentials);
    }

    return data;
  }

  /**
   * Get all active partners by type
   */
  async getPartnersByType(type) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('type', type)
      .eq('status', PARTNER_STATUS.ACTIVE)
      .order('name');

    if (error) throw error;
    return data;
  }

  /**
   * Process OAuth callback
   */
  async processOAuthCallback(partnerId, authCode, state) {
    const partnerConfig = await this.getPartnerConfig(partnerId);
    if (!partnerConfig) {
      throw new Error('Partner not found or inactive');
    }

    const integration = await this.initializeIntegration(partnerId);
    if (!integration || !integration.exchangeOAuthToken) {
      throw new Error('OAuth not supported for this partner');
    }

    // Exchange authorization code for access token
    const tokens = await integration.exchangeOAuthToken(authCode, partnerConfig);

    // Store tokens securely
    await this.storePartnerTokens(partnerId, tokens);

    return { success: true, partnerId };
  }

  /**
   * Store partner OAuth tokens
   */
  async storePartnerTokens(partnerId, tokens) {
    const encryptedTokens = this.encryptCredentials(tokens);

    const { data, error } = await supabase
      .from('partner_tokens')
      .upsert({
        partner_id: partnerId,
        access_token: encryptedTokens.access_token,
        refresh_token: encryptedTokens.refresh_token,
        expires_at: tokens.expires_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get partner tokens (with auto-refresh)
   */
  async getPartnerTokens(partnerId) {
    const { data, error } = await supabase
      .from('partner_tokens')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      // Token expired, refresh it
      return await this.refreshPartnerToken(partnerId, data.refresh_token);
    }

    // Decrypt tokens
    return {
      access_token: this.decryptCredentials({ access_token: data.access_token }).access_token,
      refresh_token: this.decryptCredentials({ refresh_token: data.refresh_token }).refresh_token,
      expires_at: data.expires_at
    };
  }

  /**
   * Refresh partner OAuth token
   */
  async refreshPartnerToken(partnerId, refreshToken) {
    const integration = await this.initializeIntegration(partnerId);
    if (!integration || !integration.refreshOAuthToken) {
      throw new Error('Token refresh not supported for this partner');
    }

    const decryptedRefreshToken = this.decryptCredentials({ refresh_token: refreshToken }).refresh_token;
    const newTokens = await integration.refreshOAuthToken(decryptedRefreshToken);

    await this.storePartnerTokens(partnerId, newTokens);
    return newTokens;
  }

  /**
   * Encrypt sensitive credentials
   */
  encryptCredentials(credentials) {
    if (!credentials) return null;

    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(credentials), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive credentials
   */
  decryptCredentials(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;

    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'hex')),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Log partner activity
   */
  async logPartnerActivity(partnerId, activityType, details, userId = null) {
    const { data, error } = await supabase
      .from('partner_activity_log')
      .insert({
        partner_id: partnerId,
        activity_type: activityType,
        details,
        user_id: userId,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log partner activity:', error);
      // Don't throw - logging failure shouldn't break the flow
    }

    return data;
  }

  /**
   * Check partner health status
   */
  async checkPartnerHealth(partnerId) {
    const integration = await this.initializeIntegration(partnerId);
    if (!integration || !integration.healthCheck) {
      return { healthy: false, error: 'Health check not supported' };
    }

    try {
      const result = await integration.healthCheck();
      await this.logPartnerActivity(partnerId, 'health_check', result);
      return result;
    } catch (error) {
      await this.logPartnerActivity(partnerId, 'health_check_failed', { error: error.message });
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
const partnerManager = new PartnerManager();

module.exports = {
  partnerManager,
  PartnerManager,
  PARTNER_TYPES,
  PARTNER_STATUS,
  PARTNER_REGISTRY
};
