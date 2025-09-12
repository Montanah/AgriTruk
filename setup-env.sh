#!/bin/bash

# Script to set up environment variables for TRUKAPP
# This script helps you configure the necessary environment variables

echo "🔧 Setting up TRUKAPP environment variables..."

# Navigate to frontend directory
cd /home/clintmadeit/Projects/TRUKAPP/frontend

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file with template
cat > .env << 'EOF'
# TRUKAPP Environment Variables
# Replace the placeholder values with your actual API keys

# Backend API URL
EXPO_PUBLIC_API_URL=https://agritruk.onrender.com

# Google Maps API Key (Required for location services)
# Get this from: https://console.cloud.google.com/apis/credentials
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Firebase Configuration (Required for authentication and database)
# Get these from: https://console.firebase.google.com/project/agritruk-d543b/settings/general
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=agritruk-d543b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=agritruk-d543b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=agritruk-d543b.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Optional: Push Notifications (if using custom FCM)
# EXPO_PUBLIC_FCM_SERVER_KEY=your_fcm_server_key_here
EOF

echo "✅ .env file created with template values"
echo ""
echo "🔧 Next steps:"
echo "1. Edit the .env file and replace the placeholder values with your actual API keys"
echo "2. Get Google Maps API key from: https://console.cloud.google.com/apis/credentials"
echo "3. Get Firebase config from: https://console.firebase.google.com/project/agritruk-d543b/settings/general"
echo "4. Run the build scripts to create APK/IPA files"
echo ""
echo "📝 To edit the .env file, run: nano .env"
echo "📝 Or use your preferred text editor: code .env"
