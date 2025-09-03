import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';

import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
    <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
    <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
    <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
    <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
    <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
    <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
    <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
  </Stack.Navigator>
);

const ManageStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransporterBookingManagement" component={TransporterBookingManagementScreen} initialParams={{ transporterType }} />
    <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
    <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
    <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
    <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
    <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
    <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
    <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
  </Stack.Navigator>
);

const ProfileStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransporterProfile" component={TransporterProfileScreen} initialParams={{ transporterType }} />
    <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
    <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
    <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
    <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
  </Stack.Navigator>
);

const TransporterTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const [transporterType, setTransporterType] = React.useState(route?.params?.transporterType || 'individual');
  const [loading, setLoading] = React.useState(true);
  const isCompany = transporterType === 'company';

  // Fetch transporter profile to determine type
  React.useEffect(() => {
    const fetchTransporterProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const res = await fetch(`https://agritruk-backend.onrender.com/api/transporters/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const type = data.transporter?.transporterType || 'individual';
          setTransporterType(type);
        }
      } catch (error) {
        console.error('Error fetching transporter profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransporterProfile();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        {() => <ProfileStack transporterType={transporterType} />}
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
