/**
 * Audit Logger Service
 *
 * Comprehensive audit logging for:
 * - User actions
 * - Admin actions
 * - API calls
 * - Database changes
 * - Security events
 * - Guardian actions
 * - System events
 */

const fs = require('fs').promises;
const path = require('path');

// Log levels
const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Event categories
const EVENT_CATEGORY = {
  USER_ACTION: 'user_action',
  ADMIN_ACTION: 'admin_action',
  API_CALL: 'api_call',
  DATABASE_CHANGE: 'database_change',
  SECURITY_EVENT: 'security_event',
  GUARDIAN_ACTION: 'guardian_action',
  SYSTEM_EVENT: 'system_event',
  DATA_ACCESS: 'data_access'
};

class AuditLogger {
  constructor() {
    this.logDir = process.env.AUDIT_LOG_DIR || path.join(__dirname, '../../logs/audit');
    this._ensureLogDir();

    // In-memory buffer for batch writing
    this.buffer = [];
    this.bufferSize = 100;

    // Start flush interval
    this._startFlushInterval();
  }

  /**
   * Ensure log directory exists
   */
  async _ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('[AuditLogger] Failed to create log directory:', error);
    }
  }

  /**
   * Log user action
   */
  async logUserAction(data) {
    await this._log({
      category: EVENT_CATEGORY.USER_ACTION,
      level: LOG_LEVEL.INFO,
      ...data
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(data) {
    await this._log({
      category: EVENT_CATEGORY.ADMIN_ACTION,
      level: LOG_LEVEL.WARNING, // Admin actions are always notable
      ...data
    });
  }

  /**
   * Log API call
   */
  async logAPICall(data) {
    await this._log({
      category: EVENT_CATEGORY.API_CALL,
      level: LOG_LEVEL.DEBUG,
      ...data
    });
  }

  /**
   * Log database change
   */
  async logDatabaseChange(data) {
    await this._log({
      category: EVENT_CATEGORY.DATABASE_CHANGE,
      level: LOG_LEVEL.INFO,
      ...data
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(data) {
    const level = data.severity === 'critical' ? LOG_LEVEL.CRITICAL :
                  data.severity === 'high' ? LOG_LEVEL.ERROR :
                  data.severity === 'medium' ? LOG_LEVEL.WARNING :
                  LOG_LEVEL.INFO;

    await this._log({
      category: EVENT_CATEGORY.SECURITY_EVENT,
      level,
      ...data
    });
  }

  /**
   * Log guardian action
   */
  async logGuardianAction(data) {
    await this._log({
      category: EVENT_CATEGORY.GUARDIAN_ACTION,
      level: LOG_LEVEL.INFO,
      ...data
    });
  }

  /**
   * Log system event
   */
  async logSystemEvent(data) {
    await this._log({
      category: EVENT_CATEGORY.SYSTEM_EVENT,
      level: LOG_LEVEL.INFO,
      ...data
    });
  }

  /**
   * Log data access (for encryption/decryption)
   */
  async logDataAccess(data) {
    await this._log({
      category: EVENT_CATEGORY.DATA_ACCESS,
      level: LOG_LEVEL.WARNING,
      ...data
    });
  }

  /**
   * Internal log method
   */
  async _log(entry) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
      hostname: process.env.HOSTNAME || 'localhost',
      processId: process.pid
    };

    // Add to buffer
    this.buffer.push(logEntry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] [${logEntry.level}] [${logEntry.category}]`, logEntry);
    }

    // Flush if buffer full
    if (this.buffer.length >= this.bufferSize) {
      await this._flush();
    }
  }

  /**
   * Flush buffer to disk
   */
  async _flush() {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const filename = `audit-${new Date().toISOString().split('T')[0]}.log`;
      const filepath = path.join(this.logDir, filename);

      const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';

      await fs.appendFile(filepath, logLines);
    } catch (error) {
      console.error('[AuditLogger] Failed to write logs:', error);
      // Put entries back in buffer
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Start flush interval
   */
  _startFlushInterval() {
    setInterval(() => {
      this._flush().catch(error => {
        console.error('[AuditLogger] Flush error:', error);
      });
    }, 10000); // Flush every 10 seconds
  }

  /**
   * Query logs
   */
  async queryLogs(filters) {
    const filename = filters.date ?
      `audit-${filters.date}.log` :
      `audit-${new Date().toISOString().split('T')[0]}.log`;

    const filepath = path.join(this.logDir, filename);

    try {
      const content = await fs.readFile(filepath, 'utf8');
      let logs = content.trim().split('\n').map(line => JSON.parse(line));

      // Apply filters
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }

      if (filters.category) {
        logs = logs.filter(log => log.category === filters.category);
      }

      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }

      return logs;
    } catch (error) {
      console.error('[AuditLogger] Failed to query logs:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const today = new Date().toISOString().split('T')[0];
    const logs = await this.queryLogs({ date: today });

    const stats = {
      total: logs.length,
      byCategory: {},
      byLevel: {},
      byUser: {}
    };

    for (const log of logs) {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }
    }

    return stats;
  }
}

module.exports = new AuditLogger();
module.exports.AuditLogger = AuditLogger;
module.exports.LOG_LEVEL = LOG_LEVEL;
module.exports.EVENT_CATEGORY = EVENT_CATEGORY;
