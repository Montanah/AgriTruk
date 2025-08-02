import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Booking } from '../mocks/bookings';
import { useAssignedJobs } from '../hooks/UseAssignedJobs';

import AssignTransporterModal from '../components/TransporterService/AssignTransporterModal';
import BookingCard from '../components/TransporterService/BookingCard';
import Header from '../components/TransporterService/Header';
import Insights from '../components/TransporterService/Insights';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';
import AvailableLoadsAlongRoute from '../components/TransporterService/AvailableLoadsAlongRoute';

type TransporterType = 'company' | 'individual' | 'broker';
type RouteParams = { params?: { transporterType?: TransporterType } };

const TransporterServiceScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const navigation = useNavigation<any>();

  const transporterType: TransporterType = route?.params?.transporterType ?? 'company';
  const isCompanyOrBroker = transporterType === 'company' || transporterType === 'broker';

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`https://agritruk-backend.onrender.com/api/transporters/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.transporter);
        }
      } catch {}
      setLoadingProfile(false);
    };
    fetchProfile();
  }, []);

  const { jobs: bookings, loading, error } = useAssignedJobs('agri');

  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);
  const [selectedTransporter, setSelectedTransporter] = useState<Booking['assignedTransporter'] | null>(null);

  const [notification, setNotification] = useState<string | null>(
    'Your subscription expires in 3 days. Renew now to avoid interruption.'
  );

  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: '6 Months',
    expires: '2024-06-30',
    active: true,
  });

  // Defensive: ensure bookings is always an array
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const instantRequests = safeBookings.filter(
    (req) => req.type === 'instant' && ['pending', 'accepted'].includes(req.status)
  );

  const handleAssign = (job: Booking) => {
    if (!isCompanyOrBroker) return;
    setSelectedJob(job);
    setShowAssignModal(true);
  };

  const handleAssignTransporter = (
    jobId: string,
    transporter: Booking['assignedTransporter']
  ) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === jobId
          ? {
              ...booking,
              assignedTransporter: transporter,
              status: 'assigned',
            }
          : booking
      )
    );
  };

  const handleAccept = async (id: string) => {
    try {
      await apiRequest(`/bookings/agri/${id}/accept`, { method: 'PATCH' });
      // Optionally refetch jobs or update state
    } catch (err) {
      console.error('Accept failed', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/bookings/agri/${id}/reject`, { method: 'PATCH' });
      // Optionally refetch jobs or update state
    } catch (err) {
      console.error('Reject failed', err);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await apiRequest(`/bookings/agri/${id}/complete`, { method: 'PATCH' });
      // Optionally refetch jobs or update state
    } catch (err) {
      console.error('Complete failed', err);
    }
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      onAccept={handleAccept}
      onReject={handleReject}
      onComplete={handleComplete}
      onAssign={isCompanyOrBroker ? handleAssign : undefined}
    />
  );

  const fleetStats = isCompanyOrBroker
    ? {
        fleetSize: 12,
        activeToday: 7,
        avgUtilizationRate: 58,
      }
    : undefined;

  // For demo, use a mock tripId. In real app, get from active trip state.
  const activeTripId = 'TRIP123';

  return (
    <View style={styles.container}>
      <FlatList
        data={instantRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No instant bookings found.</Text>
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <Header
              isCompany={isCompanyOrBroker}
              transporterType={transporterType}
              navigation={navigation}
              onShowSubscription={() => setShowSubscription(true)}
              user={{
                firstName: profile?.displayName || '',
                avatarUrl: profile?.driverProfileImage || undefined,
                // add more fields as needed
              }}
            />

            {notification && (
              <TouchableOpacity
                onPress={() => setNotification(null)}
                style={styles.notification}
                activeOpacity={0.8}
              >
                <Text style={styles.notificationText}>{notification}</Text>
              </TouchableOpacity>
            )}

            <Insights
              revenue={19850}
              recentRevenue={2650}
              currentTripRevenue={1800}
              accumulatedRevenue={38050}
              successfulTrips={27}
              completionRate={92}
              currencyCode="KES"
              fleetStats={fleetStats}
            />

            {/* Available Loads Along Route */}
            <AvailableLoadsAlongRoute tripId={activeTripId} />

            <Text style={styles.sectionTitle}>Instant Requests</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />

      {showSubscription && (
        <SubscriptionModal
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onClose={() => setShowSubscription(false)}
          onSubscribe={() => {
            setSubscriptionStatus({
              plan: selectedPlan,
              expires: '2024-12-31',
              active: true,
            });
            setNotification(null);
            setShowSubscription(false);
          }}
        />
      )}

      {showAssignModal && selectedJob && isCompanyOrBroker && (
        <AssignTransporterModal
          job={selectedJob}
          transporter={selectedTransporter}
          onAssign={handleAssignTransporter}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedJob(null);
            setSelectedTransporter(null);
          }}
        />
      )}
    </View>
  );
};

export default TransporterServiceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerWrapper: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1F2937',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
  footerSpacer: {
    height: 72,
  },
  notification: {
    marginTop: 12,
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderColor: '#FFEEBA',
    borderWidth: 1,
    marginBottom: 16,
  },
  notificationText: {
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 14,
  },
});
