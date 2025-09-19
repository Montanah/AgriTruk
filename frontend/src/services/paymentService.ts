/**
 * Enhanced Payment Service
 * Handles all payment operations with proper validation and error handling
 */

import { API_ENDPOINTS } from '../constants/api';
import CardValidator, { CardData, CardValidationResult } from '../utils/cardValidation';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mpesa' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  paymentMethod?: PaymentMethod;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: string;
  requiresAction?: boolean;
  nextAction?: any;
}

export interface SubscriptionPaymentData {
  planId: string;
  amount: number;
  currency: string;
  isTrial: boolean;
  trialDays?: number;
  autoRenew: boolean;
  paymentMethod?: 'mpesa' | 'stripe';
  phoneNumber?: string;
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
}

class PaymentService {
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
   * Validate card data before processing
   */
  validateCardData(cardData: CardData): CardValidationResult {
    return CardValidator.validateCard(cardData);
  }

  /**
   * Create payment method for future use
   */
  async createPaymentMethod(cardData: CardData): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      // Validate card data first
      const validation = this.validateCardData(cardData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/payment-methods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'card',
          card: {
            number: cardData.number.replace(/\s/g, ''),
            exp_month: parseInt(cardData.expiry.split('/')[0]),
            exp_year: parseInt(cardData.expiry.split('/')[1].length === 2 ? `20${cardData.expiry.split('/')[1]}` : cardData.expiry.split('/')[1]),
            cvc: cardData.cvc,
            name: cardData.cardholderName,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment method');
      }

      return {
        success: true,
        paymentMethod: data.paymentMethod,
      };
    } catch (error) {
      console.error('Error creating payment method:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process subscription payment
   */
  async processSubscriptionPayment(
    paymentData: SubscriptionPaymentData,
    paymentMethodId?: string,
    cardData?: CardData
  ): Promise<PaymentResult> {
    try {
      const token = await this.getAuthToken();

      // For trial activation with $1 test charge, we need to process the payment first
      if (paymentData.isTrial && paymentData.amount > 0) {
        if (paymentData.paymentMethod === 'mpesa' && paymentData.phoneNumber) {
          // Process M-PESA test charge
          const mpesaResult = await this.processMpesaPayment(
            paymentData.phoneNumber,
            paymentData.amount,
            paymentData.currency
          );
          
          if (!mpesaResult.success) {
            return mpesaResult;
          }
        } else if (paymentData.paymentMethod === 'stripe' && paymentData.cardDetails) {
          // Process Stripe test charge
          const cardData: CardData = {
            number: paymentData.cardDetails.cardNumber,
            expiry: paymentData.cardDetails.expiryDate,
            cvc: paymentData.cardDetails.cvv,
            cardholderName: paymentData.cardDetails.cardholderName,
          };
          
          const validation = this.validateCardData(cardData);
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.errors.join(', '),
            };
          }
          
          // Create payment method and process test charge
          const paymentMethodResult = await this.createPaymentMethod(cardData);
          if (!paymentMethodResult.success) {
            return {
              success: false,
              error: paymentMethodResult.error,
            };
          }
          
          // Process the test charge
          const testChargeResult = await this.processTestCharge(
            paymentMethodResult.paymentMethod!.id,
            paymentData.amount,
            paymentData.currency
          );
          
          if (!testChargeResult.success) {
            return testChargeResult;
          }
        }
      }

      // If no payment method provided and this is not a trial, create one
      let finalPaymentMethodId = paymentMethodId;
      if (!finalPaymentMethodId && !paymentData.isTrial && cardData) {
        const paymentMethodResult = await this.createPaymentMethod(cardData);
        if (!paymentMethodResult.success) {
          return {
            success: false,
            error: paymentMethodResult.error,
          };
        }
        finalPaymentMethodId = paymentMethodResult.paymentMethod?.id;
      }

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/subscription-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: paymentData.planId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          isTrial: paymentData.isTrial,
          trialDays: paymentData.trialDays,
          autoRenew: paymentData.autoRenew,
          paymentMethodId: finalPaymentMethodId,
          paymentMethod: paymentData.paymentMethod,
          phoneNumber: paymentData.phoneNumber,
          cardDetails: paymentData.cardDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      return {
        success: true,
        paymentIntent: data.paymentIntent,
        requiresAction: data.requiresAction,
        nextAction: data.nextAction,
      };
    } catch (error) {
      console.error('Error processing subscription payment:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process test charge for payment method verification
   */
  async processTestCharge(
    paymentMethodId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<PaymentResult> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/test-charge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          amount,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Test charge failed');
      }

      return {
        success: true,
        paymentIntent: data.paymentIntent,
      };
    } catch (error) {
      console.error('Error processing test charge:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process M-PESA payment
   */
  async processMpesaPayment(
    phoneNumber: string,
    amount: number,
    currency: string = 'KES'
  ): Promise<PaymentResult> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/mpesa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          amount,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'M-PESA payment failed');
      }

      return {
        success: true,
        paymentIntent: data.paymentIntent,
      };
    } catch (error) {
      console.error('Error processing M-PESA payment:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get user's saved payment methods
   */
  async getPaymentMethods(): Promise<{ success: boolean; paymentMethods?: PaymentMethod[]; error?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/payment-methods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment methods');
      }

      return {
        success: true,
        paymentMethods: data.paymentMethods,
      };
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to set default payment method');
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete payment method');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Setup automatic renewal for subscription
   */
  async setupAutoRenewal(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.SUBSCRIPTIONS}/auto-renewal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          paymentMethodId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to setup auto-renewal');
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting up auto-renewal:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Cancel automatic renewal
   */
  async cancelAutoRenewal(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.SUBSCRIPTIONS}/auto-renewal/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel auto-renewal');
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling auto-renewal:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });

    return formatter.format(amount);
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
    ];
  }
}

export default new PaymentService();

