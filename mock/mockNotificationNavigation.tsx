// /mock/mockNotificationNavigation.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationCenterScreen from '../src/screens/NotificationCenterScreen';
import ManageTransporterScreen from '../src/screens/ManageTransporterScreen';

let mockNotifications: any[] = [];
try {
  // @ts-ignore
  mockNotifications = (typeof window !== 'undefined' && window.mockNotifications) ? window.mockNotifications : require('./mockNotifications').mockNotifications;
} catch (e) {}

const Stack = createStackNavigator();

// Mock current user
const currentUser = { id: 'D001', role: 'driver' };

export default function AppNavigator() {
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    // Count unread notifications for this user
    const count = mockNotifications.filter(n => (n.to === currentUser.id || n.audience === currentUser.role) && !n.read).length;
    setUnread(count);
  }, [mockNotifications.length]);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ManageTransporter"
          options={({ navigation }) => ({
            title: 'Transporter',
            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 18 }}
                onPress={() => navigation.navigate('Notifications', {
                  userId: currentUser.id,
                  role: currentUser.role,
                  onReadAll: () => setUnread(0),
                })}
              >
                <View>
                  <Ionicons name="notifications-outline" size={24} color="#333" />
                  {unread > 0 && (
                    <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: 'red', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ),
          })}
        >
          {props => <ManageTransporterScreen {...props} />}
        </Stack.Screen>
        <Stack.Screen
          name="Notifications"
          options={{ title: 'Notifications' }}
        >
          {props => <NotificationCenterScreen {...props.route.params} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
