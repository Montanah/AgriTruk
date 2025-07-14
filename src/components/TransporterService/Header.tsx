import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';

type HeaderProps = {
  isCompany: boolean;
  transporterType: 'company' | 'individual' | 'broker';
  navigation: any;
  onShowSubscription: () => void;
  user: {
    firstName: string;
    avatarUrl?: string;
  };
};

export default function Header({
  isCompany,
  transporterType,
  navigation,
  onShowSubscription,
  user,
}: HeaderProps) {
  const getDashboardTitle = () => {
    switch (transporterType) {
      case 'company':
        return 'Company Dashboard';
      case 'broker':
        return 'Broker Dashboard';
      default:
        return 'Transporter Dashboard';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.welcomeText}>Hi, {user.firstName}</Text>
          <Text style={styles.title}>{getDashboardTitle()}</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() =>
            navigation.navigate('TransporterBookingManagement', {
              transporterType,
            })
          }
        >
          <Ionicons name="clipboard-outline" size={18} color={colors.secondary} />
          <Text style={styles.tabText}>Manage Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={onShowSubscription}>
          <Ionicons name="card-outline" size={18} color={colors.primary} />
          <Text style={styles.tabText}>Subscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '600',
    color: colors.primary,
  },
});
