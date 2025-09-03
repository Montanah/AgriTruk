# Request Logging Guide for Backend Engineer

## TRUKAPP - Frontend Request Data Documentation

### 🚀 ENHANCED LOGGING IMPLEMENTED

**All API requests now include comprehensive logging with clear separators and detailed information for the backend engineer.**

**Purpose:** This document shows the exact request data structure and logging format that the frontend sends to the backend APIs.

---

## 🔍 LOGGING FORMAT

All API requests now include comprehensive logging with the following format:

### Enhanced Request Logging Format:

```
================================================================================
🚀 [REQUEST_TYPE] REQUEST FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: [FULL_ENDPOINT_URL]
📋 Method: [HTTP_METHOD]
⏰ Request Timestamp: [ISO_TIMESTAMP]
🔑 Auth Token Present: YES/NO
🔑 Token Preview: [FIRST_30_CHARS]...
👤 User UID: [USER_ID]
📋 Request Headers: [JSON_HEADERS]
📦 Request Body: [JSON_FORMATTED_BODY]
================================================================================
```

### Enhanced Response Logging Format:

```
================================================================================
📊 [REQUEST_TYPE] RESPONSE FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: [FULL_ENDPOINT_URL]
📋 Response Status: [HTTP_STATUS] [STATUS_TEXT]
⏰ Response Timestamp: [ISO_TIMESTAMP]
📋 Response Headers: [JSON_HEADERS]
📦 Response Data: [JSON_FORMATTED_RESPONSE]
✅/❌ [SUCCESS/ERROR_MESSAGE]
================================================================================
```

### Enhanced Error Logging Format:

```
================================================================================
❌ [REQUEST_TYPE] ERROR FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: [FULL_ENDPOINT_URL]
📋 Method: [HTTP_METHOD]
⏰ Error Timestamp: [ISO_TIMESTAMP]
❌ Error Name: [ERROR_NAME]
❌ Error Message: [ERROR_MESSAGE]
❌ Error Stack: [ERROR_STACK]
❌ Error Cause: [ERROR_CAUSE]
================================================================================
```

---

## 📋 REQUEST DATA STRUCTURES

### 1. Location Update Request

**Endpoint:** `POST /api/transporters/update-location`

**Frontend Logs:**

```
🚀 LOCATION UPDATE REQUEST:
📍 Endpoint: https://agritruk-backend.onrender.com/api/transporters/update-location
📋 Method: POST
📦 Request Body: {
  "latitude": -1.2921,
  "longitude": 36.8219
}
🔑 Auth Token: eyJhbGciOiJSUzI1NiIs...
👤 User UID: O955xz5IsSdrZxkPyQrVeejYiYy2
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "location": {
      "latitude": -1.2921,
      "longitude": 36.8219
    },
    "timestamp": "2025-01-XX..."
  }
}
```

### 2. Transporter Profile Request

**Endpoint:** `GET /api/transporters/{transporterId}`

**Frontend Logs:**

```
🚀 TRANSPORTER PROFILE REQUEST:
📍 Endpoint: https://agritruk-backend.onrender.com/api/transporters/O955xz5IsSdrZxkPyQrVeejYiYy2
📋 Method: GET
🔑 Auth Token: eyJhbGciOiJSUzI1NiIs...
👤 User UID: O955xz5IsSdrZxkPyQrVeejYiYy2
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "message": "Transporter retrieved successfully",
  "transporter": {
    "transporterId": "O955xz5IsSdrZxkPyQrVeejYiYy2",
    "userId": "O955xz5IsSdrZxkPyQrVeejYiYy2",
    "transporterType": "individual",
    "displayName": "John Doe",
    "phoneNumber": "+254712345678",
    "email": "john@example.com",
    "vehicleType": "truck",
    "vehicleRegistration": "KAA 123A",
    "vehicleMake": "Isuzu",
    "vehicleModel": "NPR",
    "vehicleYear": 2020,
    "vehicleCapacity": 3000,
    "vehicleImagesUrl": ["image1.jpg", "image2.jpg"],
    "humidityControl": true,
    "refrigerated": false,
    "driverLicense": "license_url",
    "insuranceUrl": "insurance_url",
    "driverIdUrl": "id_url",
    "acceptingBooking": false,
    "status": "pending",
    "totalTrips": 0,
    "rating": 0,
    "currentRoute": [],
    "lastKnownLocation": null,
    "createdAt": "2025-01-XX...",
    "updatedAt": "2025-01-XX..."
  }
}
```

### 3. Available Requests Request

**Endpoint:** `GET /api/bookings/requests`

**Frontend Logs:**

```
🚀 API Request: https://agritruk-backend.onrender.com/api/bookings/requests
📋 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
📦 Body: No body
🔧 Method: GET
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Available bookings retrieved successfully",
  "availableBookings": [
    {
      "bookingId": "booking_123",
      "userId": "client_uid",
      "fromLocation": "Nairobi",
      "toLocation": "Mombasa",
      "productType": "Agricultural Produce",
      "weight": "2000 kg",
      "isPerishable": true,
      "specialRequirements": ["refrigerated"],
      "urgency": "high",
      "estimatedValue": 50000,
      "status": "pending",
      "createdAt": "2025-01-XX...",
      "client": {
        "name": "Client Name",
        "rating": 4.5,
        "completedOrders": 25
      }
    }
  ]
}
```

### 4. Route Loads Request

**Endpoint:** `GET /api/bookings/transporters/route-loads`

**Frontend Logs:**

```
🚀 API Request: https://agritruk-backend.onrender.com/api/bookings/transporters/route-loads
📋 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
📦 Body: No body
🔧 Method: GET
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Route loads retrieved successfully",
  "routeLoads": [
    {
      "bookingId": "route_123",
      "userId": "client_uid",
      "fromLocation": "Kisumu",
      "toLocation": "Nairobi",
      "productType": "Cargo",
      "weight": "1500 kg",
      "schedule": {
        "pickupDate": "2025-01-XX...",
        "deliveryDate": "2025-01-XX...",
        "flexibility": "flexible"
      },
      "status": "available",
      "createdAt": "2025-01-XX..."
    }
  ]
}
```

### 5. Transporter Bookings Request

**Endpoint:** `GET /api/bookings/transporter/{transporterId}`

**Frontend Logs:**

```
🚀 API Request: https://agritruk-backend.onrender.com/api/bookings/transporter/O955xz5IsSdrZxkPyQrVeejYiYy2
📋 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
📦 Body: No body
🔧 Method: GET
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "bookings": [
    {
      "bookingId": "booking_456",
      "transporterId": "O955xz5IsSdrZxkPyQrVeejYiYy2",
      "userId": "client_uid",
      "fromLocation": "Nairobi",
      "toLocation": "Kisumu",
      "productType": "Agricultural Produce",
      "weight": "1000 kg",
      "status": "active",
      "pricing": {
        "total": 25000,
        "paid": 12500,
        "pending": 12500
      },
      "schedule": {
        "pickupDate": "2025-01-XX...",
        "deliveryDate": "2025-01-XX..."
      },
      "createdAt": "2025-01-XX...",
      "updatedAt": "2025-01-XX..."
    }
  ]
}
```

### 6. Document Upload Request

**Endpoint:** `PATCH /api/transporters/{transporterId}/documents`

**Frontend Logs:**

```
🚀 API Request: https://agritruk-backend.onrender.com/api/transporters/O955xz5IsSdrZxkPyQrVeejYiYy2/documents
📋 Headers: {
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
📦 Body: [FormData with files]
🔧 Method: PATCH
⏰ Timestamp: 2025-01-XX...
```

**Form Data Structure:**

```
dlFile: [binary file - Driver License]
insuranceFile: [binary file - Insurance Document]
profilePhoto: [binary file - Profile Photo]
vehiclePhoto: [binary file array - Vehicle Photos]
idFile: [binary file - ID Document]
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Documents updated successfully",
  "updateData": {
    "driverLicense": "new_license_url",
    "insuranceUrl": "new_insurance_url",
    "driverProfileImage": "new_profile_url",
    "vehicleImagesUrl": ["vehicle1.jpg", "vehicle2.jpg"],
    "driverIdUrl": "new_id_url"
  }
}
```

### 7. Subscription Status Request

**Endpoint:** `GET /api/subscriptions/status`

**Frontend Logs:**

```
🚀 SUBSCRIPTION STATUS REQUEST:
📍 Endpoint: https://agritruk-backend.onrender.com/api/subscriptions/status
📋 Method: GET
🔑 Auth Token: eyJhbGciOiJSUzI1NiIs...
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "hasActiveSubscription": true,
  "isTrialActive": false,
  "needsTrialActivation": false,
  "currentPlan": {
    "id": "plan_123",
    "name": "Premium Monthly",
    "price": 5000,
    "duration": 1,
    "currency": "KES",
    "features": ["unlimited_bookings", "priority_support"],
    "isActive": true
  },
  "daysRemaining": 15,
  "subscriptionStatus": "active"
}
```

### 8. Subscription Payment Request

**Endpoint:** `POST /api/subscriptions/subscriber/pay`

**Frontend Logs:**

```
🚀 SUBSCRIPTION PAYMENT REQUEST:
📍 Endpoint: https://agritruk-backend.onrender.com/api/subscriptions/subscriber/pay
📋 Method: POST
📦 Request Body: {
  "userId": "O955xz5IsSdrZxkPyQrVeejYiYy2",
  "planId": "plan_123",
  "paymentMethod": "mpesa",
  "phoneNumber": "+254712345678"
}
🔑 Auth Token: eyJhbGciOiJSUzI1NiIs...
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "success": true,
  "message": "Payment initiated. Awaiting confirmation.",
  "payment": {
    "id": "payment_123",
    "payerId": "O955xz5IsSdrZxkPyQrVeejYiYy2",
    "amount": 5000,
    "currency": "KES",
    "method": "mpesa",
    "status": "pending",
    "gatewayResponse": {
      "CheckoutRequestID": "ws_CO_123456789"
    }
  }
}
```

### 9. Verification Code Resend Request

**Endpoint:** `POST /api/auth/`

**Frontend Logs:**

```
🚀 API Request: https://agritruk-backend.onrender.com/api/auth/
📋 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
📦 Body: {
  "action": "resend-email-code"
}
🔧 Method: POST
⏰ Timestamp: 2025-01-XX...
```

**Expected Backend Response:**

```json
{
  "message": "Verification code resent successfully"
}
```

---

## 🔧 IMPLEMENTATION NOTES

### Authentication Token Format:

- **Type:** Firebase JWT Token
- **Format:** `Bearer eyJhbGciOiJSUzI1NiIs...`
- **Expiry:** 1 hour (auto-refreshed by frontend)

### User ID Format:

- **Type:** Firebase UID
- **Format:** `O955xz5IsSdrZxkPyQrVeejYiYy2`
- **Length:** 28 characters
- **Used in:** All transporter-specific endpoints

### Error Response Format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE" // Optional
}
```

### Success Response Format:

```json
{
  "success": true,
  "message": "Success description",
  "data": {
    /* response data */
  }
}
```

---

## 📱 TESTING INSTRUCTIONS

1. **Enable Console Logging:** Open browser dev tools or React Native debugger
2. **Trigger Actions:** Perform actions that make API calls
3. **Copy Logs:** Copy the formatted request/response logs
4. **Share with Backend:** Send logs to backend engineer for analysis

### Key Actions to Test:

- ✅ Login and get transporter profile
- ✅ Update location (automatic every 30 seconds)
- ✅ Fetch available requests
- ✅ Fetch route loads
- ✅ Fetch transporter bookings
- ✅ Upload documents
- ✅ Check subscription status
- ✅ Process subscription payment
- ✅ Resend verification codes

---

## 📞 CONTACT

**Frontend Developer:** Ready to provide additional logs as needed  
**Backend Engineer:** Use this data to verify request format and implement missing endpoints  
**Status:** 🟢 **READY** - All logging implemented and documented

## 🔍 HOW TO EXTRACT LOGS FOR BACKEND ENGINEER

### 1. **Console Logs in Development**

- Open your React Native development console
- Look for logs with `================================================================================` separators
- Copy the entire log block between separators

### 2. **Log Categories to Share**

- **API Requests**: All requests to backend endpoints
- **Location Updates**: Transporter location data being sent
- **Authentication**: Login/signup requests and responses
- **Subscription**: Payment and subscription status requests
- **Transporter Profile**: Profile fetch and update requests

### 3. **What to Share with Backend Engineer**

- **Request logs**: Show exactly what data is being sent
- **Response logs**: Show what the backend is returning
- **Error logs**: Show any failures and their details
- **Headers**: Show authentication tokens and content types
- **Timestamps**: Show when requests are made

### 4. **Example Log Block to Share**

```
================================================================================
🚀 LOCATION UPDATE REQUEST FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: https://agritruk-backend.onrender.com/api/transporters/update-location
📋 Method: POST
⏰ Request Timestamp: 2025-01-03T17:44:23.710Z
🔑 Auth Token Present: YES
🔑 Token Preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
👤 User UID: O955xz5IsSdrZxkPyQrVeejYiYy2
📦 Request Body: {
  "latitude": -1.2921,
  "longitude": 36.8219
}
================================================================================
```

**Last Updated:** January 2025
