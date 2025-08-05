import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BusinessTabNavigator from './BusinessTabNavigator';
import BusinessRequestScreen from '../screens/business/BusinessRequestScreen';

const Stack = createStackNavigator();

const BusinessStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BusinessTabs" component={BusinessTabNavigator} />
    <Stack.Screen name="BusinessRequest" component={BusinessRequestScreen} />
  </Stack.Navigator>
);

export default BusinessStackNavigator;
