import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  MOCK_ACTIVE,
  MOCK_COMPLETED,
  MOCK_REQUESTS,
} from '../mocks/jobs';

import AssignTransporterModal from '../components/TransporterService/AssignTransporterModal';
import BookingCard from '../components/TransporterService/BookingCard';
import DashboardHeader from '../components/TransporterService/DashboardHeader';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';
import { Booking } from '../mocks/bookings';

const TABS = ['Incoming', 'Active', 'Completed'] as const;
type TabType = typeof TABS[number];
type TransporterType = 'company' | 'individual' | 'broker';

type RouteParams = {
  params?: {
    transporterType?: TransporterType;
  };
};

const TransporterServiceScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const navigation = useNavigation<any>();

  const transporterType: TransporterType = route?.params?.transporterType ?? 'company';
  const isCompanyOrBroker = transporterType === 'company' || transporterType === 'broker';

  const [tab, setTab] = useState<TabType>('Incoming');
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

  const dataByTab: Record<TabType, Booking[]> = {
    Incoming: MOCK_REQUESTS,
    Active: MOCK_ACTIVE,
    Completed: MOCK_COMPLETED,
  };

  const handleAssign = (job: Booking, transporter: Booking['assignedTransporter']) => {
    if (!isCompanyOrBroker) return;
    setSelectedJob(job);
    setSelectedTransporter(transporter);
    setShowAssignModal(true);
  };

  const handleAccept = (id: string) => {
    console.log(`Accepted booking: ${id}`);
    // TODO: Add accept logic or API call
  };

  const handleReject = (id: string) => {
    console.log(`Rejected booking: ${id}`);
    // TODO: Add reject logic or API call
  };

  const handleComplete = (id: string) => {
    console.log(`Completed booking: ${id}`);
    // TODO: Add complete logic or API call
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      onAccept={handleAccept}
      onReject={handleReject}
      onComplete={handleComplete}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dataByTab[tab]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No {tab.toLowerCase()} bookings found.</Text>
        }
        ListHeaderComponent={
          <DashboardHeader
            tab={tab}
            setTab={setTab}
            subscriptionStatus={subscriptionStatus}
            notification={notification}
            onCloseNotification={() => setNotification(null)}
            showSubscription={() => setShowSubscription(true)}
            onManage={() => navigation.navigate('TransporterBookingManagement')}
            onAssignPress={handleAssign}
            isCompany={isCompanyOrBroker}
          />
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
});
