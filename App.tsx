import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SignupSelectionScreen from './src/screens/auth/SignupSelectionScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import { StatusBar } from 'expo-status-bar';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';
import PhoneOTPScreen from './src/screens/auth/PhoneOTPScreen';
import DriverProfileCompletionScreen from './src/screens/auth/DriverProfileCompletionScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="dark" translucent />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="SignIn" component={LoginScreen} />
          <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="PhoneOTPScreen" component={PhoneOTPScreen} />
          <Stack.Screen
            name="DriverProfileCompletionScreen"
            component={DriverProfileCompletionScreen}
          />
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
