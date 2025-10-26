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
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface Driver {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
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

const DriverAssignmentsScreen = ({ route }: any) => {
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [isJobSeeker, setIsJobSeeker] = useState(false);
  
  // Get route params for specific vehicle assignment
  const { vehicleId, vehicleMake, vehicleModel, vehicleRegistration, hasAssignedDriver } = route?.params || {};

  const fetchData = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      console.log('🔍 Fetching drivers and vehicles...');

      // First get the company ID
      const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let companyId = user.uid; // fallback
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const company = companyData[0] || companyData;
        if (company?.id) {
          companyId = company.id;
        }
      }
      
      console.log('🔍 Company ID for driver fetch:', companyId);

      const [driversRes, vehiclesRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.DRIVERS}?companyId=${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_ENDPOINTS.VEHICLES}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      console.log('🔍 Drivers response status:', driversRes.status);
      console.log('🔍 Vehicles response status:', vehiclesRes.status);

      const driversData = driversRes.ok ? await driversRes.json() : { drivers: [] };
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { vehicles: [] };

      console.log('🔍 Drivers data:', driversData);
      console.log('🔍 Vehicles data:', vehiclesData);

      // Handle different response structures
      const driversList = driversData.drivers || driversData || [];
      const vehiclesList = vehiclesData.vehicles || vehiclesData || [];
      
      // Only show approved vehicles and active drivers for assignment
      const approvedVehicles = vehiclesList.filter((v: any) => v.status === 'approved');
      const activeDrivers = driversList.filter((d: any) => d.status === 'active');

      console.log('🔍 Parsed drivers list:', activeDrivers);
      console.log('🔍 Parsed vehicles list:', approvedVehicles);
      console.log('🔍 Active drivers count:', activeDrivers.length);
      console.log('🔍 Approved vehicles count:', approvedVehicles.length);

      setDrivers(activeDrivers);
      setVehicles(approvedVehicles);
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

  // Auto-open assignment modal if specific vehicle is passed
  useEffect(() => {
    if (vehicleId && vehicles.length > 0) {
      const targetVehicle = vehicles.find(v => v.id === vehicleId);
      if (targetVehicle) {
        setSelectedVehicle(targetVehicle);
        setAssignModalVisible(true);
      }
    }
  }, [vehicleId, vehicles]);

  // Check if a driver is a job seeker (has jobSeekerId or is from job seekers)
  const checkIfJobSeeker = (driver: Driver) => {
    return driver.jobSeekerId || driver.source === 'job_seeker' || driver.isJobSeeker;
  };

  // Handle driver selection and detect if it's a job seeker
  const handleDriverSelection = (driver: Driver) => {
    setSelectedDriver(driver);
    const isFromJobSeeker = checkIfJobSeeker(driver);
    setIsJobSeeker(isFromJobSeeker);
    
    // If it's a job seeker, show email options
    if (isFromJobSeeker) {
      setUseCustomEmail(false); // Default to using job seeker's email
      setCustomEmail('');
    }
  };

  const handleAssignDriver = async (driverId: string, vehicleId: string) => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      console.log('🔍 Assigning driver:', { driverId, vehicleId, useCustomEmail, customEmail, isJobSeeker });

      // Prepare assignment data with email management
      const assignmentData: any = { 
        driverId,
        activateDriver: true // Always activate driver before assignment
      };
      
      if (useCustomEmail && customEmail.trim()) {
        assignmentData.customEmail = customEmail.trim();
        assignmentData.useCustomEmail = true;
      }
      
      if (isJobSeeker) {
        assignmentData.isJobSeeker = true;
        assignmentData.updateJobSeekerStatus = true;
      }

      // Use the correct backend endpoint: POST /api/vehicles/:id/assign-driver
      const response = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}/assign-driver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      console.log('🔍 Assignment response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Assignment success:', result);
        
        // Reset form state
        setUseCustomEmail(false);
        setCustomEmail('');
        setIsJobSeeker(false);
        setSelectedDriver(null);
        
        Alert.alert('Success', 'Driver assigned to vehicle successfully. Login credentials have been sent to the driver.');
        fetchData();
        setAssignModalVisible(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Assignment error response:', errorData);
        
        // Handle different error scenarios
        if (errorData.message && errorData.message.includes('must be active')) {
          console.log('🔍 Driver not active, attempting to activate first...');
          
          try {
            // First activate the driver
            const activateResponse = await fetch(`${API_ENDPOINTS.DRIVERS}/${driverId}/activate`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (activateResponse.ok) {
              console.log('🔍 Driver activated successfully, retrying assignment...');
              
              // Retry the assignment
              const retryResponse = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}/assign-driver`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignmentData),
              });
              
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                console.log('🔍 Assignment success after activation:', retryResult);
                
                // Reset form state
                setUseCustomEmail(false);
                setCustomEmail('');
                setIsJobSeeker(false);
                setSelectedDriver(null);
                
                Alert.alert('Success', 'Driver activated and assigned to vehicle successfully. Login credentials have been sent to the driver.');
                fetchData();
                setAssignModalVisible(false);
                return;
              } else {
                const retryErrorData = await retryResponse.json().catch(() => ({}));
                throw new Error(`Failed to assign driver after activation: ${retryResponse.status} - ${retryErrorData.message || 'Unknown error'}`);
              }
            } else {
              const activateErrorData = await activateResponse.json().catch(() => ({}));
              throw new Error(`Failed to activate driver: ${activateResponse.status} - ${activateErrorData.message || 'Unknown error'}`);
            }
          } catch (activateErr: any) {
            console.error('Error activating driver:', activateErr);
            throw new Error(`Failed to activate driver: ${activateErr.message}`);
          }
        } else if (errorData.message && errorData.message.includes('already assigned to another vehicle')) {
          console.log('🔍 Driver already assigned to another vehicle, handling reassignment...');
          
          // Show confirmation dialog for reassignment
          Alert.alert(
            'Driver Already Assigned',
            'This driver is already assigned to another vehicle. Do you want to reassign them to this vehicle?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Reassign',
                onPress: async () => {
                  try {
                    // The backend should handle reassignment automatically
                    // But let's try with a reassignment flag
                    const reassignmentData = {
                      ...assignmentData,
                      allowReassignment: true,
                      reassignDriver: true
                    };
                    
                    const reassignResponse = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}/assign-driver`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(reassignmentData),
                    });
                    
                    if (reassignResponse.ok) {
                      const reassignResult = await reassignResponse.json();
                      console.log('🔍 Reassignment success:', reassignResult);
                      
                      // Reset form state
                      setUseCustomEmail(false);
                      setCustomEmail('');
                      setIsJobSeeker(false);
                      setSelectedDriver(null);
                      
                      Alert.alert('Success', 'Driver reassigned to vehicle successfully. Login credentials have been sent to the driver.');
                      fetchData();
                      setAssignModalVisible(false);
                    } else {
                      const reassignErrorData = await reassignResponse.json().catch(() => ({}));
                      throw new Error(`Failed to reassign driver: ${reassignResponse.status} - ${reassignErrorData.message || 'Unknown error'}`);
                    }
                  } catch (reassignErr: any) {
                    console.error('Error reassigning driver:', reassignErr);
                    Alert.alert('Error', `Failed to reassign driver: ${reassignErr.message}`);
                  }
                },
              },
            ]
          );
          return; // Don't throw error, we're handling it in the dialog
        } else {
          throw new Error(`Failed to assign driver: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      console.error('Error assigning driver:', err);
      Alert.alert('Error', `Failed to assign driver to vehicle: ${err.message}`);
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

  const renderVehicle = ({ item }: { item: Vehicle }) => {
    // Get vehicle features
    const features = [];
    if (item.refrigerated) features.push('Refrigerated');
    if (item.humidityControl) features.push('Humidity Control');
    if (item.specialCargo) features.push('Special Cargo');
    if (item.driveType === '4WD') features.push('4WD');
    if (item.bodyType === 'open') features.push('Open Body');

    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleIconContainer}>
            <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle}>{item.make} {item.model}</Text>
            <Text style={styles.vehicleSubtitle}>{item.registration} • {item.year}</Text>
            <View style={styles.vehicleDetails}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="palette" size={14} color={colors.text.secondary} />
                <Text style={styles.detailText}>{item.color}</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="weight" size={14} color={colors.text.secondary} />
                <Text style={styles.detailText}>{item.capacity}t</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="car" size={14} color={colors.text.secondary} />
                <Text style={styles.detailText}>{item.bodyType}</Text>
              </View>
            </View>
            {features.length > 0 && (
              <View style={styles.featuresContainer}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureTag}>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}
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
  };

  const renderDriver = ({ item }: { item: Driver }) => {
    console.log('🔍 Rendering driver:', item);
    return (
      <TouchableOpacity
        style={[
          styles.driverCard,
          selectedDriver?.id === item.id && styles.selectedDriverCard
        ]}
        onPress={() => handleDriverSelection(item)}
      >
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatar}>
          <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {item.firstName && item.lastName 
              ? `${item.firstName} ${item.lastName}` 
              : item.name || 'Driver Name Not Available'
            }
          </Text>
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
            Currently assigned to: {item.assignedVehicle.make} {item.assignedVehicle.model}
          </Text>
        </View>
      )}
      
      {item.assignedVehicleId ? (
        <View style={styles.assignedDriverInfo}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.warning} />
          <Text style={styles.assignedDriverText}>
            Already assigned to vehicle
          </Text>
        </View>
      ) : (
        <View style={styles.availableDriverInfo}>
          <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          <Text style={styles.availableDriverText}>
            Available for assignment
          </Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

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
              data={(() => {
                // Filter for active/approved drivers who are NOT assigned to any vehicle
                const filteredDrivers = drivers.filter(d => 
                  (d.status === 'active' || d.status === 'approved') && 
                  !d.assignedVehicleId
                );
                console.log('🔍 Available drivers filter result:', filteredDrivers);
                console.log('🔍 Total drivers:', drivers.length);
                console.log('🔍 Unassigned drivers:', filteredDrivers.length);
                return filteredDrivers;
              })()}
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
            
            {hasAssignedDriver && (
              <View style={styles.reassignmentWarning}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
                <Text style={styles.warningText}>
                  This vehicle already has an assigned driver. Selecting a new driver will reassign the vehicle.
                </Text>
              </View>
            )}

            <FlatList
              data={(() => {
                // Filter for active/approved drivers who are NOT assigned to any vehicle
                const filteredDrivers = drivers.filter(d => 
                  (d.status === 'active' || d.status === 'approved') && 
                  !d.assignedVehicleId
                );
                console.log('🔍 Modal drivers filter result:', filteredDrivers);
                console.log('🔍 All drivers:', drivers);
                console.log('🔍 Unassigned drivers in modal:', filteredDrivers.length);
                return filteredDrivers;
              })()}
              renderItem={renderDriver}
              keyExtractor={(item) => item.id}
              style={styles.driversList}
              ListEmptyComponent={() => (
                <View style={styles.emptyDriversList}>
                  <MaterialCommunityIcons name="account-outline" size={48} color={colors.text.light} />
                  <Text style={styles.emptyDriversText}>No drivers available</Text>
                  <Text style={styles.emptyDriversSubtext}>
                    Recruit drivers first to assign them to vehicles
                  </Text>
                </View>
              )}
            />

            {/* Email Management Section - Only show if driver is selected */}
            {selectedDriver && (
              <View style={styles.emailManagementSection}>
                <Text style={styles.emailSectionTitle}>Email Configuration</Text>
                
                {isJobSeeker && (
                  <View style={styles.jobSeekerInfo}>
                    <MaterialCommunityIcons name="account-search" size={20} color={colors.primary} />
                    <Text style={styles.jobSeekerText}>
                      This driver was recruited from job seekers
                    </Text>
                  </View>
                )}

                <View style={styles.emailOptions}>
                  <TouchableOpacity
                    style={styles.emailOption}
                    onPress={() => setUseCustomEmail(false)}
                  >
                    <View style={[
                      styles.radioButton,
                      !useCustomEmail && styles.radioButtonSelected
                    ]}>
                      {!useCustomEmail && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.emailOptionContent}>
                      <Text style={styles.emailOptionTitle}>
                        Use {isJobSeeker ? 'Job Seeker' : 'Driver'} Email
                      </Text>
                      <Text style={styles.emailOptionSubtitle}>
                        {selectedDriver.email}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emailOption}
                    onPress={() => setUseCustomEmail(true)}
                  >
                    <View style={[
                      styles.radioButton,
                      useCustomEmail && styles.radioButtonSelected
                    ]}>
                      {useCustomEmail && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.emailOptionContent}>
                      <Text style={styles.emailOptionTitle}>Use Company Email</Text>
                      <Text style={styles.emailOptionSubtitle}>
                        Provide a custom company email
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {useCustomEmail && (
                  <View style={styles.customEmailInput}>
                    <Text style={styles.inputLabel}>Company Email</Text>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="driver@yourcompany.com"
                      value={customEmail}
                      onChangeText={setCustomEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                {isJobSeeker && (
                  <View style={styles.jobSeekerStatusInfo}>
                    <MaterialCommunityIcons name="information" size={16} color={colors.info} />
                    <Text style={styles.jobSeekerStatusText}>
                      {useCustomEmail 
                        ? "The job seeker will be prompted to update their status to 'recruited' on their status screen."
                        : "The job seeker's status will automatically change to 'recruited'."
                      }
                    </Text>
                  </View>
                )}
              </View>
            )}

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
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  featureTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  featureText: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.primary,
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
  availableDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  availableDriverText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
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
  reassignmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
    marginLeft: 8,
    flex: 1,
  },
  emptyDriversList: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyDriversText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDriversSubtext: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Email Management Styles
  emailManagementSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emailSectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  jobSeekerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  jobSeekerText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  emailOptions: {
    marginBottom: 16,
  },
  emailOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  emailOptionContent: {
    flex: 1,
  },
  emailOptionTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  emailOptionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  customEmailInput: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobSeekerStatusInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  jobSeekerStatusText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.info,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  // Assigned Driver Styles
  assignedDriverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  assignedDriverText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
    marginLeft: 4,
  },
});

export default DriverAssignmentsScreen;
