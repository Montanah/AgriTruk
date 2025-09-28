#!/bin/bash

echo "🚀 Setting up Firestore indexes for AgriTruk"
echo "============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    firebase login
fi

echo "📋 Deploying Firestore indexes..."
echo "This will create the following indexes:"
echo "1. vehicles: companyId (ASC) + createdAt (DESC)"
echo "2. drivers: companyId (ASC) + createdAt (DESC)"
echo ""

# Deploy the indexes
firebase deploy --only firestore:indexes

echo ""
echo "✅ Index deployment complete!"
echo "🔗 You can also create them manually at:"
echo "   https://console.firebase.google.com/v1/r/project/agritruk-d543b/firestore/indexes"
echo ""
echo "📊 After deployment, the fleet management should work without errors."

