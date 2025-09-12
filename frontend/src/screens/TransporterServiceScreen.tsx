import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useAssignedJobs } from '../hooks/UseAssignedJobs';
import { API_ENDPOINTS } from '../constants/api';

import AssignTransporterModal from '../components/TransporterService/AssignTransporterModal';
import Header from '../components/TransporterService/Header';
import IncomingRequestsCard from '../components/TransporterService/IncomingRequestsCard';
import Insights from '../components/TransporterService/Insights';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';

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
        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.transporter);
        } else if (res.status === 404) {
          // Profile doesn't exist yet, redirect to profile completion
          navigation.navigate('TransporterCompletionScreen');
        }
      } catch { }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, []);

  const { jobs: bookings, loading, error } = useAssignedJobs('agri');

  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState(null);

  const [notification, setNotification] = useState<string | null>(
    'Your subscription expires in 3 days. Renew now to avoid interruption.'
  );

  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: '6 Months',
    expires: '2024-06-30',
    active: true,
  });

  const handleAssignTransporter = (jobId: string, transporter: any) => {
    // Handle transporter assignment logic here
    console.log('Assigning transporter:', transporter, 'to job:', jobId);
  };

  // Enhanced stats for different transporter types
  const getStats = () => {
    if (isCompanyOrBroker) {
      return {
        fleetSize: 12,
        activeToday: 7,
        avgUtilizationRate: 58,
        totalRevenue: 198500,
        monthlyRevenue: 45600,
        weeklyRevenue: 12500,
        totalTrips: 342,
        completedTrips: 315,
        cancelledTrips: 12,
        pendingTrips: 15,
        avgRating: 4.7,
        totalReviews: 289,
        netProfit: 29500,
      };
    } else {
      return {
        totalRevenue: 98500,
        monthlyRevenue: 23400,
        weeklyRevenue: 6800,
        totalTrips: 156,
        completedTrips: 142,
        cancelledTrips: 8,
        pendingTrips: 6,
        avgRating: 4.8,
        totalReviews: 134,
        netEarnings: 58500,
        onTimeDelivery: 89,
      };
    }
  };

  const stats = getStats();
  const fleetStats = isCompanyOrBroker
    ? {
      fleetSize: stats.fleetSize || 0,
      activeToday: stats.activeToday || 0,
      avgUtilizationRate: stats.avgUtilizationRate || 0,
    }
    : undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.listContent}>
        <Header
          isCompany={isCompanyOrBroker}
          transporterType={transporterType}
          navigation={navigation}
          onShowSubscription={() => setShowSubscription(true)}
          user={{
            firstName: (profile as any)?.displayName || '',
            avatarUrl: (profile as any)?.driverProfileImage || undefined,
            // add more fields as needed
          }}
        />

        {/* Notification */}
        {notification && (
          <TouchableOpacity
            onPress={() => navigation.navigate('TransporterCompletionScreen')}
            style={styles.notification}
            activeOpacity={0.8}
          >
            <Text style={styles.notificationText}>{notification}</Text>
          </TouchableOpacity>
        )}

        <Insights
          revenue={stats.totalRevenue}
          recentRevenue={stats.weeklyRevenue}
          currentTripRevenue={1800}
          accumulatedRevenue={stats.monthlyRevenue}
          successfulTrips={stats.completedTrips}
          completionRate={Math.round((stats.completedTrips / stats.totalTrips) * 100)}
          currencyCode="KES"
          fleetStats={fleetStats}
        />

        {/* Latest Requests */}
        <IncomingRequestsCard
          onRequestAccepted={(request) => {
            console.log('Request accepted:', request.id);
            // Handle request acceptance
          }}
          onRequestRejected={(request) => {
            console.log('Request rejected:', request.id);
            // Handle request rejection
          }}
          onViewAll={() => {
            // Navigate to the Manage tab
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('Manage');
            }
          }}
        />
      </View>

      {showSubscription && (
        <SubscriptionModal
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onClose={() => setShowSubscription(false)}
          onSubscribe={(planData: any) => {
            // Navigate directly to PaymentScreen within the current stack
            navigation.navigate('PaymentScreen', {
              plan: planData,
              userType: 'transporter',
              billingPeriod: 'monthly',
              isUpgrade: false
            });
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
          visible={showAssignModal}
        />
      )}
    </ScrollView>
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
    paddingBottom: 100,
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
