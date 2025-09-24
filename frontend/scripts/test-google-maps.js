#!/usr/bin/env node

require('dotenv').config();

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

console.log('🧪 Testing Google Maps API Key');
console.log('==============================\n');

if (!API_KEY) {
  console.log('❌ No API key found in .env file');
  process.exit(1);
}

console.log('✅ API key found in .env file');
console.log(`🔑 Key preview: ${API_KEY.substring(0, 10)}...\n`);

// Test 1: Geocoding API
console.log('1️⃣ Testing Geocoding API...');
const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Nairobi,Kenya&key=${API_KEY}`;

fetch(geocodingUrl)
  .then((response) => response.json())
  .then((data) => {
    if (data.status === 'OK') {
      console.log('✅ Geocoding API: WORKING');
      console.log(`   Found: ${data.results[0].formatted_address}`);
    } else {
      console.log('❌ Geocoding API: FAILED');
      console.log(`   Status: ${data.status}`);
      console.log(`   Error: ${data.error_message || 'No error message'}`);
    }
  })
  .catch((error) => {
    console.log('❌ Geocoding API: ERROR');
    console.log(`   Error: ${error.message}`);
  });

// Test 2: Places API
console.log('\n2️⃣ Testing Places API...');
const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=Nairobi&key=${API_KEY}`;

fetch(placesUrl)
  .then((response) => response.json())
  .then((data) => {
    if (data.status === 'OK') {
      console.log('✅ Places API: WORKING');
      console.log(`   Found ${data.results.length} places`);
      if (data.results.length > 0) {
        console.log(`   First result: ${data.results[0].name}`);
      }
    } else {
      console.log('❌ Places API: FAILED');
      console.log(`   Status: ${data.status}`);
      console.log(`   Error: ${data.error_message || 'No error message'}`);
    }
  })
  .catch((error) => {
    console.log('❌ Places API: ERROR');
    console.log(`   Error: ${error.message}`);
  });

// Test 3: Directions API
console.log('\n3️⃣ Testing Directions API...');
const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=Nairobi&destination=Mombasa&key=${API_KEY}`;

fetch(directionsUrl)
  .then((response) => response.json())
  .then((data) => {
    if (data.status === 'OK') {
      console.log('✅ Directions API: WORKING');
      console.log(`   Route found: ${data.routes[0].legs[0].distance.text}`);
    } else {
      console.log('❌ Directions API: FAILED');
      console.log(`   Status: ${data.status}`);
      console.log(`   Error: ${data.error_message || 'No error message'}`);
    }
  })
  .catch((error) => {
    console.log('❌ Directions API: ERROR');
    console.log(`   Error: ${error.message}`);
  });

console.log('\n🔍 Testing completed! Check results above.');
console.log('\n📱 Next: Test in your app with the GoogleMapsTest component.');
