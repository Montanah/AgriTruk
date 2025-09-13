#!/bin/bash

# Script to build APK for TRUKAPP
# This script builds production-ready APK for testing

echo "🚀 Building TRUKAPP APK for Production Testing..."

# Navigate to frontend directory
cd /home/clintmadeit/Projects/TRUKAPP/frontend

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged into EAS. Please run: eas login"
    exit 1
fi

# Clean build cache
echo "🧹 Cleaning build cache..."
eas build --platform android --profile testing --clear-cache

echo "📱 Building APK for testing..."
eas build --platform android --profile testing

echo "✅ APK build completed!"
echo "📱 Download the APK from the link above and share with testers."
echo "📱 Testers can install directly on Android devices (enable 'Install from unknown sources')"
