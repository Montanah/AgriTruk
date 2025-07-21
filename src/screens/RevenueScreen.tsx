import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import revenueCompanyMock from '../../mock/revenueCompanyMock';
import colors from '../constants/colors';

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
      // Use mock data for UI
      setTimeout(() => {
        if (!mounted) return;
        setInventory(revenueCompanyMock.inventory || []);
        setRevenue(revenueCompanyMock.totalRevenue || 0);
        setOutstanding(revenueCompanyMock.outstandingPayments || 0);
        setAnalytics({
          drivers: revenueCompanyMock.topDrivers || [],
          jobs: revenueCompanyMock.frequentJobs || [],
        });
        setLoading(false);
      }, 800); // Simulate network delay
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
        <Text style={styles.title}>Company Revenue</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Revenue Collected</Text>
          <Text style={styles.amount}>Ksh {revenue.toLocaleString()}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outstanding Payments</Text>
          <Text style={styles.amount}>Ksh {outstanding.toLocaleString()}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Performance</Text>
          {inventory.length === 0 ? (
            <Text style={styles.value}>No vehicle data available.</Text>
          ) : (
            inventory.map((item: any) => (
              <View key={item.id || item.name} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.label}>{item.name}</Text>
                    <Text style={styles.value}>Trips: {item.trips || 0}</Text>
                  </View>
                  <Text style={styles.amount}>Ksh {item.revenue?.toLocaleString() || '0'}</Text>
                </View>
                {/* Performance Bar */}
                <View style={{ height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, marginTop: 6, marginBottom: 2 }}>
                  <View style={{
                    width: `${Math.min(100, Math.round((item.revenue / (revenue || 1)) * 100))}%`,
                    height: 8,
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                  }} />
                </View>
              </View>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <Text style={styles.label}>Top Performing Vehicles</Text>
          <Text style={styles.value}>
            {inventory.length > 0
              ? inventory
                .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
                .slice(0, 3)
                .map((v: any) => `${v.name} (Ksh ${v.revenue?.toLocaleString() || '0'})`)
                .join(', ')
              : 'N/A'}
          </Text>
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
