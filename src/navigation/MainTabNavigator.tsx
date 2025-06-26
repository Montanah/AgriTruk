import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const HomeScreen = () => (
  <View style={styles.screen}>
    <Text>Home</Text>
  </View>
);
const ActivityScreen = () => (
  <View style={styles.screen}>
    <Text>Activity</Text>
  </View>
);
const AccountScreen = () => (
  <View style={styles.screen}>
    <Text>Account</Text>
  </View>
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 10,
          borderRadius: 24,
          height: 64,
          backgroundColor: colors.white,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 12,
          borderTopWidth: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={28}
                color={focused ? colors.primary : colors.text.light}
              />
            );
          } else if (route.name === 'Activity') {
            return (
              <MaterialCommunityIcons
                name={focused ? 'history' : 'history'}
                size={28}
                color={focused ? colors.secondary : colors.text.light}
              />
            );
          } else if (route.name === 'Account') {
            return (
              <FontAwesome5
                name={focused ? 'user-alt' : 'user'}
                size={26}
                color={focused ? colors.tertiary : colors.text.light}
              />
            );
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
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
