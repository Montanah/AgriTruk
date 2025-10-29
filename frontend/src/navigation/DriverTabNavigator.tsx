import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';

// Import driver screens
import DriverHomeScreen from '../screens/DriverHomeScreen';
import DriverJobManagementScreen from '../screens/DriverJobManagementScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import DriverSettingsScreen from '../screens/DriverSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
    <Stack.Screen name="TransporterJobDetailsScreen" component={require('../screens/TransporterJobDetailsScreen').default} />
    <Stack.Screen name="DriverTripNavigation" component={require('../screens/DriverTripNavigationScreen').default} />
    <Stack.Screen name="TripDetailsScreen" component={require('../screens/TripDetailsScreen').default} />
    <Stack.Screen name="RouteLoadsScreen" component={require('../screens/RouteLoadsScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
    <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
  </Stack.Navigator>
);

const JobStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverJobManagement" component={DriverJobManagementScreen} />
    <Stack.Screen name="TransporterJobDetailsScreen" component={require('../screens/TransporterJobDetailsScreen').default} />
    <Stack.Screen name="DriverTripNavigation" component={require('../screens/DriverTripNavigationScreen').default} />
    <Stack.Screen name="TripNavigationScreen" component={require('../screens/TripNavigationScreen').default} />
    <Stack.Screen name="TripDetailsScreen" component={require('../screens/TripDetailsScreen').default} />
    <Stack.Screen name="RouteLoadsScreen" component={require('../screens/RouteLoadsScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
    <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
    <Stack.Screen name="MapViewScreen" component={require('../screens/MapViewScreen').default} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
    <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} />
  </Stack.Navigator>
);

const DriverTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const [driverType, setDriverType] = React.useState<'company' | 'individual'>('individual');
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Check if this is a company driver - only when component is actually mounted
  React.useEffect(() => {
    const checkDriverType = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setIsInitialized(true);
          return;
        }

        // Check if user has transporter role first
        const userRole = user.displayName || '';
        if (!userRole.includes('transporter') && !userRole.includes('driver')) {
          console.log('User is not a transporter/driver, skipping driver type check');
          setIsInitialized(true);
          return;
        }

        const token = await user.getIdToken();
        const driverResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/companies/driver/${user.uid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (driverResponse.ok) {
          const driverData = await driverResponse.json();
          if (driverData.success && driverData.driver) {
            setDriverType('company');
          }
        }
      } catch (error) {
        console.log('Not a company driver, using individual driver flow');
      } finally {
        setIsInitialized(true);
      }
    };

    checkDriverType();
  }, []);

  // Don't render until we've checked the driver type
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text.secondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarShowIcon: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.family.medium,
          marginTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 0,
          height: 70 + insets.bottom,
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          marginTop: 0,
        },
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.white,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Home') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={28}
                color={color}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Jobs') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'briefcase' : 'briefcase-outline'}
                size={28}
                color={color}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Profile') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'account' : 'account-outline'}
                size={28}
                color={color}
                style={{ marginBottom: -2 }}
              />
            );
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen 
        name="Home"
        options={{
          title: 'Dashboard',
        }}
      >
        {() => <HomeStack />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Jobs"
        options={{
          title: 'My Jobs',
        }}
      >
        {() => <JobStack />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Profile"
        options={{
          title: 'My Profile',
        }}
      >
        {() => <ProfileStack />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default DriverTabNavigator;
