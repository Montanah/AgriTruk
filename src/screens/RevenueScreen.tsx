import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { apiRequest } from '../utils/api';

export default function RevenueScreen({ route }) {
  const transporterType = route?.params?.transporterType || 'company';

  if (transporterType === 'company') {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inventory, setInventory] = useState([]);
    const [revenue, setRevenue] = useState(0);
    const [outstanding, setOutstanding] = useState(0);
    const [analytics, setAnalytics] = useState({ drivers: [], jobs: [] });

    useEffect(() => {
      let mounted = true;
      setLoading(true);
      setError('');
      apiRequest('/company/revenue-overview')
        .then(data => {
          if (!mounted) return;
          setInventory(data.inventory || []);
          setRevenue(data.totalRevenue || 0);
          setOutstanding(data.outstandingPayments || 0);
          setAnalytics({
            drivers: data.topDrivers || [],
            jobs: data.frequentJobs || [],
          });
        })
        .catch(e => {
          if (mounted) setError(e.message || 'Failed to load data');
        })
        .finally(() => { if (mounted) setLoading(false); });
      return () => { mounted = false; };
    }, []);

    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 24, color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
            Loading company revenue data...
          </Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: colors.error, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Error</Text>
          <Text style={{ color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>{error}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Company/Broker Revenue</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Inventory Overview</Text>
          {inventory.length === 0 ? (
            <Text style={styles.value}>No inventory data available.</Text>
          ) : (
            inventory.map((item: any) => (
              <View key={item.id || item.name} style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.label}>{item.name}</Text>
                  <Text style={styles.value}>Quantity: {item.quantity}</Text>
                </View>
                <Text style={styles.amount}>Ksh {item.revenue?.toLocaleString() || '0'}</Text>
              </View>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Revenue</Text>
          <Text style={styles.amount}>Ksh {revenue.toLocaleString()}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outstanding Payments</Text>
          <Text style={styles.amount}>Ksh {outstanding.toLocaleString()}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <Text style={styles.label}>Top Performing Drivers</Text>
          <Text style={styles.value}>
            {analytics.drivers.length > 0 ? analytics.drivers.map((d: any) => `${d.name} (Ksh ${d.revenue?.toLocaleString() || '0'})`).join(', ') : 'N/A'}
          </Text>
          <Text style={styles.label}>Most Frequent Jobs</Text>
          <Text style={styles.value}>
            {analytics.jobs.length > 0 ? analytics.jobs.join(', ') : 'N/A'}
          </Text>
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
