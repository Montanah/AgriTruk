#!/bin/bash

# Script to build IPA for TRUKAPP
# This script builds the iOS app for testing

echo "🍎 Building TRUKAPP IPA..."

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

echo "📱 Building IPA..."
eas build --platform ios --profile preview

echo "✅ IPA build completed!"
echo "🍎 Install the IPA on your iOS device using the QR code or download link above."
echo "📱 Note: You'll need to trust the developer certificate on your iOS device."
