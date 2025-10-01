import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    <Stack.Screen name="TripNavigationScreen" component={require('../screens/TripNavigationScreen').default} />
    <Stack.Screen name="TripDetailsScreen" component={require('../screens/TripDetailsScreen').default} />
    <Stack.Screen name="RouteLoadsScreen" component={require('../screens/RouteLoadsScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
    <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
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

  // Check if this is a company driver
  React.useEffect(() => {
    const checkDriverType = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

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
      }
    };

    checkDriverType();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
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
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? colors.secondary : colors.white;
          
          if (route.name === 'Home') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Jobs') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'briefcase' : 'briefcase-outline'}
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
