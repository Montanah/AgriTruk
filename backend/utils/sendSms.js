const axios = require('axios');

class SMSService {
  constructor(apiToken, baseUrl = 'https://api.mobilesasa.com/v1/send/message') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Send SMS via JSON POST request
   * @param {string} senderID - Registered sender ID
   * @param {string} message - SMS content
   * @param {string} phone - Recipient phone number (format: 2547...)
   * @returns {Promise<Object>} - API response
   */
  async sendViaJson(senderID, message, phone) {
    try {
      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        data: {
          senderID,
          message,
          phone
        }
      });
      return response.data;
    } catch (error) {
      console.error('SMS sending failed (JSON):', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send SMS via Form POST request
   * @param {string} senderID - Registered sender ID
   * @param {string} message - SMS content
   * @param {string} phone - Recipient phone number (format: 2547...)
   * @returns {Promise<Object>} - API response
   */
  async sendViaForm(senderID, message, phone) {
    try {
      const params = new URLSearchParams();
      params.append('senderID', senderID);
      params.append('message', message);
      params.append('phone', phone);
      params.append('api_token', this.apiToken);

      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params
      });
      return response.data;
    } catch (error) {
      console.error('SMS sending failed (Form):', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send SMS via GET request
   * @param {string} senderID - Registered sender ID
   * @param {string} message - SMS content
   * @param {string} phone - Recipient phone number (format: 2547...)
   * @returns {Promise<Object>} - API response
   */
  async sendViaGet(senderID, message, phone) {
    try {
      const url = new URL('https://api.mobilesasa.com/v1/send/messageget');
      url.searchParams.append('senderID', senderID);
      url.searchParams.append('message', message);
      url.searchParams.append('phone', phone);
      url.searchParams.append('api_token', this.apiToken);

      const response = await axios.get(url.toString());
      return response.data;
    } catch (error) {
      console.error('SMS sending failed (GET):', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send SMS (defaults to JSON POST)
   * @param {string} senderID - Registered sender ID
   * @param {string} message - SMS content
   * @param {string} phone - Recipient phone number (format: 2547...)
   * @param {string} [method='json'] - Method to use: 'json', 'form', or 'get'
   * @returns {Promise<Object>} - API response
   */
  async sendSMS(senderID, message, phone, method = 'json') {
    switch (method.toLowerCase()) {
      case 'json':
        return this.sendViaJson(senderID, message, phone);
      case 'form':
        return this.sendViaForm(senderID, message, phone);
      case 'get':
        return this.sendViaGet(senderID, message, phone);
      default:
        throw new Error('Invalid method specified. Use "json", "form", or "get"');
    }
  }
}

module.exports = SMSService;