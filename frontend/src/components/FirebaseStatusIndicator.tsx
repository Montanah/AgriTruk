import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const FirebaseStatusIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Try to enable network to test connection
      await enableNetwork(db);
      setIsConnected(true);
      setRetryCount(0);
    } catch (error) {
      console.warn('Firebase connection check failed:', error);
      setIsConnected(false);
      setRetryCount(prev => prev + 1);
      
      // Retry after 5 seconds
      if (retryCount < 3) {
        setTimeout(() => {
          checkConnection();
        }, 5000);
      }
    }
  };

  if (isConnected === null) {
    return null; // Don't show anything while checking
  }

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚠️ Connection issues detected. Some features may be limited.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    padding: 8,
    margin: 4,
    borderRadius: 4,
  },
  text: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default FirebaseStatusIndicator;
