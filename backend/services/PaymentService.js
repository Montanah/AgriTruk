const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class PaymentService {
  constructor() {
    this.baseUrl = 'https://api.paystack.co';
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  // Generate a unique transaction reference
  generateReference() {
    return `txn_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Initialize a payment transaction
  async initializePayment({ email, amount, planId, userId, callbackUrl }) {
    try {
      const reference = this.generateReference();
      const data = {
        email,
        amount: amount * 100, // Convert to kobo (smallest unit)
        currency: 'KES',
        reference,
        callback_url: callbackUrl || `${process.env.APP_URL}/payment/callback`,
        metadata: { userId, planId },
      };

      const response = await axios.post(`${this.baseUrl}/transaction/initialize`, data, { headers: this.headers });
      return {
        success: true,
        data: {
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference,
        },
      };
    } catch (error) {
      console.error('Payment initialization error:', error.response?.data || error.message);
      return { success: false, message: 'Failed to initialize payment' };
    }
  }

  // Verify a payment transaction
  async verifyPayment(reference) {
    try {
      const response = await axios.get(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, { headers: this.headers });
      const { status, amount, currency, paid_at, metadata } = response.data.data;
      return {
        success: true,
        data: {
          status,
          amount: amount / 100, // Convert back to base currency
          currency,
          paidAt: paid_at,
          metadata,
        },
      };
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return { success: false, message: 'Failed to verify payment' };
    }
  }

  // Create a subscription (for recurring payments)
  async createSubscription({ email, planId, authorizationCode }) {
    try {
      const data = {
        customer: email,
        plan: planId,
        authorization: authorizationCode,
        start_date: new Date().toISOString().split('T')[0], // Start immediately
      };

      const response = await axios.post(`${this.baseUrl}/subscription`, data, { headers: this.headers });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Subscription creation error:', error.response?.data || error.message);
      return { success: false, message: 'Failed to create subscription' };
    }
  }

  // Charge an existing authorization (for manual charges)
  async chargeAuthorization({ email, amount, authorizationCode }) {
    try {
      const data = {
        email,
        amount: amount * 100, // Convert to kobo
        currency: 'KES',
        authorization_code: authorizationCode,
      };

      const response = await axios.post(`${this.baseUrl}/transaction/charge_authorization`, data, { headers: this.headers });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      console.error('Charge authorization error:', error.response?.data || error.message);
      return { success: false, message: 'Failed to charge authorization' };
    }
  }
}

module.exports = new PaymentService();