import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, LogBox, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_ENDPOINTS } from './src/constants/api';
import colors from './src/constants/colors';
import BusinessStackNavigator from './src/navigation/BusinessStackNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import TransporterTabNavigator from './src/navigation/TransporterTabNavigator';
import DriverTabNavigator from './src/navigation/DriverTabNavigator';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import TransporterCompletionScreen from './src/screens/auth/TransporterCompletionScreen';
import JobSeekerCompletionScreen from './src/screens/auth/JobSeekerCompletionScreen';
import VerifyIdentificationDocumentScreen from './src/screens/VerifyIdentificationDocumentScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import ConsolidationScreen from './src/screens/business/ConsolidationScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import SubscriptionExpiredScreen from './src/screens/SubscriptionExpiredScreen';
import SubscriptionTrialScreen from './src/screens/SubscriptionTrialScreen';
import CompanyFleetPlansScreen from './src/screens/subscription/CompanyFleetPlansScreen';
import TransporterProcessingScreen from './src/screens/TransporterProcessingScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import JobManagementScreen from './src/screens/JobManagementScreen';
import RouteLoadsScreen from './src/screens/RouteLoadsScreen';
import NotificationPreferencesScreen from './src/screens/NotificationPreferencesScreen';
import RatingSubmissionScreen from './src/screens/RatingSubmissionScreen';
import RatingAnalyticsScreen from './src/screens/RatingAnalyticsScreen';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { NotificationProvider } from './src/components/Notification/NotificationContext';
import NotificationManager from './src/components/Notification/NotificationManager';
import { ConsolidationProvider } from './src/context/ConsolidationContext';
import fonts from './src/constants/fonts';
import { auth, db } from './src/firebaseConfig';

const Stack = createStackNavigator();

LogBox.ignoreLogs(['useInsertionEffect must not schedule updates']);

// App initialization

// Helper function to check if user is a driver (company or individual)
const checkIfDriver = async (userId: string) => {
  try {
    const { getAuth } = require('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return false;

    const token = await user.getIdToken();
    
    // First check if user is a company driver
    try {
      const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/driver/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.driver) {
          return { isDriver: true, driverType: 'company', driverData: companyData.driver };
        }
      }
    } catch (companyError) {
      console.log('Not a company driver, checking individual transporter...');
    }

    // Check if user is an individual transporter
    try {
      const transporterResponse = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (transporterResponse.ok) {
        const data = await transporterResponse.json();
        if (data.success && data.transporter) {
          return { isDriver: true, driverType: 'individual', driverData: data.transporter };
        }
      }
    } catch (transporterError) {
      console.log('Not an individual transporter either');
    }

    return false;
  } catch (error) {
    console.warn('Could not verify driver status (network error):', error.message);
    return false;
  }
};

// Helper function to check if company profile is complete
const checkCompanyProfileComplete = (companyData: any) => {
  if (!companyData) return false;

  // Required fields for companies (fleet management only)
  const companyRequiredFields = [
    'companyName',
    'companyRegistration', 
    'companyContact',
    'companyEmail',
    'status'
  ];

  // Check if all required fields are present and not empty
  for (const field of companyRequiredFields) {
    if (!companyData[field] ||
      (typeof companyData[field] === 'string' && companyData[field].trim() === '') ||
      (Array.isArray(companyData[field]) && companyData[field].length === 0)) {
      return false;
    }
  }

  // Status must be at least 'pending', 'under_review', or 'approved'
  if (!['pending', 'under_review', 'approved'].includes(companyData.status)) {
    return false;
  }

  return true;
};

// Helper function to check if transporter profile is complete
const checkTransporterProfileComplete = (transporterData: any) => {
  if (!transporterData) return false;

  // Required fields for individual transporters
  const individualRequiredFields = [
    'driverProfileImage',
    'driverLicense',
    'insuranceUrl',
    'vehicleType',
    'vehicleRegistration',
    'vehicleMake',
    'vehicleColor',
    'vehicleYear',
    'bodyType',
    'driveType',
    'email',
    'phoneNumber',
    'status'
  ];

  // Required fields for company transporters (fleet management only)
  const companyRequiredFields = [
    'displayName', // Company name
    'phoneNumber',
    'email',
    'status'
  ];

  const transporterType = transporterData.transporterType || 'company';
  const requiredFields = transporterType === 'company' ? companyRequiredFields : individualRequiredFields;

  // Check if all required fields are present and not empty
  for (const field of requiredFields) {
    if (!transporterData[field] ||
      (typeof transporterData[field] === 'string' && transporterData[field].trim() === '') ||
      (Array.isArray(transporterData[field]) && transporterData[field].length === 0)) {
      return false;
    }
  }

  // For individual transporters, check if at least one vehicle image is uploaded
  if (transporterType === 'individual') {
    if (!Array.isArray(transporterData.vehicleImagesUrl) || transporterData.vehicleImagesUrl.length === 0) {
      return false;
    }
  }

  // Status must be at least 'pending', 'under_review', or 'approved'
  if (!['pending', 'under_review', 'approved'].includes(transporterData.status)) {
    return false;
  }

  return true;
};

// Helper function to check subscription status with better error handling
// Only transporters and brokers need subscriptions - business users are free
const checkSubscriptionStatus = async (userId: string, userType: 'transporter' | 'broker') => {
  try {
    // Use the subscription service which handles auth tokens properly
    const subscriptionService = require('./src/services/subscriptionService').default;
    const status = await subscriptionService.getSubscriptionStatus();
    
    console.log('📊 Subscription status check result for user:', userId, {
      hasActiveSubscription: status.hasActiveSubscription,
      isTrialActive: status.isTrialActive,
      needsTrialActivation: status.needsTrialActivation,
      subscriptionStatus: status.subscriptionStatus,
      isApiError: status.isApiError
    });
    
    return status;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    
    // Return a consistent fallback status
    return {
      hasActiveSubscription: false,
      isTrialActive: false,
      needsTrialActivation: true,
      currentPlan: null,
      daysRemaining: 0,
      subscriptionStatus: 'none',
      isApiError: true
    };
  }
};

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [role, setRole] = React.useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = React.useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [userData, setUserData] = React.useState<any>(null);
  const [isDriver, setIsDriver] = React.useState<boolean>(false);

  // Retry function for connection errors
  const retryConnection = React.useCallback(() => {
    console.log('App.tsx: Retrying connection...');
    setConnectionError(null);
    setLoading(true);
    // The auth state listener will automatically retry when loading is set to true
  }, []);

  // App state changes

  // App lifecycle
  React.useEffect(() => {
    
    // Check current auth state immediately
    if (auth && auth.currentUser) {
      // Current user found on app start
    } else {
      // No current user on app start - this is normal for first launch
    }
    
    return () => {
      // App unmounting
    };
  }, []);

  React.useEffect(() => {
    // Setting up auth state listener
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Auth state changed
      // Ensure we show loading while we resolve user role and verification status to prevent flicker
      setLoading(true);
      
      // Debug: Check if user is being lost
      if (!firebaseUser && user) {
        // User lost
      }
      
      // Debug: Check if this is the initial auth state
      if (firebaseUser && !user) {
        // User found - initial authentication state
      }
      
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Clear any previous connection errors
          setConnectionError(null);
          
          // Fetching user data from Firestore
          // Try users collection first
          let snap = await getDoc(firestoreDoc(db, 'users', firebaseUser.uid));
          let data = snap.exists() ? snap.data() : null;
          // Firestore data fetched
          
          if (data) {
            // For new users, isVerified might be false initially
            // We need to check if they just signed up and need verification
            const isUserVerified = !!data.isVerified;
            console.log('App.tsx: User verification status:', {
              isVerified: data.isVerified,
              emailVerified: data.emailVerified,
              phoneVerified: data.phoneVerified,
              role: data.role,
              isUserVerified
            });
            setIsVerified(isUserVerified);
            setRole(data.role || null);
            setUserData(data); // Store user data for routing decisions
            
            // Send login success notification
            try {
              const { NotificationHelper } = require('./src/services/notificationHelper');
              await NotificationHelper.sendAuthNotification('login', {
                userId: firebaseUser.uid,
                role: data.role,
                email: data.email,
                lastLogin: new Date().toISOString()
              });
            } catch (notificationError) {
              console.warn('Failed to send login success notification:', notificationError);
            }
            
            // User data processed

            // For transporters, check if they have a profile and if they're a driver
            if (data.role === 'transporter') {
              // Check if this user is a driver (only for transporters)
              const driverCheck = await checkIfDriver(firebaseUser.uid);
              setIsDriver(driverCheck);
              try {
                // First check if this is a company transporter by calling the backend API
                const token = await firebaseUser.getIdToken();
                const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${firebaseUser.uid}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                
                if (companyResponse.ok) {
                  const companyData = await companyResponse.json();
                  if (companyData && companyData.length > 0) {
                    // This is a company owner - check company profile completion
                    const company = companyData[0];
                    const isProfileComplete = checkCompanyProfileComplete(company);
                    setProfileCompleted(isProfileComplete);
                    data.transporterStatus = company.status || 'pending';
                    data.transporterType = 'company';
                    
                    // Check subscription status for company
                    const subStatus = await checkSubscriptionStatus(firebaseUser.uid, 'transporter');
                    setSubscriptionStatus(subStatus);
                  } else {
                    // No company found - this is a new transporter
                    setProfileCompleted(false);
                    data.transporterStatus = 'incomplete';
                    data.transporterType = 'company';
                    
                    // Set default subscription status for new company transporters
                    setSubscriptionStatus({
                      hasActiveSubscription: false,
                      isTrialActive: false,
                      needsTrialActivation: true,
                      currentPlan: null,
                      daysRemaining: 0,
                      subscriptionStatus: 'none',
                      transporterType: 'company'
                    });
                  }
                } else {
                  // Company API failed - treat as new transporter
                  setProfileCompleted(false);
                  data.transporterStatus = 'incomplete';
                  data.transporterType = 'company';
                  
                  // Set default subscription status for new company transporters
                  setSubscriptionStatus({
                    hasActiveSubscription: false,
                    isTrialActive: false,
                    needsTrialActivation: true,
                    currentPlan: null,
                    daysRemaining: 0,
                    subscriptionStatus: 'none',
                    transporterType: 'company'
                  });
                }
              } catch (e) {
                setProfileCompleted(false);
                data.transporterStatus = 'incomplete';
                console.error('Error checking transporter profile:', e);
              }
            } else if (data.role === 'broker') {
              // Check subscription status for brokers
              if (data.isVerified) {
                const subStatus = await checkSubscriptionStatus(firebaseUser.uid, 'broker');
                setSubscriptionStatus(subStatus);
              }
              setIsDriver(false); // Brokers are not drivers
            } else if (data.role === 'business') {
              // Business users don't need subscriptions - they're free users
              console.log('App.tsx: Business user detected - no subscription needed');
              setProfileCompleted(!!data.profileCompleted);
              setIsDriver(false); // Business users are not drivers
            } else if (data.role === 'job_seeker' || data.role === 'driver') {
              // Job seekers don't need subscriptions - they're just applying for jobs
              console.log('App.tsx: Job seeker detected - skipping subscription checks');
              
              // Check job seeker profile completeness
              try {
                const { getAuth } = require('firebase/auth');
                const auth = getAuth();
                const firebaseUser = auth.currentUser;
                
                if (!firebaseUser) {
                  console.log('App.tsx: No Firebase user found for job seeker profile check');
                  setProfileCompleted(false);
                  return;
                }
                
                const token = await firebaseUser.getIdToken();
                const jobSeekerResponse = await fetch(`${API_ENDPOINTS.JOB_SEEKERS}/user/${firebaseUser.uid}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (jobSeekerResponse.ok) {
                  const jobSeekerData = await jobSeekerResponse.json();
                  const application = jobSeekerData.application;
                  
                  console.log('App.tsx: Raw job seeker API response:', jobSeekerData);
                  console.log('App.tsx: Application data:', application);
                  
                  // Check if job seeker profile is complete
                  // Handle both possible field names for vehicle classes (check experience nested object first, then root level as fallback)
                  const vehicleClasses = application?.experience?.vehicleClassesExperience || application?.vehicleClassesExperience || application?.vehicleClasses || [];
                  const specializations = application?.experience?.specializations || application?.specializations || [];
                  
                  const isJobSeekerProfileComplete = application && 
                    application.profilePhoto && 
                    application.profilePhoto.trim() !== '' &&
                    application.documents && 
                    application.documents.drivingLicense && 
                    application.documents.drivingLicense.url && 
                    application.documents.goodConductCert && 
                    application.documents.goodConductCert.url && 
                    application.documents.idDoc && 
                    application.documents.idDoc.url &&
                    application.dateOfBirth && 
                    vehicleClasses.length > 0 && 
                    specializations.length > 0;
                  
                  console.log('App.tsx: Job seeker profile completeness check:', {
                    hasProfilePhoto: application?.profilePhoto && application.profilePhoto.trim() !== '',
                    hasDocuments: application?.documents && 
                      application.documents.drivingLicense?.url && 
                      application.documents.goodConductCert?.url && 
                      application.documents.idDoc?.url,
                    hasRequiredFields: application?.dateOfBirth && 
                      vehicleClasses.length > 0 && 
                      specializations.length > 0,
                    isComplete: isJobSeekerProfileComplete,
                    // Debug the actual values
                    dateOfBirth: application?.dateOfBirth,
                    vehicleClasses: vehicleClasses,
                    vehicleClassesLength: vehicleClasses.length,
                    specializations: specializations,
                    specializationsLength: specializations.length
                  });
                  
                  setProfileCompleted(isJobSeekerProfileComplete);
                } else {
                  console.log('App.tsx: Job seeker profile not found - setting incomplete');
                  setProfileCompleted(false);
                }
              } catch (error) {
                console.log('App.tsx: Error checking job seeker profile:', error);
                setProfileCompleted(false);
              }
              
              setIsDriver(false); // Job seekers are not active drivers yet
            } else {
              // For other users (shippers), use the profileCompleted field
              setProfileCompleted(!!data.profileCompleted);
              setIsDriver(false); // Shippers are not drivers
            }
          } else {
            // User not found in users collection - this means their data was deleted
            // Sign them out and redirect to welcome screen
            console.log('App.tsx: User not found in Firestore - signing out and redirecting to welcome');
            try {
              await auth.signOut();
              console.log('App.tsx: User signed out successfully');
            } catch (signOutError) {
              console.error('App.tsx: Error signing out user:', signOutError);
            }
            setIsVerified(false);
            setRole(null);
            setProfileCompleted(false);
            setUserData(null);
            setSubscriptionStatus(null);
            setIsDriver(false);
            return; // Exit early to prevent further processing
          }
        } catch (e) {
          console.error('Error fetching user data from Firestore:', e);
          
          // Set connection error for user feedback
          setConnectionError('Unable to load user data. Please check your connection and try again.');
          
          // If Firestore fails, use Firebase Auth as fallback
          // This prevents verified users from being stuck in verification loop
          if (firebaseUser.emailVerified) {
            console.log('App.tsx: Firestore failed but Firebase Auth shows email verified - using as fallback');
            setIsVerified(true);
            // We can't get role from Firestore, so we'll need to handle this case
            // For now, set a default role or let the user re-authenticate
            setRole(null);
            setProfileCompleted(false);
            setConnectionError(null); // Clear error since we have fallback
          } else {
            // Show a user-friendly error message instead of the raw Firebase error
            console.log('App.tsx: Firestore failed and user not verified - showing error state');
            setIsVerified(false);
            setRole(null);
            setProfileCompleted(false);
          }
        }
      } else {
        setIsVerified(false);
        setRole(null);
        setProfileCompleted(false);
        setSubscriptionStatus(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    // Show a proper loading screen instead of null to prevent navigation issues
    return (
      <NavigationContainer key={`${user ? user.uid : 'guest'}-${role || 'none'}`}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading">
            {() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, fontSize: 16, color: colors.text.primary }}>Loading...</Text>
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Show connection error screen if there's a connection error
  if (connectionError) {
    return (
      <NavigationContainer key={`${user ? user.uid : 'guest'}-error`}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ConnectionError">
            {() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 }}>
                <MaterialCommunityIcons name="wifi-off" size={64} color={colors.error} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginTop: 16, textAlign: 'center' }}>
                  Connection Error
                </Text>
                <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: 8, textAlign: 'center', lineHeight: 24 }}>
                  {connectionError}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginTop: 24,
                  }}
                  onPress={retryConnection}
                >
                  <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Determine initial route and screens based on auth state
  let initialRouteName = 'Welcome';
  let screens = null;
  
  console.log('App.tsx: Routing decision - user:', !!user, 'role:', role, 'isVerified:', isVerified, 'profileCompleted:', profileCompleted);
  console.log('App.tsx: User data:', userData);
  console.log('App.tsx: Role type:', typeof role, 'Role value:', role);
  
  // CRITICAL: Job seekers should NEVER access shipper, broker, business, or transporter screens
  if (role === 'job_seeker') {
    console.log('App.tsx: CRITICAL - Job seeker detected, ensuring proper routing to job seeker screens only');
  }

  // Navigation state

  // Debug business role specifically
  if (role === 'business') {
    // Business user detected - routing to BusinessStack
  } else if (role) {
    // Non-business role
  }

  // Navigation debug

  if (!user) {
    initialRouteName = 'Welcome';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="PasswordResetScreen" component={require('./src/screens/auth/PasswordResetScreen').default} />
        <Stack.Screen name="ChangePasswordScreen" component={require('./src/screens/auth/ChangePasswordScreen').default} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
        <Stack.Screen 
          name="VerifyIdentificationDocument" 
          component={require('./src/screens/VerifyIdentificationDocumentScreen').default}
          options={{
            title: 'Broker Verification',
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
        <Stack.Screen name="RatingSubmission" component={RatingSubmissionScreen} />
        <Stack.Screen name="RatingAnalytics" component={RatingAnalyticsScreen} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
        <Stack.Screen name="DriverTabs" component={DriverTabNavigator} />
        <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
      </>
    );
  } else if (user && isVerified && !role) {
    // User is verified but we couldn't get role from Firestore (Firestore error)
    // This is a fallback case to prevent verified users from being stuck
    console.log('App.tsx: Verified user but no role data - routing to role selection');
    initialRouteName = 'SignupSelection';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="PasswordResetScreen" component={require('./src/screens/auth/PasswordResetScreen').default} />
        <Stack.Screen name="ChangePasswordScreen" component={require('./src/screens/auth/ChangePasswordScreen').default} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
        <Stack.Screen 
          name="VerifyIdentificationDocument" 
          component={require('./src/screens/VerifyIdentificationDocumentScreen').default}
          options={{
            title: 'Broker Verification',
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
        <Stack.Screen name="DriverTabs" component={DriverTabNavigator} />
        <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
      </>
    );
  } else if (role && role !== 'transporter' && role !== 'broker' && !isVerified) {
    // Unverified non-transporter/non-broker users - send to verification options
    // Unverified user detected - routing to verification options
    // Check user's preferred verification method from their profile
    const preferredMethod = userData?.preferredVerificationMethod || 'phone';
    initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="PasswordResetScreen" component={require('./src/screens/auth/PasswordResetScreen').default} />
        <Stack.Screen name="ChangePasswordScreen" component={require('./src/screens/auth/ChangePasswordScreen').default} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        {/* Add role-specific screens for after verification */}
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      </>
    );
  } else if (user && isVerified) {
    // Verified users - route based on role
    // Verified user detected - routing based on role
    console.log('App.tsx: Verified user detected with role:', role);
    
    // Safety check: Job seekers should NEVER be routed to shipper screens
    if (role === 'job_seeker') {
      console.log('App.tsx: Job seeker detected in verified section - ensuring proper routing');
    }
    
    if (role === 'shipper') {
      // Routing shipper to main tabs
      console.log('App.tsx: Shipper detected - routing to main tabs');
      initialRouteName = 'MainTabs';
      screens = (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
          <Stack.Screen name="TripDetailsScreen" component={require('./src/screens/TripDetailsScreen').default} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          {/* Add verification screens for secondary verification */}
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        </>
      );
    } else if (role === 'business') {
      // Routing business to business stack
      initialRouteName = 'BusinessStack';
      screens = (
        <>
          <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          {/* Add verification screens for secondary verification */}
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        </>
      );
    } else if (role === 'broker') {
      // Check broker verification and subscription status
      console.log('App.tsx: Verified broker detected - checking verification and subscription status');
      
      // Check if broker has active subscription
      if (subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isExpired) {
        // Broker has active subscription - go directly to dashboard
        console.log('App.tsx: Broker has active subscription - routing to dashboard');
        initialRouteName = 'BrokerTabs';
        screens = (
          <>
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            <Stack.Screen name="PaymentConfirmation" component={require('./src/screens/PaymentConfirmationScreen').default} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      } else if (subscriptionStatus?.isExpired) {
        // Broker has expired subscription - go to expiry screen
        console.log('App.tsx: Broker has expired subscription - routing to expiry screen');
        initialRouteName = 'SubscriptionExpired';
        screens = (
          <>
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            <Stack.Screen name="PaymentConfirmation" component={require('./src/screens/PaymentConfirmationScreen').default} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      } else {
        // Broker needs verification or trial activation
        console.log('App.tsx: Broker needs verification or trial activation - routing to verification screen');
        initialRouteName = 'VerifyIdentificationDocument';
        screens = (
          <>
            <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            <Stack.Screen name="PaymentConfirmation" component={require('./src/screens/PaymentConfirmationScreen').default} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      }
    } else if (role === 'transporter') {
      // For transporters, check profile completion, approval status, and subscription status
      console.log('App.tsx: Verified transporter detected - checking profile, approval, and subscription status');
      
      const transporterStatus = userData?.transporterStatus || 'incomplete';
      const transporterType = userData?.transporterType || 'company';
      console.log('App.tsx: Transporter status:', transporterStatus, 'Type:', transporterType);
      
      if (!profileCompleted) {
        // Profile not completed - go to completion screen
        console.log('App.tsx: Profile not completed - routing to completion screen');
        initialRouteName = 'TransporterCompletionScreen';
        screens = (
          <>
            <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
            <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="JobManagementScreen" component={JobManagementScreen} />
            <Stack.Screen name="RouteLoadsScreen" component={RouteLoadsScreen} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      } else if (transporterStatus !== 'approved') {
        // Profile completed but not approved yet - stay on processing screen
        console.log('App.tsx: Profile completed but not approved - routing to processing screen');
        initialRouteName = 'TransporterProcessingScreen';
        screens = (
          <>
            <Stack.Screen 
              name="TransporterProcessingScreen" 
              component={TransporterProcessingScreen}
              initialParams={{ transporterType: transporterType }}
            />
            <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="JobManagementScreen" component={JobManagementScreen} />
            <Stack.Screen name="RouteLoadsScreen" component={RouteLoadsScreen} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      } else {
        // Profile completed and approved - check subscription status
        console.log('App.tsx: Profile completed and approved - checking subscription status');
        console.log('App.tsx: Subscription status details:', {
          hasActiveSubscription: subscriptionStatus?.hasActiveSubscription,
          isTrialActive: subscriptionStatus?.isTrialActive,
          needsTrialActivation: subscriptionStatus?.needsTrialActivation,
          subscriptionStatus: subscriptionStatus?.subscriptionStatus,
          isApiError: subscriptionStatus?.isApiError
        });
        
        // More reliable subscription status checking
        const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription === true;
        const isTrialActive = subscriptionStatus?.isTrialActive === true;
        const needsTrialActivation = subscriptionStatus?.needsTrialActivation === true;
        const isExpired = subscriptionStatus?.subscriptionStatus === 'expired';
        const isApiError = subscriptionStatus?.isApiError === true;
        
        if (isApiError) {
          // API error - be conservative and route to trial activation
          console.log('App.tsx: Subscription API error - routing to trial activation for safety');
          initialRouteName = 'SubscriptionTrial';
          screens = (
            <>
              <Stack.Screen
                name="SubscriptionTrial"
                component={SubscriptionTrialScreen as any}
                initialParams={{
                  userType: userData?.transporterType === 'company' ? 'company' : 'individual',
                  subscriptionStatus: subscriptionStatus
                }}
              />
              <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
              <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
              <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
              <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            </>
          );
        } else if (isExpired) {
          // Subscription expired - route to expired screen
          console.log('App.tsx: Subscription expired - routing to expired screen');
          initialRouteName = 'SubscriptionExpired';
          screens = (
            <>
              <Stack.Screen
                name="SubscriptionExpired"
                component={require('./src/screens/SubscriptionExpiredScreen').default}
                initialParams={{
                  userType: userData?.transporterType === 'company' ? 'company' : 'individual',
                  userId: 'current_user',
                  expiredDate: new Date().toISOString()
                }}
              />
              <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
              <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
              <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
              <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            </>
          );
        } else if (needsTrialActivation || (!hasActiveSubscription && !isTrialActive)) {
          // No active subscription - route to trial activation
          console.log('App.tsx: No active subscription - routing to trial activation');
          initialRouteName = 'SubscriptionTrial';
          screens = (
            <>
              <Stack.Screen
                name="SubscriptionTrial"
                component={SubscriptionTrialScreen as any}
                initialParams={{
                  userType: userData?.transporterType === 'company' ? 'company' : 'individual',
                  subscriptionStatus: subscriptionStatus
                }}
              />
              <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
              <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
              <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
              <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            </>
          );
        } else {
          // Has active subscription - route to dashboard
          console.log('App.tsx: Has active subscription - routing to dashboard');
          // Has active subscription - check if driver or company/individual transporter
          if (isDriver && typeof isDriver === 'object' && isDriver.isDriver) {
            console.log('App.tsx: Driver detected - routing to driver dashboard');
            console.log('App.tsx: Driver type:', isDriver.driverType);
            initialRouteName = 'DriverTabs';
          } else {
            console.log('App.tsx: Has active subscription - routing to transporter dashboard');
            initialRouteName = 'TransporterTabs';
          }
          screens = (
            <>
              <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
              <Stack.Screen name="DriverTabs" component={DriverTabNavigator} />
              <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
              <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
              <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
              <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
              <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
              <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
              <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
              <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
              <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
              <Stack.Screen name="SubscriptionManagement" component={require('./src/screens/SubscriptionManagementScreen').default} />
              <Stack.Screen name="ContactCustomer" component={require('./src/screens/ContactCustomerScreen').default} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
              <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
            </>
          );
        }
      }
            } else if (role === 'driver' || role === 'job_seeker') {
              // Job seekers should only access their recruitment status screen
              // They should NEVER have access to service requests or job management
              console.log('App.tsx: Job seeker detected - routing to recruitment status screen only');
              
              // Check if job seeker has completed their profile
              if (!profileCompleted) {
                console.log('App.tsx: Job seeker profile incomplete - routing to job seeker completion screen');
                initialRouteName = 'JobSeekerCompletionScreen';
                screens = (
                  <>
                    <Stack.Screen 
                      name="JobSeekerCompletionScreen" 
                      component={JobSeekerCompletionScreen}
                    />
                    <Stack.Screen name="DriverRecruitmentStatusScreen" component={require('./src/screens/DriverRecruitmentStatusScreen').default} />
                    {/* Add verification screens for secondary verification */}
                    <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                    <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
                  </>
                );
              } else {
                console.log('App.tsx: Job seeker profile complete - routing to recruitment status');
                initialRouteName = 'DriverRecruitmentStatusScreen';
                screens = (
                  <>
                    <Stack.Screen name="DriverRecruitmentStatusScreen" component={require('./src/screens/DriverRecruitmentStatusScreen').default} />
                    <Stack.Screen name="JobSeekerCompletionScreen" component={JobSeekerCompletionScreen} />
                    {/* Add verification screens for secondary verification */}
                    <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                    <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
                  </>
                );
              }
    } else {
      // Fallback for other roles - but NEVER route job_seeker here
      console.log('App.tsx: Fallback routing for role:', role);
      if (role === 'job_seeker') {
        console.error('App.tsx: ERROR - Job seeker should not reach fallback routing!');
        // Force job seeker to recruitment status
        initialRouteName = 'DriverRecruitmentStatusScreen';
        screens = (
          <>
            <Stack.Screen name="DriverRecruitmentStatusScreen" component={require('./src/screens/DriverRecruitmentStatusScreen').default} />
            <Stack.Screen 
              name="TransporterCompletionScreen" 
              component={TransporterCompletionScreen}
              initialParams={{ isJobSeeker: true }}
            />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      } else {
        // Routing unknown role to main tabs (shippers only)
        initialRouteName = 'MainTabs';
        screens = (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
            {/* Add verification screens for secondary verification */}
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          </>
        );
      }
    }
  } else if (user && !isVerified) {
    // Handle unverified users based on their role
    if (role === 'transporter') {
      // Check if transporter is actually verified but Firestore hasn't updated yet
      console.log('App.tsx: Unverified transporter detected - checking Firebase Auth email verification status');
      
      // Check Firebase Auth email verification status as fallback
      if (user.emailVerified) {
        console.log('App.tsx: Firebase Auth shows email verified - routing to TransporterCompletionScreen');
        initialRouteName = 'TransporterCompletionScreen';
        screens = (
          <>
            <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
            <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
            <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
            <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          </>
        );
      } else {
        // Unverified transporter - route to preferred verification method
        const preferredMethod = userData?.preferredVerificationMethod || 'phone';
        initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
        screens = (
          <>
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
            <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
            <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          </>
        );
      }
            } else if (role === 'driver' || role === 'job_seeker') {
              // Unverified job seekers should go to verification, then profile completion
              console.log('App.tsx: Unverified job seeker detected - routing to verification');
              const preferredMethod = userData?.preferredVerificationMethod || 'phone';
              initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
              screens = (
                <>
                  <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                  <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
                  <Stack.Screen 
                    name="JobSeekerCompletionScreen" 
                    component={JobSeekerCompletionScreen}
                  />
                  <Stack.Screen name="DriverRecruitmentStatusScreen" component={require('./src/screens/DriverRecruitmentStatusScreen').default} />
                </>
              );
            } else {
      // Fallback: Any other authenticated user who is not verified should go to verification options
      // Fallback: authenticated but unverified user - routing to verification options
      const preferredMethod = userData?.preferredVerificationMethod || 'phone';
      initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
      screens = (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="SignIn" component={LoginScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
          <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
        </>
      );
    }
  } else if (role === 'broker') {
    if (!isVerified) {
      // Unverified broker - route to preferred verification method
      const preferredMethod = userData?.preferredVerificationMethod || 'phone';
      initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
      screens = (
        <>
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
          <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
          <Stack.Screen name="BrokerHomeScreen" component={require('./src/screens/BrokerHomeScreen').default} />
          <Stack.Screen name="BrokerManagementScreen" component={require('./src/screens/BrokerManagementScreen').default} />
          <Stack.Screen name="BrokerRequestScreen" component={require('./src/screens/BrokerRequestScreen').default} />
          <Stack.Screen name="BrokerNetworkScreen" component={require('./src/screens/BrokerNetworkScreen').default} />
          <Stack.Screen name="BrokerRequestsScreen" component={require('./src/screens/BrokerRequestsScreen').default} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
          <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
          <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          <Stack.Screen name="PaymentConfirmation" component={require('./src/screens/PaymentConfirmationScreen').default} />
        </>
      );
    } else {
      // Check subscription status for verified brokers
      if (subscriptionStatus?.subscriptionStatus === 'expired') {
        initialRouteName = 'SubscriptionExpired';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionExpired"
              component={SubscriptionExpiredScreen as any}
              initialParams={{
                userType: 'broker',
                userId: user.uid,
                expiredDate: subscriptionStatus?.subscriptionExpiryDate || new Date().toISOString()
              }}
            />
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="BrokerHomeScreen" component={require('./src/screens/BrokerHomeScreen').default} />
            <Stack.Screen name="BrokerManagementScreen" component={require('./src/screens/BrokerManagementScreen').default} />
            <Stack.Screen name="BrokerRequestScreen" component={require('./src/screens/BrokerRequestScreen').default} />
            <Stack.Screen name="BrokerNetworkScreen" component={require('./src/screens/BrokerNetworkScreen').default} />
            <Stack.Screen name="BrokerRequestsScreen" component={require('./src/screens/BrokerRequestsScreen').default} />
            <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
            <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
            <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
            <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else if (subscriptionStatus?.needsTrialActivation || (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive)) {
        initialRouteName = 'SubscriptionTrial';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionTrial"
              component={SubscriptionTrialScreen as any}
              initialParams={{
                userType: 'broker',
                subscriptionStatus: subscriptionStatus
              }}
            />
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="BrokerHomeScreen" component={require('./src/screens/BrokerHomeScreen').default} />
            <Stack.Screen name="BrokerManagementScreen" component={require('./src/screens/BrokerManagementScreen').default} />
            <Stack.Screen name="BrokerRequestScreen" component={require('./src/screens/BrokerRequestScreen').default} />
            <Stack.Screen name="BrokerNetworkScreen" component={require('./src/screens/BrokerNetworkScreen').default} />
            <Stack.Screen name="BrokerRequestsScreen" component={require('./src/screens/BrokerRequestsScreen').default} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else {
        initialRouteName = 'BrokerTabs';
        screens = (
          <>
            <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
            <Stack.Screen name="BrokerHomeScreen" component={require('./src/screens/BrokerHomeScreen').default} />
            <Stack.Screen name="BrokerManagementScreen" component={require('./src/screens/BrokerManagementScreen').default} />
            <Stack.Screen name="BrokerRequestScreen" component={require('./src/screens/BrokerRequestScreen').default} />
            <Stack.Screen name="BrokerNetworkScreen" component={require('./src/screens/BrokerNetworkScreen').default} />
            <Stack.Screen name="BrokerRequestsScreen" component={require('./src/screens/BrokerRequestsScreen').default} />
            <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
            <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
            <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
            <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
            <Stack.Screen name="VerifyIdentificationDocument" component={VerifyIdentificationDocumentScreen} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
            <Stack.Screen name="SubscriptionManagement" component={require('./src/screens/SubscriptionManagementScreen').default} />
            <Stack.Screen name="ContactCustomer" component={require('./src/screens/ContactCustomerScreen').default} />
          </>
        );
      }
    }
  } else if (role === 'transporter') {
    // Enhanced transporter navigation logic
    // Transporter condition hit - checking profile completion
    // Transporter navigation logic

    if (!profileCompleted) {
      // Profile not completed - go to completion screen
      initialRouteName = 'TransporterCompletionScreen';
      // Routing to TransporterCompletionScreen - profile not completed
      screens = (
        <>
          <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
          <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
          <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
          <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen as any} />
          <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
          <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
          <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
          <Stack.Screen name="CompanyFleetPlans" component={CompanyFleetPlansScreen} />
          <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
          <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          <Stack.Screen name="SubscriptionManagement" component={require('./src/screens/SubscriptionManagementScreen').default} />
          <Stack.Screen name="ContactCustomer" component={require('./src/screens/ContactCustomerScreen').default} />
        </>
      );
    } else if (!isVerified) {
      // Profile completed but not verified - go to processing screen
      initialRouteName = 'TransporterProcessingScreen';
      screens = (
        <>
          <Stack.Screen 
            name="TransporterProcessingScreen" 
            component={TransporterProcessingScreen}
            initialParams={{ transporterType: userData?.transporterType || 'company' }}
          />
          <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen as any} />
          <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
          <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
          <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
          <Stack.Screen name="CompanyFleetPlans" component={CompanyFleetPlansScreen} />
          <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
          <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          <Stack.Screen name="SubscriptionManagement" component={require('./src/screens/SubscriptionManagementScreen').default} />
          <Stack.Screen name="ContactCustomer" component={require('./src/screens/ContactCustomerScreen').default} />
        </>
      );
    } else {
      // Profile completed and verified - check subscription status
      // Transporter subscription check
      
      // Check subscription status for approved transporters
      if (subscriptionStatus?.subscriptionStatus === 'expired') {
        // Routing transporter to expired screen
        initialRouteName = 'SubscriptionExpired';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionExpired"
              component={SubscriptionExpiredScreen as any}
              initialParams={{
                userType: userData?.transporterType === 'company' ? 'company' : 'individual',
                userId: user.uid,
                expiredDate: subscriptionStatus?.subscriptionExpiryDate || new Date().toISOString()
              }}
            />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else if (subscriptionStatus?.needsTrialActivation || (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive)) {
        // No active subscription - route to trial activation
        initialRouteName = 'SubscriptionTrial';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionTrial"
              component={SubscriptionTrialScreen as any}
              initialParams={{
                userType: userData?.transporterType === 'company' ? 'company' : 'individual',
                subscriptionStatus: subscriptionStatus
              }}
            />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else {
        // Has active subscription - route to dashboard
        initialRouteName = 'TransporterTabs';
        screens = (
          <>
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      }
    }
  } else if (role === 'business') {
    // Business user navigation
    console.log('App.tsx: Business user routing - isVerified:', isVerified, 'userData:', userData);

    if (!isVerified) {
      // Unverified business users - send to preferred verification method
      const preferredMethod = userData?.preferredVerificationMethod || 'phone';
      initialRouteName = preferredMethod === 'phone' ? 'PhoneOTPScreen' : 'EmailVerification';
      screens = (
        <>
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
        </>
      );
    } else {
      // Verified business users - go directly to business dashboard (no subscription needed)
      initialRouteName = 'BusinessStack';
      screens = (
        <>
          <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        </>
      );
    }
  } else if (role === 'shipper') {
    initialRouteName = 'MainTabs';
    screens = (
      <>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="EmailVerification" component={require('./src/screens/auth/EmailVerificationScreen').default} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
        <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  } else {
    initialRouteName = 'MainTabs';
    screens = (
      <>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
        <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  }

  // Wrap the entire app in a global error boundary
  const ErrorBoundary = require('./src/components/ErrorBoundary').default;
  return (
    <ErrorBoundary>
      <ConsolidationProvider>
        <NotificationProvider>
          <StatusBar style="dark" translucent />
          <NavigationContainer key={`${user ? user.uid : 'guest'}-${role || 'none'}`}>
            <Stack.Navigator key={`${user ? user.uid : 'guest'}-${role || 'none'}`} screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
              {screens}
            </Stack.Navigator>
          </NavigationContainer>
          <NotificationManager />
        </NotificationProvider>
      </ConsolidationProvider>
    </ErrorBoundary>
  );
}

export default App;