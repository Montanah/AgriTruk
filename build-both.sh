#!/bin/bash

# Script to build both APK and IPA for TRUKAPP
# This script builds both Android and iOS apps for testing

echo "🚀 Building TRUKAPP for both platforms..."

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

echo "📱 Building APK (Android)..."
eas build --platform android --profile preview

echo "🍎 Building IPA (iOS)..."
eas build --platform ios --profile preview

echo "✅ Both builds completed!"
echo "📱 Android: Install the APK on your Android device using the QR code or download link above."
echo "🍎 iOS: Install the IPA on your iOS device using the QR code or download link above."
echo "📱 Note: For iOS, you'll need to trust the developer certificate on your device."
