import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import { NTSA_VEHICLE_CLASSES_SIMPLE, VEHICLE_SPECIALIZATIONS_ENHANCED, mapApiSpecializationToFilter, mapFilterToApiSpecialization } from '../constants/vehicleClasses';
import subscriptionService, { SubscriptionStatus } from '../services/subscriptionService';
import companyFleetValidationService, { FeatureAccessResult } from '../services/companyFleetValidationService';

interface JobSeeker {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  age: number;
  experience: {
    experienceYears: number;
    vehicleClassesExperience: string[];
    specializations: string[];
    startDate: string;
    experienceDescription: string;
  };
  location: {
    city: string;
    county: string;
    country: string;
  };
  status: 'pending_approval' | 'approved' | 'rejected';
  documents: {
    idDoc: { url: string; status: string };
    drivingLicense: { url: string; status: string };
    goodConductCert: { url: string; status: string };
    goodsServiceLicense?: { url: string; status: string };
  };
  createdAt: string;
}

interface FilterOptions {
  vehicleClasses: string[];
  specializations: string[];
  experienceMin: number;
  ageRange: { min: number; max: number };
  location: string;
  status: string;
  gender: string[];
  religion: string[];
}

const JobSeekersMarketplaceScreen = () => {
  const navigation = useNavigation();
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [filteredJobSeekers, setFilteredJobSeekers] = useState<JobSeeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJobSeeker, setSelectedJobSeeker] = useState<JobSeeker | null>(null);
  const [showJobSeekerDetails, setShowJobSeekerDetails] = useState(false);
  
  // Animation for disclaimer
  const disclaimerOpacity = useRef(new Animated.Value(1)).current;
  const disclaimerHeight = useRef(new Animated.Value(1)).current;
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [jobSeekersAccess, setJobSeekersAccess] = useState<FeatureAccessResult | null>(null);
  
  const [filters, setFilters] = useState<FilterOptions>({
    vehicleClasses: [],
    specializations: [],
    experienceMin: 0,
    ageRange: { min: 18, max: 65 },
    location: '',
    status: 'approved',
    gender: [],
    religion: []
  });

  const fetchSubscriptionStatus = async () => {
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      
      // Validate job seekers marketplace access
      const access = companyFleetValidationService.validateJobSeekersAccess(status);
      setJobSeekersAccess(access);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const fetchJobSeekers = async (retryCount = 0) => {
    try {
      setError(null);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Try different endpoint structures in order of preference
      let response;
      let endpointUsed = '';
      
      try {
        // First try company-specific endpoint (if we can get company ID)
        // This would be ideal for companies browsing job seekers
        console.log('Fetching company profile to get company ID...');
        const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          const company = companyData[0] || companyData;
          const companyId = company?.id;
          
          if (companyId) {
            console.log('Company ID found:', companyId);
            endpointUsed = 'company-specific';
            response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/job-seekers`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Company endpoint error:', response.status, errorText);
              throw new Error(`Company endpoint failed: ${response.status} - ${errorText}`);
            }
          } else {
            throw new Error('No company ID found');
          }
        } else {
          throw new Error('Company profile not found');
        }
      } catch (err) {
        console.log('Company-specific endpoint failed:', err.message);
        // If company endpoint failed, try the approved endpoint as fallback
        try {
          endpointUsed = 'approved';
          response = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/approved`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`Approved endpoint failed: ${response.status}`);
          }
        } catch (err2) {
          console.log('Approved endpoint also failed:', err2.message);
          // Try the general job seekers endpoint as final fallback
          try {
            endpointUsed = 'general';
            response = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`General endpoint failed: ${response.status}`);
            }
          } catch (err3) {
            console.log('All endpoints failed:', err3.message);
            throw new Error('All endpoints failed');
          }
        }
      }

      if (response.ok) {
        const data = await response.json();
        console.log(`Job seekers data received from ${endpointUsed} endpoint:`, data);
        const jobSeekersList = data.jobSeekers || data || [];
        
                  // Filter for approved job seekers (exclude recruited ones)
                  // Recruited job seekers should not appear in company listings
                  let filteredJobSeekersList = jobSeekersList;
                  if (endpointUsed === 'general') {
                    filteredJobSeekersList = jobSeekersList.filter((seeker: any) => 
                      seeker.status === 'approved' && seeker.status !== 'recruited'
                    );
                  }
        
        // Transform API data to match frontend interface
        const transformedJobSeekers = filteredJobSeekersList.map((seeker: any) => ({
          id: seeker.jobSeekerId || seeker.id,
          name: seeker.name,
          email: seeker.email,
          phone: seeker.phone,
          profilePhoto: seeker.profilePhoto,
          age: seeker.age,
          experience: {
            experienceYears: seeker.experience?.experienceYears || 0,
            vehicleClassesExperience: seeker.experience?.vehicleClassesExperience || [],
            specializations: seeker.experience?.specializations || [],
            startDate: seeker.experience?.startDate || '',
            experienceDescription: seeker.experience?.experienceDescription || ''
          },
          location: {
            city: seeker.address?.city || 'N/A',
            county: seeker.address?.county || 'N/A',
            country: seeker.address?.country || 'Kenya'
          },
          status: seeker.status,
          documents: {
            idDoc: { url: seeker.documents?.idDoc?.url || '', status: seeker.documents?.idDoc?.status || 'pending' },
            drivingLicense: { url: seeker.documents?.drivingLicense?.url || '', status: seeker.documents?.drivingLicense?.status || 'pending' },
            goodConductCert: { url: seeker.documents?.goodConductCert?.url || '', status: seeker.documents?.goodConductCert?.status || 'pending' },
            goodsServiceLicense: seeker.documents?.goodsServiceLicense ? { url: seeker.documents.goodsServiceLicense.url || '', status: seeker.documents.goodsServiceLicense.status || 'pending' } : undefined
          },
          createdAt: seeker.createdAt
        }));
        
        // Filter for approved job seekers (exclude recruited ones)
        // Recruited job seekers should not appear in company listings
        const approvedJobSeekers = transformedJobSeekers.filter((seeker: any) => 
          seeker.status === 'approved' && seeker.status !== 'recruited'
        );
        console.log(`Found ${approvedJobSeekers.length} approved job seekers`);
        setJobSeekers(approvedJobSeekers);
        setFilteredJobSeekers(approvedJobSeekers);
      } else {
        console.error(`API Error from ${endpointUsed} endpoint:`, response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch job seekers from ${endpointUsed} endpoint: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('Error fetching job seekers:', err);
      
      // Set appropriate error message based on error type
      let errorMessage = 'Failed to load job seekers. Please try again.';
      
      if (err.message?.includes('All endpoints failed')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (err.message?.includes('401') || err.message?.includes('403')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.message?.includes('404')) {
        errorMessage = 'No job seekers found. Try adjusting your filters.';
      } else if (err.message?.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      // Retry logic for network errors
      if (retryCount < 2 && (err.message?.includes('Network request failed') || err.message?.includes('All endpoints failed'))) {
        console.log(`Retrying fetchJobSeekers (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          fetchJobSeekers(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(errorMessage);
      setJobSeekers([]);
      setFilteredJobSeekers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobSeekers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchJobSeekers();
    fetchSubscriptionStatus();
  }, []);

  // Animate disclaimer to disappear after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(disclaimerOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(disclaimerHeight, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowDisclaimer(false);
      });
    }, 5000); // Show for 5 seconds

    return () => clearTimeout(timer);
  }, [disclaimerOpacity, disclaimerHeight]);

  useEffect(() => {
    applyFilters();
  }, [filters, jobSeekers]);

  const applyFilters = () => {
    let filtered = jobSeekers.filter(seeker => {
      // Status filter
      if (filters.status && seeker.status !== filters.status) return false;
      
      // Location filter
      if (filters.location && 
          !seeker.location.city.toLowerCase().includes(filters.location.toLowerCase()) &&
          !seeker.location.county.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      
      // Age filter
      if (seeker.age < filters.ageRange.min || seeker.age > filters.ageRange.max) return false;
      
      // Experience filter
      if (seeker.experience.experienceYears < filters.experienceMin) return false;
      
      // Vehicle classes filter
      if (filters.vehicleClasses.length > 0) {
        const hasMatchingClass = filters.vehicleClasses.some(className => 
          seeker.experience.vehicleClassesExperience.includes(className)
        );
        if (!hasMatchingClass) return false;
      }
      
      // Specializations filter
      if (filters.specializations.length > 0) {
        const hasMatchingSpecialization = filters.specializations.some(filterSpec => {
          const apiSpec = mapFilterToApiSpecialization(filterSpec);
          return seeker.experience.specializations.includes(apiSpec);
        });
        if (!hasMatchingSpecialization) return false;
      }
      
      // Gender filter
      if (filters.gender.length > 0) {
        if (!filters.gender.includes(seeker.gender)) return false;
      }
      
      // Religion filter
      if (filters.religion.length > 0) {
        if (!filters.religion.includes(seeker.religion)) return false;
      }
      
      return true;
    });
    
    setFilteredJobSeekers(filtered);
  };

  const handleViewDocuments = (jobSeeker: JobSeeker) => {
    setSelectedJobSeeker(jobSeeker);
    setShowJobSeekerDetails(true);
  };

  const handleRecruitJobSeeker = (jobSeeker: JobSeeker) => {
    Alert.alert(
      'Send Recruitment Request',
      `Are you sure you want to send a recruitment request to ${jobSeeker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Request', 
          onPress: () => sendRecruitmentRequest(jobSeeker)
        }
      ]
    );
  };

  const sendRecruitmentRequest = async (jobSeeker: JobSeeker) => {
    // For now, show a simple alert with salary offer
    // In a real implementation, this would open a modal with salary input
    Alert.prompt(
      'Salary Offer',
      'Enter the monthly salary you are offering (KSh):',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Request', 
          onPress: async (salary) => {
            if (!salary || isNaN(Number(salary))) {
              Alert.alert('Error', 'Please enter a valid salary amount.');
              return;
            }
            
            try {
              const auth = getAuth();
              const user = auth.currentUser;
              if (!user) return;

              const token = await user.getIdToken();
              
              const response = await fetch(`${API_ENDPOINTS.COMPANIES}/recruitment-requests`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  jobSeekerId: jobSeeker.id,
                  companyId: user.uid,
                  salaryOffer: Number(salary),
                  message: `We are interested in recruiting you for our fleet with a monthly salary of KSh ${Number(salary).toLocaleString()}. Please review our offer and contact us if interested.`
                })
              });

              if (response.ok) {
                Alert.alert('Success', 'Recruitment request sent successfully! The job seeker will be notified and can accept or decline your offer.');
              } else {
                throw new Error('Failed to send recruitment request');
              }
            } catch (err: any) {
              console.error('Error sending recruitment request:', err);
              Alert.alert('Error', 'Failed to send recruitment request. Please try again.');
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const downloadDocument = async (url: string, documentType: string) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      console.log(`Attempting to download ${documentType} for job seeker:`, selectedJobSeeker?.id);
      
      // Try to get signed URL for download
      const response = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/${selectedJobSeeker?.id}/documents/${documentType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Document download response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Document signed URL received:', data);
        
        if (data.signedUrl) {
          // Open the signed URL for download
          const { Linking } = require('react-native');
          await Linking.openURL(data.signedUrl);
        } else {
          throw new Error('No signed URL received from server');
        }
      } else {
        const errorText = await response.text();
        console.error('Document download API error:', response.status, errorText);
        
        // Fallback: try to use the direct URL if available
        if (url && url.startsWith('http')) {
          console.log('Trying fallback with direct URL:', url);
          const { Linking } = require('react-native');
          await Linking.openURL(url);
          return;
        }
        
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      Alert.alert(
        'Document Download Error', 
        `Failed to download ${documentType}. ${err.message || 'Please try again.'}`
      );
    }
  };

  const renderJobSeeker = ({ item }: { item: JobSeeker }) => (
    <TouchableOpacity 
      style={styles.jobSeekerCard}
      onPress={() => {
        setSelectedJobSeeker(item);
        setShowJobSeekerDetails(true);
      }}
    >
      {/* Card Header with Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons name="check-circle" size={12} color={colors.white} />
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {item.profilePhoto ? (
            <Image source={{ uri: item.profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.onlineIndicator} />
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.jobSeekerName}>{item.name}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={colors.text.secondary} />
            <Text style={styles.jobSeekerLocation}>{item.location.city}, {item.location.county}</Text>
          </View>
          <View style={styles.experienceRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.jobSeekerExperience}>{item.experience.experienceYears} years experience</Text>
          </View>
        </View>
      </View>

      {/* Skills Section */}
      <View style={styles.skillsSection}>
        <View style={styles.skillGroup}>
          <View style={styles.skillHeader}>
            <MaterialCommunityIcons name="truck" size={16} color={colors.primary} />
            <Text style={styles.skillTitle}>Vehicle Classes</Text>
          </View>
          <View style={styles.tagsContainer}>
            {item.experience.vehicleClassesExperience.slice(0, 3).map((className, index) => (
              <View key={index} style={styles.vehicleClassTag}>
                <Text style={styles.vehicleClassTagText}>{className}</Text>
              </View>
            ))}
            {item.experience.vehicleClassesExperience.length > 3 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreTagText}>+{item.experience.vehicleClassesExperience.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.skillGroup}>
          <View style={styles.skillHeader}>
            <MaterialCommunityIcons name="star" size={16} color={colors.success} />
            <Text style={styles.skillTitle}>Specializations</Text>
          </View>
          <View style={styles.tagsContainer}>
            {item.experience.specializations.slice(0, 2).map((spec, index) => (
              <View key={index} style={styles.specializationTag}>
                <Text style={styles.specializationTagText}>{spec}</Text>
              </View>
            ))}
            {item.experience.specializations.length > 2 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreTagText}>+{item.experience.specializations.length - 2}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.viewDocumentsButton}
          onPress={() => handleViewDocuments(item)}
        >
          <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
          <Text style={styles.viewDocumentsText}>View Documents</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.recruitButton}
          onPress={() => handleRecruitJobSeeker(item)}
        >
          <MaterialCommunityIcons name="send" size={18} color={colors.white} />
          <Text style={styles.recruitButtonText}>Send Request</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.filterModal}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Job Seekers</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.filterContent}>
          {/* Vehicle Classes Filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <MaterialCommunityIcons name="truck" size={20} color={colors.primary} />
              <Text style={styles.filterSectionTitle}>Vehicle Classes</Text>
            </View>
            <View style={styles.checkboxContainer}>
              {NTSA_VEHICLE_CLASSES_SIMPLE.map((className) => (
                <TouchableOpacity
                  key={`vehicle-class-${className.value}`}
                  style={styles.checkboxItem}
                  onPress={() => {
                    const updated = filters.vehicleClasses.includes(className.value)
                      ? filters.vehicleClasses.filter(c => c !== className.value)
                      : [...filters.vehicleClasses, className.value];
                    setFilters({ ...filters, vehicleClasses: updated });
                  }}
                >
                  <MaterialCommunityIcons 
                    name={filters.vehicleClasses.includes(className.value) ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={filters.vehicleClasses.includes(className.value) ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={styles.checkboxText}>{className.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Specializations Filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <MaterialCommunityIcons name="star" size={20} color={colors.primary} />
              <Text style={styles.filterSectionTitle}>Specializations</Text>
            </View>
            <View style={styles.checkboxContainer}>
              {VEHICLE_SPECIALIZATIONS_ENHANCED.map((spec) => (
                <TouchableOpacity
                  key={`specialization-${spec.value}`}
                  style={styles.checkboxItem}
                  onPress={() => {
                    const updated = filters.specializations.includes(spec.value)
                      ? filters.specializations.filter(s => s !== spec.value)
                      : [...filters.specializations, spec.value];
                    setFilters({ ...filters, specializations: updated });
                  }}
                >
                  <View style={styles.specializationItem}>
                    <MaterialCommunityIcons 
                      name={filters.specializations.includes(spec.value) ? "checkbox-marked" : "checkbox-blank-outline"} 
                      size={24} 
                      color={filters.specializations.includes(spec.value) ? colors.primary : colors.text.secondary} 
                    />
                    <MaterialCommunityIcons 
                      name={spec.icon as any} 
                      size={20} 
                      color={filters.specializations.includes(spec.value) ? colors.primary : colors.text.secondary} 
                      style={styles.specializationIcon}
                    />
                    <Text style={styles.checkboxText}>{spec.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Experience (Years)</Text>
            <TextInput
              style={styles.textInput}
              value={filters.experienceMin.toString()}
              onChangeText={(text) => setFilters({ ...filters, experienceMin: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          {/* Gender Filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <MaterialCommunityIcons name="gender-male-female" size={20} color={colors.primary} />
              <Text style={styles.filterSectionTitle}>Gender</Text>
            </View>
            <View style={styles.checkboxContainer}>
              {['male', 'female', 'other'].map((gender) => (
                <TouchableOpacity
                  key={`gender-${gender}`}
                  style={styles.checkboxItem}
                  onPress={() => {
                    const updated = filters.gender.includes(gender)
                      ? filters.gender.filter(g => g !== gender)
                      : [...filters.gender, gender];
                    setFilters({ ...filters, gender: updated });
                  }}
                >
                  <MaterialCommunityIcons 
                    name={filters.gender.includes(gender) ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={filters.gender.includes(gender) ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={styles.checkboxText}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Religion Filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <MaterialCommunityIcons name="church" size={20} color={colors.primary} />
              <Text style={styles.filterSectionTitle}>Religion</Text>
            </View>
            <View style={styles.checkboxContainer}>
              {['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Sikhism', 'Jainism', 'Baháʼí Faith', 'Traditional African Religions', 'Other', 'Prefer not to say'].map((religion) => (
                <TouchableOpacity
                  key={`religion-${religion}`}
                  style={styles.checkboxItem}
                  onPress={() => {
                    const updated = filters.religion.includes(religion)
                      ? filters.religion.filter(r => r !== religion)
                      : [...filters.religion, religion];
                    setFilters({ ...filters, religion: updated });
                  }}
                >
                  <MaterialCommunityIcons 
                    name={filters.religion.includes(religion) ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={filters.religion.includes(religion) ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={styles.checkboxText}>{religion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Location</Text>
            <TextInput
              style={styles.textInput}
              value={filters.location}
              onChangeText={(text) => setFilters({ ...filters, location: text })}
              placeholder="City or County"
            />
          </View>
        </ScrollView>
        
        <View style={styles.filterActions}>
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={() => setFilters({
              vehicleClasses: [],
              specializations: [],
              experienceMin: 0,
              ageRange: { min: 18, max: 65 },
              location: '',
              status: 'approved',
              gender: [],
              religion: []
            })}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderJobSeekerDetailsModal = () => (
    <Modal
      visible={showJobSeekerDetails}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.detailsModal}>
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>Job Seeker Details</Text>
          <TouchableOpacity onPress={() => setShowJobSeekerDetails(false)}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        {selectedJobSeeker && (
          <ScrollView style={styles.detailsContent}>
            <View style={styles.detailsProfile}>
              <View style={styles.detailsProfileImage}>
                {selectedJobSeeker.profilePhoto ? (
                  <Image source={{ uri: selectedJobSeeker.profilePhoto }} style={styles.detailsProfileImage} />
                ) : (
                  <View style={styles.detailsProfileImagePlaceholder}>
                    <Text style={styles.detailsProfileImageText}>
                      {selectedJobSeeker.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsProfileInfo}>
                <Text style={styles.detailsName}>{selectedJobSeeker.name}</Text>
                <Text style={styles.detailsLocation}>
                  {selectedJobSeeker.location.city}, {selectedJobSeeker.location.county}
                </Text>
                <Text style={styles.detailsExperience}>
                  {selectedJobSeeker.experience.experienceYears} years experience
                </Text>
                <Text style={styles.detailsAge}>Age: {selectedJobSeeker.age}</Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Contact Information</Text>
              <Text style={styles.detailsText}>Email: {selectedJobSeeker.email}</Text>
              <Text style={styles.detailsText}>Phone: {selectedJobSeeker.phone}</Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Vehicle Classes</Text>
              <View style={styles.detailsTagsContainer}>
                {selectedJobSeeker.experience.vehicleClassesExperience.map((className, index) => (
                  <View key={index} style={styles.detailsTag}>
                    <Text style={styles.detailsTagText}>{className}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Specializations</Text>
              <View style={styles.detailsTagsContainer}>
                {selectedJobSeeker.experience.specializations.map((spec, index) => (
                  <View key={index} style={styles.detailsSpecializationTag}>
                    <Text style={styles.detailsSpecializationTagText}>{spec}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Experience Description</Text>
              <Text style={styles.detailsText}>{selectedJobSeeker.experience.experienceDescription}</Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Documents</Text>
              <View style={styles.documentButtonsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.documentButton,
                    !selectedJobSeeker.documents.idDoc?.url && styles.documentButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedJobSeeker.documents.idDoc?.url) {
                      downloadDocument(selectedJobSeeker.documents.idDoc.url, 'idDoc');
                    } else {
                      Alert.alert('Document Not Available', 'ID Document URL is not available.');
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name="card-account-details" 
                    size={20} 
                    color={selectedJobSeeker.documents.idDoc?.url ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.documentButtonText,
                    !selectedJobSeeker.documents.idDoc?.url && styles.documentButtonTextDisabled
                  ]}>ID Document</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.documentButton,
                    !selectedJobSeeker.documents.drivingLicense?.url && styles.documentButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedJobSeeker.documents.drivingLicense?.url) {
                      downloadDocument(selectedJobSeeker.documents.drivingLicense.url, 'drivingLicense');
                    } else {
                      Alert.alert('Document Not Available', 'Driving License URL is not available.');
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name="license" 
                    size={20} 
                    color={selectedJobSeeker.documents.drivingLicense?.url ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.documentButtonText,
                    !selectedJobSeeker.documents.drivingLicense?.url && styles.documentButtonTextDisabled
                  ]}>Driving License</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.documentButton,
                    !selectedJobSeeker.documents.goodConductCert?.url && styles.documentButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedJobSeeker.documents.goodConductCert?.url) {
                      downloadDocument(selectedJobSeeker.documents.goodConductCert.url, 'goodConductCert');
                    } else {
                      Alert.alert('Document Not Available', 'Good Conduct Certificate URL is not available.');
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name="certificate" 
                    size={20} 
                    color={selectedJobSeeker.documents.goodConductCert?.url ? colors.primary : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.documentButtonText,
                    !selectedJobSeeker.documents.goodConductCert?.url && styles.documentButtonTextDisabled
                  ]}>Good Conduct</Text>
                </TouchableOpacity>
                {selectedJobSeeker.documents.goodsServiceLicense && (
                  <TouchableOpacity 
                    style={[
                      styles.documentButton,
                      !selectedJobSeeker.documents.goodsServiceLicense?.url && styles.documentButtonDisabled
                    ]}
                    onPress={() => {
                      if (selectedJobSeeker.documents.goodsServiceLicense?.url) {
                        downloadDocument(selectedJobSeeker.documents.goodsServiceLicense.url, 'goodsServiceLicense');
                      } else {
                        Alert.alert('Document Not Available', 'Goods Service License URL is not available.');
                      }
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="file-document" 
                      size={20} 
                      color={selectedJobSeeker.documents.goodsServiceLicense?.url ? colors.primary : colors.text.secondary} 
                    />
                    <Text style={[
                      styles.documentButtonText,
                      !selectedJobSeeker.documents.goodsServiceLicense?.url && styles.documentButtonTextDisabled
                    ]}>GSL</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        )}
        
        <View style={styles.detailsActions}>
          <TouchableOpacity 
            style={styles.recruitButtonLarge}
            onPress={() => {
              setShowJobSeekerDetails(false);
              handleRecruitJobSeeker(selectedJobSeeker!);
            }}
          >
            <MaterialCommunityIcons name="account-plus" size={24} color={colors.white} />
            <Text style={styles.recruitButtonLargeText}>Send Recruitment Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading job seekers...</Text>
      </View>
    );
  }

  // Check if company has access to job seekers marketplace
  if (jobSeekersAccess && !jobSeekersAccess.hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Seekers</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.featureRestrictionContainer}>
          <MaterialCommunityIcons 
            name="lock" 
            size={64} 
            color={colors.warning} 
            style={styles.restrictionIcon}
          />
          <Text style={styles.restrictionTitle}>Feature Not Available</Text>
          <Text style={styles.restrictionMessage}>
            {jobSeekersAccess.reason}
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('CompanyFleetPlans' as never)}
          >
            <MaterialCommunityIcons name="arrow-up" size={20} color={colors.white} />
            <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Job Seekers</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons name="filter" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredJobSeekers.length} job seeker{filteredJobSeekers.length !== 1 ? 's' : ''} found
          </Text>
          {!showDisclaimer && (
            <TouchableOpacity 
              style={styles.showDisclaimerButton}
              onPress={() => {
                setShowDisclaimer(true);
                disclaimerOpacity.setValue(1);
                disclaimerHeight.setValue(1);
              }}
            >
              <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
              <Text style={styles.showDisclaimerText}>Show Important Notice</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Liability Disclaimer - Animated */}
        {showDisclaimer && (
          <Animated.View 
            style={[
              styles.disclaimerContainer,
              {
                opacity: disclaimerOpacity,
                transform: [{ scaleY: disclaimerHeight }],
              }
            ]}
          >
            <View style={styles.disclaimerHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.disclaimerTitle}>Important Notice</Text>
              <TouchableOpacity 
                style={styles.disclaimerCloseButton}
                onPress={() => {
                  Animated.parallel([
                    Animated.timing(disclaimerOpacity, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(disclaimerHeight, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    setShowDisclaimer(false);
                  });
                }}
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.warning} />
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimerText}>
              <Text style={styles.disclaimerBold}>Company Liability:</Text> All liability for driver recruitment, background checks, and verification lies with your company. TRUK provides this platform for discovery only. You must conduct your own thorough vetting, background checks, and verification before engaging any driver from this platform.
            </Text>
            <Text style={styles.disclaimerText}>
              <Text style={styles.disclaimerBold}>Required Actions:</Text> Verify all documents, conduct background checks, check references, and ensure compliance with your company's hiring standards before recruitment.
            </Text>
          </Animated.View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchJobSeekers}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredJobSeekers.length === 0 && !error ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-search" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Job Seekers Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or check back later for new candidates.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredJobSeekers}
            renderItem={renderJobSeeker}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {renderFilterModal()}
      {renderJobSeekerDetailsModal()}
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
    paddingTop: 50, // Fixed padding instead of insets.top
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.family.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  filterButton: {
    padding: 12,
    backgroundColor: colors.white + '20',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  showDisclaimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  showDisclaimerText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 6,
  },
  disclaimerContainer: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  disclaimerCloseButton: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.warning + '20',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.warning,
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  disclaimerBold: {
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  listContainer: {
    paddingBottom: 100, // Extra padding to account for bottom navigation
  },
  jobSeekerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  // New Modern Card Styles
  cardHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  jobSeekerName: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobSeekerLocation: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  jobSeekerExperience: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  skillsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  skillGroup: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vehicleClassTag: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  vehicleClassTagText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  specializationTag: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  specializationTagText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
  },
  moreTag: {
    backgroundColor: colors.text.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  moreTagText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  jobSeekerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  jobSeekerInfo: {
    flex: 1,
  },
  jobSeekerName: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  jobSeekerLocation: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  jobSeekerExperience: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  jobSeekerActions: {
    marginLeft: 12,
  },
  recruitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  recruitButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 6,
  },
  viewDocumentsButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  viewDocumentsText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 6,
  },
  jobSeekerDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
  },
  vehicleClassesContainer: {
    marginBottom: 8,
  },
  specializationsContainer: {
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  specializationTag: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  specializationTagText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.success,
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
    marginTop: 12,
  },
  // Feature restriction styles
  featureRestrictionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  restrictionIcon: {
    marginBottom: 24,
  },
  restrictionTitle: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  restrictionMessage: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
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
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  // Filter Modal Styles
  filterModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginLeft: 8,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    marginLeft: 8,
  },
  specializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  specializationIcon: {
    marginLeft: 8,
    marginRight: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    backgroundColor: colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  clearFiltersButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    marginRight: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  applyFiltersButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginLeft: 8,
  },
  applyFiltersText: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.white,
  },
  // Details Modal Styles
  detailsModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailsTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  detailsContent: {
    flex: 1,
    padding: 20,
  },
  detailsProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailsProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  detailsProfileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsProfileImageText: {
    fontSize: 32,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  detailsProfileInfo: {
    flex: 1,
  },
  detailsName: {
    fontSize: 24,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  detailsLocation: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  detailsExperience: {
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginBottom: 4,
  },
  detailsAge: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    lineHeight: 24,
  },
  detailsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailsTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  detailsTagText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  detailsSpecializationTag: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  detailsSpecializationTagText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.success,
  },
  documentButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
    marginBottom: 8,
  },
  documentButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  documentButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background,
  },
  documentButtonTextDisabled: {
    color: colors.text.secondary,
  },
  detailsActions: {
    padding: 20,
    paddingBottom: 40, // Extra padding for bottom navigation
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  recruitButtonLarge: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruitButtonLargeText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
});

export default JobSeekersMarketplaceScreen;
