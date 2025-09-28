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
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
        <Text style={styles.vehicleSubtitle}>Registration: {item.registration}</Text>
        <Text style={styles.vehicleStatus}>Status: {item.status}</Text>
      </View>
      
      {item.assignedDriver ? (
        <View style={styles.assignedDriver}>
          <Text style={styles.assignedDriverTitle}>Assigned Driver:</Text>
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
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.driverPhone}>{item.phone}</Text>
        <Text style={styles.driverStatus}>Status: {item.status}</Text>
        {item.assignedVehicle && (
          <Text style={styles.assignedVehicle}>
            Currently assigned to: {item.assignedVehicle.make} {item.assignedVehicle.model}
          </Text>
        )}
      </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Assignments</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Vehicles</Text>
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

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
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  vehicleCard: {
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
  vehicleInfo: {
    marginBottom: 12,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  vehicleStatus: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
  },
  assignedDriver: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
  },
  assignedDriverTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  assignedDriverName: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  assignedDriverPhone: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  assignButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 4,
  },
  unassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  unassignButtonText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.error,
    marginLeft: 4,
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
