#!/usr/bin/env node

// Direct Google Maps API Test
// This script tests the Google Maps API directly to identify issues

require('dotenv').config();

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

console.log('🧪 Google Maps API Direct Test');
console.log('==============================');

if (!API_KEY) {
  console.error('❌ No API key found in environment variables');
  console.log('🔑 Please check your .env file contains:');
  console.log('   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 10) + '...');
console.log('');

// Test 1: Places API Text Search
async function testPlacesAPI() {
  console.log('🧪 Test 1: Places API Text Search');
  console.log('--------------------------------');

  try {
    const testUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=Nairobi&key=${API_KEY}`;
    console.log('🔗 URL:', testUrl);

    const response = await fetch(testUrl);
    const data = await response.json();

    console.log('📊 Response Status:', data.status);

    if (data.status === 'OK') {
      console.log('✅ Places API is working!');
      console.log('📍 Found', data.results.length, 'places');

      if (data.results.length > 0) {
        const firstResult = data.results[0];
        console.log('🏢 First result:', firstResult.name);
        console.log('📍 Address:', firstResult.formatted_address);
        console.log('📍 Location:', firstResult.geometry.location);
      }
    } else {
      console.error('❌ Places API failed:', data.status);
      if (data.error_message) {
        console.error('💬 Error message:', data.error_message);
      }
      if (data.status === 'REQUEST_DENIED') {
        console.error('🔑 This usually means:');
        console.error('   - API key is invalid');
        console.error('   - Places API is not enabled');
        console.error('   - Billing is not set up');
      }
    }

    console.log('');
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    return false;
  }
}

// Test 2: Geocoding API
async function testGeocodingAPI() {
  console.log('🧪 Test 2: Geocoding API');
  console.log('-------------------------');

  try {
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Nairobi&key=${API_KEY}`;
    console.log('🔗 URL:', testUrl);

    const response = await fetch(testUrl);
    const data = await response.json();

    console.log('📊 Response Status:', data.status);

    if (data.status === 'OK') {
      console.log('✅ Geocoding API is working!');
      console.log('📍 Found', data.results.length, 'results');
    } else {
      console.error('❌ Geocoding API failed:', data.status);
      if (data.error_message) {
        console.error('💬 Error message:', data.error_message);
      }
    }

    console.log('');
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    return false;
  }
}

// Test 3: Directions API
async function testDirectionsAPI() {
  console.log('🧪 Test 3: Directions API');
  console.log('--------------------------');

  try {
    const testUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=Nairobi&destination=Mombasa&key=${API_KEY}`;
    console.log('🔗 URL:', testUrl);

    const response = await fetch(testUrl);
    const data = await response.json();

    console.log('📊 Response Status:', data.status);

    if (data.status === 'OK') {
      console.log('✅ Directions API is working!');
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        console.log(
          '🚗 Route found:',
          route.legs[0].distance.text,
          'in',
          route.legs[0].duration.text,
        );
      }
    } else {
      console.error('❌ Directions API failed:', data.status);
      if (data.error_message) {
        console.error('💬 Error message:', data.error_message);
      }
    }

    console.log('');
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Google Maps API tests...\n');

  const results = {
    places: await testPlacesAPI(),
    geocoding: await testGeocodingAPI(),
    directions: await testDirectionsAPI(),
  };

  console.log('📋 Test Results Summary');
  console.log('========================');
  console.log('🔍 Places API:', results.places ? '✅ Working' : '❌ Failed');
  console.log('📍 Geocoding API:', results.geocoding ? '✅ Working' : '❌ Failed');
  console.log('🚗 Directions API:', results.directions ? '✅ Working' : '❌ Failed');

  console.log('');

  if (results.places && results.geocoding && results.directions) {
    console.log('🎉 All APIs are working correctly!');
    console.log('💡 The issue might be in your React Native app configuration.');
  } else {
    console.log('❌ Some APIs are not working.');
    console.log('🔧 Please check:');
    console.log('   1. API key is correct');
    console.log('   2. APIs are enabled in Google Cloud Console');
    console.log('   3. Billing is set up');
    console.log('   4. No IP restrictions are blocking your requests');
  }
}

// Run the tests
runAllTests().catch(console.error);






