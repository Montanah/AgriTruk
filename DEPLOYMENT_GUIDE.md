# AgriTruk Deployment Guide for Render

This guide will help you deploy both the backend (Express.js API) and frontend (React Native/Expo) to Render.

## 🚀 Deployment Overview

You'll be deploying two separate services on Render:
1. **Backend Service** - Express.js API server
2. **Frontend Service** - React Native app exported as web

## 📋 Prerequisites

- GitHub repository with your code
- Render account (free tier available)
- Environment variables ready

## 🔧 Backend Deployment

### 1. Create Backend Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name**: `agritruk-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your preferred branch)
- **Root Directory**: `backend`

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Environment Variables:**
```
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

**Health Check:**
- **Health Check Path**: `/health`

### 2. Backend Configuration Files

The following files have been created/updated:

**`backend/package.json`** - Updated start script:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

**`backend/render.yaml`** - Render configuration:
```yaml
services:
  - type: web
    name: agritruk-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /health
```

## 🌐 Frontend Deployment

### 1. Create Frontend Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name**: `agritruk-frontend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your preferred branch)
- **Root Directory**: `frontend`

**Build & Deploy:**
- **Build Command**: `npm install && npx expo export --platform web`
- **Start Command**: `npx serve dist`

**Environment Variables:**
```
NODE_ENV=production
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_API_BASE_URL=https://agritruk-backend.onrender.com
```

**Health Check:**
- **Health Check Path**: `/`

### 2. Frontend Configuration Files

The following files have been created/updated:

**`frontend/package.json`** - Added build and serve scripts:
```json
{
  "scripts": {
    "build": "expo export --platform web",
    "serve": "npx serve dist"
  },
  "dependencies": {
    "serve": "^14.2.4"
  }
}
```

**`frontend/render.yaml`** - Render configuration:
```yaml
services:
  - type: web
    name: agritruk-frontend
    env: node
    plan: free
    buildCommand: npm install && npx expo export --platform web
    startCommand: npx serve dist
    envVars:
      - key: NODE_ENV
        value: production
    healthCheckPath: /
```

## 🔑 Environment Variables Setup

### Backend Environment Variables

Create these in your Render backend service:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Payment Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
```

### Frontend Environment Variables

Create these in your Render frontend service:

```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://agritruk-backend.onrender.com

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

## 📝 Deployment Steps

### Step 1: Prepare Your Repository

1. Ensure all changes are committed and pushed to your main branch
2. Verify that both `backend/` and `frontend/` folders contain the necessary files

### Step 2: Deploy Backend

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set Root Directory to `backend`
4. Configure build and start commands as specified above
5. Add all required environment variables
6. Deploy the service

### Step 3: Deploy Frontend

1. Create another Web Service on Render
2. Connect the same GitHub repository
3. Set Root Directory to `frontend`
4. Configure build and start commands as specified above
5. Add all required environment variables
6. Deploy the service

### Step 4: Update Frontend API URL

After backend deployment, update the frontend environment variable:
```
EXPO_PUBLIC_API_BASE_URL=https://your-backend-service-url.onrender.com
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility
   - Check build logs for specific errors

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify values are correct

3. **Health Check Failures**
   - Ensure health check endpoints exist
   - Check that services are listening on correct ports
   - Verify CORS settings for frontend-backend communication

### Logs and Monitoring

- Use Render's built-in logging to debug issues
- Check both build logs and runtime logs
- Monitor service health and performance

## 🌍 URLs After Deployment

After successful deployment, you'll have:

- **Backend API**: `https://agritruk-backend.onrender.com`
- **Frontend Web App**: `https://agritruk-frontend.onrender.com`
- **API Documentation**: `https://agritruk-backend.onrender.com/api-docs`

## 📱 Mobile App Distribution

For the React Native mobile app:

1. **Development**: Use Expo Go app with your development server
2. **Production**: Build standalone apps using EAS Build
3. **Distribution**: Use Expo Application Services (EAS) for app store distribution

## 🔄 Continuous Deployment

Render automatically deploys when you push to your connected branch. To update:

1. Make changes to your code
2. Commit and push to your main branch
3. Render will automatically rebuild and redeploy

## 💰 Cost Considerations

- **Free Tier**: Both services can run on Render's free tier
- **Limitations**: Free tier has sleep periods and resource limits
- **Upgrade**: Consider paid plans for production use

## 📞 Support

- Render Documentation: https://render.com/docs
- Expo Documentation: https://docs.expo.dev
- Firebase Documentation: https://firebase.google.com/docs
