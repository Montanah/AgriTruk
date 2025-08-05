import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../../components/common/Card';
import Spacer from '../../components/common/Spacer';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';

const BusinessManageScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Logistics</Text>
      <Card style={styles.actionCard}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BusinessRequest')}>
          <MaterialCommunityIcons name="cube-send" size={28} color={colors.secondary} style={styles.actionIcon} />
          <View>
            <Text style={styles.actionTitle}>Request Transport</Text>
            <Text style={styles.actionDesc}>Place instant, booking, or bulk requests</Text>
          </View>
        </TouchableOpacity>
        <Spacer size={16} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Consolidation')}>
          <FontAwesome5 name="layer-group" size={26} color={colors.primary} style={styles.actionIcon} />
          <View>
            <Text style={styles.actionTitle}>Consolidate Shipments</Text>
            <Text style={styles.actionDesc}>Combine multiple shipments for efficiency</Text>
          </View>
        </TouchableOpacity>
        <Spacer size={16} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TrackingManagement')}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={28} color={colors.primary} style={styles.actionIcon} />
          <View>
            <Text style={styles.actionTitle}>Track & Manage</Text>
            <Text style={styles.actionDesc}>View and manage all your shipments</Text>
          </View>
        </TouchableOpacity>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    alignSelf: 'flex-start',
    marginBottom: 18,
    fontFamily: fonts.family.bold,
  },
  actionCard: {
    width: '100%',
    alignItems: 'stretch',
    paddingVertical: 18,
    backgroundColor: colors.surface,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    marginRight: 18,
  },
  actionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  actionDesc: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

export default BusinessManageScreen;
