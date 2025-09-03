import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen';
import BusinessRequestScreen from '../screens/business/BusinessRequestScreen';
import ConsolidationScreen from '../screens/business/ConsolidationScreen';
import TrackingManagementScreen from '../screens/business/TrackingManagementScreen';
import MapViewScreen from '../screens/MapViewScreen';
import TrackingScreen from '../screens/TrackingScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import BusinessTabNavigator from './BusinessTabNavigator';

const Stack = createStackNavigator();

const BusinessStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BusinessTabs" component={BusinessTabNavigator} />
    <Stack.Screen name="BusinessRequest" component={BusinessRequestScreen} />
    <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
    <Stack.Screen name="TrackingManagement" component={TrackingManagementScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
    <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
    <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
  </Stack.Navigator>
);

export default BusinessStackNavigator;
