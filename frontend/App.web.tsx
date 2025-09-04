import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox, Platform, View, Text, StyleSheet } from 'react-native';
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
import { auth, db } from './src/firebaseConfig';

const Stack = createStackNavigator();

// Ignore specific warnings for web
LogBox.ignoreLogs([
  'useInsertionEffect must not schedule updates',
  'requireNativeComponent',
  'react-native-maps',
]);

// Web-specific logging
console.log('\n' + '='.repeat(100));
console.log('🚀 TRUKAPP WEB VERSION STARTED');
console.log('='.repeat(100));
console.log('✅ Web app is starting up...');
console.log('🌐 This is the web version - some features may be limited');
console.log('📱 For full functionality, use the mobile app version');
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
    'vehicleRegistration',
    'vehicleInsurance',
    'vehicleInspection',
  ];

  // Required fields for company transporters
  const companyRequiredFields = [
    'companyName',
    'companyRegistration',
    'companyLicense',
    'fleetSize',
  ];

  // Check if it's a company transporter
  const isCompany = transporterData.transporterType === 'company';

  const requiredFields = isCompany ? companyRequiredFields : individualRequiredFields;

  return requiredFields.every(field => {
    const value = transporterData[field];
    return value !== null && value !== undefined && value !== '';
  });
};

// Helper function to check if business profile is complete
const checkBusinessProfileComplete = (businessData: any) => {
  if (!businessData) return false;

  const requiredFields = [
    'businessName',
    'businessType',
    'businessRegistration',
    'businessLicense',
    'contactPerson',
    'contactEmail',
    'contactPhone',
    'businessAddress',
  ];

  return requiredFields.every(field => {
    const value = businessData[field];
    return value !== null && value !== undefined && value !== '';
  });
};

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [navigationState, setNavigationState] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Get user profile from Firestore
          const userDoc = await getDoc(firestoreDoc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            
            // Determine navigation state based on user profile
            const isVerified = userData.emailVerified || userData.phoneVerified;
            const role = userData.role || 'shipper';
            const roleType = userData.roleType || 'string';
            const subscriptionStatus = userData.subscriptionStatus;
            
            // Check if profile is complete based on role
            let profileCompleted = false;
            if (role === 'transporter') {
              profileCompleted = checkTransporterProfileComplete(userData);
            } else if (role === 'business') {
              profileCompleted = checkBusinessProfileComplete(userData);
            } else {
              // For shippers, check basic profile completion
              profileCompleted = userData.firstName && userData.lastName && userData.phone;
            }
            
            const navState = {
              isVerified,
              profileCompleted,
              role,
              roleType,
              subscriptionStatus,
              user: true,
              userId: user.uid,
            };
            
            setNavigationState(navState);
            console.log('🔍 Navigation state:', navState);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
        setNavigationState(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #007AFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <h2 style={{ margin: '0 0 0.5rem', color: '#333' }}>Loading TRUKAPP</h2>
          <p style={{ margin: '0', color: '#666' }}>Please wait while we set up your experience...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <ConsolidationProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              // Not authenticated
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
                <Stack.Screen name="PhoneOTP" component={PhoneOTPScreen} />
                <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
              </>
            ) : !navigationState?.isVerified ? (
              // Not verified
              <>
                <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                <Stack.Screen name="PhoneOTP" component={PhoneOTPScreen} />
              </>
            ) : !navigationState?.profileCompleted ? (
              // Profile not complete
              <>
                {navigationState?.role === 'transporter' && (
                  <Stack.Screen name="TransporterCompletion" component={TransporterCompletionScreen} />
                )}
                {navigationState?.role === 'business' && (
                  <Stack.Screen name="BusinessCompletion" component={TransporterCompletionScreen} />
                )}
              </>
            ) : navigationState?.role === 'transporter' ? (
              // Transporter flow
              <>
                <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
                <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
                <Stack.Screen name="TransporterProcessing" component={TransporterProcessingScreen} />
              </>
            ) : navigationState?.role === 'business' ? (
              // Business flow
              <>
                <Stack.Screen name="BusinessTabs" component={BusinessStackNavigator} />
                <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
                <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
              </>
            ) : (
              // Default shipper flow
              <>
                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
                <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
                <Stack.Screen name="SubscriptionTrial" component={SubscriptionTrialScreen} />
                <Stack.Screen name="SubscriptionExpired" component={SubscriptionExpiredScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ConsolidationProvider>
    </NotificationProvider>
  );
}
