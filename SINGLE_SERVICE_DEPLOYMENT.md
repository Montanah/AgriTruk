# Single Service Deployment - Backend API Only

## 🎯 **Correct Setup for Your Use Case**

You want to deploy **ONLY the backend API** on Render, while the frontend is a **React Native mobile app** that runs on Android and iPhone devices.

## 🚀 **Render Service Configuration**

### **Service Type**: `Web Service`
### **Root Directory**: `backend`
### **Environment**: `Node`
### **Plan**: `Free`

## 📋 **Build and Run Commands**

### **Build Command**:
```bash
npm install
```

### **Start Command**:
```bash
npm start
```

## 🔧 **Complete Render Settings**

1. **Service Name**: `agritruk-backend`
2. **Root Directory**: `backend` ⚠️ **CRITICAL**
3. **Environment**: `Node`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Auto-Deploy**: `On Commit`
7. **Plan**: `Free`

## 🌐 **Environment Variables**

Add these in Render dashboard:

### **Required Backend Environment Variables**:
```
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

## 📱 **Frontend Mobile App Setup**

### **For Android Development**:
```bash
cd frontend
npm install
npx expo start
# Scan QR code with Expo Go app on Android
```

### **For iPhone Development**:
```bash
cd frontend
npm install
npx expo start
# Scan QR code with Expo Go app on iPhone
```

### **For Production Mobile App**:
```bash
# Build Android APK
cd frontend
npx expo build:android

# Build iOS App (requires macOS)
cd frontend
npx expo build:ios
```

## 🔗 **Frontend Configuration**

### **Update Frontend Environment Variables**:
Create `frontend/.env`:
```
EXPO_PUBLIC_API_URL=https://agritruk-backend.onrender.com
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## 🎯 **Expected URLs**

- **Backend API**: `https://agritruk-backend.onrender.com`
- **Health Check**: `https://agritruk-backend.onrender.com/api/health`
- **API Documentation**: `https://agritruk-backend.onrender.com/api-docs`

## 📱 **Mobile App Access**

### **Development Testing**:
1. **Install Expo Go** on your Android/iPhone
2. **Start Frontend**: `cd frontend && npm start`
3. **Scan QR Code** with Expo Go app
4. **App loads** on your mobile device

### **Production Distribution**:
1. **Build APK/IPA** using Expo build tools
2. **Distribute** via Google Play Store / App Store
3. **Or share APK** directly for testing

## 🚨 **Critical Points**

1. **Only Backend on Render**: Frontend is mobile app, not web app
2. **Root Directory**: Must be `backend` (not empty)
3. **Build Command**: `npm install` (installs backend dependencies)
4. **Start Command**: `npm start` (starts backend server)
5. **Frontend**: Runs on mobile devices, connects to Render backend

## 🔧 **Troubleshooting**

### **If Backend Not Loading**:
1. **Check Root Directory**: Must be `backend`
2. **Check Environment Variables**: All required variables set
3. **Check Logs**: Go to "Logs" tab in Render dashboard
4. **Check Build Command**: Must be `npm install`
5. **Check Start Command**: Must be `npm start`

### **If Mobile App Can't Connect**:
1. **Check API URL**: Must be `https://agritruk-backend.onrender.com`
2. **Check Network**: Ensure mobile device has internet
3. **Check CORS**: Backend should allow mobile app requests
4. **Check Environment Variables**: Frontend .env file configured

## 📋 **Deployment Checklist**

- [ ] Render service created with `backend` root directory
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Environment variables added
- [ ] Backend deployed successfully
- [ ] Health check working: `/api/health`
- [ ] Frontend .env configured with backend URL
- [ ] Mobile app can connect to backend API

## 🎯 **Summary**

- **Render**: Deploy backend API only
- **Mobile**: React Native app runs on Android/iPhone
- **Connection**: Mobile app connects to Render backend API
- **Development**: Use Expo Go for testing
- **Production**: Build APK/IPA for distribution

This setup gives you a scalable backend API on Render and native mobile apps for Android and iPhone!
