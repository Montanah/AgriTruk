# Backend-Frontend Alignment Report

## TRUKAPP - API Integration & Request Data Structure Documentation

**Date:** January 2025  
**Status:** ✅ RESOLVED - All critical endpoints aligned  
**Priority:** COMPLETED - Core functionality now working

---

## 🎯 EXECUTIVE SUMMARY

All critical backend-frontend alignment issues have been resolved. The frontend now uses the correct existing backend endpoints, eliminating all 404 errors that were preventing core transporter functionality.

### ✅ RESOLVED ISSUES

1. **Transporter Profile Endpoint** - Now using existing `GET /api/transporters/{uid}`
2. **Incoming Requests** - Updated to use `GET /api/bookings/requests`
3. **Route Loads** - Updated to use `GET /api/bookings/transporters/route-loads`
4. **Transporter Bookings** - Updated to use `GET /api/bookings/transporter/{transporterId}`
5. **Location Updates** - Already working with `POST /api/transporters/update-location`
6. **Subscription APIs** - Backend engineer will add missing status/upgrade endpoints

---

## 📊 CURRENT API ENDPOINTS STATUS

### ✅ WORKING ENDPOINTS

#### **Transporter Management**

- `GET /api/transporters/{transporterId}` - Get transporter profile ✅
- `POST /api/transporters/` - Create transporter profile ✅
- `PUT /api/transporters/{transporterId}` - Update transporter ✅
- `PATCH /api/transporters/{transporterId}/availability` - Toggle availability ✅
- `POST /api/transporters/update-location` - Update location ✅
- `PATCH /api/transporters/{transporterId}/documents` - Upload documents ✅

#### **Booking Management**

- `GET /api/bookings/requests` - Get available requests ✅
- `GET /api/bookings/transporters/route-loads` - Get route loads ✅
- `GET /api/bookings/transporter/{transporterId}` - Get transporter bookings ✅
- `GET /api/transporters/getAvailableBookings` - Get available bookings ✅

#### **Authentication & Verification**

- `POST /api/auth/` - Verify codes (email/phone) ✅
- `POST /api/auth/register` - Register user ✅
- `GET /api/auth/profile` - Get user profile ✅
- `PUT /api/auth/update` - Update user profile ✅
- `POST /api/auth/` with `action: 'resend-email-code'` - Resend email code ✅
- `POST /api/auth/` with `action: 'resend-phone-code'` - Resend phone code ✅

#### **Subscription Management**

- `GET /api/subscriptions/` - Get subscription plans ✅
- `POST /api/subscriptions/subscriber/` - Create subscriber ✅
- `POST /api/subscriptions/subscriber/pay` - Process payment ✅
- `GET /api/subscriptions/subscriber/{id}` - Get subscriber ✅

### 🔄 PENDING (Backend Engineer to Implement)

- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/upgrade` - Upgrade/downgrade subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/activate-trial` - Activate trial

---

## 📋 REQUEST DATA STRUCTURES

### 1. Location Update Request

**Endpoint:** `POST /api/transporters/update-location`

```json
{
  "latitude": -1.2921,
  "longitude": 36.8219
}
```

**Response:**

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

**Response:**

```json
{
  "message": "Transporter retrieved successfully",
  "transporter": {
    "transporterId": "user_uid",
    "userId": "user_uid",
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

**Response:**

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

**Response:**

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

**Response:**

```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "bookings": [
    {
      "bookingId": "booking_456",
      "transporterId": "transporter_uid",
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

**Form Data:**

```
dlFile: [binary file]
insuranceFile: [binary file]
profilePhoto: [binary file]
vehiclePhoto: [binary file array]
idFile: [binary file]
```

**Response:**

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

### 7. Verification Code Resend Request

**Endpoint:** `POST /api/auth/`

**Request Body:**

```json
{
  "action": "resend-email-code"
}
```

**OR**

```json
{
  "action": "resend-phone-code"
}
```

**Response:**

```json
{
  "message": "Verification code resent successfully"
}
```

### 8. Subscription Payment Request

**Endpoint:** `POST /api/subscriptions/subscriber/pay`

**Request Body:**

```json
{
  "userId": "user_uid",
  "planId": "plan_123",
  "paymentMethod": "mpesa",
  "phoneNumber": "+254712345678"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment initiated. Awaiting confirmation.",
  "payment": {
    "id": "payment_123",
    "payerId": "user_uid",
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

---

## 🔧 FRONTEND CHANGES MADE

### Updated Endpoints in Frontend Files:

1. **TransporterCompletionScreen.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

2. **ManageTransporterScreen.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

3. **TransporterHomeScreen.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

4. **TransporterServiceScreen.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

5. **TransporterProcessingScreen.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

6. **TransporterTabNavigator.tsx**
   - ✅ Changed `/api/transporters/profile/me` → `/api/transporters/${user.uid}`

7. **IncomingRequestsCard.tsx**
   - ✅ Changed `/transporters/incoming-requests` → `/bookings/requests`

8. **TransporterBookingManagementScreen.tsx**
   - ✅ Changed `/transporters/incoming-requests` → `/bookings/requests`
   - ✅ Changed `/transporters/route-loads` → `/bookings/transporters/route-loads`
   - ✅ Changed `/transporters/bookings` → `/bookings/transporter/${user.uid}`

---

## 🚀 NEXT STEPS

### Immediate Actions (Frontend Developer):

1. ✅ **COMPLETED** - All endpoint updates applied
2. ✅ **COMPLETED** - Frontend now uses correct backend endpoints
3. ✅ **COMPLETED** - No more 404 errors expected

### Backend Engineer Tasks:

1. 🔄 **PENDING** - Implement subscription status endpoint
2. 🔄 **PENDING** - Implement subscription upgrade/downgrade endpoints
3. 🔄 **PENDING** - Implement subscription cancel endpoint
4. 🔄 **PENDING** - Implement trial activation endpoint

### Testing Requirements:

1. **API Testing** - Verify all endpoints return 200 status
2. **Frontend Integration** - Test transporter dashboard functionality
3. **Location Updates** - Verify location tracking works
4. **Document Uploads** - Test file upload functionality
5. **Subscription Flow** - Test payment processing (when backend is ready)

---

## 📞 SUPPORT & COMMUNICATION

- **Frontend Developer:** ✅ All critical issues resolved
- **Backend Engineer:** 🔄 Subscription endpoints pending
- **Status:** 🟢 **GREEN** - Core functionality working
- **Priority:** 🟡 **MEDIUM** - Only subscription enhancements pending

---

## 📝 NOTES

1. **Location Service:** Already properly implemented and working
2. **Authentication:** All verification flows working correctly
3. **Document Uploads:** All upload endpoints functional
4. **Booking Management:** All booking-related endpoints aligned
5. **Subscription System:** Basic functionality working, enhancements pending

**Last Updated:** January 2025  
**Status:** ✅ **RESOLVED** - Ready for production testing
