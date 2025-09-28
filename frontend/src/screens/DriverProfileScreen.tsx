import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  driverLicense: string;
  driverLicenseExpiryDate: string;
  idNumber: string;
  idExpiryDate: string;
  status: string;
  assignedVehicle: {
    id: string;
    make: string;
    model: string;
    registration: string;
  };
  company: {
    id: string;
    name: string;
    contact: string;
  };
  createdAt: string;
}

const DriverProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.DRIVERS}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.driver);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { signOut } = require('firebase/auth');
            await signOut(auth);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('DriverSettings')}
        >
          <MaterialCommunityIcons name="cog" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {profile && (
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile.profileImage ? (
                  <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
                ) : (
                  <MaterialCommunityIcons name="account" size={60} color={colors.primary} />
                )}
              </View>
              <Text style={styles.driverName}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.driverEmail}>{profile.email}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Company Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="office-building" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>Company:</Text>
                  <Text style={styles.infoValue}>{profile.company.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>Contact:</Text>
                  <Text style={styles.infoValue}>{profile.company.contact}</Text>
                </View>
              </View>
            </View>

            {/* Vehicle Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="truck" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>Vehicle:</Text>
                  <Text style={styles.infoValue}>
                    {profile.assignedVehicle.make} {profile.assignedVehicle.model}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="card-account-details" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>Registration:</Text>
                  <Text style={styles.infoValue}>{profile.assignedVehicle.registration}</Text>
                </View>
              </View>
            </View>

            {/* Driver Documents */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Driver Documents</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="card-account-details" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>License:</Text>
                  <Text style={styles.infoValue}>{profile.driverLicense}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>Expires:</Text>
                  <Text style={[
                    styles.infoValue,
                    new Date(profile.driverLicenseExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
                      ? styles.expiringText 
                      : null
                  ]}>
                    {new Date(profile.driverLicenseExpiryDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="id-card" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>ID Number:</Text>
                  <Text style={styles.infoValue}>{profile.idNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.infoLabel}>ID Expires:</Text>
                  <Text style={[
                    styles.infoValue,
                    new Date(profile.idExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
                      ? styles.expiringText 
                      : null
                  ]}>
                    {new Date(profile.idExpiryDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('UpdateDriverDocuments')}
              >
                <MaterialCommunityIcons name="file-document-edit" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Update Documents</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ChangePassword')}
              >
                <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Change Password</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  driverName: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverEmail: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.secondary,
    marginLeft: 12,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text.primary,
    flex: 1,
  },
  expiringText: {
    color: colors.warning,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text.primary,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.error,
    marginLeft: 12,
  },
});

export default DriverProfileScreen;
