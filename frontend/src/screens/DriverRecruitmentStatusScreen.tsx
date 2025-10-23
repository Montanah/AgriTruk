import React, { useState, useEffect, useCallback } from 'react';
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
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';

// Removed RecruitmentRequest interface - no longer needed

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'recruited' | 'active' | 'inactive';
  profilePhoto?: string;
  profileImage?: string;
  experience: number;
  location: string;
  vehicleTypes: string[];
  expectedSalary: {
    min: number;
    max: number;
    currency: string;
  };
  recruitedBy?: string;
  recruitedAt?: string;
  documents?: {
    idDoc?: { url: string; status: string };
    drivingLicense?: { url: string; status: string };
    goodConductCert?: { url: string; status: string };
    goodsServiceLicense?: { url: string; status: string };
  };
}

const DriverRecruitmentStatusScreen = () => {
  const navigation = useNavigation();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriverData = useCallback(async () => {
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
          routes: [{ name: 'JobSeekerCompletionScreen' as never }]
        });
          return;
        }
        
        setDriverProfile(application);
      } else if (profileResponse.status === 404) {
        // No job seeker application found - redirect to profile completion
        console.log('No job seeker application found - redirecting to profile completion');
        navigation.reset({
          index: 0,
          routes: [{ name: 'JobSeekerCompletionScreen' as never }]
        });
        return;
      }

      // No recruitment requests needed - companies handle recruitment offline
    } catch (err: any) {
      console.error('Error fetching driver data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // Check if job seeker profile is complete
  const isProfileComplete = (profile: any) => {
    if (!profile) return false;
    
    console.log('Checking profile completeness:', {
      profilePhoto: profile.profilePhoto,
      documents: profile.documents,
      dateOfBirth: profile.dateOfBirth,
      vehicleClassesExperience: profile.experience?.vehicleClassesExperience || profile.vehicleClassesExperience,
      specializations: profile.experience?.specializations || profile.specializations,
      experienceObject: profile.experience
    });
    
    // Check required documents - profile photo is at root level, others are in documents
    const hasProfilePhoto = profile.profilePhoto && profile.profilePhoto.trim() !== '';
    const hasRequiredDocs = profile.documents && 
      profile.documents.drivingLicense && 
      profile.documents.drivingLicense.url && 
      profile.documents.goodConductCert && 
      profile.documents.goodConductCert.url && 
      profile.documents.idDoc && 
      profile.documents.idDoc.url;
    
    // Check required profile fields (check experience nested object first, then root level as fallback)
    const vehicleClasses = profile.experience?.vehicleClassesExperience || profile.vehicleClassesExperience || [];
    const specializations = profile.experience?.specializations || profile.specializations || [];
    
    const hasRequiredFields = profile.dateOfBirth && 
      vehicleClasses.length > 0 && 
      specializations.length > 0;
    
    const isComplete = hasProfilePhoto && hasRequiredDocs && hasRequiredFields;
    console.log('Profile completeness check:', {
      hasProfilePhoto,
      hasRequiredDocs,
      hasRequiredFields,
      isComplete
    });
    
    return isComplete;
  };

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDriverData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { getAuth, signOut } = require('firebase/auth');
              const auth = getAuth();
              await signOut(auth);
              // Navigation will be handled by App.tsx based on auth state
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getDocumentIcon = (docType: string) => {
    const iconMap: { [key: string]: string } = {
      'idDoc': 'card-account-details',
      'drivingLicense': 'license',
      'goodConductCert': 'certificate',
      'goodsServiceLicense': 'file-document',
      'profilePhoto': 'camera',
    };
    return iconMap[docType] || 'file-document';
  };

  const getDocumentName = (docType: string) => {
    const nameMap: { [key: string]: string } = {
      'idDoc': 'ID Document',
      'drivingLicense': 'Driving License',
      'goodConductCert': 'Good Conduct Certificate',
      'goodsServiceLicense': 'Goods Service License',
      'profilePhoto': 'Profile Photo',
    };
    return nameMap[docType] || docType;
  };

  // Removed hasDocumentIssues function - no longer needed

  const hasRequiredDocumentIssues = (documents: any) => {
    if (!documents) return false;
    
    // Only check required documents (exclude optional ones like goodsServiceLicense)
    const requiredDocs = ['profilePhoto', 'idDoc', 'drivingLicense', 'goodConductCert'];
    
    return requiredDocs.some(docType => {
      const docData = documents[docType];
      if (!docData) return false;
      return docData.status === 'rejected' || docData.status === 'pending';
    });
  };

  const handleCorrectDocuments = () => {
    Alert.alert(
      'Correct Document Issues',
      'You will be taken back to the profile completion form to correct any document issues. Your approved documents will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            // Navigate to JobSeekerCompletionScreen with correction mode
            (navigation as any).navigate('JobSeekerCompletion', { 
              correctionMode: true,
              approvedDocuments: getApprovedDocuments(driverProfile?.documents)
            });
          },
        },
      ]
    );
  };

  const getApprovedDocuments = (documents: any) => {
    if (!documents) return {};
    
    const approvedDocs: any = {};
    Object.entries(documents).forEach(([docType, docData]: [string, any]) => {
      if (docData && docData.status === 'approved') {
        approvedDocs[docType] = docData;
      }
    });
    return approvedDocs;
  };

  const handleUpdateStatus = async () => {
    Alert.alert(
      'Update Recruitment Status',
      'Have you been recruited by a company? This will mark you as recruited and you will no longer appear in job seeker listings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, I\'ve been recruited',
          onPress: async () => {
            try {
              const { getAuth } = require('firebase/auth');
              const auth = getAuth();
              const user = auth.currentUser;
              if (!user) return;

              const token = await user.getIdToken();
              
              const response = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/${driverProfile?.id}/status`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'recruited',
                  recruitedAt: new Date().toISOString(),
                  notes: 'Status updated by job seeker'
                }),
              });

              if (response.ok) {
                Alert.alert(
                  'Success',
                  'Your status has been updated to recruited. You will no longer appear in job seeker listings.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Refresh the data to show updated status
                        fetchDriverData();
                      }
                    }
                  ]
                );
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to update status. Please try again.');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update status. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return colors.warning;
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      case 'recruited': return colors.primary;
      case 'active': return colors.success;
      case 'inactive': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'clock-outline';
      case 'approved': return 'check-circle';
      case 'rejected': return 'close-circle';
      case 'recruited': return 'account-check';
      case 'active': return 'check-circle';
      case 'inactive': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  // Removed renderRecruitmentRequest function - no longer needed

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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={colors.white} 
              style={refreshing ? styles.refreshingIcon : null}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
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
              {driverProfile?.profilePhoto ? (
                <Image 
                  source={{ uri: driverProfile.profilePhoto }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : driverProfile?.name ? (
                <View style={styles.profileImage}>
                  <Text style={styles.profileImageText}>
                    {driverProfile.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
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
                {driverProfile?.name || 'Job Seeker'}
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
          
          {/* Enhanced Status Indicator */}
          <View style={styles.statusIndicatorContainer}>
            <View style={[
              styles.statusIndicator,
              driverProfile?.status === 'pending_approval' && styles.statusIndicatorPending,
              driverProfile?.status === 'approved' && styles.statusIndicatorApproved,
              driverProfile?.status === 'rejected' && styles.statusIndicatorRejected,
              driverProfile?.status === 'recruited' && styles.statusIndicatorRecruited,
            ]}>
              <View style={styles.statusIconContainer}>
                {driverProfile?.status === 'pending_approval' && (
                  <MaterialCommunityIcons name="clock-outline" size={28} color={colors.warning} />
                )}
                {driverProfile?.status === 'approved' && (
                  <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
                )}
                {driverProfile?.status === 'rejected' && (
                  <MaterialCommunityIcons name="close-circle" size={28} color={colors.error} />
                )}
                {driverProfile?.status === 'recruited' && (
                  <MaterialCommunityIcons name="account-check" size={28} color={colors.primary} />
                )}
              </View>
              <View style={styles.statusContent}>
                <Text style={[
                  styles.statusTitle,
                  driverProfile?.status === 'pending_approval' && styles.statusTitlePending,
                  driverProfile?.status === 'approved' && styles.statusTitleApproved,
                  driverProfile?.status === 'rejected' && styles.statusTitleRejected,
                  driverProfile?.status === 'recruited' && styles.statusTitleRecruited,
                ]}>
                  {driverProfile?.status === 'pending_approval' && 'Profile Under Review'}
                  {driverProfile?.status === 'approved' && 'Profile Approved!'}
                  {driverProfile?.status === 'rejected' && 'Profile Rejected'}
                  {driverProfile?.status === 'recruited' && 'Successfully Recruited!'}
                </Text>
                <Text style={styles.statusDescription}>
                  {driverProfile?.status === 'pending_approval' && 
                    'Your application is being reviewed by our team. You\'ll be notified once approved.'}
                  {driverProfile?.status === 'approved' && 
                    'Your profile is now visible to companies. You can receive recruitment requests.'}
                  {driverProfile?.status === 'rejected' && 
                    'Your application was not approved. Please contact support for more information.'}
                  {driverProfile?.status === 'recruited' && 
                    'Congratulations! You have been recruited by a company. You will no longer appear in job seeker listings.'}
                </Text>
                {driverProfile?.status === 'pending_approval' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={styles.progressFill} />
                    </View>
                    <Text style={styles.progressText}>Review in progress...</Text>
                  </View>
                )}
                {driverProfile?.status === 'approved' && (
                  <View style={styles.approvedActions}>
                    <View style={styles.readyIndicator}>
                      <MaterialCommunityIcons name="account-check" size={16} color={colors.success} />
                      <Text style={styles.readyText}>Profile visible to companies</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.updateStatusButton}
                      onPress={handleUpdateStatus}
                    >
                      <MaterialCommunityIcons name="account-plus" size={16} color={colors.white} />
                      <Text style={styles.updateStatusText}>Mark as Recruited</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {driverProfile?.status === 'recruited' && (
                  <View style={styles.recruitedActions}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.primary} />
                    <Text style={styles.recruitedText}>Recruitment Complete</Text>
                  </View>
                )}
                
                {/* Document Status Details - Only show if there are issues with required documents */}
                {driverProfile?.documents && hasRequiredDocumentIssues(driverProfile.documents) && (
                  <View style={styles.documentStatusContainer}>
                    <Text style={styles.documentStatusTitle}>Document Issues</Text>
                    {Object.entries(driverProfile.documents).map(([docType, docData]: [string, any]) => {
                      // Only show required documents with issues
                      if (!docData || docType === 'backgroundCheck' || docType === 'goodsServiceLicense') return null;
                      if (docData.status === 'approved') return null; // Don't show approved documents
                      
                      const isPending = docData.status === 'pending';
                      const isRejected = docData.status === 'rejected';
                      
                      return (
                        <View key={docType} style={styles.documentStatusItem}>
                          <View style={styles.documentStatusLeft}>
                            <MaterialCommunityIcons 
                              name={getDocumentIcon(docType) as any} 
                              size={20} 
                              color={isRejected ? colors.error : colors.warning} 
                            />
                            <Text style={styles.documentStatusName}>{getDocumentName(docType)}</Text>
                          </View>
                          <View style={styles.documentStatusRight}>
                            <View style={[
                              styles.documentStatusBadge,
                              isPending && styles.documentStatusPending,
                              isRejected && styles.documentStatusRejected,
                            ]}>
                              <Text style={[
                                styles.documentStatusText,
                                isPending && styles.documentStatusTextPending,
                                isRejected && styles.documentStatusTextRejected,
                              ]}>
                                {isRejected ? 'Rejected' : 'Pending'}
                              </Text>
                            </View>
                            {isRejected && docData.rejectionReason && (
                              <Text style={styles.documentRejectionReason}>{docData.rejectionReason}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    
                    {/* Action buttons for document issues */}
                    <View style={styles.documentActions}>
                      <TouchableOpacity 
                        style={styles.correctDocumentsButton}
                        onPress={handleCorrectDocuments}
                      >
                        <MaterialCommunityIcons name="pencil" size={16} color={colors.white} />
                        <Text style={styles.correctDocumentsText}>Correct Issues</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {driverProfile?.status === 'rejected' && (
                  <View style={styles.rejectionActions}>
                    <TouchableOpacity style={styles.contactSupportButton}>
                      <MaterialCommunityIcons name="help-circle" size={16} color={colors.white} />
                      <Text style={styles.contactSupportText}>Contact Support</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information for Companies */}
        {driverProfile?.status === 'approved' && (
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
                <Text style={styles.contactLabel}>Email:</Text>
                <Text style={styles.contactValue}>{driverProfile.email}</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
                <Text style={styles.contactLabel}>Phone:</Text>
                <Text style={styles.contactValue}>{driverProfile.phone}</Text>
              </View>
            </View>
            <View style={styles.contactNote}>
              <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
              <Text style={styles.contactNoteText}>
                Companies can contact you directly using the information above. 
                All discussions and negotiations happen outside the app.
              </Text>
            </View>
          </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshingIcon: {
    transform: [{ rotate: '180deg' }],
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
    shadowColor: '#000',
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
  contactSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 12,
    marginRight: 8,
    minWidth: 50,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    flex: 1,
  },
  contactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  contactNoteText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  // Removed old recruitment request styles - no longer needed
  // Enhanced Status Indicator Styles
  statusIndicatorContainer: {
    marginTop: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusIndicatorPending: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning + '40',
  },
  statusIndicatorApproved: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
  },
  statusIndicatorRejected: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error + '40',
  },
  statusIndicatorRecruited: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '40',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    marginBottom: 8,
  },
  statusTitlePending: {
    color: colors.warning,
  },
  statusTitleApproved: {
    color: colors.success,
  },
  statusTitleRejected: {
    color: colors.error,
  },
  statusTitleRecruited: {
    color: colors.primary,
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.warning + '30',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 2,
    width: '70%',
  },
  progressText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.warning,
  },
  approvedActions: {
    marginTop: 12,
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  readyText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
    marginLeft: 6,
  },
  rejectionActions: {
    marginTop: 8,
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  contactSupportText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: 6,
  },
  // Document Status Styles
  documentStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentStatusTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 12,
  },
  documentStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  documentStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentStatusName: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginLeft: 8,
  },
  documentStatusRight: {
    alignItems: 'flex-end',
  },
  documentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  documentStatusApproved: {
    backgroundColor: colors.success + '20',
  },
  documentStatusPending: {
    backgroundColor: colors.warning + '20',
  },
  documentStatusRejected: {
    backgroundColor: colors.error + '20',
  },
  documentStatusText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
  },
  documentStatusTextApproved: {
    color: colors.success,
  },
  documentStatusTextPending: {
    color: colors.warning,
  },
  documentStatusTextRejected: {
    color: colors.error,
  },
  documentRejectionReason: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'right',
    maxWidth: 150,
  },
  documentActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
  },
  correctDocumentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  correctDocumentsText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: 6,
  },
  // Removed empty requests styles - no longer needed
  // Update Status Button Styles
  updateStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  updateStatusText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white,
    marginLeft: 6,
  },
  // Recruited Status Styles
  recruitedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  recruitedText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 6,
  },
});

export default DriverRecruitmentStatusScreen;

