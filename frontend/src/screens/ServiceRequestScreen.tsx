import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import RequestForm from '../components/common/RequestForm';

const ServiceRequestScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RequestForm mode="shipper" isModal={false} />
    </SafeAreaView>
  );
};

export default ServiceRequestScreen;
