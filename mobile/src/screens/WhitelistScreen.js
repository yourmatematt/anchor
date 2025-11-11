/**
 * Whitelist Screen
 *
 * Manage approved payees
 * - View all whitelisted payees
 * - Add new payees
 * - Remove existing payees
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { whitelistService } from '../services/supabase';

export default function WhitelistScreen({ navigation }) {
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    loadWhitelist();
  }, []);

  async function loadWhitelist() {
    try {
      setLoading(true);
      const data = await whitelistService.getAll();
      setWhitelist(data);
    } catch (error) {
      console.error('Error loading whitelist:', error);
      Alert.alert('Error', 'Failed to load whitelist');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPayee() {
    if (!newPayeeName.trim()) {
      Alert.alert('Error', 'Payee name is required');
      return;
    }

    try {
      await whitelistService.add(newPayeeName.trim(), newCategory.trim(), newNotes.trim());
      setShowAddModal(false);
      setNewPayeeName('');
      setNewCategory('');
      setNewNotes('');
      loadWhitelist();
      Alert.alert('Success', `${newPayeeName} added to whitelist`);
    } catch (error) {
      console.error('Error adding payee:', error);
      Alert.alert('Error', 'Failed to add payee. They may already exist.');
    }
  }

  async function handleRemovePayee(id, payeeName) {
    Alert.alert(
      'Remove from Whitelist',
      `Are you sure you want to remove "${payeeName}" from your whitelist? Transactions to this payee will trigger alerts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await whitelistService.remove(id);
              loadWhitelist();
              Alert.alert('Removed', `${payeeName} removed from whitelist`);
            } catch (error) {
              console.error('Error removing payee:', error);
              Alert.alert('Error', 'Failed to remove payee');
            }
          }
        }
      ]
    );
  }

  const categoryColors = {
    rent: '#ff9500',
    utilities: '#007AFF',
    groceries: '#34c759',
    pet: '#af52de',
    default: '#8e8e93'
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Whitelist</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.infoBannerText}>
          Whitelisted payees won't trigger alerts. All others require voice memos.
        </Text>
      </View>

      {/* Whitelist Items */}
      <ScrollView style={styles.scrollView}>
        {whitelist.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyStateText}>No whitelisted payees yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap + to add your first trusted payee
            </Text>
          </View>
        ) : (
          whitelist.map((item) => (
            <View key={item.id} style={styles.whitelistItem}>
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: categoryColors[item.category] || categoryColors.default }
                  ]}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.payee_name}</Text>
                  {item.category && (
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  )}
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemovePayee(item.id, item.payee_name)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Payee Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Whitelist</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Payee Name"
              placeholderTextColor="#8e8e93"
              value={newPayeeName}
              onChangeText={setNewPayeeName}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Category (e.g., rent, utilities)"
              placeholderTextColor="#8e8e93"
              value={newCategory}
              onChangeText={setNewCategory}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              placeholderTextColor="#8e8e93"
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddPayee}
            >
              <Text style={styles.addButtonText}>Add to Whitelist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  infoBannerText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  whitelistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    color: '#8e8e93',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  itemNotes: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
