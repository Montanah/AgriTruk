import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox } from 'react-native';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import TransporterTabNavigator from './src/navigation/TransporterTabNavigator';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import TransporterCompletionScreen from './src/screens/auth/TransporterCompletionScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import TransporterProcessingScreen from './src/screens/TransporterProcessingScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { NotificationProvider } from './src/components/Notification/NotificationContext';
import { auth, db } from './src/firebaseConfig';

const Stack = createStackNavigator();

LogBox.ignoreLogs(['useInsertionEffect must not schedule updates']);


export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [role, setRole] = React.useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = React.useState<boolean>(false);
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
            setProfileCompleted(!!data.profileCompleted);
            console.log('Detected user role:', data.role); // DEBUG LOG
          } else {
            // Try transporters collection
            snap = await getDoc(firestoreDoc(db, 'transporters', firebaseUser.uid));
            data = snap.exists() ? snap.data() : null;
            if (data) {
              setRole('transporter');
              // Profile is completed if all required fields are present
              const completed = !!data.vehicleType && !!data.registration && !!data.profilePhoto;
              setProfileCompleted(completed);
              // Only set isVerified true if transporter is approved
              setIsVerified(data.status === 'approved');
              console.log('Detected user role: transporter'); // DEBUG LOG
            } else {
              setIsVerified(false);
              setRole(null);
              setProfileCompleted(false);
              console.log('Detected user role: null'); // DEBUG LOG
            }
          }
        } catch (e) {
          setIsVerified(false);
          setRole(null);
          setProfileCompleted(false);
          console.log('Error detecting user role:', e); // DEBUG LOG
        }
      } else {
        setIsVerified(false);
        setRole(null);
        setProfileCompleted(false);
        console.log('No user logged in'); // DEBUG LOG
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null; // Or a splash screen

  // Determine initial route and screens based on auth state
  let initialRouteName = 'Welcome';
  let screens = null;

  if (!user || (!isVerified && role !== 'transporter' && role !== 'broker')) {
    initialRouteName = 'Welcome';
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="BookingCreation" component={require('./src/screens/BookingCreationScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
        <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
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
        </>
      );
    } else {
      initialRouteName = 'BrokerTabs';
      screens = (
        <>
          <Stack.Screen name="BrokerTabs" component={require('./src/navigation/BrokerTabNavigator').default} />
          <Stack.Screen name="VerifyIdentificationDocument" component={require('./src/screens/VerifyIdentificationDocumentScreen').default} />
        </>
      );
    }
  } else if (role === 'transporter' && !profileCompleted) {
    initialRouteName = 'TransporterCompletionScreen';
    screens = (
      <>
        <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
        {/* Allow navigation for UI testing */}
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  } else if (role === 'transporter' && profileCompleted && !isVerified) {
    initialRouteName = 'TransporterProcessingScreen';
    screens = (
      <>
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
        {/* Allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  } else if (role === 'transporter' && profileCompleted && isVerified) {
    initialRouteName = 'TransporterHome';
    screens = (
      <>
        <Stack.Screen name="TransporterHome" component={require('./src/screens/TransporterHomeScreen').default} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="TransporterBookingManagement" component={require('./src/screens/TransporterBookingManagementScreen').default} />
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  } else if (role === 'business') {
    initialRouteName = 'BusinessStack';
    screens = (
      <>
        <Stack.Screen name="BusinessStack" component={require('./src/navigation/BusinessStackNavigator').default} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="BookingCreation" component={require('./src/screens/BookingCreationScreen').default} />
      </>
    );
  } else if (role === 'shipper') {
    initialRouteName = 'MainTabs';
    screens = (
      <>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="BookingCreation" component={require('./src/screens/BookingCreationScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  } else {
    initialRouteName = 'MainTabs';
    screens = (
      <>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="BookingList" component={require('./src/screens/BookingListScreen').default} />
        <Stack.Screen name="BookingCreation" component={require('./src/screens/BookingCreationScreen').default} />
        {/* Temporary: allow navigation for UI testing */}
        <Stack.Screen name="TransporterTabs" component={TransporterTabNavigator} />
      </>
    );
  }

  // Wrap the entire app in a global error boundary
  const ErrorBoundary = require('./src/components/ErrorBoundary').default;
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <StatusBar style="dark" translucent />
        <NavigationContainer>
          <Stack.Navigator key={role || 'guest'} screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
            {screens}
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationProvider>
    </ErrorBoundary>
  );
}