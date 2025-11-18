/**
 * Conflict Resolver Service
 *
 * Handles sync conflicts between local and server data
 * Strategy: Server wins (server data is authoritative)
 *
 * Conflict Types:
 * - Update conflicts: Both client and server modified same record
 * - Delete conflicts: Client modified, server deleted or vice versa
 * - Create conflicts: Same ID created on both client and server
 */

import localDatabase from './local-database';

// Conflict resolution strategies
const RESOLUTION_STRATEGY = {
  SERVER_WINS: 'server_wins',        // Server data overwrites local (default)
  CLIENT_WINS: 'client_wins',        // Local data overwrites server
  MERGE: 'merge',                    // Attempt to merge both changes
  MANUAL: 'manual'                   // Require manual resolution
};

// Conflict types
const CONFLICT_TYPE = {
  UPDATE: 'update',      // Both sides modified
  DELETE: 'delete',      // One side deleted
  CREATE: 'create'       // Duplicate creation
};

class ConflictResolver {
  constructor() {
    this.strategy = RESOLUTION_STRATEGY.SERVER_WINS;
    this.conflictLog = [];
    this.listeners = [];
  }

  /**
   * Set resolution strategy
   */
  setStrategy(strategy) {
    if (!Object.values(RESOLUTION_STRATEGY).includes(strategy)) {
      throw new Error(`Invalid strategy: ${strategy}`);
    }

    this.strategy = strategy;
    console.log('[ConflictResolver] Strategy set to:', strategy);
  }

  /**
   * Resolve transaction conflict
   */
  async resolveTransactionConflict(localTransaction, serverTransaction) {
    const conflict = {
      type: this._determineConflictType(localTransaction, serverTransaction),
      table: 'transactions',
      localData: localTransaction,
      serverData: serverTransaction,
      timestamp: Date.now()
    };

    console.log('[ConflictResolver] Transaction conflict detected:', {
      id: localTransaction?.id || serverTransaction?.id,
      type: conflict.type
    });

    let resolution;

    switch (this.strategy) {
      case RESOLUTION_STRATEGY.SERVER_WINS:
        resolution = await this._resolveServerWins(conflict);
        break;

      case RESOLUTION_STRATEGY.CLIENT_WINS:
        resolution = await this._resolveClientWins(conflict);
        break;

      case RESOLUTION_STRATEGY.MERGE:
        resolution = await this._resolveMerge(conflict);
        break;

      case RESOLUTION_STRATEGY.MANUAL:
        resolution = await this._resolveManual(conflict);
        break;

      default:
        resolution = await this._resolveServerWins(conflict);
    }

    // Log conflict and resolution
    this._logConflict(conflict, resolution);

    // Notify listeners
    this._notifyListeners({
      type: 'conflict_resolved',
      conflict,
      resolution
    });

    return resolution;
  }

  /**
   * Resolve conversation conflict
   */
  async resolveConversationConflict(localConversation, serverConversation) {
    const conflict = {
      type: this._determineConflictType(localConversation, serverConversation),
      table: 'conversations',
      localData: localConversation,
      serverData: serverConversation,
      timestamp: Date.now()
    };

    console.log('[ConflictResolver] Conversation conflict detected:', {
      id: localConversation?.id || serverConversation?.id,
      type: conflict.type
    });

    // Conversations always use server wins
    const resolution = await this._resolveServerWins(conflict);

    this._logConflict(conflict, resolution);
    this._notifyListeners({
      type: 'conflict_resolved',
      conflict,
      resolution
    });

    return resolution;
  }

  /**
   * Resolve pattern conflict
   */
  async resolvePatternConflict(localPattern, serverPattern) {
    const conflict = {
      type: this._determineConflictType(localPattern, serverPattern),
      table: 'patterns',
      localData: localPattern,
      serverData: serverPattern,
      timestamp: Date.now()
    };

    console.log('[ConflictResolver] Pattern conflict detected:', {
      id: localPattern?.id || serverPattern?.id,
      type: conflict.type
    });

    // For patterns, try to merge frequency and occurrence data
    let resolution;

    if (this.strategy === RESOLUTION_STRATEGY.MERGE) {
      resolution = await this._resolveMerge(conflict);
    } else {
      resolution = await this._resolveServerWins(conflict);
    }

    this._logConflict(conflict, resolution);
    this._notifyListeners({
      type: 'conflict_resolved',
      conflict,
      resolution
    });

    return resolution;
  }

  /**
   * Resolve setting conflict
   */
  async resolveSettingConflict(key, localValue, serverValue) {
    const conflict = {
      type: CONFLICT_TYPE.UPDATE,
      table: 'settings',
      localData: { key, value: localValue },
      serverData: { key, value: serverValue },
      timestamp: Date.now()
    };

    console.log('[ConflictResolver] Setting conflict detected:', {
      key,
      type: conflict.type
    });

    // For settings, check if it's a user preference (client wins) or system setting (server wins)
    const userPreferenceKeys = [
      'language',
      'theme',
      'notifications',
      'accessibility',
      'highContrast',
      'textSize',
      'voiceNavigation'
    ];

    let resolution;

    if (userPreferenceKeys.includes(key)) {
      // User preferences: client wins
      resolution = await this._resolveClientWins(conflict);
    } else {
      // System settings: server wins
      resolution = await this._resolveServerWins(conflict);
    }

    this._logConflict(conflict, resolution);
    this._notifyListeners({
      type: 'conflict_resolved',
      conflict,
      resolution
    });

    return resolution;
  }

  /**
   * Resolve guardian message conflict
   */
  async resolveGuardianMessageConflict(localMessage, serverMessage) {
    const conflict = {
      type: this._determineConflictType(localMessage, serverMessage),
      table: 'guardian_messages',
      localData: localMessage,
      serverData: serverMessage,
      timestamp: Date.now()
    };

    console.log('[ConflictResolver] Guardian message conflict detected:', {
      id: localMessage?.id || serverMessage?.id,
      type: conflict.type
    });

    // Guardian messages: server wins (authoritative source)
    const resolution = await this._resolveServerWins(conflict);

    this._logConflict(conflict, resolution);
    this._notifyListeners({
      type: 'conflict_resolved',
      conflict,
      resolution
    });

    return resolution;
  }

  /**
   * Determine conflict type
   */
  _determineConflictType(localData, serverData) {
    if (!localData && serverData) {
      return CONFLICT_TYPE.CREATE; // Server created, not in local
    }

    if (localData && !serverData) {
      return CONFLICT_TYPE.DELETE; // Local exists, server deleted
    }

    if (localData && serverData) {
      return CONFLICT_TYPE.UPDATE; // Both exist, need to resolve updates
    }

    return CONFLICT_TYPE.UPDATE; // Default
  }

  /**
   * Resolve using server wins strategy
   */
  async _resolveServerWins(conflict) {
    console.log('[ConflictResolver] Resolving with SERVER_WINS strategy');

    if (!conflict.serverData) {
      // Server deleted, remove local
      await this._deleteLocal(conflict.table, conflict.localData.id);

      return {
        strategy: RESOLUTION_STRATEGY.SERVER_WINS,
        action: 'delete_local',
        data: null
      };
    }

    // Server data exists, update local
    await this._updateLocal(conflict.table, conflict.serverData);

    return {
      strategy: RESOLUTION_STRATEGY.SERVER_WINS,
      action: 'update_local',
      data: conflict.serverData
    };
  }

  /**
   * Resolve using client wins strategy
   */
  async _resolveClientWins(conflict) {
    console.log('[ConflictResolver] Resolving with CLIENT_WINS strategy');

    if (!conflict.localData) {
      // Local deleted, ignore server
      return {
        strategy: RESOLUTION_STRATEGY.CLIENT_WINS,
        action: 'ignore_server',
        data: null
      };
    }

    // Local data exists, keep it and queue for server update
    return {
      strategy: RESOLUTION_STRATEGY.CLIENT_WINS,
      action: 'keep_local',
      data: conflict.localData,
      requiresServerUpdate: true
    };
  }

  /**
   * Resolve using merge strategy
   */
  async _resolveMerge(conflict) {
    console.log('[ConflictResolver] Resolving with MERGE strategy');

    // Attempt to merge based on table type
    let mergedData;

    switch (conflict.table) {
      case 'transactions':
        mergedData = this._mergeTransactions(conflict.localData, conflict.serverData);
        break;

      case 'patterns':
        mergedData = this._mergePatterns(conflict.localData, conflict.serverData);
        break;

      case 'settings':
        // Settings can't be merged, use server wins
        mergedData = conflict.serverData;
        break;

      default:
        // Default to server data if merge not possible
        mergedData = conflict.serverData;
    }

    // Update local with merged data
    await this._updateLocal(conflict.table, mergedData);

    return {
      strategy: RESOLUTION_STRATEGY.MERGE,
      action: 'merge',
      data: mergedData
    };
  }

  /**
   * Resolve using manual strategy
   */
  async _resolveManual(conflict) {
    console.log('[ConflictResolver] Manual resolution required');

    // Store conflict for manual resolution
    await localDatabase.setSetting(
      `conflict_${conflict.table}_${Date.now()}`,
      conflict
    );

    return {
      strategy: RESOLUTION_STRATEGY.MANUAL,
      action: 'pending_manual',
      data: null,
      requiresManualResolution: true
    };
  }

  /**
   * Merge transaction data
   */
  _mergeTransactions(localTransaction, serverTransaction) {
    // For transactions, server is authoritative
    // But preserve local flags if set
    return {
      ...serverTransaction,
      // Preserve local gambling detection if more confident
      isGambling: (localTransaction.gamblingConfidence || 0) >
                  (serverTransaction.gamblingConfidence || 0)
                  ? localTransaction.isGambling
                  : serverTransaction.isGambling,
      gamblingConfidence: Math.max(
        localTransaction.gamblingConfidence || 0,
        serverTransaction.gamblingConfidence || 0
      ),
      blocked: localTransaction.blocked || serverTransaction.blocked
    };
  }

  /**
   * Merge pattern data
   */
  _mergePatterns(localPattern, serverPattern) {
    // Merge pattern frequency and occurrences
    return {
      ...serverPattern,
      frequency: (localPattern.frequency || 0) + (serverPattern.frequency || 0),
      lastOccurrence: Math.max(
        localPattern.lastOccurrence || 0,
        serverPattern.lastOccurrence || 0
      ),
      confidence: Math.max(
        localPattern.confidence || 0,
        serverPattern.confidence || 0
      )
    };
  }

  /**
   * Update local data
   */
  async _updateLocal(table, data) {
    switch (table) {
      case 'transactions':
        await localDatabase.insertTransaction({ ...data, synced: true });
        break;

      case 'conversations':
        await localDatabase.insertConversation({ ...data, synced: true });
        break;

      case 'patterns':
        await localDatabase.upsertPattern({ ...data, synced: true });
        break;

      case 'guardian_messages':
        await localDatabase.insertGuardianMessage({ ...data, synced: true });
        break;

      case 'settings':
        await localDatabase.setSetting(data.key, data.value);
        await localDatabase.markSettingSynced(data.key);
        break;

      default:
        console.warn('[ConflictResolver] Unknown table for update:', table);
    }
  }

  /**
   * Delete local data
   */
  async _deleteLocal(table, id) {
    switch (table) {
      case 'transactions':
      case 'conversations':
      case 'patterns':
      case 'guardian_messages':
        // Mark as deleted in local database
        // (In production, you'd want to actually delete or mark as deleted)
        console.log(`[ConflictResolver] Would delete ${table} record:`, id);
        break;

      case 'settings':
        // Don't delete settings, just mark as synced
        break;

      default:
        console.warn('[ConflictResolver] Unknown table for delete:', table);
    }
  }

  /**
   * Log conflict and resolution
   */
  _logConflict(conflict, resolution) {
    const logEntry = {
      conflict,
      resolution,
      timestamp: Date.now()
    };

    this.conflictLog.push(logEntry);

    // Keep only last 100 conflicts
    if (this.conflictLog.length > 100) {
      this.conflictLog.shift();
    }

    console.log('[ConflictResolver] Conflict resolved:', {
      table: conflict.table,
      type: conflict.type,
      strategy: resolution.strategy,
      action: resolution.action
    });
  }

  /**
   * Get conflict history
   */
  getConflictHistory(limit = 50) {
    return this.conflictLog.slice(-limit);
  }

  /**
   * Get conflict statistics
   */
  getStatistics() {
    const stats = {
      total: this.conflictLog.length,
      byType: {},
      byTable: {},
      byStrategy: {}
    };

    for (const entry of this.conflictLog) {
      // Count by conflict type
      const type = entry.conflict.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by table
      const table = entry.conflict.table;
      stats.byTable[table] = (stats.byTable[table] || 0) + 1;

      // Count by resolution strategy
      const strategy = entry.resolution.strategy;
      stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1;
    }

    return stats;
  }

  /**
   * Subscribe to conflict events
   */
  subscribe(listener) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConflictResolver] Listener error:', error);
      }
    }
  }

  /**
   * Clear conflict log
   */
  clearLog() {
    this.conflictLog = [];
    console.log('[ConflictResolver] Conflict log cleared');
  }
}

// Export singleton instance
const conflictResolver = new ConflictResolver();
export default conflictResolver;

// Export class and constants for testing
export { ConflictResolver, RESOLUTION_STRATEGY, CONFLICT_TYPE };
