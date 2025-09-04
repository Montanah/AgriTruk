#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 TRUKAPP EAS Setup Script');
console.log('============================\n');

// Check if EAS CLI is installed
try {
    execSync('eas --version', { stdio: 'pipe' });
    console.log('✅ EAS CLI is already installed');
} catch (error) {
    console.log('📦 Installing EAS CLI...');
    try {
        execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
        console.log('✅ EAS CLI installed successfully');
    } catch (installError) {
        console.log('❌ Failed to install EAS CLI. Please install manually:');
        console.log('   npm install -g @expo/eas-cli');
        process.exit(1);
    }
}

// Check if user is logged in
try {
    const whoami = execSync('eas whoami', { stdio: 'pipe' }).toString().trim();
    console.log(`✅ Logged in as: ${whoami}`);
} catch (error) {
    console.log('🔐 Please log in to EAS:');
    console.log('   Run: eas login');
    console.log('   Then run this script again.');
    process.exit(1);
}

// Check project configuration
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (!fs.existsSync(appJsonPath)) {
    console.log('❌ app.json not found. Please run this script from the frontend directory.');
    process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const projectId = appJson.expo?.extra?.eas?.projectId;

if (!projectId) {
    console.log('❌ EAS project ID not found in app.json');
    console.log('   Please run: eas init');
    process.exit(1);
}

console.log(`✅ EAS project ID: ${projectId}`);

// Check environment variables
console.log('\n🔍 Checking environment variables...');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found. Creating template...');
    
    const envTemplate = `# TRUKAPP Environment Variables
# Copy this file and fill in your actual values

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Backend API URL
EXPO_PUBLIC_API_URL=https://agritruk.onrender.com

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id_here
`;

    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env template file');
    console.log('   Please edit .env with your actual values');
} else {
    console.log('✅ .env file exists');
}

// Check EAS configuration
const easJsonPath = path.join(__dirname, '..', 'eas.json');
if (!fs.existsSync(easJsonPath)) {
    console.log('❌ eas.json not found. Please run: eas init');
    process.exit(1);
}

console.log('✅ EAS configuration found');

// Test build configuration
console.log('\n🧪 Testing build configuration...');
try {
    execSync('eas build:configure', { stdio: 'pipe' });
    console.log('✅ Build configuration is valid');
} catch (error) {
    console.log('⚠️  Build configuration may need attention');
}

console.log('\n🎉 EAS Setup Complete!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your actual environment variables');
console.log('2. Run: npm run build:apk (to build preview APK)');
console.log('3. Or run: npm run eas:build:preview (direct EAS command)');
console.log('\n📱 Build commands available:');
console.log('   npm run build:apk              - Build preview APK');
console.log('   npm run build:apk:production   - Build production AAB');
console.log('   npm run build:apk:development  - Build development APK');
console.log('\n🔗 EAS Dashboard: https://expo.dev/accounts/[your-account]/projects/TRUKapp');
