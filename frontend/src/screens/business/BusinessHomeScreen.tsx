import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Spacer from '../../components/common/Spacer';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';

interface BusinessData {
  name: string;
  logo?: string;
  contact: string;
  email: string;
}

interface BusinessStats {
  activeBookings: number;
  consolidations: number;
  inTransit: number;
  completed: number;
  totalSpent: string;
  mostUsedRoute: string;
}
const getStatsData = (stats: BusinessStats) => [
  {
    icon: <MaterialCommunityIcons name="clipboard-list-outline" size={28} color={colors.primary} />,
    label: 'Active Bookings',
    value: stats.activeBookings,
  },
  {
    icon: <MaterialCommunityIcons name="layers-outline" size={28} color={colors.primary} />,
    label: 'Consolidations',
    value: stats.consolidations,
  },
  {
    icon: <MaterialCommunityIcons name="truck-delivery-outline" size={28} color={colors.primary} />,
    label: 'In Transit',
    value: stats.inTransit,
  },
  {
    icon: <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.primary} />,
    label: 'Completed',
    value: stats.completed,
  },
];
const recentBookings = [
  {
    id: 'BKG-001',
    from: 'Nairobi',
    to: 'Mombasa',
    status: 'In Transit',
    date: '2024-06-10',
    type: 'Cargo',
  },
  {
    id: 'BKG-002',
    from: 'Eldoret',
    to: 'Kisumu',
    status: 'Completed',
    date: '2024-06-08',
    type: 'Agri',
  },
];


const BusinessHomeScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessData>({
    name: '',
    logo: undefined,
    contact: '',
    email: '',
  });
  const [stats, setStats] = useState<BusinessStats>({
    activeBookings: 0,
    consolidations: 0,
    inTransit: 0,
    completed: 0,
    totalSpent: 'KES 0',
    mostUsedRoute: 'N/A',
  });

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../firebaseConfig');

        // Get business profile data
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBusiness({
            name: userData.businessName || userData.name || 'Business',
            logo: userData.logo || userData.profilePhotoUrl,
            contact: userData.phone || user.phoneNumber || '',
            email: userData.email || user.email || '',
          });
        }

        // Get business statistics (mock for now, replace with real queries)
        // TODO: Implement real statistics queries
        setStats({
          activeBookings: 12,
          consolidations: 3,
          inTransit: 5,
          completed: 27,
          totalSpent: 'KES 1.2M',
          mostUsedRoute: 'Nairobi → Mombasa',
        });
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingSpinner
          visible={true}
          message="Loading Business Dashboard..."
          size="large"
          type="pulse"
          logo={true}
        />
      </View>
    );
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: Business Branding */}
          <View style={styles.headerRow}>
            <Avatar uri={business.logo} size={64} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.contact}>{business.contact}</Text>
            </View>
          </View>
          <Spacer size={18} />
          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('BusinessRequest')}>
              <MaterialCommunityIcons name="cube-send" size={28} color={colors.secondary} />
              <Text style={styles.quickActionLabel}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('BusinessManage')}>
              <MaterialCommunityIcons name="layers-outline" size={28} color={colors.secondary} />
              <Text style={styles.quickActionLabel}>Consolidate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('BusinessManage')}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={28} color={colors.secondary} />
              <Text style={styles.quickActionLabel}>Track</Text>
            </TouchableOpacity>
          </View>
          <Spacer size={18} />
          {/* Analytics Widgets */}
          <View style={styles.statsGrid}>
            {getStatsData(stats).map((stat) => (
              <Card key={stat.label} style={styles.statCard}>
                {stat.icon}
                <Spacer size={8} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            ))}
          </View>
          <Spacer size={18} />
          {/* Recent Activity */}
          <Card style={styles.activityCard}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {recentBookings.map((b) => (
              <TouchableOpacity key={b.id} style={styles.bookingRow} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingId}>{b.id}</Text>
                  <Text style={styles.bookingRoute}>{b.from} → {b.to}</Text>
                  <Text style={styles.bookingType}>{b.type}</Text>
                </View>
                <View style={styles.bookingStatusWrap}>
                  <Text style={[styles.bookingStatus, b.status === 'Completed' ? styles.statusCompleted : styles.statusInTransit]}>{b.status}</Text>
                  <Text style={styles.bookingDate}>{b.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Button
              title="View All Bookings"
              onPress={() => navigation.navigate('BusinessManage')}
              style={styles.viewAllBtn}
            />
          </Card>
          <Spacer size={18} />
          {/* Insights Widgets */}
          <View style={styles.insightsRow}>
            <Card style={styles.insightCard}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.secondary} style={{ marginBottom: 6 }} />
              <Text style={styles.insightValue}>{stats.totalSpent}</Text>
              <Text style={styles.insightLabel}>Total Spent (30d)</Text>
            </Card>
            <Card style={styles.insightCard}>
              <MaterialCommunityIcons name="map-marker-path" size={24} color={colors.secondary} style={{ marginBottom: 6 }} />
              <Text style={styles.insightValue}>{stats.mostUsedRoute}</Text>
              <Text style={styles.insightLabel}>Most Used Route</Text>
            </Card>
          </View>
          <Spacer size={18} />
          {/* Business Tips / Platform Updates */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Business Tips</Text>
            <Text style={styles.infoText}>
              Maximize your logistics efficiency: Try consolidating multiple requests for better rates, or use the "Track" tab to monitor all your shipments in real time.
            </Text>
            <Text style={styles.infoText}>
              Stay tuned for platform updates and new features designed for business clients.
            </Text>
          </Card>
          <Spacer size={40} />
          <Button
            title="Request Transport"
            onPress={() => navigation.navigate('BusinessRequest')}
            style={styles.requestBtn}
          />
        </ScrollView>
      </View>
      {/* No modal, navigation only */}
    </>
  );
};

// ...styles remain unchanged

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  avatar: {
    marginRight: 18,
  },
  greeting: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  businessName: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  contact: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    fontWeight: '600',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 22,
    backgroundColor: colors.surface,
  },
  statValue: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
    fontFamily: fonts.family.bold,
  },
  statLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    width: '100%',
    backgroundColor: colors.white,
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    fontFamily: fonts.family.bold,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  bookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  bookingRoute: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
  },
  bookingType: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    fontWeight: '500',
  },
  bookingStatusWrap: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  bookingStatus: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 2,
    textAlign: 'right',
  },
  statusCompleted: {
    backgroundColor: colors.success + '22',
    color: colors.success,
  },
  statusInTransit: {
    backgroundColor: colors.secondary + '22',
    color: colors.secondary,
  },
  bookingDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  viewAllBtn: {
    marginTop: 10,
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  insightsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  insightCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: colors.surface,
    paddingVertical: 18,
  },
  insightValue: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  insightLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 12,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
    width: '100%',
  },
  infoTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 6,
    fontFamily: fonts.family.bold,
  },
  infoText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  supportBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  requestBtn: {
    marginTop: 10,
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 16,
  },
});

export default BusinessHomeScreen;
