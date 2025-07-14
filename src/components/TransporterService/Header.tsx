import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';

export default function Header({ isCompany, navigation, onShowSubscription }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 32, paddingBottom: 8, backgroundColor: colors.white,
      borderBottomWidth: 1, borderBottomColor: colors.background, paddingHorizontal: 16
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primaryDark }} numberOfLines={2}>
          {isCompany ? 'Broker/Company Dashboard' : 'Transporter Dashboard'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 6, marginRight: 8 }}
          onPress={() => navigation.navigate('TransporterBookingManagement', { transporterType: isCompany ? 'company' : 'individual' })}
        >
          <Ionicons name="clipboard-outline" size={20} color={colors.secondary} />
          <Text style={{ marginLeft: 6, fontWeight: '600', color: colors.primary }}>Manage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 6 }}
          onPress={onShowSubscription}
        >
          <Ionicons name="card-outline" size={20} color={colors.primary} />
          <Text style={{ marginLeft: 6, fontWeight: '600', color: colors.primary }}>Subscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
