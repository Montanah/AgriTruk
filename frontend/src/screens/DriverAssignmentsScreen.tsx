import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'inactive';
  assignedVehicleId?: string;
  assignedVehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
  };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  registration: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedDriverId?: string;
  assignedDriver?: {
    id: string;
    name: string;
    phone: string;
  };
}

const DriverAssignmentsScreen = () => {
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const [driversRes, vehiclesRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.DRIVERS}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_ENDPOINTS.VEHICLES}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const driversData = driversRes.ok ? await driversRes.json() : { drivers: [] };
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { vehicles: [] };

      setDrivers(driversData.drivers || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to fetch drivers and vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignDriver = async (driverId: string, vehicleId: string) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}/assign-driver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Driver assigned to vehicle successfully');
        fetchData();
        setAssignModalVisible(false);
      } else {
        throw new Error('Failed to assign driver');
      }
    } catch (err: any) {
      console.error('Error assigning driver:', err);
      Alert.alert('Error', 'Failed to assign driver to vehicle');
    }
  };

  const handleUnassignDriver = async (vehicleId: string) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}/unassign-driver`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Driver unassigned from vehicle successfully');
        fetchData();
      } else {
        throw new Error('Failed to unassign driver');
      }
    } catch (err: any) {
      console.error('Error unassigning driver:', err);
      Alert.alert('Error', 'Failed to unassign driver from vehicle');
    }
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIconContainer}>
          <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
          <Text style={styles.vehicleSubtitle}>{item.registration}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? colors.success : colors.warning }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {item.assignedDriver ? (
        <View style={styles.assignedDriver}>
          <View style={styles.assignedDriverHeader}>
            <MaterialCommunityIcons name="account-check" size={20} color={colors.success} />
            <Text style={styles.assignedDriverTitle}>Assigned Driver</Text>
          </View>
          <Text style={styles.assignedDriverName}>{item.assignedDriver.name}</Text>
          <Text style={styles.assignedDriverPhone}>{item.assignedDriver.phone}</Text>
          <TouchableOpacity
            style={styles.unassignButton}
            onPress={() => handleUnassignDriver(item.id)}
          >
            <MaterialCommunityIcons name="account-remove" size={16} color={colors.error} />
            <Text style={styles.unassignButtonText}>Unassign</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => {
            setSelectedVehicle(item);
            setAssignModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
          <Text style={styles.assignButtonText}>Assign Driver</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDriver = ({ item }: { item: Driver }) => (
    <TouchableOpacity
      style={[
        styles.driverCard,
        selectedDriver?.id === item.id && styles.selectedDriverCard
      ]}
      onPress={() => setSelectedDriver(item)}
    >
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatar}>
          <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.driverPhone}>{item.phone}</Text>
          <View style={styles.driverStatusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? colors.success : colors.warning }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {item.assignedVehicle && (
        <View style={styles.assignedVehicleInfo}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.text.secondary} />
          <Text style={styles.assignedVehicleText}>
            Assigned to: {item.assignedVehicle.make} {item.assignedVehicle.model}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Assignments</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="refresh" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.secondary} />
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-check" size={24} color={colors.success} />
            <Text style={styles.statNumber}>{vehicles.filter(v => v.assignedDriverId).length}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
        </View>

        {/* Vehicles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            <Text style={styles.sectionSubtitle}>Manage driver assignments for your fleet</Text>
          </View>
          
          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="truck-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyTitle}>No Vehicles Available</Text>
              <Text style={styles.emptySubtitle}>
                Add vehicles to your fleet to start assigning drivers
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('VehicleManagement')}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={styles.emptyActionText}>Add Vehicles</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.vehiclesListContainer}>
              {vehicles.map((vehicle) => (
                <View key={vehicle.id}>
                  {renderVehicle({ item: vehicle })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Drivers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Drivers</Text>
            <Text style={styles.sectionSubtitle}>Drivers ready for assignment</Text>
          </View>
          
          {drivers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-outline" size={64} color={colors.text.light} />
              <Text style={styles.emptyTitle}>No Drivers Available</Text>
              <Text style={styles.emptySubtitle}>
                Recruit drivers to start assigning them to vehicles
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('DriverManagement')}
              >
                <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                <Text style={styles.emptyActionText}>Recruit Drivers</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={drivers.filter(d => d.status === 'active')}
              renderItem={renderDriver}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.driversListContainer}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Driver to Vehicle</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a driver for: {selectedVehicle?.make} {selectedVehicle?.model}
            </Text>

            <FlatList
              data={drivers.filter(d => d.status === 'active' && !d.assignedVehicleId)}
              renderItem={renderDriver}
              keyExtractor={(item) => item.id}
              style={styles.driversList}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedDriver && styles.disabledButton
                ]}
                onPress={() => {
                  if (selectedDriver && selectedVehicle) {
                    handleAssignDriver(selectedDriver.id, selectedVehicle.id);
                  }
                }}
                disabled={!selectedDriver}
              >
                <Text style={styles.confirmButtonText}>Assign Driver</Text>
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
  refreshButton: {
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
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.white,
    marginBottom: 8,
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  vehiclesListContainer: {
    paddingHorizontal: 20,
  },
  driversListContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyActionText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  vehicleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    textTransform: 'capitalize',
  },
  assignedDriver: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  assignedDriverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignedDriverTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: 8,
  },
  assignedDriverName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  assignedDriverPhone: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  assignButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  unassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  unassignButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedDriverCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.background.secondary,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  driverStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedVehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  assignedVehicleText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 4,
    flex: 1,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  driversList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  driverCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedDriverCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  driverStatus: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginBottom: 2,
  },
  assignedVehicle: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.text.secondary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
});

export default DriverAssignmentsScreen;
