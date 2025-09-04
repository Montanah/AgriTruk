#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 TRUKAPP APK Build Script');
console.log('============================\n');

// Check if EAS CLI is installed
try {
    execSync('eas --version', { stdio: 'pipe' });
    console.log('✅ EAS CLI is installed');
} catch (error) {
    console.log('❌ EAS CLI is not installed. Installing...');
    execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
    console.log('✅ EAS CLI installed successfully');
}

// Check if user is logged in to EAS
try {
    execSync('eas whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to EAS');
} catch (error) {
    console.log('❌ Not logged in to EAS. Please log in:');
    console.log('Run: eas login');
    process.exit(1);
}

// Check environment variables
const requiredEnvVars = [
    'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
];

console.log('\n🔍 Checking environment variables...');
const missingVars = [];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
    });
    console.log('\nPlease set these environment variables before building.');
    process.exit(1);
}
console.log('✅ All required environment variables are set');

// Build options
const buildProfiles = {
    'preview': {
        description: 'Preview APK for testing (recommended for testers)',
        command: 'eas build --platform android --profile preview'
    },
    'production': {
        description: 'Production AAB for Play Store',
        command: 'eas build --platform android --profile production'
    },
    'development': {
        description: 'Development build with debugging',
        command: 'eas build --platform android --profile development'
    }
};

// Parse command line arguments
const args = process.argv.slice(2);
const profile = args[0] || 'preview';

if (!buildProfiles[profile]) {
    console.log('❌ Invalid build profile. Available profiles:');
    Object.keys(buildProfiles).forEach(key => {
        console.log(`   - ${key}: ${buildProfiles[key].description}`);
    });
    process.exit(1);
}

console.log(`\n📱 Building ${profile} APK...`);
console.log(`Description: ${buildProfiles[profile].description}`);
console.log(`Command: ${buildProfiles[profile].command}\n`);

// Create build directory
const buildDir = path.join(__dirname, '..', 'builds');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

// Run the build
try {
    console.log('🏗️  Starting build process...');
    console.log('This may take 10-15 minutes. Please wait...\n');
    
    execSync(buildProfiles[profile].command, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
    
    console.log('\n✅ Build completed successfully!');
    console.log('📱 Your APK will be available in the EAS dashboard:');
    console.log('   https://expo.dev/accounts/[your-account]/projects/TRUKapp/builds');
    console.log('\n📋 Next steps:');
    console.log('1. Go to the EAS dashboard link above');
    console.log('2. Download the APK file');
    console.log('3. Share the APK with your testers');
    console.log('4. Testers can install it directly on their Android devices');
    
} catch (error) {
    console.log('\n❌ Build failed!');
    console.log('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Ensure all environment variables are set');
    console.log('3. Try running: eas build --clear-cache');
    console.log('4. Check EAS dashboard for detailed error logs');
    process.exit(1);
}
