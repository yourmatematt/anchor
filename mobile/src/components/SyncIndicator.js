/**
 * Sync Indicator Component
 *
 * Displays sync status and network connectivity
 * Shows queue size and allows manual sync trigger
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSyncStatus, useQueueStatus, useNetworkStatus } from '../hooks/useOfflineData';

export default function SyncIndicator({ style, showDetails = false, compact = false }) {
  const { isOnline, syncStatus, lastSyncTime, triggerSync } = useSyncStatus();
  const { status: queueStatus } = useQueueStatus();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing || !isOnline) return;

    setSyncing(true);
    try {
      await triggerSync('full');
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Compact view - just an icon
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        {!isOnline && (
          <Icon name="cloud-off-outline" size={16} color="#E74C3C" />
        )}
        {isOnline && syncStatus === 'syncing' && (
          <ActivityIndicator size="small" color="#3498DB" />
        )}
        {isOnline && syncStatus === 'success' && (
          <Icon name="cloud-check" size={16} color="#27AE60" />
        )}
        {isOnline && syncStatus === 'error' && (
          <Icon name="cloud-alert" size={16} color="#E67E22" />
        )}
        {queueStatus && queueStatus.queueSize > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queueStatus.queueSize}</Text>
          </View>
        )}
      </View>
    );
  }

  // Full view with details
  return (
    <View style={[styles.container, style]}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        {/* Network Status */}
        <View style={styles.statusSection}>
          <Icon
            name={isOnline ? 'wifi' : 'wifi-off'}
            size={20}
            color={isOnline ? '#27AE60' : '#E74C3C'}
          />
          <Text style={[styles.statusText, !isOnline && styles.errorText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Sync Status */}
        {isOnline && (
          <View style={styles.statusSection}>
            {syncStatus === 'syncing' ? (
              <>
                <ActivityIndicator size="small" color="#3498DB" />
                <Text style={styles.statusText}>Syncing...</Text>
              </>
            ) : syncStatus === 'success' ? (
              <>
                <Icon name="check-circle" size={20} color="#27AE60" />
                <Text style={styles.statusText}>Synced</Text>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <Icon name="alert-circle" size={20} color="#E67E22" />
                <Text style={styles.statusText}>Error</Text>
              </>
            ) : (
              <>
                <Icon name="cloud" size={20} color="#95A5A6" />
                <Text style={styles.statusText}>Idle</Text>
              </>
            )}
          </View>
        )}

        {/* Queue Size */}
        {queueStatus && queueStatus.queueSize > 0 && (
          <View style={styles.statusSection}>
            <Icon name="folder-sync" size={20} color="#3498DB" />
            <Text style={styles.statusText}>
              {queueStatus.queueSize} pending
            </Text>
          </View>
        )}

        {/* Manual Sync Button */}
        {isOnline && (
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
          >
            <Icon
              name="sync"
              size={20}
              color={syncing ? '#95A5A6' : '#3498DB'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Details Section */}
      {showDetails && (
        <View style={styles.detailsSection}>
          {/* Last Sync Time */}
          {lastSyncTime && (
            <Text style={styles.detailText}>
              Last synced: {_formatTime(Date.now() - lastSyncTime)} ago
            </Text>
          )}

          {/* Queue Details */}
          {queueStatus && queueStatus.queueSize > 0 && (
            <View style={styles.queueDetails}>
              <Text style={styles.detailText}>
                Pending items: {queueStatus.queueSize}
              </Text>
              {queueStatus.nextItems && queueStatus.nextItems.length > 0 && (
                <View style={styles.nextItems}>
                  {queueStatus.nextItems.slice(0, 3).map(item => (
                    <View key={item.id} style={styles.nextItem}>
                      <Icon
                        name={_getActionIcon(item.action)}
                        size={14}
                        color="#7F8C8D"
                      />
                      <Text style={styles.nextItemText}>
                        {_formatAction(item.action)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Offline Message */}
          {!isOnline && (
            <View style={styles.offlineMessage}>
              <Icon name="information" size={16} color="#3498DB" />
              <Text style={styles.offlineMessageText}>
                Changes will sync when back online
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Minimal sync indicator (just a dot)
 */
export function SyncDot() {
  const { isOnline, syncStatus } = useSyncStatus();

  let color = '#95A5A6'; // idle
  if (!isOnline) {
    color = '#E74C3C'; // offline
  } else if (syncStatus === 'syncing') {
    color = '#3498DB'; // syncing
  } else if (syncStatus === 'success') {
    color = '#27AE60'; // success
  } else if (syncStatus === 'error') {
    color = '#E67E22'; // error
  }

  return (
    <View style={[styles.dot, { backgroundColor: color }]} />
  );
}

/**
 * Animated sync spinner
 */
export function SyncSpinner() {
  const spinValue = new Animated.Value(0);

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Icon name="sync" size={24} color="#3498DB" />
    </Animated.View>
  );
}

/**
 * Network status banner
 */
export function NetworkBanner() {
  const { isOnline } = useNetworkStatus();
  const [visible, setVisible] = useState(!isOnline);

  React.useEffect(() => {
    if (!isOnline) {
      setVisible(true);
    } else {
      // Hide banner after 3 seconds when back online
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!visible) return null;

  return (
    <View style={[
      styles.banner,
      isOnline ? styles.bannerOnline : styles.bannerOffline
    ]}>
      <Icon
        name={isOnline ? 'wifi' : 'wifi-off'}
        size={20}
        color="#FFFFFF"
      />
      <Text style={styles.bannerText}>
        {isOnline
          ? 'Back online - syncing...'
          : 'You are offline - changes will sync when reconnected'}
      </Text>
    </View>
  );
}

// Helper functions
function _formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function _getActionIcon(action) {
  const iconMap = {
    payment_request: 'cash',
    ai_conversation: 'message',
    guardian_message: 'shield-account',
    pattern_update: 'chart-line',
    setting_update: 'cog',
    transaction_flag: 'flag',
    emergency_alert: 'alert'
  };

  return iconMap[action] || 'file-sync';
}

function _formatAction(action) {
  const nameMap = {
    payment_request: 'Payment',
    ai_conversation: 'Conversation',
    guardian_message: 'Guardian message',
    pattern_update: 'Pattern',
    setting_update: 'Setting',
    transaction_flag: 'Transaction flag',
    emergency_alert: 'Emergency alert'
  };

  return nameMap[action] || action;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500'
  },
  errorText: {
    color: '#E74C3C'
  },
  syncButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EBF5FB'
  },
  syncButtonDisabled: {
    opacity: 0.5
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    gap: 8
  },
  detailText: {
    fontSize: 12,
    color: '#7F8C8D'
  },
  queueDetails: {
    gap: 6
  },
  nextItems: {
    marginTop: 4,
    gap: 4
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8
  },
  nextItemText: {
    fontSize: 11,
    color: '#95A5A6'
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#EBF5FB',
    borderRadius: 8
  },
  offlineMessageText: {
    fontSize: 12,
    color: '#2C3E50',
    flex: 1
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16
  },
  bannerOffline: {
    backgroundColor: '#E74C3C'
  },
  bannerOnline: {
    backgroundColor: '#27AE60'
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1
  }
});
