#!/bin/bash

# Script to build both APK and IPA for TRUKAPP
# This script builds both Android and iOS apps for production testing

echo "🚀 Building TRUKAPP for both platforms (Production Testing)..."

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
eas build --platform all --profile testing --clear-cache

echo "📱 Building APK (Android)..."
eas build --platform android --profile testing

echo "🍎 Building IPA (iOS)..."
eas build --platform ios --profile testing

echo "✅ Both builds completed!"
echo "📱 Android: Download APK and share with testers (enable 'Install from unknown sources')"
echo "🍎 iOS: Download IPA and share with testers (use TestFlight or trust developer certificate)"
echo "📱 Both files are ready for production testing!"
