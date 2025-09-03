# Build and Run Commands for AgriTruk

This guide provides all the commands needed to build, run, and deploy the AgriTruk application.

## 🏗️ Build and Run Commands

### Backend (Express.js API)

#### Local Development
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run in development mode (with auto-restart)
npm run dev

# OR run in production mode
npm start
```

#### Production Build (for Render)
```bash
# Build command (Render will run this)
npm install

# Start command (Render will run this)
npm start
```

**Backend will be available at:**
- Local: `http://localhost:3000`
- Render: `https://agritruk-backend.onrender.com`

### Frontend (React Native + Expo)

#### Local Development

##### For Mobile Development (Android/iOS)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start
# OR
npx expo start

# For Android specifically
npm run android
# OR
npx expo run:android

# For iOS specifically
npm run ios
# OR
npx expo run:ios
```

##### For Web Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start web development server
npm run web
# OR
npx expo start --web
```

#### Production Build (for Render Web Service)
```bash
# Build command (Render will run this)
npm install && npx expo export --platform web

# Start command (Render will run this)
npx serve dist
```

**Frontend will be available at:**
- Local Web: `http://localhost:8081`
- Local Mobile: Expo Go app or development build
- Render: `https://agritruk-frontend.onrender.com`

## 📱 How to Access the App on Mobile Phones

### Option 1: Expo Go App (Recommended for Development)

#### Step 1: Install Expo Go
- **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)

#### Step 2: Start Development Server
```bash
cd frontend
npm start
```

#### Step 3: Connect Your Phone
1. **Same WiFi Network**: Ensure your phone and computer are on the same WiFi network
2. **Scan QR Code**: Use Expo Go app to scan the QR code displayed in terminal
3. **Alternative**: Enter the URL manually in Expo Go app

#### Step 4: Access the App
- The app will load on your phone through Expo Go
- Any changes you make will hot-reload automatically

### Option 2: Development Build (For Production-like Testing)

#### For Android
```bash
cd frontend

# Build and install on connected Android device
npx expo run:android

# OR build APK
npx expo build:android
```

#### For iOS (macOS only)
```bash
cd frontend

# Build and install on connected iOS device
npx expo run:ios

# OR build for App Store
npx expo build:ios
```

### Option 3: Web Version on Mobile Browser

#### Deployed Version
1. Open mobile browser
2. Navigate to: `https://agritruk-frontend.onrender.com`
3. Add to home screen for app-like experience

#### Local Development
1. Start web server: `npm run web`
2. Find your computer's IP address
3. Open mobile browser and go to: `http://YOUR_IP:8081`

## 🌐 Render Deployment Commands

### Backend Service Configuration
```yaml
# render.yaml (already configured)
serviceId: agritruk-backend
type: web
name: agritruk-backend
rootDir: backend
buildCommand: npm install
startCommand: npm start
healthCheckPath: /health
```

### Frontend Service Configuration
```yaml
# render.yaml (already configured)
serviceId: agritruk-frontend
type: web
name: agritruk-frontend
rootDir: frontend
buildCommand: npm install && npx expo export --platform web
startCommand: npx serve dist
healthCheckPath: /
```

## 🔧 Environment Setup Commands

### Backend Environment Variables
```bash
# Create .env file in backend directory
cd backend
touch .env

# Add required variables (see DEPLOYMENT_GUIDE.md for full list)
echo "PORT=3000" >> .env
echo "NODE_ENV=production" >> .env
# ... add other variables
```

### Frontend Environment Variables
```bash
# Create .env file in frontend directory
cd frontend
touch .env

# Add required variables
echo "EXPO_PUBLIC_API_URL=https://agritruk-backend.onrender.com" >> .env
# ... add other variables
```

## 📋 Complete Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/Montanah/AgriTruk.git
cd AgriTruk

# Setup backend
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev

# Setup frontend (in new terminal)
cd frontend
npm install
cp .env.example .env  # Configure environment variables
npm start
```

### 2. Mobile Development
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in new terminal)
cd frontend && npm start

# Scan QR code with Expo Go app on your phone
```

### 3. Production Deployment
```bash
# Push to main branch (triggers automatic deployment)
git add .
git commit -m "Your changes"
git push origin main

# Render automatically builds and deploys both services
```

## 🚀 Quick Start Commands

### For Local Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (in new terminal)
cd frontend && npm install && npm start
```

### For Production Build
```bash
# Backend
cd backend && npm install && npm start

# Frontend
cd frontend && npm install && npm run build && npm run serve
```

### For Mobile Testing
```bash
# Start development server
cd frontend && npm start

# Use Expo Go app to scan QR code
# OR build development APK
npx expo run:android
```

## 📱 Mobile App Distribution

### Development Testing
- **Expo Go**: Quick testing with hot reload
- **Development Build**: Production-like testing
- **Web Version**: Cross-platform testing

### Production Distribution
- **Android**: Build APK or AAB for Google Play Store
- **iOS**: Build for App Store Connect
- **Web**: Deploy to Render for web access

## 🔍 Troubleshooting Commands

### Clear Cache
```bash
# Frontend
cd frontend
npx expo start --clear

# Backend
cd backend
rm -rf node_modules
npm install
```

### Check Dependencies
```bash
# Frontend
cd frontend
npm audit
npm outdated

# Backend
cd backend
npm audit
npm outdated
```

### Reset Project
```bash
# Frontend
cd frontend
npm run reset-project
```

## 📞 Support Commands

### Check Service Status
```bash
# Backend health check
curl https://agritruk-backend.onrender.com/health

# Frontend status
curl https://agritruk-frontend.onrender.com
```

### View Logs
```bash
# Local development logs
# Backend: Check terminal where npm run dev is running
# Frontend: Check terminal where npm start is running

# Render logs: Check Render dashboard
```

Remember: The main branch is configured for automatic deployment on Render!
