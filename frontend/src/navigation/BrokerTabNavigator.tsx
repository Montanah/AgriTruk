import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import BrokerHomeScreen from '../screens/BrokerHomeScreen';
import BrokerManagementScreen from '../screens/BrokerManagementScreen';
import BrokerProfileScreen from '../screens/BrokerProfileScreen';
import BrokerRequestScreen from '../screens/BrokerRequestScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import TrackingScreen from '../screens/TrackingScreen';
import MapViewScreen from '../screens/MapViewScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const subscriptionStatus = route.params?.subscriptionStatus;

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
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Home') {
            return <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={28} color={color} style={{ marginBottom: -2 }} />;
          } else if (route.name === 'Management') {
            return <MaterialCommunityIcons name={focused ? 'clipboard-list' : 'clipboard-list-outline'} size={28} color={color} style={{ marginBottom: -2 }} />;
          } else if (route.name === 'Profile') {
            return <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={28} color={color} style={{ marginBottom: -2 }} />;
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen
        name="Home"
        component={BrokerHomeScreen}
        initialParams={{ subscriptionStatus }}
      />
      <Tab.Screen name="Management" component={BrokerManagementScreen} initialParams={{ activeTab: 'requests' }} />
      <Tab.Screen name="Profile" component={BrokerProfileScreen} />
    </Tab.Navigator>
  );
};

export default function BrokerTabNavigator({ route }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} initialParams={route.params} />
      <Stack.Screen name="BrokerRequestScreen" component={BrokerRequestScreen} />
      <Stack.Screen name="BrokerManagementScreen" component={BrokerManagementScreen} />
      <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
      <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
      <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      <Stack.Screen name="SubscriptionScreen" component={require('../screens/SubscriptionScreen').default} />
      <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
      <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
      <Stack.Screen name="PaymentConfirmation" component={require('../screens/PaymentConfirmationScreen').default} />
      <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
      <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
      <Stack.Screen name="SubscriptionTrial" component={require('../screens/SubscriptionTrialScreen').default} />
      <Stack.Screen name="SubscriptionExpired" component={require('../screens/SubscriptionExpiredScreen').default} />
      <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
      <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
    </Stack.Navigator>
  );
}
