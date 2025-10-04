import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  currency: string;
  features: string[];
  isActive: boolean;
  isTrial?: boolean;
  userType?: string;
  savingsAmount?: number;
  savingsPercentage?: number;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  needsTrialActivation: boolean;
  currentPlan: SubscriptionPlan | null;
  daysRemaining: number;
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'none' | 'inactive';
  subscription?: any;
  isTrial?: boolean;
  trialDaysRemaining?: number;
}

export interface Subscriber {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  autoRenew: boolean;
  paymentStatus: string;
  transactionId?: string;
  currentUsage: number;
  createdAt: Date;
  updatedAt: Date;
}

class SubscriptionService {
  private authToken: string | null = null;
  private subscriptionCache: { [key: string]: { data: SubscriptionStatus; timestamp: number } } = {};
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private pendingRequests: { [key: string]: Promise<SubscriptionStatus> } = {};

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get authentication token from Firebase
   */
  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    try {
      // getAuth is already imported at the top
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      this.authToken = token;
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(userId?: string): void {
    if (userId) {
      delete this.subscriptionCache[userId];
    } else {
      this.subscriptionCache = {};
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(userId: string): boolean {
    const cached = this.subscriptionCache[userId];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_DURATION;
  }

  /**
   * Get current user's subscription status with caching and race condition prevention
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = user.uid;

      // Check cache first
      if (this.isCacheValid(userId)) {
        console.log('📦 Using cached subscription status for user:', userId);
        return this.subscriptionCache[userId].data;
      }

      // Check if there's already a pending request for this user
      if (this.pendingRequests[userId]) {
        console.log('⏳ Waiting for pending subscription request for user:', userId);
        return await this.pendingRequests[userId];
      }

      // Create new request and store it to prevent race conditions
      const requestPromise = this.fetchSubscriptionStatus(userId);
      this.pendingRequests[userId] = requestPromise;

      try {
        const result = await requestPromise;
        
        // Cache the result
        this.subscriptionCache[userId] = {
          data: result,
          timestamp: Date.now()
        };
        
        return result;
      } finally {
        // Clean up pending request
        delete this.pendingRequests[userId];
      }
      
    } catch (error: any) {
      console.warn('Subscription status check failed:', error.message);

      // Return a consistent fallback status
      return {
        hasActiveSubscription: false,
        isTrialActive: false,
        needsTrialActivation: true,
        currentPlan: null,
        daysRemaining: 0,
        subscriptionStatus: 'none',
        isApiError: true,
      };
    }
  }

  /**
   * Internal method to fetch subscription status from API
   */
  private async fetchSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const token = await this.getAuthToken();

    // First, get the subscriber status to get planId
    const subscriberResponse = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!subscriberResponse.ok) {
      console.warn(`Subscriber status API returned ${subscriberResponse.status}`);
      throw new Error(`HTTP error! status: ${subscriberResponse.status}`);
    }

    const subscriberData = await subscriberResponse.json();
    console.log('📊 Subscriber API response for user:', userId, {
      hasData: !!subscriberData,
      hasSubscriber: !!subscriberData.subscriber,
      status: subscriberData.subscriber?.status
    });
    
    // Extract subscription data
    const subscriptionData = subscriberData.data || subscriberData;
    const planId = subscriptionData.planId || subscriberData.planId;
    
    let planDetails = null;
    
    // If we have a planId, fetch the full plan details
    if (planId) {
      try {
        const planResponse = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + `/plans/${planId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (planResponse.ok) {
          const planData = await planResponse.json();
          planDetails = planData.plan || planData;
        } else {
          console.warn(`Plan details API returned ${planResponse.status}`);
        }
      } catch (planError) {
        console.warn('Failed to fetch plan details:', planError);
      }
    }
    
    // Parse the subscription data with more robust checking
    const hasActiveSubscription = subscriptionData.hasActiveSubscription === true;
    const isTrialActive = subscriptionData.isTrialActive === true;
    const needsTrialActivation = subscriptionData.needsTrialActivation === true;
    const subscriptionStatus = subscriptionData.subscriptionStatus || 'none';
    const isTrial = subscriptionData.isTrial === true;
    
    // Calculate actual days remaining based on start date
    let daysRemaining = 0;
    let trialDaysRemaining = 0;
    
    if (subscriberData.subscriber && subscriberData.subscriber.startDate) {
      const startDate = new Date(subscriberData.subscriber.startDate);
      const endDate = new Date(subscriberData.subscriber.endDate);
      const now = new Date();
      
      // Calculate days since start
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      
      if (isTrial) {
        // For trial, calculate remaining days from 30-day trial period
        const totalTrialDays = 30;
        trialDaysRemaining = Math.max(0, totalTrialDays - daysSinceStart);
        daysRemaining = trialDaysRemaining;
      } else {
        // For regular subscription, calculate from end date
        const timeDiff = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
    } else {
      // Fallback to API values if subscriber data not available
      daysRemaining = subscriptionData.daysRemaining || 0;
      trialDaysRemaining = subscriptionData.trialDaysRemaining || 0;
    }
    
    const result = {
      hasActiveSubscription,
      isTrialActive,
      needsTrialActivation,
      currentPlan: planDetails,
      daysRemaining,
      subscriptionStatus,
      subscription: subscriberData.subscriber || subscriptionData,
      isTrial,
      trialDaysRemaining
    };

    console.log('📊 Processed subscription status for user:', userId, {
      hasActiveSubscription,
      isTrialActive,
      needsTrialActivation,
      subscriptionStatus,
      daysRemaining
    });

    return result;
  }

  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      
      // Return a default trial plan if API fails to prevent navigation issues
      return [{
        id: 'trial-plan',
        name: 'Trial Plan',
        description: '30-day free trial',
        price: 0,
        duration: 30,
        features: ['Basic features', '30-day trial'],
        isTrial: true,
        isActive: true
      }];
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    planId: string,
    paymentMethod: string,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subscription');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Upgrade or change subscription plan
   */
  async upgradePlan(
    planId: string,
    paymentMethod: string,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/change-plan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upgrade plan');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error upgrading plan:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Process subscription payment
   */
  async processPayment(
    userId: string,
    planId: string,
    paymentMethod: string,
    phoneNumber?: string,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const requestData = {
        userId,
        planId,
        paymentMethod,
        phoneNumber,
      };

      // Subscription payment request

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/pay', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Subscription payment response

      const data = await response.json();
      // Response data received

      if (!response.ok) {
        // Payment processing failed
        throw new Error(data.message || 'Failed to process payment');
      }

      // Payment processed successfully
      return { success: true, data };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Get subscriber details
   */
  async getSubscriber(subscriberId: string): Promise<Subscriber | null> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + `/subscriber/${subscriberId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching subscriber:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Activate trial subscription
   */
  async activateTrial(
    userType: 'transporter' | 'broker',
  ): Promise<{ success: boolean; data?: any; message?: string; existingSubscription?: boolean }> {
    try {
      const token = await this.getAuthToken();
      const auth = getAuth();
      const user = auth.currentUser;
      const userId = user?.uid;

      // Clear cache before checking to ensure fresh data
      if (userId) {
        this.clearCache(userId);
      }

      // First, check if user already has a subscription
      console.log('Checking existing subscription status...');
      try {
        const existingStatus = await this.getSubscriptionStatus();
        console.log('Existing subscription status:', existingStatus);
        
        if (existingStatus.hasActiveSubscription) {
          console.log('User already has an active subscription, returning current status');
          return { 
            success: true, 
            data: existingStatus, 
            existingSubscription: true,
            message: 'User already has an active subscription'
          };
        }
      } catch (statusError) {
        console.log('No existing subscription found, proceeding with trial activation');
      }

      // Get available subscription plans to find the trial plan
      const plansResponse = await fetch(API_ENDPOINTS.SUBSCRIPTIONS, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!plansResponse.ok) {
        throw new Error('Failed to fetch subscription plans');
      }

      const plansData = await plansResponse.json();
      console.log('Plans response data:', plansData);
      
      const plans = plansData.data || plansData.subscriptions || [];
      console.log('Available plans:', plans);
      
      const trialPlan = plans.find((plan: any) => plan.price === 0 || plan.name.toLowerCase().includes('trial'));
      console.log('Found trial plan:', trialPlan);

      if (!trialPlan) {
        console.error('No trial plan found. Available plans:', plans.map((p: any) => ({ name: p.name, price: p.price })));
        throw new Error('No trial plan available. Please contact support.');
      }

      // Create subscriber with trial plan
      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: trialPlan.planId,
          userType,
          autoRenew: false, // Don't auto-renew trials
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If subscriber already exists, check their current status
        if (data.message && data.message.includes('already exists')) {
          console.log('Subscriber already exists, fetching current status...');
          try {
            // Clear cache and fetch fresh status
            if (userId) {
              this.clearCache(userId);
            }
            const currentStatus = await this.getSubscriptionStatus();
            return { 
              success: true, 
              data: currentStatus, 
              existingSubscription: true,
              message: 'User already has a subscription'
            };
          } catch (statusError) {
            console.error('Failed to get existing subscription status:', statusError);
            throw new Error('Subscriber already exists but unable to fetch current status');
          }
        }
        throw new Error(data.message || 'Failed to activate trial');
      }

      // Clear cache after successful trial activation to ensure fresh data on next check
      if (userId) {
        this.clearCache(userId);
      }

      return { success: true, data, existingSubscription: false };
    } catch (error) {
      console.error('Error activating trial:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Check if user needs trial activation
   */
  async checkTrialEligibility(): Promise<{
    needsTrial: boolean;
    canActivate: boolean;
    message?: string;
  }> {
    try {
      const status = await this.getSubscriptionStatus();

      return {
        needsTrial: status.needsTrialActivation,
        canActivate: !status.hasActiveSubscription && !status.isTrialActive,
        message: status.needsTrialActivation
          ? 'You can activate your free trial'
          : 'Trial already activated or subscription active',
      };
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      return {
        needsTrial: true,
        canActivate: true,
        message: 'Unable to check trial status',
      };
    }
  }

  /**
   * Format subscription status for display
   */
  formatSubscriptionStatus(status: SubscriptionStatus): {
    planName: string;
    statusText: string;
    daysRemaining: number;
    isTrial: boolean;
    progressPercentage: number;
    statusColor: string;
  } {
    let planName = 'No Active Plan';
    let statusText = 'Inactive';
    let daysRemaining = 0;
    let isTrial = false;
    let progressPercentage = 0;
    let statusColor = '#FF6B6B';

    if (status.isTrialActive) {
      planName = 'Free Trial';
      statusText = 'Trial Active';
      daysRemaining = status.daysRemaining;
      isTrial = true;
      progressPercentage = Math.max(0, Math.min(1, (30 - daysRemaining) / 30));
      statusColor = '#4ECDC4';
    } else if (status.hasActiveSubscription && status.currentPlan) {
      planName = status.currentPlan.name;
      statusText = 'Active';
      daysRemaining = status.daysRemaining;
      isTrial = false;
      // Assuming monthly subscription (30 days)
      const totalDays = 30;
      progressPercentage = Math.max(0, Math.min(1, (totalDays - daysRemaining) / totalDays));
      statusColor = '#45B7D1';
    } else if (status.subscriptionStatus === 'expired') {
      planName = 'Expired';
      statusText = 'Expired';
      daysRemaining = 0;
      isTrial = false;
      progressPercentage = 1;
      statusColor = '#FF6B6B';
    }

    return {
      planName,
      statusText,
      daysRemaining,
      isTrial,
      progressPercentage,
      statusColor,
    };
  }
}

export default new SubscriptionService();
