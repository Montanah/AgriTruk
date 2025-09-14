import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { firebaseService } from '../services/simpleFirebaseService';
import { networkService } from '../services/simpleNetworkService';

interface FirebaseConnectionStatusProps {
  showDetails?: boolean;
  onRetry?: () => void;
}

const FirebaseConnectionStatus: React.FC<FirebaseConnectionStatusProps> = ({
  showDetails = false,
  onRetry
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);

  useEffect(() => {
    // Check initial connection status
    checkConnectionStatus();

    // Listen for network changes
    const unsubscribe = networkService.addNetworkListener((connected) => {
      if (connected) {
        checkConnectionStatus();
      } else {
        setIsConnected(false);
      }
    });

    return unsubscribe;
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = firebaseService.getConnectionStatus();
      const network = await networkService.getNetworkInfo();
      const diagnosisResult = await networkService.diagnoseConnectionIssues();

      setIsConnected(status.isConnected);
      setNetworkInfo(network);
      setDiagnosis(diagnosisResult);

      // Connection Status Check completed
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await firebaseService.forceReconnect();
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
    if (isConnected) return colors.success;
    if (diagnosis?.issue === 'no_network') return colors.error;
    if (diagnosis?.issue === 'no_internet') return colors.warning;
    if (diagnosis?.issue === 'firebase_unreachable') return colors.secondary;
    return colors.text.secondary;
  };

  const getStatusIcon = () => {
    if (isConnected) return 'check-circle';
    if (diagnosis?.issue === 'no_network') return 'wifi-off';
    if (diagnosis?.issue === 'no_internet') return 'wifi-alert';
    if (diagnosis?.issue === 'firebase_unreachable') return 'cloud-off';
    return 'help-circle';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (diagnosis?.issue === 'no_network') return 'No Network';
    if (diagnosis?.issue === 'no_internet') return 'No Internet';
    if (diagnosis?.issue === 'firebase_unreachable') return 'Firebase Unreachable';
    return 'Unknown';
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
          {getStatusText()}
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
            color={colors.white} 
          />
          <Text style={styles.retryText}>
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Text>
        
      </View>

      {diagnosis && (
        <View style={styles.diagnosisContainer}>
          <Text style={styles.solutionText}>Solution: {diagnosis.solution}</Text>
        </View>
      )}

      {networkInfo && (
        <View style={styles.networkContainer}>
          <Text style={styles.networkTitle}>Network Info:</Text>
          <Text style={styles.networkText}>
            Type: {networkInfo.type} | Internet: {networkInfo.connectivityTest ? '✅' : '❌'} | Firebase: {networkInfo.firebaseTest ? '✅' : '❌'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.semiBold,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  retryButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  retryText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
  },
  diagnosisContainer: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  diagnosisTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  diagnosisText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  solutionText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.primary,
  },
  networkContainer: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
  },
  networkTitle: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  networkText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  compactText: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
  },
});

export default FirebaseConnectionStatus;
