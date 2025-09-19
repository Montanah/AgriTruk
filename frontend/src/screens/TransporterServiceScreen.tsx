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

  // Fetch subscription status
  React.useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setLoadingSubscription(true);
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const res = await fetch(`${API_ENDPOINTS.SUBSCRIPTIONS}/subscriber/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          setSubscriptionStatus(data.data);
          
          // Set notification based on subscription status
          if (data.data?.hasActiveSubscription) {
            const daysRemaining = data.data.daysRemaining;
            if (daysRemaining <= 3 && daysRemaining > 0) {
              setNotification(`Your subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Renew now to avoid interruption.`);
            } else if (daysRemaining <= 0) {
              setNotification('Your subscription has expired. Please renew to continue using premium features.');
            }
          } else if (data.data?.needsTrialActivation) {
            setNotification('Activate your free trial to access all premium features.');
          }
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    
    fetchSubscriptionStatus();
  }, []);

  const { jobs: bookings, loading, error } = useAssignedJobs('agri');

  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const handleAssignTransporter = (jobId: string, transporter: any) => {
    // Handle transporter assignment logic here
    // Assigning transporter to job
  };

  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    totalTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    pendingTrips: 0,
    avgRating: 0,
    totalReviews: 0,
    netEarnings: 0,
    onTimeDelivery: 0,
    fleetSize: 0,
    activeToday: 0,
    avgUtilizationRate: 0,
    netProfit: 0,
  });

  // Fetch real stats from API
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const res = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
  }, []);
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
            // Request accepted
            // Handle request acceptance
          }}
          onRequestRejected={(request) => {
            // Request rejected
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
