import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function RevenueScreen({ route }) {
  const transporterType = route?.params?.transporterType || 'company';

  if (transporterType === 'company') {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Company/Broker Revenue</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Revenue</Text>
          <Text style={styles.amount}>Ksh 1,200,000</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outstanding Payments</Text>
          <Text style={styles.amount}>Ksh 200,000</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <Text style={styles.label}>Top Performing Drivers</Text>
          <Text style={styles.value}>John Doe (Ksh 400,000), Jane Smith (Ksh 350,000)</Text>
          <Text style={styles.label}>Most Frequent Jobs</Text>
          <Text style={styles.value}>Depot X → Market Z, Farm Y → Shop Q</Text>
        </View>
      </ScrollView>
    );
  } else {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Individual Revenue</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Earnings</Text>
          <Text style={styles.amount}>Ksh 120,000</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last Payment</Text>
          <Text style={styles.value}>Ksh 10,000 on 2024-06-10</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <Text style={styles.value}>Farm Z → Market Q (Ksh 8,000)</Text>
          <Text style={styles.value}>Depot A → Shop B (Ksh 12,000)</Text>
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
  amount: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  label: { fontSize: 15, color: colors.text.secondary, marginTop: 6 },
  value: { fontSize: 15, color: colors.text.primary, marginBottom: 2 },
});
