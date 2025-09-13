#!/bin/bash

# Script to build IPA for TRUKAPP
# This script builds production-ready IPA for testing

echo "🍎 Building TRUKAPP IPA for Production Testing..."

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
eas build --platform ios --profile testing --clear-cache

echo "📱 Building IPA for testing..."
eas build --platform ios --profile testing

echo "✅ IPA build completed!"
echo "🍎 Download the IPA from the link above and share with testers."
echo "📱 Testers need to install via TestFlight or Apple Configurator 2"
echo "📱 Note: For direct installation, testers need to trust the developer certificate"
