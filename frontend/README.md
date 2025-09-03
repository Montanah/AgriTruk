# TRUKAPP Frontend

This folder contains all the frontend-related files for the TRUKAPP project, organized for merging purposes.

## Structure

### Core Application Files

- `App.tsx` - Main React Native application entry point
- `package.json` & `package-lock.json` - Node.js dependencies
- `app.json` - Expo configuration
- `eas.json` - Expo Application Services configuration

### Configuration Files

- `babel.config.js` - Babel transpiler configuration
- `metro.config.js` - Metro bundler configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `expo-env.d.ts` - Expo TypeScript definitions
- `.prettierrc` - Prettier code formatting configuration

### Source Code

- `src/` - Main source code directory
  - `components/` - React Native components
  - `screens/` - Application screens
  - `navigation/` - Navigation configuration
  - `services/` - API and external service integrations
  - `utils/` - Utility functions
  - `constants/` - Application constants
  - `hooks/` - Custom React hooks
  - `context/` - React context providers
  - `types/` - TypeScript type definitions

### Platform-Specific Files

- `android/` - Android-specific configuration and build files
- `assets/` - Static assets (images, fonts, etc.)

### Scripts and Tools

- `scripts/` - Build and utility scripts
- `services/` - Additional service files
- `seed_transporters.js` - Database seeding script

### Documentation

- `GOOGLE_MAPS_SETUP.md` - Google Maps integration guide
- `GOOGLE_MAPS_TROUBLESHOOTING.md` - Google Maps troubleshooting
- `INSTANT_REQUEST_IMPLEMENTATION.md` - Instant request feature documentation
- `REQUEST_LOGGING_GUIDE.md` - API request logging guide
- `TERMINAL_LOGGING_GUIDE.md` - Terminal logging guide
- `TRUK_ICON_THEMES_GUIDE.md` - App icon theming guide
- `APP_ICON_PREVIEW.html` - App icon preview
- `APP_ICON_SETUP.md` - App icon setup guide

## Key Features Implemented

### API Integration

- Comprehensive request/response logging for backend debugging
- Firebase authentication integration
- Google Maps integration for location services
- Subscription management system

### Components

- Transporter management components
- Booking and request management
- Network connectivity testing
- API testing components

### Services

- Location tracking and updates
- Google Maps geocoding and reverse geocoding
- Subscription service integration
- Notification services

## Development Setup

1. Navigate to the frontend directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start` or `expo start`
4. Run on Android: `npm run android`

## Logging and Debugging

The application includes comprehensive logging for:

- API requests and responses
- Google Maps API calls
- Location updates
- Booking and navigation flows

Check the terminal for detailed logs with clear separators for easy identification.

## Backend Integration

The frontend is configured to work with the backend API at:

- Base URL: `https://agritruk-backend.onrender.com`
- All API requests include proper authentication headers
- Comprehensive error handling and logging

## Notes for Merging

This frontend folder contains all the React Native application code and can be merged as a complete frontend module. The backend folder remains separate and contains the Express.js API server.
