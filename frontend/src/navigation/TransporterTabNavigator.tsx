import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapViewScreen from '../screens/MapViewScreen';
import TrackingScreen from '../screens/TrackingScreen';
import TransporterBookingManagementScreen from '../screens/TransporterBookingManagementScreen';
import TransporterProfileScreen from '../screens/TransporterProfileScreen';
import TransporterServiceScreen from '../screens/TransporterServiceScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import JobManagementScreen from '../screens/JobManagementScreen';
import RouteLoadsScreen from '../screens/RouteLoadsScreen';
import AllAvailableJobsScreen from '../screens/AllAvailableJobsScreen';
import ShipmentManagementScreen from '../screens/ShipmentManagementScreen';
import VehicleManagementScreen from '../screens/VehicleManagementScreen';
import DriverManagementScreen from '../screens/DriverManagementScreen';
import CompanyDashboardScreen from '../screens/CompanyDashboardScreen';
import DriverJobManagementScreen from '../screens/DriverJobManagementScreen';
import FleetManagementScreen from '../screens/FleetManagementScreen';
import DriverAssignmentsScreen from '../screens/DriverAssignmentsScreen';
import FleetAnalyticsScreen from '../screens/FleetAnalyticsScreen';
import FleetReportsScreen from '../screens/FleetReportsScreen';
import FleetMaintenanceScreen from '../screens/FleetMaintenanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {transporterType === 'company' ? (
      // Company-specific screens
      <>
        <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
        <Stack.Screen name="VehicleManagement" component={VehicleManagementScreen} />
        <Stack.Screen name="DriverManagement" component={DriverManagementScreen} />
        <Stack.Screen name="DriverJobManagement" component={DriverJobManagementScreen} />
        <Stack.Screen name="DriverAssignments" component={DriverAssignmentsScreen} />
        <Stack.Screen name="FleetAnalytics" component={FleetAnalyticsScreen} />
        <Stack.Screen name="FleetReports" component={FleetReportsScreen} />
        <Stack.Screen name="FleetMaintenance" component={FleetMaintenanceScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
        <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
        <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
        <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
        <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
        <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
        <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
        <Stack.Screen name="ShipmentManagementScreen" component={ShipmentManagementScreen} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
        <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      </>
    ) : (
      // Individual transporter screens
      <>
        <Stack.Screen name="TransporterService" component={TransporterServiceScreen} initialParams={{ transporterType }} />
        <Stack.Screen name="JobManagementScreen" component={JobManagementScreen} />
        <Stack.Screen name="AllAvailableJobsScreen" component={AllAvailableJobsScreen} />
        <Stack.Screen name="RouteLoadsScreen" component={RouteLoadsScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
        <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
        <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
        <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
        <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
        <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
        <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
        <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
        <Stack.Screen name="ShipmentManagementScreen" component={ShipmentManagementScreen} />
      </>
    )}
  </Stack.Navigator>
);

const ManageStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={transporterType === 'company' ? 'FleetManagement' : 'JobManagement'}>
    {transporterType === 'company' ? (
      // Company fleet management screens
      <>
        <Stack.Screen name="FleetManagement" component={FleetManagementScreen} />
        <Stack.Screen name="VehicleManagement" component={VehicleManagementScreen} />
        <Stack.Screen name="DriverManagement" component={DriverManagementScreen} />
        <Stack.Screen name="DriverJobManagement" component={DriverJobManagementScreen} />
        <Stack.Screen name="DriverAssignments" component={DriverAssignmentsScreen} />
        <Stack.Screen name="FleetAnalytics" component={FleetAnalyticsScreen} />
        <Stack.Screen name="FleetReports" component={FleetReportsScreen} />
        <Stack.Screen name="FleetMaintenance" component={FleetMaintenanceScreen} />
        <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
        <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
        <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
        <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
        <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
        <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
        <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
        <Stack.Screen name="ShipmentManagementScreen" component={ShipmentManagementScreen} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
        <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      </>
    ) : (
      // Individual transporter management screens - job management
      <>
        <Stack.Screen name="JobManagement" component={JobManagementScreen} initialParams={{ transporterType }} />
        <Stack.Screen name="TransporterBookingManagement" component={TransporterBookingManagementScreen} initialParams={{ transporterType }} />
        <Stack.Screen name="TransporterJobDetailsScreen" component={require('../screens/TransporterJobDetailsScreen').default} />
        <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
        <Stack.Screen name="TripDetailsScreen" component={TripDetailsScreen} />
        <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
        <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
        <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
        <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
        <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
        <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
        <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
        <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
        <Stack.Screen name="ShipmentManagementScreen" component={ShipmentManagementScreen} />
      </>
    )}
  </Stack.Navigator>
);

const ProfileStack = ({ transporterType }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="TransporterProfile">
    <Stack.Screen name="TransporterProfile" component={TransporterProfileScreen} initialParams={{ transporterType }} />
    <Stack.Screen name="TransporterCompletionScreen" component={require('../screens/auth/TransporterCompletionScreen').default} />
    <Stack.Screen name="PaymentScreen" component={require('../screens/PaymentScreen').default} />
    <Stack.Screen name="PaymentSuccess" component={require('../screens/PaymentSuccessScreen').default} />
    <Stack.Screen name="SubscriptionManagement" component={require('../screens/SubscriptionManagementScreen').default} />
    <Stack.Screen name="SubscriptionPlans" component={require('../screens/SubscriptionPlansScreen').default} />
    <Stack.Screen name="ContactCustomer" component={require('../screens/ContactCustomerScreen').default} />
    <Stack.Screen name="ChatScreen" component={require('../screens/ChatScreen').default} />
    <Stack.Screen name="ShipmentManagementScreen" component={ShipmentManagementScreen} />
    <Stack.Screen name="VehicleManagement" component={VehicleManagementScreen} />
    <Stack.Screen name="DriverManagement" component={DriverManagementScreen} />
    <Stack.Screen name="DriverAssignments" component={DriverAssignmentsScreen} />
    <Stack.Screen name="FleetAnalytics" component={FleetAnalyticsScreen} />
    <Stack.Screen name="FleetReports" component={FleetReportsScreen} />
    <Stack.Screen name="FleetMaintenance" component={FleetMaintenanceScreen} />
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
        
        // First try to fetch company data (companies collection)
        const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData && companyData.length > 0) {
            // This is a company transporter - they are in companies collection
            // but should be treated as transporters with type 'company'
            setTransporterType('company');
            setLoading(false);
            return;
          }
        }

        // If not a company, fetch from transporters collection
        const transporterRes = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (transporterRes.ok) {
          const data = await transporterRes.json();
          // Individual transporters are in transporters collection
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
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.family.medium,
          marginTop: 4,
        },
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.white,
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
            if (transporterType === 'company') {
              return (
                <MaterialCommunityIcons
                  name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
                  size={28}
                  color={iconColor}
                  style={{ marginBottom: -2 }}
                />
              );
            } else {
              return (
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={28}
                  color={iconColor}
                  style={{ marginBottom: -2 }}
                />
              );
            }
          } else if (route.name === 'Fleet') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'truck' : 'truck-outline'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Manage') {
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
          title: transporterType === 'company' ? 'Dashboard' : 'Home',
        }}
      >
        {() => <HomeStack transporterType={transporterType} />}
      </Tab.Screen>
      
      {transporterType === 'company' ? (
        <Tab.Screen 
          name="Fleet"
          options={{
            title: 'Fleet',
          }}
        >
          {() => <ManageStack transporterType={transporterType} />}
        </Tab.Screen>
      ) : (
        <Tab.Screen 
          name="Manage"
          options={{
            title: 'Manage',
          }}
        >
          {() => <ManageStack transporterType={transporterType} />}
        </Tab.Screen>
      )}
      
      <Tab.Screen 
        name="Profile"
        options={{
          title: 'Profile',
        }}
      >
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