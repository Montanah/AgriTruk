#!/usr/bin/env node

// Debug script for transporter accepting jobs
// This script helps debug the API call that's failing

const https = require('https');

const API_BASE_URL = 'https://agritruk.onrender.com';
const BOOKINGS_ENDPOINT = `${API_BASE_URL}/api/bookings`;

// Test data - you'll need to replace these with actual values
const TEST_DATA = {
  transporterId: '77aA8yBjstWmMjYDZMTHLDf3JbL2', // From your company data
  bookingId: 'test-booking-id', // You'll need to get a real booking ID
  token: 'test-token' // You'll need to get a real Firebase token
};

function makeRequest(bookingId, transporterId, token) {
  const url = `${BOOKINGS_ENDPOINT}/${bookingId}/accept`;
  const postData = JSON.stringify({ transporterId });
  
  console.log('Making request to:', url);
  console.log('Request body:', postData);
  console.log('Headers:', {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  const req = https.request(url, options, (res) => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
      try {
        const jsonData = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Request error:', error);
  });
  
  req.write(postData);
  req.end();
}

// Test the health endpoint first
console.log('Testing health endpoint...');
https.get(`${API_BASE_URL}/api/health`, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Health check response:', data);
    console.log('\nTo test the accept booking endpoint, you need to:');
    console.log('1. Get a real Firebase token from your app');
    console.log('2. Get a real booking ID from your app');
    console.log('3. Update the TEST_DATA object above');
    console.log('4. Run: node debug-transporter-accept.js');
  });
}).on('error', (error) => {
  console.error('Health check failed:', error);
});

// Uncomment to test with real data
// makeRequest(TEST_DATA.bookingId, TEST_DATA.transporterId, TEST_DATA.token);

