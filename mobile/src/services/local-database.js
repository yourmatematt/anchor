/**
 * Local Database Service
 *
 * SQLite-based encrypted local storage for offline-first functionality
 * Supports: Transactions, Conversations, Patterns, Settings, Emergency Contacts
 *
 * Data Retention:
 * - Transactions: 90 days
 * - Conversations: 30 days
 * - Patterns: All historical data
 * - Settings: Persistent
 * - Emergency Contacts: Persistent
 */

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Database version for migrations
const DATABASE_VERSION = 1;
const DATABASE_NAME = 'anchor_offline.db';

// Encryption key storage
const ENCRYPTION_KEY_NAME = 'anchor_db_encryption_key';

class LocalDatabase {
  constructor() {
    this.db = null;
    this.encryptionKey = null;
    this.initialized = false;
  }

  /**
   * Initialize database with encryption
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Get or create encryption key
      this.encryptionKey = await this._getOrCreateEncryptionKey();

      // Open database
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME, {
        enableCRSQLite: true // Enable encryption support
      });

      // Enable encryption
      await this._enableEncryption();

      // Create tables
      await this._createTables();

      // Run migrations
      await this._runMigrations();

      // Setup data retention cleanup
      this._scheduleRetentionCleanup();

      this.initialized = true;
      console.log('[LocalDB] Initialized successfully');
    } catch (error) {
      console.error('[LocalDB] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get or create encryption key
   */
  async _getOrCreateEncryptionKey() {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);

    if (!key) {
      // Generate new 256-bit key
      key = this._generateEncryptionKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
      console.log('[LocalDB] Generated new encryption key');
    }

    return key;
  }

  /**
   * Generate random encryption key
   */
  _generateEncryptionKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Enable SQLite encryption
   */
  async _enableEncryption() {
    try {
      // Use SQLCipher pragma for encryption
      await this.db.execAsync(`PRAGMA key = '${this.encryptionKey}'`);
      await this.db.execAsync('PRAGMA cipher_page_size = 4096');
      await this.db.execAsync('PRAGMA kdf_iter = 256000');
      console.log('[LocalDB] Encryption enabled');
    } catch (error) {
      console.warn('[LocalDB] Encryption not available:', error.message);
    }
  }

  /**
   * Create all tables
   */
  async _createTables() {
    const tables = [
      // Transactions table (90 days retention)
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        merchant TEXT,
        category TEXT,
        description TEXT,
        timestamp INTEGER NOT NULL,
        is_gambling INTEGER DEFAULT 0,
        gambling_confidence REAL,
        gambling_type TEXT,
        blocked INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // AI Conversations table (30 days retention)
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        sentiment TEXT,
        crisis_detected INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Patterns table (all historical data)
      `CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        pattern_data TEXT NOT NULL,
        confidence REAL,
        detected_at INTEGER NOT NULL,
        last_occurrence INTEGER,
        frequency INTEGER DEFAULT 1,
        synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Guardian messages table
      `CREATE TABLE IF NOT EXISTS guardian_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        guardian_id TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'alert',
        read INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Settings table (persistent)
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Emergency contacts table (persistent)
      `CREATE TABLE IF NOT EXISTS emergency_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        relationship TEXT,
        priority INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_attempt INTEGER
      )`,

      // Cache metadata table
      `CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        size_bytes INTEGER NOT NULL,
        access_count INTEGER DEFAULT 0,
        last_accessed INTEGER DEFAULT (strftime('%s', 'now')),
        expires_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    for (const sql of tables) {
      await this.db.execAsync(sql);
    }

    // Create indexes for performance
    await this._createIndexes();

    console.log('[LocalDB] Tables created successfully');
  }

  /**
   * Create database indexes
   */
  async _createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_synced ON transactions(synced)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_user_id ON patterns(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type)',
      'CREATE INDEX IF NOT EXISTS idx_guardian_messages_user_id ON guardian_messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC)',
      'CREATE INDEX IF NOT EXISTS idx_cache_last_accessed ON cache_metadata(last_accessed)'
    ];

    for (const sql of indexes) {
      await this.db.execAsync(sql);
    }
  }

  /**
   * Run database migrations
   */
  async _runMigrations() {
    // Get current version
    const result = await this.db.getFirstAsync(
      'PRAGMA user_version'
    );
    const currentVersion = result?.user_version || 0;

    if (currentVersion < DATABASE_VERSION) {
      console.log(`[LocalDB] Migrating from v${currentVersion} to v${DATABASE_VERSION}`);

      // Run migrations in order
      for (let v = currentVersion + 1; v <= DATABASE_VERSION; v++) {
        await this._runMigration(v);
      }

      // Update version
      await this.db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
      console.log('[LocalDB] Migrations completed');
    }
  }

  /**
   * Run specific migration version
   */
  async _runMigration(version) {
    console.log(`[LocalDB] Running migration v${version}`);

    switch (version) {
      case 1:
        // Initial schema - already created
        break;

      // Add future migrations here
      // case 2:
      //   await this.db.execAsync('ALTER TABLE transactions ADD COLUMN new_field TEXT');
      //   break;

      default:
        console.warn(`[LocalDB] Unknown migration version: ${version}`);
    }
  }

  /**
   * Schedule data retention cleanup
   */
  _scheduleRetentionCleanup() {
    // Run cleanup daily
    setInterval(() => {
      this.cleanupOldData().catch(error => {
        console.error('[LocalDB] Retention cleanup failed:', error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Run initial cleanup
    this.cleanupOldData();
  }

  /**
   * Clean up old data based on retention policies
   */
  async cleanupOldData() {
    const now = Math.floor(Date.now() / 1000);

    // Transactions: 90 days
    const transactionCutoff = now - (90 * 24 * 60 * 60);
    await this.db.runAsync(
      'DELETE FROM transactions WHERE timestamp < ? AND synced = 1',
      [transactionCutoff]
    );

    // Conversations: 30 days
    const conversationCutoff = now - (30 * 24 * 60 * 60);
    await this.db.runAsync(
      'DELETE FROM conversations WHERE timestamp < ? AND synced = 1',
      [conversationCutoff]
    );

    // Clean up synced queue items older than 7 days
    const queueCutoff = now - (7 * 24 * 60 * 60);
    await this.db.runAsync(
      'DELETE FROM sync_queue WHERE created_at < ?',
      [queueCutoff]
    );

    // Clean up expired cache
    await this.db.runAsync(
      'DELETE FROM cache_metadata WHERE expires_at IS NOT NULL AND expires_at < ?',
      [now]
    );

    console.log('[LocalDB] Retention cleanup completed');
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Insert transaction
   */
  async insertTransaction(transaction) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO transactions
       (id, user_id, amount, merchant, category, description, timestamp,
        is_gambling, gambling_confidence, gambling_type, blocked, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.userId,
        transaction.amount,
        transaction.merchant || null,
        transaction.category || null,
        transaction.description || null,
        transaction.timestamp || now,
        transaction.isGambling ? 1 : 0,
        transaction.gamblingConfidence || null,
        transaction.gamblingType || null,
        transaction.blocked ? 1 : 0,
        transaction.synced ? 1 : 0,
        now
      ]
    );

    return transaction.id;
  }

  /**
   * Get transactions for user
   */
  async getTransactions(userId, options = {}) {
    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (options.gamblingOnly) {
      sql += ' AND is_gambling = 1';
    }

    if (options.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(Math.floor(options.startDate / 1000));
    }

    if (options.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(Math.floor(options.endDate / 1000));
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = await this.db.getAllAsync(sql, params);
    return rows.map(this._deserializeTransaction);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id) {
    const row = await this.db.getFirstAsync(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return row ? this._deserializeTransaction(row) : null;
  }

  /**
   * Get unsynced transactions
   */
  async getUnsyncedTransactions(limit = 100) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM transactions WHERE synced = 0 ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return rows.map(this._deserializeTransaction);
  }

  /**
   * Mark transaction as synced
   */
  async markTransactionSynced(id) {
    await this.db.runAsync(
      'UPDATE transactions SET synced = 1, updated_at = ? WHERE id = ?',
      [Math.floor(Date.now() / 1000), id]
    );
  }

  /**
   * Deserialize transaction from database row
   */
  _deserializeTransaction(row) {
    return {
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      merchant: row.merchant,
      category: row.category,
      description: row.description,
      timestamp: row.timestamp * 1000, // Convert to milliseconds
      isGambling: Boolean(row.is_gambling),
      gamblingConfidence: row.gambling_confidence,
      gamblingType: row.gambling_type,
      blocked: Boolean(row.blocked),
      synced: Boolean(row.synced),
      createdAt: row.created_at * 1000,
      updatedAt: row.updated_at * 1000
    };
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Insert conversation
   */
  async insertConversation(conversation) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO conversations
       (id, user_id, message, response, sentiment, crisis_detected, timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        conversation.userId,
        conversation.message,
        conversation.response || null,
        conversation.sentiment || null,
        conversation.crisisDetected ? 1 : 0,
        conversation.timestamp || now,
        conversation.synced ? 1 : 0
      ]
    );

    return conversation.id;
  }

  /**
   * Get conversations for user
   */
  async getConversations(userId, limit = 50) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(this._deserializeConversation);
  }

  /**
   * Get unsynced conversations
   */
  async getUnsyncedConversations(limit = 50) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM conversations WHERE synced = 0 ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return rows.map(this._deserializeConversation);
  }

  /**
   * Mark conversation as synced
   */
  async markConversationSynced(id) {
    await this.db.runAsync(
      'UPDATE conversations SET synced = 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Deserialize conversation from database row
   */
  _deserializeConversation(row) {
    return {
      id: row.id,
      userId: row.user_id,
      message: row.message,
      response: row.response,
      sentiment: row.sentiment,
      crisisDetected: Boolean(row.crisis_detected),
      timestamp: row.timestamp * 1000,
      synced: Boolean(row.synced),
      createdAt: row.created_at * 1000
    };
  }

  // ==================== PATTERNS ====================

  /**
   * Insert or update pattern
   */
  async upsertPattern(pattern) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT INTO patterns
       (id, user_id, pattern_type, pattern_data, confidence, detected_at,
        last_occurrence, frequency, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pattern_data = excluded.pattern_data,
         confidence = excluded.confidence,
         last_occurrence = excluded.last_occurrence,
         frequency = frequency + 1,
         updated_at = excluded.updated_at`,
      [
        pattern.id,
        pattern.userId,
        pattern.patternType,
        JSON.stringify(pattern.patternData),
        pattern.confidence,
        pattern.detectedAt || now,
        pattern.lastOccurrence || now,
        pattern.frequency || 1,
        pattern.synced ? 1 : 0,
        now
      ]
    );

    return pattern.id;
  }

  /**
   * Get patterns for user
   */
  async getPatterns(userId, patternType = null) {
    let sql = 'SELECT * FROM patterns WHERE user_id = ?';
    const params = [userId];

    if (patternType) {
      sql += ' AND pattern_type = ?';
      params.push(patternType);
    }

    sql += ' ORDER BY last_occurrence DESC';

    const rows = await this.db.getAllAsync(sql, params);
    return rows.map(this._deserializePattern);
  }

  /**
   * Get unsynced patterns
   */
  async getUnsyncedPatterns(limit = 100) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM patterns WHERE synced = 0 ORDER BY detected_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(this._deserializePattern);
  }

  /**
   * Mark pattern as synced
   */
  async markPatternSynced(id) {
    await this.db.runAsync(
      'UPDATE patterns SET synced = 1, updated_at = ? WHERE id = ?',
      [Math.floor(Date.now() / 1000), id]
    );
  }

  /**
   * Deserialize pattern from database row
   */
  _deserializePattern(row) {
    return {
      id: row.id,
      userId: row.user_id,
      patternType: row.pattern_type,
      patternData: JSON.parse(row.pattern_data),
      confidence: row.confidence,
      detectedAt: row.detected_at * 1000,
      lastOccurrence: row.last_occurrence * 1000,
      frequency: row.frequency,
      synced: Boolean(row.synced),
      createdAt: row.created_at * 1000,
      updatedAt: row.updated_at * 1000
    };
  }

  // ==================== GUARDIAN MESSAGES ====================

  /**
   * Insert guardian message
   */
  async insertGuardianMessage(message) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO guardian_messages
       (id, user_id, guardian_id, message, message_type, read, timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.userId,
        message.guardianId,
        message.message,
        message.messageType || 'alert',
        message.read ? 1 : 0,
        message.timestamp || now,
        message.synced ? 1 : 0
      ]
    );

    return message.id;
  }

  /**
   * Get guardian messages
   */
  async getGuardianMessages(userId, limit = 50) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM guardian_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(this._deserializeGuardianMessage);
  }

  /**
   * Mark message as read
   */
  async markMessageRead(id) {
    await this.db.runAsync(
      'UPDATE guardian_messages SET read = 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Get unsynced guardian messages
   */
  async getUnsyncedGuardianMessages(limit = 50) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM guardian_messages WHERE synced = 0 ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return rows.map(this._deserializeGuardianMessage);
  }

  /**
   * Mark guardian message as synced
   */
  async markGuardianMessageSynced(id) {
    await this.db.runAsync(
      'UPDATE guardian_messages SET synced = 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Deserialize guardian message from database row
   */
  _deserializeGuardianMessage(row) {
    return {
      id: row.id,
      userId: row.user_id,
      guardianId: row.guardian_id,
      message: row.message,
      messageType: row.message_type,
      read: Boolean(row.read),
      timestamp: row.timestamp * 1000,
      synced: Boolean(row.synced),
      createdAt: row.created_at * 1000
    };
  }

  // ==================== SETTINGS ====================

  /**
   * Set setting value
   */
  async setSetting(key, value) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value, synced, updated_at)
       VALUES (?, ?, 0, ?)`,
      [key, JSON.stringify(value), now]
    );
  }

  /**
   * Get setting value
   */
  async getSetting(key, defaultValue = null) {
    const row = await this.db.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );

    if (row) {
      return JSON.parse(row.value);
    }

    return defaultValue;
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const rows = await this.db.getAllAsync('SELECT * FROM settings');
    const settings = {};

    for (const row of rows) {
      settings[row.key] = JSON.parse(row.value);
    }

    return settings;
  }

  /**
   * Get unsynced settings
   */
  async getUnsyncedSettings() {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM settings WHERE synced = 0'
    );

    const settings = {};
    for (const row of rows) {
      settings[row.key] = JSON.parse(row.value);
    }

    return settings;
  }

  /**
   * Mark setting as synced
   */
  async markSettingSynced(key) {
    await this.db.runAsync(
      'UPDATE settings SET synced = 1 WHERE key = ?',
      [key]
    );
  }

  // ==================== EMERGENCY CONTACTS ====================

  /**
   * Insert emergency contact
   */
  async insertEmergencyContact(contact) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO emergency_contacts
       (id, user_id, name, phone, relationship, priority, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact.id,
        contact.userId,
        contact.name,
        contact.phone,
        contact.relationship || null,
        contact.priority || 0,
        contact.synced ? 1 : 0,
        now
      ]
    );

    return contact.id;
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(userId) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority DESC, name ASC',
      [userId]
    );
    return rows.map(this._deserializeEmergencyContact);
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(id) {
    await this.db.runAsync(
      'DELETE FROM emergency_contacts WHERE id = ?',
      [id]
    );
  }

  /**
   * Get unsynced emergency contacts
   */
  async getUnsyncedEmergencyContacts() {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM emergency_contacts WHERE synced = 0'
    );
    return rows.map(this._deserializeEmergencyContact);
  }

  /**
   * Mark emergency contact as synced
   */
  async markEmergencyContactSynced(id) {
    await this.db.runAsync(
      'UPDATE emergency_contacts SET synced = 1, updated_at = ? WHERE id = ?',
      [Math.floor(Date.now() / 1000), id]
    );
  }

  /**
   * Deserialize emergency contact from database row
   */
  _deserializeEmergencyContact(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      relationship: row.relationship,
      priority: row.priority,
      synced: Boolean(row.synced),
      createdAt: row.created_at * 1000,
      updatedAt: row.updated_at * 1000
    };
  }

  // ==================== SYNC QUEUE ====================

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(action, tableName, recordId, data, priority = 0) {
    const id = `${tableName}_${recordId}_${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT INTO sync_queue
       (id, action, table_name, record_id, data, priority, retry_count, max_retries, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 3, ?)`,
      [id, action, tableName, recordId, JSON.stringify(data), priority, now]
    );

    return id;
  }

  /**
   * Get next items from sync queue
   */
  async getNextSyncItems(limit = 10) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM sync_queue ORDER BY priority DESC, created_at ASC LIMIT ?',
      [limit]
    );

    return rows.map(row => ({
      id: row.id,
      action: row.action,
      tableName: row.table_name,
      recordId: row.record_id,
      data: JSON.parse(row.data),
      priority: row.priority,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      createdAt: row.created_at * 1000,
      lastAttempt: row.last_attempt ? row.last_attempt * 1000 : null
    }));
  }

  /**
   * Update sync queue item retry
   */
  async updateSyncQueueRetry(id) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      'UPDATE sync_queue SET retry_count = retry_count + 1, last_attempt = ? WHERE id = ?',
      [now, id]
    );
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id) {
    await this.db.runAsync(
      'DELETE FROM sync_queue WHERE id = ?',
      [id]
    );
  }

  /**
   * Get sync queue size
   */
  async getSyncQueueSize() {
    const result = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM sync_queue'
    );
    return result.count;
  }

  // ==================== CACHE METADATA ====================

  /**
   * Set cache metadata
   */
  async setCacheMetadata(key, sizeBytes, expiresAt = null) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO cache_metadata
       (key, size_bytes, access_count, last_accessed, expires_at, created_at)
       VALUES (?, ?, COALESCE((SELECT access_count FROM cache_metadata WHERE key = ?), 0), ?, ?, ?)`,
      [key, sizeBytes, key, now, expiresAt, now]
    );
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(key) {
    const row = await this.db.getFirstAsync(
      'SELECT * FROM cache_metadata WHERE key = ?',
      [key]
    );

    if (!row) return null;

    return {
      key: row.key,
      sizeBytes: row.size_bytes,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed * 1000,
      expiresAt: row.expires_at ? row.expires_at * 1000 : null,
      createdAt: row.created_at * 1000
    };
  }

  /**
   * Update cache access
   */
  async updateCacheAccess(key) {
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      'UPDATE cache_metadata SET access_count = access_count + 1, last_accessed = ? WHERE key = ?',
      [now, key]
    );
  }

  /**
   * Get total cache size
   */
  async getTotalCacheSize() {
    const result = await this.db.getFirstAsync(
      'SELECT SUM(size_bytes) as total FROM cache_metadata'
    );
    return result.total || 0;
  }

  /**
   * Get least recently used cache items
   */
  async getLRUCacheItems(limit = 10) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM cache_metadata ORDER BY last_accessed ASC LIMIT ?',
      [limit]
    );

    return rows.map(row => ({
      key: row.key,
      sizeBytes: row.size_bytes,
      lastAccessed: row.last_accessed * 1000
    }));
  }

  /**
   * Remove cache metadata
   */
  async removeCacheMetadata(key) {
    await this.db.runAsync(
      'DELETE FROM cache_metadata WHERE key = ?',
      [key]
    );
  }

  // ==================== UTILITY ====================

  /**
   * Get database statistics
   */
  async getStatistics() {
    const stats = {};

    // Count records in each table
    const tables = ['transactions', 'conversations', 'patterns', 'guardian_messages',
                    'settings', 'emergency_contacts', 'sync_queue'];

    for (const table of tables) {
      const result = await this.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      stats[table] = result.count;
    }

    // Sync queue size
    stats.syncQueueSize = await this.getSyncQueueSize();

    // Cache size
    stats.totalCacheSize = await this.getTotalCacheSize();

    // Database file size (if available)
    try {
      const sizeResult = await this.db.getFirstAsync(
        'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
      );
      stats.databaseSize = sizeResult.size;
    } catch (error) {
      stats.databaseSize = null;
    }

    return stats;
  }

  /**
   * Clear all data (for testing/logout)
   */
  async clearAllData() {
    const tables = ['transactions', 'conversations', 'patterns', 'guardian_messages',
                    'settings', 'emergency_contacts', 'sync_queue', 'cache_metadata'];

    for (const table of tables) {
      await this.db.runAsync(`DELETE FROM ${table}`);
    }

    console.log('[LocalDB] All data cleared');
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
      console.log('[LocalDB] Database closed');
    }
  }
}

// Export singleton instance
const localDatabase = new LocalDatabase();
export default localDatabase;

// Export class for testing
export { LocalDatabase };
