/**
 * Encryption Service
 *
 * Provides field-level encryption for PII
 * Features:
 * - AES-256-GCM encryption
 * - Key rotation
 * - Tokenization support
 * - Audit trail for decryption
 */

const crypto = require('crypto');
const auditLogger = require('./audit-logger');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;

class EncryptionService {
  constructor() {
    // Load encryption keys (use AWS KMS/HashiCorp Vault in production)
    this.currentKeyId = 'key_v1';
    this.keys = new Map();
    this._loadKeys();

    // Token map for tokenization
    this.tokens = new Map();
  }

  /**
   * Load encryption keys
   */
  _loadKeys() {
    // In production: Load from HSM/KMS
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(KEY_LENGTH);
    this.keys.set(this.currentKeyId, Buffer.from(key));
  }

  /**
   * Encrypt data
   */
  encrypt(plaintext, keyId = this.currentKeyId) {
    if (!plaintext) return null;

    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: keyId:iv:authTag:ciphertext
    return `${keyId}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  decrypt(ciphertext, userId = null, reason = null) {
    if (!ciphertext) return null;

    try {
      const [keyId, ivB64, authTagB64, encrypted] = ciphertext.split(':');

      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error(`Decryption key not found: ${keyId}`);
      }

      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Audit decryption
      if (userId && reason) {
        auditLogger.logDataAccess({
          userId,
          action: 'decrypt',
          reason,
          keyId,
          timestamp: Date.now()
        });
      }

      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Decryption failed:', error.message);
      return null;
    }
  }

  /**
   * Encrypt object fields
   */
  encryptFields(obj, fields) {
    const encrypted = { ...obj };

    for (const field of fields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field].toString());
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object fields
   */
  decryptFields(obj, fields, userId = null, reason = null) {
    const decrypted = { ...obj };

    for (const field of fields) {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field], userId, reason);
      }
    }

    return decrypted;
  }

  /**
   * Tokenize sensitive data (one-way)
   */
  tokenize(data) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    this.tokens.set(token, hash);

    return token;
  }

  /**
   * Verify token
   */
  verifyToken(token, data) {
    const storedHash = this.tokens.get(token);
    if (!storedHash) return false;

    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return storedHash === hash;
  }

  /**
   * Rotate encryption key
   */
  async rotateKey() {
    const newKeyId = `key_v${Date.now()}`;
    const newKey = crypto.randomBytes(KEY_LENGTH);

    this.keys.set(newKeyId, newKey);
    this.currentKeyId = newKeyId;

    console.log(`[EncryptionService] Key rotated to ${newKeyId}`);

    // In production: Re-encrypt all data with new key
    await auditLogger.logSecurityEvent({
      event: 'encryption_key_rotated',
      severity: 'high',
      keyId: newKeyId,
      timestamp: Date.now()
    });

    return newKeyId;
  }

  /**
   * Hash data (one-way)
   */
  hash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Compare hash
   */
  compareHash(data, hash, algorithm = 'sha256') {
    const computed = this.hash(data, algorithm);
    return computed === hash;
  }
}

module.exports = new EncryptionService();
module.exports.EncryptionService = EncryptionService;
