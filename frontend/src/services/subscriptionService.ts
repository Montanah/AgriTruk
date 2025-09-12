import { API_ENDPOINTS } from '../constants/api';

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
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'none';
  subscription?: any;
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
      const { getAuth } = require('firebase/auth');
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
   * Get current user's subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const token = await this.getAuthToken();

      console.log('='.repeat(80));
      console.log('🚀 SUBSCRIPTION STATUS REQUEST FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/status');
      console.log('📋 Method: GET');
      console.log('⏰ Request Timestamp:', new Date().toISOString());
      console.log('🔑 Auth Token Present:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔑 Token Preview:', `${token.substring(0, 30)}...`);
      }
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('👤 User UID:', currentUser?.uid || 'No user');
      console.log('='.repeat(80));

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('='.repeat(80));
      console.log('📊 SUBSCRIPTION STATUS RESPONSE FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/status');
      console.log(`📋 Response Status: ${response.status} ${response.statusText}`);
      console.log('⏰ Response Timestamp:', new Date().toISOString());
      console.log(
        '📋 Response Headers:',
        JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Subscription status request failed');
        console.log('📦 Error Response Data:', JSON.stringify(errorData, null, 2));
        console.log('='.repeat(80));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Subscription status retrieved successfully');
      console.log('📦 Response Data:', JSON.stringify(data, null, 2));
      
      // Add debugging for trial eligibility
      const subscriptionData = data.data;
      if (subscriptionData) {
        console.log('🔍 Trial Eligibility Check:', {
          hasActiveSubscription: subscriptionData.hasActiveSubscription,
          isTrialActive: subscriptionData.isTrialActive,
          needsTrialActivation: subscriptionData.needsTrialActivation,
          subscriptionStatus: subscriptionData.subscriptionStatus,
          shouldShowTrial: subscriptionData.needsTrialActivation || (!subscriptionData.hasActiveSubscription && !subscriptionData.isTrialActive && subscriptionData.subscriptionStatus === 'none')
        });
      }
      
      console.log('='.repeat(80));
      return data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);

      // Return default status if API fails
      return {
        hasActiveSubscription: false,
        isTrialActive: false,
        needsTrialActivation: true,
        currentPlan: null,
        daysRemaining: 0,
        subscriptionStatus: 'none',
      };
    }
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
      return [];
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

      console.log('='.repeat(80));
      console.log('🚀 SUBSCRIPTION PAYMENT REQUEST FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/pay');
      console.log('📋 Method: POST');
      console.log('⏰ Request Timestamp:', new Date().toISOString());
      console.log('🔑 Auth Token Present:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔑 Token Preview:', `${token.substring(0, 30)}...`);
      }
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('👤 User UID:', currentUser?.uid || 'No user');
      console.log('📦 Request Body:', JSON.stringify(requestData, null, 2));
      console.log('='.repeat(80));

      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/pay', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('='.repeat(80));
      console.log('📊 SUBSCRIPTION PAYMENT RESPONSE FOR BACKEND ENGINEER');
      console.log('='.repeat(80));
      console.log('📍 Endpoint:', API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/pay');
      console.log(`📋 Response Status: ${response.status} ${response.statusText}`);
      console.log('⏰ Response Timestamp:', new Date().toISOString());
      console.log(
        '📋 Response Headers:',
        JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
      );

      const data = await response.json();
      console.log('📦 Response Data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.log('❌ Payment processing failed');
        console.log('📦 Error Response Data:', JSON.stringify(data, null, 2));
        console.log('='.repeat(80));
        throw new Error(data.message || 'Failed to process payment');
      }

      console.log('✅ Payment processed successfully');
      console.log('='.repeat(80));
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
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();

      // Use the correct endpoint from Swagger docs: POST /api/subscriptions/subscriber/
      const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'trial', // Trial plan ID
          userType,
          isTrial: true,
          duration: 30, // 30-day trial
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to activate trial');
      }

      return { success: true, data };
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
