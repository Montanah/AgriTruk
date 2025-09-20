import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import subscriptionService from '../services/subscriptionService';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  needsTrialActivation: boolean;
  currentPlan: any;
  daysRemaining: number;
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'none';
  subscription?: any;
}

interface UseSubscriptionStatusReturn {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  checkSubscriptionStatus: () => Promise<void>;
}

export const useSubscriptionStatus = (): UseSubscriptionStatusReturn => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const checkSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      
      // Don't auto-navigate here - let the calling component handle navigation
      // This hook should only provide subscription status data
      
    } catch (err: any) {
      console.error('Error checking subscription status:', err);
      setError(err.message || 'Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  return {
    subscriptionStatus,
    loading,
    error,
    checkSubscriptionStatus,
  };
};
