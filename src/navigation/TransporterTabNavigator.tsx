import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';

import { StyleSheet } from 'react-native';
import MapViewScreen from '../screens/MapViewScreen';
import TrackingScreen from '../screens/TrackingScreen';
import TransporterBookingManagementScreen from '../screens/TransporterBookingManagementScreen';
import TransporterProfileScreen from '../screens/TransporterProfileScreen';
import TransporterServiceScreen from '../screens/TransporterServiceScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransporterService" component={TransporterServiceScreen} initialParams={{ transporterType }} />
    <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
    <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
    <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
  </Stack.Navigator>
);

const ManageStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransporterBookingManagement" component={TransporterBookingManagementScreen} initialParams={{ transporterType }} />
    <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
    <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
    <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
  </Stack.Navigator>
);

const TransporterTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const transporterType = route?.params?.transporterType || 'company';
  const isCompany = transporterType === 'company';

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
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Manage') {
            return (
              <MaterialCommunityIcons
                name="clipboard-list"
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Profile') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'account' : 'account-outline'}
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
      <Tab.Screen name="Home">
        {() => <HomeStack transporterType={transporterType} />}
      </Tab.Screen>
      <Tab.Screen name="Manage">
        {() => <ManageStack transporterType={transporterType} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {props => <TransporterProfileScreen {...props} route={{ ...props.route, params: { transporterType } }} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  text: {
    fontSize: 22,
    color: colors.primaryDark,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 6,
  },
});

export default TransporterTabNavigator;
