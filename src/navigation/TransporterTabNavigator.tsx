import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import TransporterServiceScreen from '../screens/TransporterServiceScreen';
import RevenueScreen from '../screens/RevenueScreen';
import ManageTransporterScreen from '../screens/ManageTransporterScreen';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

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
        tabBarIcon: ({ focused, color, size }) => {
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
          } else if (route.name === 'Revenue') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'cash-multiple' : 'cash-multiple'}
                size={28}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          } else if (route.name === 'Manage') {
            return (
              <FontAwesome5
                name={isCompany ? 'users-cog' : 'truck'}
                size={26}
                color={iconColor}
                style={{ marginBottom: -2 }}
              />
            );
          }
        },
        safeAreaInsets: { bottom: 0 },
      })}
    >
      <Tab.Screen name="Home" options={{
        tabBarLabel: 'Home',
      }}
        initialParams={{ transporterType }}
      >
        {(props) => <TransporterServiceScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen name="Revenue" options={{
        tabBarLabel: 'Revenue',
      }}>
        {props => <RevenueScreen {...props} route={{...props.route, params: {transporterType}}} />}
      </Tab.Screen>
      <Tab.Screen name="Manage" options={{
        tabBarLabel: 'Manage',
      }}>
        {props => <ManageTransporterScreen {...props} route={{...props.route, params: {transporterType}}} />}
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
