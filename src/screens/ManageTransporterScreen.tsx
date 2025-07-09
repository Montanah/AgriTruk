import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function ManageTransporterScreen({ route }) {
  const transporterType = route?.params?.transporterType || 'company';

  if (transporterType === 'company') {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Manage Vehicles, Drivers, Assignments</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicles</Text>
          <TouchableOpacity style={styles.actionBtn}><Ionicons name="add-circle" size={20} color={colors.primary} /><Text style={styles.actionText}>Add Vehicle</Text></TouchableOpacity>
          <Text style={styles.value}>- KDA 123A (Truck)</Text>
          <Text style={styles.value}>- KDB 456B (Van)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Drivers</Text>
          <TouchableOpacity style={styles.actionBtn}><Ionicons name="add-circle" size={20} color={colors.primary} /><Text style={styles.actionText}>Add Driver</Text></TouchableOpacity>
          <Text style={styles.value}>- John Doe</Text>
          <Text style={styles.value}>- Jane Smith</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assignments</Text>
          <Text style={styles.value}>Depot X → Market Z: John Doe</Text>
          <Text style={styles.value}>Farm Y → Shop Q: Jane Smith</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outsourcing</Text>
          <Text style={styles.value}>You can outsource jobs to other registered transporters.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Company Profile</Text>
          <TouchableOpacity style={styles.actionBtn}><MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} /><Text style={styles.actionText}>Edit Profile</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  } else {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Manage My Vehicle & Profile</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <TouchableOpacity style={styles.actionBtn}><Ionicons name="create-outline" size={20} color={colors.primary} /><Text style={styles.actionText}>Edit Vehicle</Text></TouchableOpacity>
          <Text style={styles.value}>KDA 123A (Truck)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity style={styles.actionBtn}><MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} /><Text style={styles.actionText}>Edit Profile</Text></TouchableOpacity>
          <Text style={styles.value}>Name: John Doe</Text>
          <Text style={styles.value}>Phone: +254700111222</Text>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  container: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 18, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  value: { fontSize: 15, color: colors.text.primary, marginBottom: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  actionText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
});
