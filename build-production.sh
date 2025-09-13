#!/bin/bash

# Production Build Script for TRUKAPP
# This script creates production-ready builds for both Android and iOS

set -e  # Exit on any error

echo "🚀 TRUKAPP Production Build Script"
echo "=================================="

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

# Clean everything first
echo "🧹 Cleaning project..."
rm -rf node_modules/.cache
rm -rf .expo
npm ci

# Clean EAS build cache
echo "🧹 Cleaning EAS build cache..."
eas build --platform all --profile testing --clear-cache

# Build Android APK
echo ""
echo "📱 Building Android APK..."
echo "=========================="
eas build --platform android --profile testing --non-interactive

# Build iOS IPA
echo ""
echo "🍎 Building iOS IPA..."
echo "====================="
eas build --platform ios --profile testing --non-interactive

echo ""
echo "✅ Production builds completed!"
echo "==============================="
echo ""
echo "📱 Android APK:"
echo "   - Download from the link above"
echo "   - Share with testers"
echo "   - Testers need to enable 'Install from unknown sources'"
echo ""
echo "🍎 iOS IPA:"
echo "   - Download from the link above"
echo "   - Share with testers via TestFlight (recommended)"
echo "   - Or use Apple Configurator 2 for direct installation"
echo ""
echo "📋 Next Steps:"
echo "   1. Download both files"
echo "   2. Test on your own devices first"
echo "   3. Share with testers"
echo "   4. Collect feedback"
echo ""
echo "🔗 EAS Dashboard: https://expo.dev/accounts/[your-account]/projects/trukapp/builds"
