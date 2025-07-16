import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import BrokerNetworkScreen from '../screens/BrokerNetworkScreen';
import BrokerRequestsScreen from '../screens/BrokerRequestsScreen';
import BrokerProfileScreen from '../screens/BrokerProfileScreen';
import colors from '../constants/colors';

const Tab = createBottomTabNavigator();

export default function BrokerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: {
          backgroundColor: colors.primaryDark,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
          fontSize: 13,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Network') {
            return <FontAwesome5 name="users" size={22} color={color} />;
          } else if (route.name === 'Requests') {
            return <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={color} />;
          } else if (route.name === 'Profile') {
            return <Ionicons name="person-circle-outline" size={26} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Network" component={BrokerNetworkScreen} />
      <Tab.Screen name="Requests" component={BrokerRequestsScreen} />
      <Tab.Screen name="Profile" component={BrokerProfileScreen} />
    </Tab.Navigator>
  );
}
