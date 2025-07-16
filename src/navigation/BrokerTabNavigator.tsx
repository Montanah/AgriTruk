import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import BrokerNetworkScreen from '../screens/BrokerNetworkScreen';
import BrokerRequestsScreen from '../screens/BrokerRequestsScreen';
import BrokerProfileScreen from '../screens/BrokerProfileScreen';
import colors from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function BrokerTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.white,
        tabBarLabelStyle: {
          fontWeight: 'bold',
          fontSize: 13,
          marginBottom: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 0,
          height: 56 + insets.bottom,
          backgroundColor: colors.primaryDark,
          borderTopWidth: 1,
          borderTopColor: '#222',
          shadowColor: 'transparent',
          elevation: 0,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Network') {
            return <FontAwesome5 name="users" size={22} color={color} style={{ marginBottom: -2 }} />;
          } else if (route.name === 'Requests') {
            return <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={color} style={{ marginBottom: -2 }} />;
          } else if (route.name === 'Profile') {
            return <Ionicons name="person-circle-outline" size={26} color={color} style={{ marginBottom: -2 }} />;
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen name="Network" component={BrokerNetworkScreen} />
      <Tab.Screen name="Requests" component={BrokerRequestsScreen} />
      <Tab.Screen name="Profile" component={BrokerProfileScreen} />
    </Tab.Navigator>
  );
}
