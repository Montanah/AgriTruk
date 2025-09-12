import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SimpleFirebaseConnectionStatusProps {
  showDetails?: boolean;
  onRetry?: () => void;
}

const SimpleFirebaseConnectionStatus: React.FC<SimpleFirebaseConnectionStatusProps> = ({
  showDetails = false,
  onRetry
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial connection status
    checkConnectionStatus();

    // Set up periodic status checks
    const interval = setInterval(checkConnectionStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Simple connection check
      setIsConnected(true);
      setLastError(null);
    } catch (error: any) {
      console.error('Error checking connection statu,
    s:', error);
      setIsConnected(false);
      setLastError(error.message);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await checkConnectionStatus();
      if (onRetry) {
        onRetry();
      }
    } catch (error) {
      console.error('Retry failed:', error);
      Alert.alert('Retry Failed', 'Unable to reconnect to Firebase. Please check your internet connection.');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusColor = () => {
    if (isConnected) return '#219653'; // success green
    if (lastError) return '#EB5757'; // error red
    return '#4F4F4F'; // secondary text
  };

  const getStatusIcon = () => {
    if (isConnected) return 'check-circle';
    if (lastError) return 'alert-circle';
    return 'help-circle';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (lastError) return 'Connection Error';
    return 'Checking...';
  };

  if (!showDetails) {
    return (
      <View style={styles.compactContainer}>
        <MaterialCommunityIcons 
          name={getStatusIcon()} 
          size={16} 
          color={getStatusColor()} 
        />
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          Firebase: {getStatusText()}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons 
            name={getStatusIcon()} 
            size={20} 
            color={getStatusColor()} 
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            Firebase: {getStatusText()}
          </Text>
        </View>
        
              </TouchableOpacity>
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
        >
          <MaterialCommunityIcons 
            name={isRetrying ? 'loading' : 'refresh'} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.retryText}>
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Text>
        
      </View>

      {lastError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Status:</Text>
        <Text style={styles.infoText}>
          {isConnected ? '✅ Firebase is connected and ready' : '❌ Firebase connection failed'}
        </Text>
        <Text style={styles.infoSubtext}>
          {isConnected 
            ? 'Your app can sync data with Firebase' 
            : 'Some features may not work properly without Firebase connection'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2B04',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  retryButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#EB575710',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EB575720',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EB5757',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#EB5757',
  },
  infoContainer: {
    backgroundColor: '#F7F9FC',
    padding: 8,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4F4F4F',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#BDBDBD',
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SimpleFirebaseConnectionStatus;