import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BusinessTabNavigator from './BusinessTabNavigator';
import BusinessRequestScreen from '../screens/business/BusinessRequestScreen';
import ConsolidationScreen from '../screens/business/ConsolidationScreen';
import TrackingManagementScreen from '../screens/business/TrackingManagementScreen';
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen';

const Stack = createStackNavigator();

const BusinessStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BusinessTabs" component={BusinessTabNavigator} />
    <Stack.Screen name="BusinessRequest" component={BusinessRequestScreen} />
    <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
    <Stack.Screen name="TrackingManagement" component={TrackingManagementScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
  </Stack.Navigator>
);

export default BusinessStackNavigator;
