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

// Initial logging test - you should see this in your terminal when the app starts
console.log('\n' + '='.repeat(100));
console.log('🚀 TRUKAPP STARTED - TERMINAL LOGGING ACTIVE');
console.log('='.repeat(100));
console.log('✅ App is starting up...');
console.log('📱 This is a React Native app - logs appear in the Metro terminal');
console.log('🔍 Look for API request logs with "================================================================================" separators');
console.log('⏰ App start timestamp:', new Date().toISOString());
console.log('='.repeat(100) + '\n');

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
    // Check subscription status from backend
    const response = await fetch(`https://agritruk-backend.onrender.com/api/subscriptions/status/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers as needed
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return {
          hasActiveSubscription: result.data.hasActiveSubscription,
          isTrialActive: result.data.isTrialActive,
          trialExpiryDate: result.data.trialExpiryDate,
          subscriptionExpiryDate: result.data.subscriptionExpiryDate,
          needsTrialActivation: result.data.needsTrialActivation,
          currentPlan: result.data.currentPlan,
          daysRemaining: result.data.daysRemaining
        };
      }
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }

  // Fallback: return default values for development
  return {
    hasActiveSubscription: false,
    isTrialActive: false,
    trialExpiryDate: null,
    subscriptionExpiryDate: null,
    needsTrialActivation: true,
    currentPlan: null,
    daysRemaining: 0
  };
};

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [role, setRole] = React.useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = React.useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Try users collection first
          let snap = await getDoc(firestoreDoc(db, 'users', firebaseUser.uid));
          let data = snap.exists() ? snap.data() : null;
          if (data) {
            setIsVerified(!!data.isVerified);
            setRole(data.role || null);

            // For transporters, check if they have a profile in transporters collection
            if (data.role === 'transporter') {
              try {
                const transporterSnap = await getDoc(firestoreDoc(db, 'transporters', firebaseUser.uid));
                const transporterData = transporterSnap.exists() ? transporterSnap.data() : null;
                if (transporterData) {
                  const isProfileComplete = checkTransporterProfileComplete(transporterData);
                  setProfileCompleted(isProfileComplete);
                  // Only set isVerified true if transporter is approved
                  setIsVerified(transporterData.status === 'approved');
                  console.log('Transporter profile found:', { isProfileComplete, status: transporterData.status });

                  // Check subscription status for approved transporters
                  if (transporterData.status === 'approved') {
                    const subStatus = await checkSubscriptionStatus(firebaseUser.uid, 'transporter');
                    setSubscriptionStatus(subStatus);
                  }
                } else {
                  // Transporter exists in users but no profile yet - this is the key case
                  setProfileCompleted(false);
                  setIsVerified(false);
                  console.log('🚨 Transporter user found but NO PROFILE in transporters collection - should go to TransporterCompletionScreen');
                }
              } catch (e) {
                setProfileCompleted(false);
                setIsVerified(false);
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
          <Stack.Screen name="Loading" component={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 16, fontSize: 16, color: colors.text.primary }}>Loading...</Text>
            </View>
          )} />
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
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
        <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
        <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
      </>
    );
  } else if (role && role !== 'transporter' && role !== 'broker' && !isVerified) {
    // Unverified non-transporter/non-broker users
    initialRouteName = 'Welcome';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
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
      if (subscriptionStatus?.needsTrialActivation) {
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
      if (subscriptionStatus?.needsTrialActivation) {
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
      } else if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive) {
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