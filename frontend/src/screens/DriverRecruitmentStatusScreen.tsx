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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';

interface RecruitmentRequest {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  requestDate: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  salaryOffer?: {
    min: number;
    max: number;
    currency: string;
  };
  jobDetails?: {
    vehicleType: string;
    route: string;
    workingHours: string;
  };
}

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  profileImage?: string;
  experience: number;
  location: string;
  vehicleTypes: string[];
  expectedSalary: {
    min: number;
    max: number;
    currency: string;
  };
}

const DriverRecruitmentStatusScreen = () => {
  const navigation = useNavigation();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [recruitmentRequests, setRecruitmentRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverData = async () => {
    try {
      setError(null);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Fetch job seeker application
      const profileResponse = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/user/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const application = profileData.application;
        
        // Check if profile is complete
        if (!isProfileComplete(application)) {
          console.log('Job seeker profile incomplete - redirecting to profile completion');
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransporterCompletionScreen', params: { isJobSeeker: true } }]
          });
          return;
        }
        
        setDriverProfile(application);
      } else if (profileResponse.status === 404) {
        // No job seeker application found - redirect to profile completion
        console.log('No job seeker application found - redirecting to profile completion');
        navigation.reset({
          index: 0,
          routes: [{ name: 'TransporterCompletionScreen', params: { isJobSeeker: true } }]
        });
        return;
      }

      // No recruitment requests - companies handle recruitment themselves
      setRecruitmentRequests([]);
    } catch (err: any) {
      console.error('Error fetching driver data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if job seeker profile is complete
  const isProfileComplete = (profile: any) => {
    if (!profile) return false;
    
    // Check required documents
    const hasRequiredDocs = profile.documents && 
      profile.documents.profilePhoto && 
      profile.documents.driverLicense && 
      profile.documents.goodConductCert && 
      profile.documents.idDoc;
    
    // Check required profile fields
    const hasRequiredFields = profile.dateOfBirth && 
      profile.careerStartDate && 
      profile.vehicleClasses && 
      profile.vehicleClasses.length > 0 && 
      profile.specializations && 
      profile.specializations.length > 0;
    
    return hasRequiredDocs && hasRequiredFields;
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverData();
  };

  const handleRequestResponse = async (requestId: string, response: 'accepted' | 'rejected') => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      const responseData = await fetch(`${API_ENDPOINTS.DRIVERS}/${user.uid}/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
      });

      if (responseData.ok) {
        Alert.alert(
          'Success',
          response === 'accepted' 
            ? 'You have accepted the recruitment request! You will now have access to company jobs.'
            : 'You have rejected the recruitment request.'
        );
        
        if (response === 'accepted') {
          // Navigate to driver dashboard
          navigation.navigate('DriverTabs');
        } else {
          // Refresh the data
          fetchDriverData();
        }
      } else {
        Alert.alert('Error', 'Failed to respond to request. Please try again.');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Error', 'Failed to respond to request. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'accepted': return 'check-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderRecruitmentRequest = (request: RecruitmentRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.companyInfo}>
          {request.companyLogo ? (
            <View style={styles.companyLogo}>
              <Text style={styles.companyLogoText}>
                {request.companyName.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <MaterialCommunityIcons name="office-building" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{request.companyName}</Text>
            <Text style={styles.requestDate}>
              {new Date(request.requestDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(request.status)} 
            size={16} 
            color={colors.white} 
          />
          <Text style={styles.statusText}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Text>
        </View>
      </View>

      {request.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      {request.salaryOffer && (
        <View style={styles.offerContainer}>
          <Text style={styles.offerLabel}>Salary Offer:</Text>
          <Text style={styles.offerText}>
            {request.salaryOffer.currency} {request.salaryOffer.min.toLocaleString()} - {request.salaryOffer.max.toLocaleString()}
          </Text>
        </View>
      )}

      {request.jobDetails && (
        <View style={styles.jobDetailsContainer}>
          <Text style={styles.jobDetailsLabel}>Job Details:</Text>
          <View style={styles.jobDetailsRow}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
            <Text style={styles.jobDetailsText}>{request.jobDetails.vehicleType}</Text>
          </View>
          <View style={styles.jobDetailsRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <Text style={styles.jobDetailsText}>{request.jobDetails.route}</Text>
          </View>
          <View style={styles.jobDetailsRow}>
            <MaterialCommunityIcons name="clock" size={16} color={colors.primary} />
            <Text style={styles.jobDetailsText}>{request.jobDetails.workingHours}</Text>
          </View>
        </View>
      )}

      {request.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRequestResponse(request.id, 'rejected')}
          >
            <MaterialCommunityIcons name="close" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRequestResponse(request.id, 'accepted')}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading recruitment status...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDriverData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Recruitment Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Status */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {driverProfile?.profileImage ? (
                <View style={styles.profileImage}>
                  <Text style={styles.profileImageText}>
                    {driverProfile.firstName.charAt(0)}{driverProfile.lastName.charAt(0)}
                  </Text>
                </View>
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialCommunityIcons name="account" size={32} color={colors.text.secondary} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {driverProfile?.firstName} {driverProfile?.lastName}
              </Text>
              <Text style={styles.profileEmail}>{driverProfile?.email}</Text>
              <View style={[styles.profileStatusBadge, { backgroundColor: getStatusColor(driverProfile?.status || 'pending') }]}>
                <MaterialCommunityIcons 
                  name={getStatusIcon(driverProfile?.status || 'pending')} 
                  size={14} 
                  color={colors.white} 
                />
                <Text style={styles.profileStatusText}>
                  {driverProfile?.status?.charAt(0).toUpperCase()}{driverProfile?.status?.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          
          {driverProfile?.status === 'approved' && (
            <View style={styles.waitingMessage}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={colors.warning} />
              <Text style={styles.waitingText}>
                Your profile has been approved! You're now visible to companies and can receive recruitment requests.
              </Text>
            </View>
          )}
        </View>

        {/* Recruitment Requests */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Recruitment Requests</Text>
          
          {recruitmentRequests.length === 0 ? (
            <View style={styles.emptyRequests}>
              <MaterialCommunityIcons name="account-search" size={64} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>No Recruitment Requests</Text>
              <Text style={styles.emptySubtitle}>
                Companies will send you recruitment requests here once your profile is approved
              </Text>
            </View>
          ) : (
            recruitmentRequests.map(renderRecruitmentRequest)
          )}
        </View>
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
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.family.bold,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.family.bold,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  profileStatusText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.family.medium,
    marginLeft: 4,
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  waitingText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.warning,
    marginLeft: 12,
  },
  requestsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  emptyRequests: {
    alignItems: 'center',
    paddingVertical: 40,
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
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyLogoText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.family.bold,
  },
  companyLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.family.medium,
    marginLeft: 4,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  offerContainer: {
    marginBottom: 12,
  },
  offerLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  offerText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.success,
  },
  jobDetailsContainer: {
    marginBottom: 12,
  },
  jobDetailsLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 8,
  },
  jobDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobDetailsText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.family.medium,
    marginLeft: 4,
  },
});

export default DriverRecruitmentStatusScreen;

