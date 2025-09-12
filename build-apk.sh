#!/bin/bash

# Script to build APK for TRUKAPP
# This script builds and installs the APK on your device

echo "🚀 Building TRUKAPP APK..."

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

echo "📱 Building APK..."
eas build --platform android --profile preview

echo "✅ APK build completed!"
echo "📱 Install the APK on your device using the QR code or download link above."
