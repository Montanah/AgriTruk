#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Google Maps API Setup for TRUK App');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  
  // Read and check the content
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=')) {
    console.log('✅ Google Maps API key is configured');
    
    // Check if it's not the placeholder
    if (!envContent.includes('YOUR_GOOGLE_MAPS_API_KEY_HERE')) {
      console.log('✅ API key appears to be set to a real value');
    } else {
      console.log('⚠️  API key is still set to placeholder value');
      console.log('   Please update your .env file with your actual API key');
    }
  } else {
    console.log('❌ Google Maps API key is not configured');
    console.log('   Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here to your .env file');
  }
} else {
  console.log('❌ .env file does not exist');
  console.log('   Creating .env file with template...');
  
  const envTemplate = `# Google Maps API Configuration
# Replace YOUR_ACTUAL_API_KEY_HERE with your actual Google Maps API key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# Other environment variables can be added here
`;
  
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env file created with template');
  console.log('   Please edit .env and replace YOUR_ACTUAL_API_KEY_HERE with your real API key');
}

console.log('\n📋 Next Steps:');
console.log('1. Get your Google Maps API key from Google Cloud Console');
console.log('2. Edit the .env file and replace YOUR_ACTUAL_API_KEY_HERE with your real key');
console.log('3. Restart your development server');
console.log('4. Test the location search functionality');

console.log('\n🔑 To get your API key:');
console.log('1. Go to https://console.cloud.google.com/');
console.log('2. Select your project');
console.log('3. Go to APIs & Services > Credentials');
console.log('4. Copy your API key (it looks like: AIzaSyC...)');
console.log('5. Make sure you have enabled: Places API, Geocoding API, Directions API');

console.log('\n📱 After updating .env, restart your app with:');
console.log('   npm start');
