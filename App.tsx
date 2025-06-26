import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import DriverProfileCompletionScreen from './src/screens/auth/DriverProfileCompletionScreen';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './src/firebaseConfig';
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(firestoreDoc(db, 'users', firebaseUser.uid));
          setIsVerified(snap.exists() && snap.data().isVerified);
        } catch {
          setIsVerified(false);
        }
      } else {
        setIsVerified(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null; // Or a splash screen

  return (
    <>
      <StatusBar style="dark" translucent />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user || !isVerified ? (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="SignIn" component={LoginScreen} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
              <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
              <Stack.Screen name="DriverProfileCompletionScreen" component={DriverProfileCompletionScreen} />
              <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
