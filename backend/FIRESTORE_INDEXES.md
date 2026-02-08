# Firestore Indexes Setup

## Problem
The application requires composite indexes for efficient querying of vehicles and drivers by company with ordering.

## Required Indexes

### 1. Vehicles Collection
- **Collection Group**: `vehicles`
- **Fields**: 
  - `companyId` (Ascending)
  - `createdAt` (Descending)

### 2. Drivers Collection  
- **Collection Group**: `drivers`
- **Fields**:
  - `companyId` (Ascending)
  - `createdAt` (Descending)

## Deployment Methods

### Method 1: Firebase CLI (Recommended)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Method 2: Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com/v1/r/project/agritruk-d543b/firestore/indexes)
2. Click "Create Index"
3. For each collection, add the required fields in the specified order

### Method 3: Automatic Creation
The indexes will be automatically created when the queries are first executed, but this may cause temporary errors.

## Files
- `firestore.indexes.json` - Index configuration
- `firebase.json` - Firebase project configuration
- `deploy-indexes.js` - Helper script

## Verification
After deployment, the queries in `vehicleController.js` and `driverController.js` should work without index errors.
