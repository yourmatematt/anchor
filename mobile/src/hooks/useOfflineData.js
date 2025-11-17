/**
 * Offline Data Hooks
 *
 * React hooks for accessing offline-first data
 * Automatically sync with local database and handle network state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import offlineSync from '../services/offline-sync';
import localDatabase from '../services/local-database';
import cacheManager from '../services/cache-manager';
import queueManager from '../services/queue-manager';

/**
 * Hook for sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState(offlineSync.getStatus());

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe(event => {
      if (event.type === 'status_change' || event.type === 'network_change') {
        setStatus(offlineSync.getStatus());
      }
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async (type = 'incremental') => {
    return await offlineSync.triggerSync(type);
  }, []);

  return {
    ...status,
    triggerSync
  };
}

/**
 * Hook for transactions
 */
export function useTransactions(userId, options = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      const cached = await cacheManager.getCachedTransactions(userId);

      if (cached && !options.forceRefresh) {
        setTransactions(cached);
        setLoading(false);
        return;
      }

      // Load from local database
      const local = await localDatabase.getTransactions(userId, options);
      setTransactions(local);

      // Cache the result
      await cacheManager.cacheTransactions(userId, local);

      setLoading(false);
    } catch (err) {
      console.error('[useTransactions] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, options.forceRefresh]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Listen for sync updates
  useEffect(() => {
    const unsubscribe = offlineSync.subscribe(event => {
      if (event.type === 'sync_complete') {
        // Reload transactions after sync
        loadTransactions();
      }
    });

    return unsubscribe;
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh: loadTransactions
  };
}

/**
 * Hook for single transaction
 */
export function useTransaction(transactionId) {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTransaction() {
      try {
        setLoading(true);
        const data = await localDatabase.getTransaction(transactionId);
        setTransaction(data);
        setLoading(false);
      } catch (err) {
        console.error('[useTransaction] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadTransaction();
  }, [transactionId]);

  return { transaction, loading, error };
}

/**
 * Hook for AI conversations
 */
export function useConversations(userId, limit = 50) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await localDatabase.getConversations(userId, limit);
      setConversations(data);

      setLoading(false);
    } catch (err) {
      console.error('[useConversations] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const addConversation = useCallback(async (message, response = null) => {
    try {
      const conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        message,
        response,
        timestamp: Math.floor(Date.now() / 1000),
        synced: false
      };

      await localDatabase.insertConversation(conversation);

      // Add to queue for syncing
      await queueManager.enqueue('ai_conversation', conversation);

      // Reload conversations
      await loadConversations();

      return conversation;
    } catch (err) {
      console.error('[useConversations] Add error:', err);
      throw err;
    }
  }, [userId, loadConversations]);

  return {
    conversations,
    loading,
    error,
    refresh: loadConversations,
    addConversation
  };
}

/**
 * Hook for patterns
 */
export function usePatterns(userId, patternType = null) {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatterns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      const cached = await cacheManager.getCachedPatterns(userId);

      if (cached && !patternType) {
        setPatterns(cached);
        setLoading(false);
        return;
      }

      const data = await localDatabase.getPatterns(userId, patternType);
      setPatterns(data);

      if (!patternType) {
        await cacheManager.cachePatterns(userId, data);
      }

      setLoading(false);
    } catch (err) {
      console.error('[usePatterns] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, patternType]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  return {
    patterns,
    loading,
    error,
    refresh: loadPatterns
  };
}

/**
 * Hook for guardian messages
 */
export function useGuardianMessages(userId, limit = 50) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await localDatabase.getGuardianMessages(userId, limit);
      setMessages(data);

      setLoading(false);
    } catch (err) {
      console.error('[useGuardianMessages] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = useCallback(async (guardianId, message, messageType = 'alert') => {
    try {
      const guardianMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        guardianId,
        message,
        messageType,
        timestamp: Math.floor(Date.now() / 1000),
        read: false,
        synced: false
      };

      await localDatabase.insertGuardianMessage(guardianMessage);

      // Add to queue with high priority
      await queueManager.enqueue('guardian_message', guardianMessage, {
        priority: messageType === 'emergency' ? 10 : 7
      });

      await loadMessages();

      return guardianMessage;
    } catch (err) {
      console.error('[useGuardianMessages] Send error:', err);
      throw err;
    }
  }, [userId, loadMessages]);

  const markAsRead = useCallback(async (messageId) => {
    try {
      await localDatabase.markMessageRead(messageId);
      await loadMessages();
    } catch (err) {
      console.error('[useGuardianMessages] Mark read error:', err);
      throw err;
    }
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    refresh: loadMessages,
    sendMessage,
    markAsRead
  };
}

/**
 * Hook for settings
 */
export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await localDatabase.getAllSettings();
      setSettings(data);

      setLoading(false);
    } catch (err) {
      console.error('[useSettings] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback(async (key, value) => {
    try {
      await localDatabase.setSetting(key, value);

      // Add to queue for syncing
      await queueManager.enqueue('setting_update', { key, value });

      await loadSettings();
    } catch (err) {
      console.error('[useSettings] Update error:', err);
      throw err;
    }
  }, [loadSettings]);

  const getSetting = useCallback((key, defaultValue = null) => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }, [settings]);

  return {
    settings,
    loading,
    error,
    refresh: loadSettings,
    updateSetting,
    getSetting
  };
}

/**
 * Hook for emergency contacts
 */
export function useEmergencyContacts(userId) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try cache first (critical data)
      const cached = await cacheManager.getCachedEmergencyContacts(userId);

      if (cached) {
        setContacts(cached);
        setLoading(false);
        return;
      }

      const data = await localDatabase.getEmergencyContacts(userId);
      setContacts(data);

      // Cache with no expiry
      await cacheManager.cacheEmergencyContacts(userId, data);

      setLoading(false);
    } catch (err) {
      console.error('[useEmergencyContacts] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const addContact = useCallback(async (contact) => {
    try {
      const newContact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        ...contact,
        synced: false
      };

      await localDatabase.insertEmergencyContact(newContact);
      await loadContacts();

      return newContact;
    } catch (err) {
      console.error('[useEmergencyContacts] Add error:', err);
      throw err;
    }
  }, [userId, loadContacts]);

  const removeContact = useCallback(async (contactId) => {
    try {
      await localDatabase.deleteEmergencyContact(contactId);
      await loadContacts();
    } catch (err) {
      console.error('[useEmergencyContacts] Remove error:', err);
      throw err;
    }
  }, [loadContacts]);

  return {
    contacts,
    loading,
    error,
    refresh: loadContacts,
    addContact,
    removeContact
  };
}

/**
 * Hook for queue status
 */
export function useQueueStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await queueManager.getStatus();
      setStatus(data);
      setLoading(false);
    } catch (err) {
      console.error('[useQueueStatus] Error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Refresh every 10 seconds
    const interval = setInterval(loadStatus, 10000);

    return () => clearInterval(interval);
  }, [loadStatus]);

  // Listen for queue updates
  useEffect(() => {
    const unsubscribe = queueManager.subscribe(event => {
      if (event.type === 'enqueued' || event.type === 'processed' || event.type === 'failed') {
        loadStatus();
      }
    });

    return unsubscribe;
  }, [loadStatus]);

  return {
    status,
    loading,
    refresh: loadStatus
  };
}

/**
 * Hook for cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cacheManager.getStatistics();
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error('[useCacheStats] Error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const clearCache = useCallback(async () => {
    try {
      await cacheManager.clearAll();
      await loadStats();
    } catch (err) {
      console.error('[useCacheStats] Clear error:', err);
      throw err;
    }
  }, [loadStats]);

  return {
    stats,
    loading,
    refresh: loadStats,
    clearCache
  };
}

/**
 * Hook for database statistics
 */
export function useDatabaseStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await localDatabase.getStatistics();
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error('[useDatabaseStats] Error:', err);
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return { stats, loading };
}

/**
 * Hook for online/offline status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe(event => {
      if (event.type === 'network_change') {
        setIsOnline(event.isOnline);
      }
    });

    // Get initial status
    const status = offlineSync.getStatus();
    setIsOnline(status.isOnline);

    return unsubscribe;
  }, []);

  return { isOnline };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate() {
  const [pendingUpdates, setPendingUpdates] = useState(new Map());

  const executeOptimisticUpdate = useCallback((key, optimisticValue, asyncFn) => {
    // Store optimistic value
    setPendingUpdates(prev => new Map(prev).set(key, optimisticValue));

    // Execute async function
    asyncFn()
      .then(() => {
        // Success - remove pending update
        setPendingUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      })
      .catch(error => {
        // Failed - revert optimistic update
        console.error('[useOptimisticUpdate] Failed:', error);
        setPendingUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      });
  }, []);

  return {
    pendingUpdates,
    executeOptimisticUpdate,
    isPending: (key) => pendingUpdates.has(key)
  };
}
