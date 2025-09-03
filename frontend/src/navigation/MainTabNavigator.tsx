import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing } from '../constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AccountScreen from '../screens/AccountScreen';

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 0,
          height: 56 + insets.bottom,
          backgroundColor: colors.primaryDark,
          borderTopWidth: 1,
          borderTopColor: '#222', // Subtle divider
          shadowColor: 'transparent',
          elevation: 0,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconColor = focused ? colors.secondary : '#fff';
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={32}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Activity') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'history' : 'history'}
                size={32}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Account') {
            return (
              <FontAwesome5
                name={focused ? 'user-alt' : 'user'}
                size={30}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen name="Home" component={ServiceRequestScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default MainTabNavigator;
