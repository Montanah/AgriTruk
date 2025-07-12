import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import TransporterCompletionScreen from './src/screens/auth/TransporterCompletionScreen';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import TransporterProcessingScreen from './src/screens/TransporterProcessingScreen';
import TransporterServiceScreen from './src/screens/TransporterServiceScreen';
import TransporterTabNavigator from './src/navigation/TransporterTabNavigator';

import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './src/firebaseConfig';
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';

const Stack = createStackNavigator();

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
            } else {
              setIsVerified(false);
              setRole(null);
              setProfileCompleted(false);
            }
          }
        } catch {
          setIsVerified(false);
          setRole(null);
          setProfileCompleted(false);
        }
      } else {
        setIsVerified(false);
        setRole(null);
        setProfileCompleted(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null; // Or a splash screen

  // Determine initial route and screens based on auth state
  let initialRouteName = 'Welcome';
  let screens = null;

  if (!user || (!isVerified && role !== 'transporter')) {
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
  } else if (role === 'transporter' && !profileCompleted) {
    initialRouteName = 'TransporterCompletionScreen';
    screens = (
      <>
        <Stack.Screen name="TransporterCompletionScreen" component={TransporterCompletionScreen} />
      </>
    );
  } else if (role === 'transporter' && profileCompleted && !isVerified) {
    initialRouteName = 'TransporterProcessingScreen';
    screens = (
      <>
        <Stack.Screen name="TransporterProcessingScreen" component={TransporterProcessingScreen} />
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
      </>
    );
  } else {
    initialRouteName = 'MainTabs';
    screens = (
      <>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" translucent />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
          {screens}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
