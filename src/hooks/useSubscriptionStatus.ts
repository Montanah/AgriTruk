import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import subscriptionService from '../services/subscriptionService';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  needsTrialActivation: boolean;
  currentPlan: any;
  daysRemaining: number;
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'none' | 'inactive';
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
      
      // Check user role first - only transporters and brokers need subscriptions
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role;

      // Only check subscription for transporters and brokers
      if (userRole === 'job_seeker' || userRole === 'driver' || userRole === 'business' || userRole === 'shipper') {
        console.log(`useSubscriptionStatus: Skipping subscription check for ${userRole} user`);
        setSubscriptionStatus({
          hasActiveSubscription: false,
          isTrialActive: false,
          needsTrialActivation: false,
          currentPlan: null,
          daysRemaining: 0,
          subscriptionStatus: 'none',
        });
        setLoading(false);
        return;
      }

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
