import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleInfo: {
    make: string;
    model: string;
    registration: string;
  };
  type: 'scheduled' | 'repair' | 'inspection' | 'emergency';
  description: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  cost?: number;
  notes?: string;
  assignedTo?: string;
}

const FleetMaintenanceScreen = () => {
  const navigation = useNavigation();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const maintenanceTypes = [
    { id: 'scheduled', title: 'Scheduled Maintenance', icon: 'calendar-clock', color: colors.primary },
    { id: 'repair', title: 'Repair', icon: 'wrench', color: colors.error },
    { id: 'inspection', title: 'Inspection', icon: 'magnify', color: colors.warning },
    { id: 'emergency', title: 'Emergency', icon: 'alert', color: colors.error },
  ];

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.MAINTENANCE}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceRecords(data.records || []);
      } else {
        // No maintenance records available yet
        setMaintenanceRecords([]);
      }
    } catch (err: any) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMaintenanceRecords();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMaintenanceRecords();
  }, []);

  const addMaintenanceRecord = async () => {
    if (!selectedVehicle || !maintenanceType || !description || !dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.MAINTENANCE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle,
          type: maintenanceType,
          description,
          dueDate,
          cost: cost ? parseFloat(cost) : undefined,
          notes,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Maintenance record added successfully');
        setAddModalVisible(false);
        resetForm();
        fetchMaintenanceRecords();
      } else {
        throw new Error('Failed to add maintenance record');
      }
    } catch (err: any) {
      console.error('Error adding maintenance record:', err);
      Alert.alert('Error', 'Failed to add maintenance record. Please try again.');
    }
  };

  const updateMaintenanceStatus = async (recordId: string, status: string) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.MAINTENANCE}/${recordId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Maintenance status updated successfully');
        fetchMaintenanceRecords();
      } else {
        throw new Error('Failed to update maintenance status');
      }
    } catch (err: any) {
      console.error('Error updating maintenance status:', err);
      Alert.alert('Error', 'Failed to update maintenance status. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedVehicle('');
    setMaintenanceType('');
    setDescription('');
    setDueDate('');
    setCost('');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'in_progress': return colors.warning;
      case 'overdue': return colors.error;
      case 'pending': return colors.info;
      default: return colors.text.secondary;
    }
  };

  const getTypeIcon = (type: string) => {
    const maintenanceType = maintenanceTypes.find(t => t.id === type);
    return maintenanceType?.icon || 'wrench';
  };

  const getTypeColor = (type: string) => {
    const maintenanceType = maintenanceTypes.find(t => t.id === type);
    return maintenanceType?.color || colors.primary;
  };

  const renderMaintenanceRecord = ({ item }: { item: MaintenanceRecord }) => (
    <View style={styles.maintenanceCard}>
      <View style={styles.maintenanceHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {item.vehicleInfo.make} {item.vehicleInfo.model}
          </Text>
          <Text style={styles.vehicleRegistration}>{item.vehicleInfo.registration}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.maintenanceDetails}>
        <View style={styles.maintenanceType}>
          <MaterialCommunityIcons
            name={getTypeIcon(item.type)}
            size={16}
            color={getTypeColor(item.type)}
          />
          <Text style={styles.typeText}>
            {maintenanceTypes.find(t => t.id === item.type)?.title || item.type}
          </Text>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
        {item.cost && <Text style={styles.cost}>Cost: ${item.cost}</Text>}
        {item.notes && <Text style={styles.notes}>Notes: {item.notes}</Text>}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            onPress={() => updateMaintenanceStatus(item.id, 'in_progress')}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => updateMaintenanceStatus(item.id, 'completed')}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'in_progress' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => updateMaintenanceStatus(item.id, 'completed')}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading maintenance records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            try {
              navigation.goBack();
            } catch (error) {
              // Fallback navigation if goBack fails
              navigation.navigate('FleetManagement');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Maintenance</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {maintenanceRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="wrench-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyStateTitle}>No Maintenance Records</Text>
            <Text style={styles.emptyStateText}>
              Add maintenance records to track vehicle upkeep and schedules.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Add Maintenance Record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Maintenance Records</Text>
            {maintenanceRecords.map((record) => (
              <View key={record.id}>
                {renderMaintenanceRecord({ item: record })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Maintenance Record</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Vehicle *</Text>
              <TextInput
                style={styles.input}
                value={selectedVehicle}
                onChangeText={setSelectedVehicle}
                placeholder="Select vehicle"
              />

              <Text style={styles.inputLabel}>Maintenance Type *</Text>
              {maintenanceTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    maintenanceType === type.id && styles.selectedTypeOption
                  ]}
                  onPress={() => setMaintenanceType(type.id)}
                >
                  <MaterialCommunityIcons name={type.icon} size={20} color={type.color} />
                  <Text style={styles.typeOptionText}>{type.title}</Text>
                  {maintenanceType === type.id && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the maintenance required"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Due Date *</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Cost (Optional)</Text>
              <TextInput
                style={styles.input}
                value={cost}
                onChangeText={setCost}
                placeholder="0.00"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addMaintenanceRecord}
              >
                <Text style={styles.addButtonText}>Add Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  maintenanceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  vehicleRegistration: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
  },
  maintenanceDetails: {
    marginBottom: 12,
  },
  maintenanceType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  cost: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginBottom: 2,
  },
  notes: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTypeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeOptionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
});

export default FleetMaintenanceScreen;
