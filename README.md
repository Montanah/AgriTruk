# AgriTruk Mobile App

A comprehensive transportation and logistics platform built with React Native (Expo) and Express.js.

## Project Structure

```
TRUKAPP/
├── frontend/          # React Native mobile application
│   ├── src/          # Source code (components, screens, services)
│   ├── android/      # Android-specific files
│   ├── assets/       # Images, fonts, and static assets
│   └── package.json  # Frontend dependencies
├── backend/          # Express.js API server
│   ├── controllers/  # API route handlers
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   └── services/     # Business logic services
└── docs/            # Documentation files
```

## Features

### Frontend (React Native)
- **Authentication**: Firebase Auth integration
- **Location Services**: Google Maps integration with real-time tracking
- **Transporter Management**: Complete transporter onboarding and management
- **Booking System**: Request creation, assignment, and tracking
- **Subscription Management**: Plan management and payment processing
- **Real-time Updates**: Live location tracking and notifications

### Backend (Express.js)
- **RESTful API**: Complete API for all app functionality
- **Authentication**: JWT-based authentication with role management
- **Database**: Firestore integration for data persistence
- **File Upload**: Cloudinary integration for image/document storage
- **Payment Processing**: Mpesa and card payment integration
- **Real-time Features**: WebSocket support for live updates

## Getting Started

### Frontend Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Run on Android:
   ```bash
   npx expo start --android
   ```

### Backend Development

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

## API Documentation

The backend API is documented with Swagger and available at:
- Development: `http://localhost:3000/api-docs`
- Production: `https://agritruk-backend.onrender.com/api-docs`

## Key Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification

### Transporters
- `GET /api/transporters/available/list` - Get available transporters
- `POST /api/transporters` - Create transporter profile
- `PUT /api/transporters/:id` - Update transporter profile
- `POST /api/transporters/update-location` - Update location

### Bookings
- `POST /api/bookings` - Create booking request
- `GET /api/bookings/requests` - Get booking requests
- `PUT /api/bookings/:id/assign` - Assign transporter

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `POST /api/subscriptions` - Create subscription
- `POST /api/subscriptions/payment` - Process payment

## Environment Setup

### Frontend Environment Variables
Create a `.env` file in the frontend directory:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_API_BASE_URL=https://agritruk-backend.onrender.com
```

### Backend Environment Variables
Create a `.env` file in the backend directory:
```
PORT=3000
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Documentation

- [Transporter Endpoints Implementation](1_TRANSPORTER_ENDPOINTS_IMPLEMENTATION.md)
- [Location System Implementation](2_LOCATION_SYSTEM_IMPLEMENTATION.md)
- [Subscription System Implementation](3_SUBSCRIPTION_SYSTEM_IMPLEMENTATION.md)
- [Backend-Frontend Alignment Report](BACKEND_FRONTEND_ALIGNMENT_REPORT.md)
- [Production Readiness Summary](PRODUCTION_READINESS_SUMMARY.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
