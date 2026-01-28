import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import RequestForm from '../components/common/RequestForm';

interface BrokerRequestScreenProps {
    route?: {
        params?: {
            clientId?: string;
            selectedClient?: any;
        };
    };
}

const BrokerRequestScreen: React.FC<BrokerRequestScreenProps> = ({ route }) => {
    const { clientId, selectedClient } = route?.params || {};

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <RequestForm
                mode="broker"
                clientId={clientId}
                selectedClient={selectedClient}
                isModal={false}
            />
        </SafeAreaView>
    );
};

export default BrokerRequestScreen;
