import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import RequestForm from '../../components/common/RequestForm';

const BusinessRequestScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RequestForm mode="business" isModal={false} />
    </SafeAreaView>
  );
};

export default BusinessRequestScreen;
