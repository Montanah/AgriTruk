import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import subscriptionService from '../services/subscriptionService';

interface BrokerSubscriptionCheckerProps {
  onSubscriptionChecked: (status: any) => void;
}

const BrokerSubscriptionChecker: React.FC<BrokerSubscriptionCheckerProps> = ({ onSubscriptionChecked }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        onSubscriptionChecked(null);
        return;
      }

      // Get subscription status
      const subscriptionStatus = await subscriptionService.getSubscriptionStatus();
      
      // Determine next step based on subscription status
      if (subscriptionStatus?.needsTrialActivation || 
          !subscriptionStatus || 
          (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive && subscriptionStatus?.subscriptionStatus === 'none')) {
        // No active subscription - route to trial activation
        navigation.reset({
          index: 0,
          routes: [{
            name: 'SubscriptionTrial',
            params: {
              userType: 'broker',
              subscriptionStatus: subscriptionStatus
            }
          }]
        });
      } else if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialActive && subscriptionStatus?.subscriptionStatus === 'expired') {
        // Subscription expired - route to expired screen
        navigation.reset({
          index: 0,
          routes: [{
            name: 'SubscriptionExpired',
            params: {
              userType: 'broker',
              userId: user.uid,
              expiredDate: subscriptionStatus?.subscriptionExpiryDate || new Date().toISOString()
            }
          }]
        });
      } else {
        // Has active subscription - route to dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'BrokerTabs' }]
        });
      }
      
      onSubscriptionChecked(subscriptionStatus);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Fallback to trial activation on error
      navigation.reset({
        index: 0,
        routes: [{
          name: 'SubscriptionTrial',
          params: {
            userType: 'broker',
            subscriptionStatus: {
              needsTrialActivation: true,
              hasActiveSubscription: false,
              isTrialActive: false,
              subscriptionStatus: 'none'
            }
          }
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking subscription status...</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
});

export default BrokerSubscriptionChecker;





