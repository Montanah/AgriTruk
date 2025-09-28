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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import { apiRequest } from '../utils/api';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverLicense: string;
  driverLicenseExpiryDate: string;
  idNumber: string;
  idExpiryDate: string;
  profileImage: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  assignedVehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
}

const DriverManagementScreen = () => {
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = async () => {
    try {
      setError(null);
      // Get company ID from route params or fetch it
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const company = companyData[0] || companyData;
        if (company?.id) {
          const data = await apiRequest(`/companies/${company.id}/drivers`);
          setDrivers(data.drivers || []);
        } else {
          setDrivers([]);
        }
      } else {
        setDrivers([]);
      }
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDrivers();
    setRefreshing(false);
  };

  const handleDriverAction = async (driverId: string, action: 'approve' | 'reject' | 'activate' | 'deactivate') => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/drivers/${driverId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', `Driver ${action}d successfully`);
        fetchDrivers(); // Refresh the list
      } else {
        throw new Error(`Failed to ${action} driver`);
      }
    } catch (err: any) {
      console.error(`Error ${action}ing driver:`, err);
      Alert.alert('Error', err.message || `Failed to ${action} driver`);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const renderDriver = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.driverPhone}>{item.phone}</Text>
          <Text style={styles.driverEmail}>{item.email}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: item.status === 'approved' || item.status === 'active' ? colors.success : 
                           item.status === 'rejected' ? colors.error : 
                           item.status === 'inactive' ? colors.text.secondary : colors.warning 
          }
        ]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="card-account-details" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>License: {item.driverLicense}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            Expires: {new Date(item.driverLicenseExpiryDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="id-card" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>ID: {item.idNumber}</Text>
        </View>
      </View>

      {item.assignedVehicle && (
        <View style={styles.vehicleInfo}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
          <Text style={styles.vehicleText}>
            Assigned to: {item.assignedVehicle.make} {item.assignedVehicle.model} ({item.assignedVehicle.registration})
          </Text>
        </View>
      )}

      <View style={styles.driverActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleDriverAction(item.id, 'approve')}
            >
              <MaterialCommunityIcons name="check" size={16} color={colors.white} />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleDriverAction(item.id, 'reject')}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.white} />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        
        {item.status === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.activateButton]}
            onPress={() => handleDriverAction(item.id, 'activate')}
          >
            <MaterialCommunityIcons name="play" size={16} color={colors.white} />
            <Text style={styles.actionText}>Activate</Text>
          </TouchableOpacity>
        )}

        {item.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deactivateButton]}
            onPress={() => handleDriverAction(item.id, 'deactivate')}
          >
            <MaterialCommunityIcons name="pause" size={16} color={colors.white} />
            <Text style={styles.actionText}>Deactivate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditDriver', { driverId: item.id })}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddEditModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{drivers.length}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {drivers.filter(d => d.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {drivers.filter(d => d.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Drivers Added</Text>
            <Text style={styles.emptySubtitle}>
              Start building your team by recruiting your first driver
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setAddEditModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.addFirstText}>Recruit First Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={drivers}
            renderItem={renderDriver}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginBottom: 2,
  },
  driverEmail: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
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
  },
  driverDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  driverActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  activateButton: {
    backgroundColor: colors.primary,
  },
  deactivateButton: {
    backgroundColor: colors.warning,
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default DriverManagementScreen;
