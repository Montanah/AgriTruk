import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessHomeScreen from '../screens/business/BusinessHomeScreen';
import BusinessManageScreen from '../screens/business/BusinessManageScreen';
import BusinessProfileScreen from '../screens/business/BusinessProfileScreen';
import colors from '../constants/colors';

const Tab = createBottomTabNavigator();

const BusinessTabNavigator = () => {
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
          borderTopColor: '#222',
          shadowColor: 'transparent',
          elevation: 0,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? colors.secondary : '#fff';
          if (route.name === 'BusinessHome') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'office-building' : 'office-building-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'BusinessManage') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'briefcase-check' : 'briefcase-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'BusinessProfile') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'account-tie' : 'account-tie-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen name="BusinessHome" component={BusinessHomeScreen} />
      <Tab.Screen name="BusinessManage" component={BusinessManageScreen} />
      <Tab.Screen name="BusinessProfile" component={BusinessProfileScreen} />
    </Tab.Navigator>
  );
};

export default BusinessTabNavigator;
