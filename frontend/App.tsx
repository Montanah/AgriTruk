import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, LogBox, Text, View } from 'react-native';
import BusinessStackNavigator from './src/navigation/BusinessStackNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import TransporterTabNavigator from './src/navigation/TransporterTabNavigator';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import TransporterCompletionScreen from './src/screens/auth/TransporterCompletionScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import ConsolidationScreen from './src/screens/business/ConsolidationScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import SubscriptionExpiredScreen from './src/screens/SubscriptionExpiredScreen';
import SubscriptionTrialScreen from './src/screens/SubscriptionTrialScreen';
import TransporterProcessingScreen from './src/screens/TransporterProcessingScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { NotificationProvider } from './src/components/Notification/NotificationContext';
import { ConsolidationProvider } from './src/context/ConsolidationContext';
import colors from './src/constants/colors';
import { auth, db } from './src/firebaseConfig';

const Stack = createStackNavigator();

LogBox.ignoreLogs(['useInsertionEffect must not schedule updates']);

// App initialization

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

  // Required fields for company transporters
  const companyRequiredFields = [
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
    'status',
    'companyName',
    'companyRegistration'
  ];

  const transporterType = transporterData.transporterType || 'individual';
  const requiredFields = transporterType === 'company' ? companyRequiredFields : individualRequiredFields;

  // Check if all required fields are present and not empty
  for (const field of requiredFields) {
    if (!transporterData[field] ||
      (typeof transporterData[field] === 'string' && transporterData[field].trim() === '') ||
      (Array.isArray(transporterData[field]) && transporterData[field].length === 0)) {
      return false;
    }
  }

  // Check if at least one vehicle image is uploaded
  if (!Array.isArray(transporterData.vehicleImagesUrl) || transporterData.vehicleImagesUrl.length === 0) {
    return false;
  }

  // Status must be at least 'pending', 'under_review', or 'approved'
  if (!['pending', 'under_review', 'approved'].includes(transporterData.status)) {
    return false;
  }

  return true;
};

// Helper function to check subscription status
const checkSubscriptionStatus = async (userId: string, userType: 'transporter' | 'broker' | 'business') => {
  try {
    // Use the subscription service which handles auth tokens properly
    const subscriptionService = require('./src/services/subscriptionService').default;
    const status = await subscriptionService.getSubscriptionStatus();
    return status;
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }

  // Fallback: return default values for development
  // Fallback to trial for new users
  return {
    hasActiveSubscription: false,
    isTrialActive: false,
    trialExpiryDate: null,
    subscriptionExpiryDate: null,
    needsTrialActivation: true,
    currentPlan: null,
    daysRemaining: 0,
    subscriptionStatus: 'none'
  };
};

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [role, setRole] = React.useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = React.useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Debug: Log app state changes
  React.useEffect(() => {
    console.log('🔍 APP STATE CHANGED:', {
      user: !!user,
      isVerified,
      role,
      profileCompleted,
      loading,
      timestamp: new Date().toISOString()
    });
  }, [user, isVerified, role, profileCompleted, loading]);

  // Debug: Log app lifecycle
  React.useEffect(() => {
    console.log('🚀 APP MOUNTED - Authentication should persist');
    
    // Check current auth state immediately
    if (auth && auth.currentUser) {
      console.log('✅ CURRENT USER FOUND ON APP START:', {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('❌ NO CURRENT USER ON APP START - This is normal for first launch');
    }
    
    return () => {
      console.log('🛑 APP UNMOUNTING - This should not happen during normal operation');
    };
  }, []);

  React.useEffect(() => {
    console.log('🔧 Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 AUTH STATE CHANGED:', {
        hasUser: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        timestamp: new Date().toISOString()
      });
      
      // Debug: Check if user is being lost
      if (!firebaseUser && user) {
        console.log('🚨 USER LOST - Previous user was:', {
          uid: user.uid,
          email: user.email,
          timestamp: new Date().toISOString()
        });
      }
      
      // Debug: Check if this is the initial auth state
      if (firebaseUser && !user) {
        console.log('✅ USER FOUND - Initial authentication state:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          timestamp: new Date().toISOString()
        });
      }
      
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          console.log('🔍 FETCHING USER DATA FROM FIRESTORE:', firebaseUser.uid);
          // Try users collection first
          let snap = await getDoc(firestoreDoc(db, 'users', firebaseUser.uid));
          let data = snap.exists() ? snap.data() : null;
          console.log('🔍 FIRESTORE DATA FETCHED:', {
            exists: snap.exists(),
            data: data ? {
              role: data.role,
              isVerified: data.isVerified,
              email: data.email,
              phone: data.phone
            } : null
          });
          
          if (data) {
            // For new users, isVerified might be false initially
            // We need to check if they just signed up and need verification
            const isUserVerified = !!data.isVerified;
            setIsVerified(isUserVerified);
            setRole(data.role || null);
            
            console.log('🔍 USER DATA PROCESSED:', {
              uid: firebaseUser.uid,
              role: data.role,
              isVerified: isUserVerified,
              email: data.email,
              phone: data.phone
            });

            // For transporters, check if they have a profile in transporters collection
            if (data.role === 'transporter') {
              try {
                const transporterSnap = await getDoc(firestoreDoc(db, 'transporters', firebaseUser.uid));
                const transporterData = transporterSnap.exists() ? transporterSnap.data() : null;
                if (transporterData) {
                  const isProfileComplete = checkTransporterProfileComplete(transporterData);
                  setProfileCompleted(isProfileComplete);
                  
                  // Set transporter status for routing logic
                  data.transporterStatus = transporterData.status || 'pending';
                  
                  // isVerified is already set from users collection - don't override it
                  // Transporter approval status is separate from verification
                  console.log('Transporter profile found:', { 
                    isProfileComplete, 
                    status: transporterData.status,
                    transporterStatus: data.transporterStatus,
                    isVerified: isUserVerified // Keep the verification status from users collection
                  });

                  // Check subscription status for approved transporters
                  if (transporterData.status === 'approved') {
                    console.log('🚨 CHECKING TRANSPORTER SUBSCRIPTION STATUS');
                    const subStatus = await checkSubscriptionStatus(firebaseUser.uid, 'transporter');
                    console.log('🚨 TRANSPORTER SUBSCRIPTION STATUS RESULT:', subStatus);
                    setSubscriptionStatus(subStatus);
                  }
                } else {
                  // Transporter exists in users but no profile yet - this is the key case
                  setProfileCompleted(false);
                  data.transporterStatus = 'incomplete'; // Set status for routing
                  // Don't override isVerified - keep it from users collection
                  console.log('🚨 Transporter user found but NO PROFILE in transporters collection - should go to TransporterCompletionScreen', {
                    isVerified: isUserVerified,
                    transporterStatus: data.transporterStatus
                  });
                }
              } catch (e) {
                setProfileCompleted(false);
                data.transporterStatus = 'incomplete'; // Set status for routing
                // Don't override isVerified in error case - keep it from users collection
                console.error('Error checking transporter profile:', e);
              }
            } else if (data.role === 'broker') {
              // Check subscription status for brokers
              if (data.isVerified) {
                const subStatus = await checkSubscriptionStatus(firebaseUser.uid, 'broker');
                setSubscriptionStatus(subStatus);
              }
            } else if (data.role === 'business') {
              // For business users, no subscription needed - just check verification
              console.log('📋 BUSINESS USER FOUND - checking verification status');
              setProfileCompleted(!!data.profileCompleted);
            } else {
              // For other users (shippers), use the profileCompleted field
              setProfileCompleted(!!data.profileCompleted);
            }
          } else {
            // User not found in users collection
            setIsVerified(false);
            setRole(null);
            setProfileCompleted(false);
          }
        } catch (e) {
          setIsVerified(false);
          setRole(null);
          setProfileCompleted(false);
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
      <NavigationContainer>
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

  // Determine initial route and screens based on auth state
  let initialRouteName = 'Welcome';
  let screens = null;

  console.log('🔍 Navigation state:', {
    user: !!user,
    role,
    roleType: typeof role,
    isVerified,
    profileCompleted,
    subscriptionStatus,
    userId: user?.uid
  });

  // Debug business role specifically
  if (role === 'business') {
    console.log('✅ BUSINESS USER DETECTED - routing to BusinessStack');
  } else if (role) {
    console.log('❌ NON-BUSINESS ROLE:', role, 'Type:', typeof role);
  }

  // Debug navigation state
  console.log('🔍 NAVIGATION DEBUG:', {
    user: !!user,
    userId: user?.uid,
    role,
    isVerified,
    profileCompleted,
    subscriptionStatus: !!subscriptionStatus,
    timestamp: new Date().toISOString()
  });

  if (!user) {
    initialRouteName = 'Welcome';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
        <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="BusinessStack" component={BusinessStackNavigator} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
        <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
      </>
    );
  } else if (role && role !== 'transporter' && role !== 'broker' && !isVerified) {
    // Unverified non-transporter/non-broker users - send to verification
    console.log('🚨 UNVERIFIED USER DETECTED - routing to verification:', { role, isVerified });
    console.log('🚨 NAVIGATING TO EMAIL VERIFICATION SCREEN');
    console.log('🚨 NAVIGATION STACK: Unverified non-transporter/non-broker flow');
    initialRouteName = 'EmailVerification'; // Default to email verification
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
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
    console.log('✅ VERIFIED USER DETECTED - routing based on role:', { role, isVerified });
    
    if (role === 'shipper') {
      console.log('🚀 ROUTING SHIPPER TO MAIN TABS (Home tab = ServiceRequest)');
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
      console.log('🚀 ROUTING BUSINESS TO BUSINESS STACK');
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
      // Check if broker is already verified (has completed ID verification)
      // We'll need to fetch broker-specific data to check verification status
      // For now, route all brokers to verification screen - they can check their status there
      console.log('🚀 ROUTING BROKER TO ID VERIFICATION (status will be checked in screen)');
      initialRouteName = 'VerifyIdentificationDocument';
      
      screens = (
        <>
          <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
          <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          {/* Add verification screens for secondary verification */}
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        </>
      );
    } else if (role === 'transporter') {
      // For transporters, always route to completion screen initially
      // The TransporterCompletionScreen will check the actual profile status
      // and route accordingly (completion -> processing -> tabs)
      console.log('🚀 ROUTING TRANSPORTER TO COMPLETION SCREEN (will check profile status)');
      initialRouteName = 'TransporterCompletionScreen';
      
      screens = (
        <>
          <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
          <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
          <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          {/* Add verification screens for secondary verification */}
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        </>
      );
    } else {
      // Fallback for other roles
      console.log('🚀 ROUTING UNKNOWN ROLE TO MAIN TABS');
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
  } else if (user && !isVerified) {
    // Fallback: Any authenticated user who is not verified should go to verification
    console.log('🚨 FALLBACK: Authenticated but unverified user - routing to verification');
    console.log('🚨 FALLBACK NAVIGATING TO EMAIL VERIFICATION SCREEN');
    console.log('🚨 NAVIGATION STACK: Fallback unverified user flow');
    initialRouteName = 'EmailVerification';
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
        <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
      </>
    );
  } else if (role === 'broker') {
    if (!isVerified) {
      initialRouteName = 'VerifyIdentificationDocument';
      screens = (
        <>
          <Stack.Screen
            name="VerifyIdentificationDocument"
            component={require('./src/screens/VerifyIdentificationDocumentScreen').default}
            initialParams={{ broker: { name: user?.displayName || '', email: user?.email, phone: user?.phoneNumber || '' } }}
          />
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
        </>
      );
    } else {
      // Check subscription status for verified brokers
      // If user has no active subscription and no trial, they need trial activation
      if (subscriptionStatus?.needsTrialActivation || (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive && subscriptionStatus?.subscriptionStatus === 'none')) {
        initialRouteName = 'SubscriptionTrial';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionTrial"
              component={SubscriptionTrialScreen}
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
            <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
            <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
            <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
            <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive) {
        initialRouteName = 'SubscriptionExpired';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionExpired"
              component={SubscriptionExpiredScreen}
              initialParams={{
                userType: 'broker',
                userId: user.uid,
                expiredDate: subscriptionStatus?.subscriptionExpiryDate || new Date().toISOString()
              }}
            />
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
            <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
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
    console.log('🚨 TRANSPORTER CONDITION HIT - checking profile completion');
    console.log('Transporter navigation logic:', { profileCompleted, isVerified, subscriptionStatus });

    if (!profileCompleted) {
      // Profile not completed - go to completion screen
      initialRouteName = 'TransporterCompletionScreen';
      console.log('🚨 ROUTING TO TransporterCompletionScreen - profile not completed');
      screens = (
        <>
          <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
          <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
          <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
          <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
          <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
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
          <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
          <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
          <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="RequestForm" component={require('./src/components/common/RequestForm').default} />
          <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
          <Stack.Screen name="TrackingScreen" component={require('./src/screens/TrackingScreen').default} />
          <Stack.Screen name="MapViewScreen" component={require('./src/screens/MapViewScreen').default} />
          <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
          <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
          <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
          <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          <Stack.Screen name="SubscriptionManagement" component={require('./src/screens/SubscriptionManagementScreen').default} />
          <Stack.Screen name="ContactCustomer" component={require('./src/screens/ContactCustomerScreen').default} />
        </>
      );
    } else {
      // Profile completed and verified - check subscription status
      console.log('🚨 TRANSPORTER SUBSCRIPTION CHECK:', {
        subscriptionStatus,
        needsTrialActivation: subscriptionStatus?.needsTrialActivation,
        hasActiveSubscription: subscriptionStatus?.hasActiveSubscription,
        isTrialActive: subscriptionStatus?.isTrialActive,
        subscriptionStatusValue: subscriptionStatus?.subscriptionStatus
      });
      
      // If user has no active subscription and no trial, they need trial activation
      // Also handle case where subscriptionStatus is null/undefined (new users)
      if (subscriptionStatus?.needsTrialActivation || 
          !subscriptionStatus || 
          (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive && subscriptionStatus?.subscriptionStatus === 'none')) {
        console.log('🚨 ROUTING TRANSPORTER TO TRIAL ACTIVATION');
        initialRouteName = 'SubscriptionTrial';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionTrial"
              component={SubscriptionTrialScreen}
              initialParams={{
                userType: 'transporter',
                subscriptionStatus: subscriptionStatus
              }}
            />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive && subscriptionStatus?.subscriptionStatus === 'expired') {
        console.log('🚨 ROUTING TRANSPORTER TO EXPIRED SUBSCRIPTION');
        initialRouteName = 'SubscriptionExpired';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionExpired"
              component={SubscriptionExpiredScreen}
              initialParams={{
                userType: 'transporter',
                userId: user.uid,
                expiredDate: subscriptionStatus?.subscriptionExpiryDate || new Date().toISOString()
              }}
            />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else if (!subscriptionStatus) {
        // Fallback: if no subscription status, treat as new user needing trial
        console.log('🚨 ROUTING TRANSPORTER TO TRIAL ACTIVATION (NO SUBSCRIPTION STATUS)');
        initialRouteName = 'SubscriptionTrial';
        screens = (
          <>
            <Stack.Screen
              name="SubscriptionTrial"
              component={SubscriptionTrialScreen}
              initialParams={{
                userType: 'transporter',
                subscriptionStatus: null
              }}
            />
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
            <Stack.Screen name="SubscriptionScreen" component={require('./src/screens/SubscriptionScreen').default} />
            <Stack.Screen name="PaymentScreen" component={require('./src/screens/PaymentScreen').default} />
            <Stack.Screen name="PaymentSuccess" component={require('./src/screens/PaymentSuccessScreen').default} />
          </>
        );
      } else {
        // Profile completed, verified, and has active subscription - go to dashboard
        initialRouteName = 'TransporterTabs';
        screens = (
          <>
            <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
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
          </>
        );
      }
    }
  } else if (role === 'business') {
    console.log('📋 BUSINESS USER NAVIGATION - isVerified:', isVerified);

    if (!isVerified) {
      // Unverified business users - send to verification
      initialRouteName = 'EmailVerification';
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
          <NavigationContainer>
            <Stack.Navigator key={role || 'guest'} screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
              {screens}
            </Stack.Navigator>
          </NavigationContainer>
        </NotificationProvider>
      </ConsolidationProvider>
    </ErrorBoundary>
  );
}