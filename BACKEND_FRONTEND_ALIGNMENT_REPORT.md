# Backend-Frontend Alignment Report

## TRUKAPP - Critical Issues & Implementation Requirements

**Date:** September 1, 2025  
**Status:** URGENT - Multiple 404 errors preventing core functionality  
**Priority:** HIGH - App cannot function without these endpoints

---

## 🚨 **CRITICAL ISSUES - IMMEDIATE ATTENTION REQUIRED**

### 1. **Missing API Endpoints (404 Errors)**

The frontend is receiving 404 errors for several critical endpoints that are essential for the transporter dashboard functionality.

#### **1.1 Transporter Profile Endpoint**

**Frontend Expectation:**

```typescript
// Multiple screens are calling this endpoint
const res = await fetch(`https://agritruk-backend.onrender.com/api/transporters/profile/me`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**Current Status:** ❌ **404 ERROR - Endpoint does not exist**

**Files Affected:**

- `src/screens/TransporterServiceScreen.tsx:39`
- `src/screens/auth/TransporterCompletionScreen.tsx:125`
- `src/screens/TransporterProcessingScreen.tsx:42`
- `src/screens/TransporterHomeScreen.tsx:23`
- `src/screens/ManageTransporterScreen.tsx:113`
- `src/navigation/TransporterTabNavigator.tsx:72`

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/profile/me',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getTransporterProfile,
);

// Add to backend/controllers/transporterController.js
exports.getTransporterProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const transporter = await Transporter.getByUserId(userId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    res.status(200).json({
      success: true,
      transporter: transporter,
    });
  } catch (error) {
    console.error('Get transporter profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

#### **1.2 Incoming Requests Endpoint**

**Frontend Expectation:**

```typescript
// IncomingRequestsCard.tsx - Line 128
const data = await apiRequest('/transporters/incoming-requests');
```

**Current Status:** ❌ **404 ERROR - Endpoint does not exist**

**Files Affected:**

- `src/components/TransporterService/IncomingRequestsCard.tsx:128`
- `src/screens/TransporterBookingManagementScreen.tsx:131`

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/incoming-requests',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getIncomingRequests,
);

// Add to backend/controllers/transporterController.js
exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    const transporter = await Transporter.getByUserId(userId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    // Get available requests based on transporter capabilities
    const requests = await Request.find({
      status: 'pending',
      // Add filtering logic based on transporter capabilities
      // - Service type (agriTRUK, cargoTRUK)
      // - Location proximity
      // - Vehicle type compatibility
      // - Special requirements matching
    });

    res.status(200).json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

#### **1.3 Route Loads Endpoint**

**Frontend Expectation:**

```typescript
// TransporterBookingManagementScreen.tsx - Line 135
const routeLoads = await apiRequest('/transporters/route-loads');
```

**Current Status:** ❌ **404 ERROR - Endpoint does not exist**

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/route-loads',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getRouteLoads,
);

// Add to backend/controllers/transporterController.js
exports.getRouteLoads = async (req, res) => {
  try {
    const userId = req.user.uid;
    const transporter = await Transporter.getByUserId(userId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    // Get route-based load opportunities
    const routeLoads = await RouteLoad.find({
      status: 'available',
      // Add filtering logic for route compatibility
      // - Origin/destination proximity
      // - Schedule compatibility
      // - Capacity requirements
    });

    res.status(200).json({
      success: true,
      routeLoads: routeLoads,
    });
  } catch (error) {
    console.error('Get route loads error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

#### **1.4 Transporter Bookings Endpoint**

**Frontend Expectation:**

```typescript
// TransporterBookingManagementScreen.tsx - Line 139
const bookings = await apiRequest('/transporters/bookings');
```

**Current Status:** ❌ **404 ERROR - Endpoint does not exist**

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/bookings',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getTransporterBookings,
);

// Add to backend/controllers/transporterController.js
exports.getTransporterBookings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const transporter = await Transporter.getByUserId(userId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    // Get transporter's current and past bookings
    const bookings = await Booking.find({
      transporterId: userId,
      // Add status filtering if needed
      // - active, completed, cancelled
    }).populate('client', 'name email phone');

    res.status(200).json({
      success: true,
      bookings: bookings,
    });
  } catch (error) {
    console.error('Get transporter bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

#### **1.5 Drivers and Vehicles Endpoints**

**Frontend Expectation:**

```typescript
// ManageTransporterScreen.tsx - Lines 53, 57
const driversData = await apiRequest('/transporters/drivers');
const vehiclesData = await apiRequest('/transporters/vehicles');
```

**Current Status:** ❌ **404 ERROR - Endpoints do not exist**

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/drivers',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getTransporterDrivers,
);
router.get(
  '/vehicles',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getTransporterVehicles,
);

// Add to backend/controllers/transporterController.js
exports.getTransporterDrivers = async (req, res) => {
  try {
    const userId = req.user.uid;
    const drivers = await Driver.find({ transporterId: userId });

    res.status(200).json({
      success: true,
      drivers: drivers,
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.getTransporterVehicles = async (req, res) => {
  try {
    const userId = req.user.uid;
    const vehicles = await Vehicle.find({ transporterId: userId });

    res.status(200).json({
      success: true,
      vehicles: vehicles,
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

#### **1.6 Assigned Jobs by Type Endpoint**

**Frontend Expectation:**

```typescript
// UseAssignedJobs.ts - Line 18
const data = await apiRequest(`/bookings/${type}/transporter`);
```

**Current Status:** ❌ **404 ERROR - Endpoint does not exist**

**Required Implementation:**

```javascript
// Add to backend/routes/transportRoutes.js
router.get(
  '/bookings/:type/transporter',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getAssignedJobsByType,
);

// Add to backend/controllers/transporterController.js
exports.getAssignedJobsByType = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type } = req.params; // 'agri' or 'cargo'

    const transporter = await Transporter.getByUserId(userId);
    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    // Get assigned jobs filtered by type
    const jobs = await Booking.find({
      transporterId: userId,
      serviceType: type === 'agri' ? 'agriTRUK' : 'cargoTRUK',
      // Add status filtering if needed
      // - active, pending, completed, cancelled
    }).populate('client', 'name email phone');

    res.status(200).json({
      success: true,
      jobs: jobs,
    });
  } catch (error) {
    console.error('Get assigned jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

---

## 🔧 **AUTHENTICATION & VERIFICATION ISSUES**

### 2. **Missing Verification Code Resend Endpoints**

The frontend has verification screens but no way to resend codes when they expire.

#### **2.1 Email Verification Resend**

**Required Implementation:**

```javascript
// Add to backend/routes/authRoutes.js
router.post('/resend-email-code', authenticateToken, authController.resendEmailCode);

// Add to backend/controllers/authController.js
exports.resendEmailCode = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userData = await User.get(uid);

    // Check if email is already verified
    if (userData.emailVerified) {
      return res.status(400).json({
        code: 'ERR_ALREADY_VERIFIED',
        message: 'Email is already verified',
      });
    }

    const newCode = generateOtp();

    await User.update(uid, {
      emailVerificationCode: newCode,
      verificationExpires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Send email with new code
    await sendEmail({
      to: userData.email,
      subject: 'Your new AgriTruk Email Verification Code',
      text: `Your new verification code is: ${newCode}`,
      html: getMFATemplate(
        newCode,
        null,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
      ),
    });

    await logActivity(uid, 'email_code_resend', req);

    res.status(200).json({
      message: 'Email verification code resent successfully',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    console.error('Resend email code error:', error);
    res.status(500).json({
      code: 'ERR_RESEND_EMAIL_CODE_FAILED',
      message: 'Failed to resend email verification code',
    });
  }
};
```

#### **2.2 Phone Verification Resend**

**Required Implementation:**

```javascript
// Add to backend/routes/authRoutes.js
router.post('/resend-phone-code', authenticateToken, authController.resendPhoneCode);

// Add to backend/controllers/authController.js
exports.resendPhoneCode = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userData = await User.get(uid);

    // Check if phone is already verified
    if (userData.phoneVerified) {
      return res.status(400).json({
        code: 'ERR_ALREADY_VERIFIED',
        message: 'Phone is already verified',
      });
    }

    const newCode = generateOtp();

    await User.update(uid, {
      phoneVerificationCode: newCode,
      phoneVerificationExpires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Send SMS to user
    const formattedPhone = formatPhoneNumber(userData.phone);
    try {
      const smsMessage = `Your Truk phone verification code is: ${newCode}`;
      await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);
      console.log('Phone verification SMS sent successfully');
    } catch (smsError) {
      console.error('Failed to send phone verification SMS:', smsError);
      return res.status(500).json({
        code: 'ERR_SMS_SEND_FAILED',
        message: 'Failed to send SMS verification code',
      });
    }

    await logActivity(uid, 'phone_code_resend', req);

    res.status(200).json({
      message: 'Phone verification code resent successfully',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    console.error('Resend phone code error:', error);
    res.status(500).json({
      code: 'ERR_RESEND_PHONE_CODE_FAILED',
      message: 'Failed to resend phone verification code',
    });
  }
};
```

---

## 📊 **DATA MODELS & RESPONSE STRUCTURES**

### 3. **Required Data Models**

The frontend expects specific data structures. Here are the required models:

#### **3.1 Transporter Profile Model**

```javascript
// Expected response structure for /transporters/profile/me
{
  success: true,
  transporter: {
    id: string,
    userId: string,
    displayName: string,
    phoneNumber: string,
    email: string,
    status: 'pending' | 'approved' | 'rejected',
    transporterType: 'individual' | 'company',
    vehicleType: string,
    vehicleMake: string,
    vehicleModel: string,
    vehicleYear: number,
    vehicleCapacity: number,
    canHandle: string[], // ['agri', 'cargo']
    refrigeration: boolean,
    humidityControl: boolean,
    specialCargo: string[], // ['fragile', 'oversized', 'hazardous']
    specialFeatures: string[], // ['temperature-control', 'security']
    perishableSpecs: string[], // ['refrigerated', 'humidity']
    profilePhoto: string,
    vehiclePhotos: string[],
    driverLicense: string,
    insuranceUrl: string,
    logbookUrl: string,
    rating: number,
    totalTrips: number,
    acceptingBooking: boolean,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
```

#### **3.2 Incoming Request Model**

```javascript
// Expected response structure for /transporters/incoming-requests
{
  success: true,
  requests: [
    {
      id: string,
      type: 'instant' | 'scheduled',
      serviceType: 'agriTRUK' | 'cargoTRUK',
      fromLocation: string,
      toLocation: string,
      productType: string,
      weight: string,
      isPerishable: boolean,
      isSpecialCargo: boolean,
      specialCargoSpecs: string[],
      perishableSpecs: string[],
      specialRequirements: string[],
      urgency: 'high' | 'medium' | 'low',
      estimatedValue: number,
      client: {
        name: string,
        rating: number,
        completedOrders: number
      },
      pricing: {
        basePrice: number,
        urgencyBonus: number,
        specialHandling: number,
        total: number
      },
      route: {
        distance: string,
        estimatedTime: string,
        detour: string
      },
      createdAt: timestamp,
      expiresAt: timestamp
    }
  ]
}
```

#### **3.3 Route Load Model**

```javascript
// Expected response structure for /transporters/route-loads
{
  success: true,
  routeLoads: [
    {
      id: string,
      type: 'route',
      serviceType: 'agriTRUK' | 'cargoTRUK',
      fromLocation: string,
      toLocation: string,
      productType: string,
      weight: string,
      isPerishable: boolean,
      isSpecialCargo: boolean,
      specialCargoSpecs: string[],
      perishableSpecs: string[],
      specialRequirements: string[],
      schedule: {
        pickupDate: timestamp,
        deliveryDate: timestamp,
        flexibility: 'strict' | 'flexible'
      },
      client: {
        name: string,
        rating: number
      },
      pricing: {
        basePrice: number,
        total: number
      },
      route: {
        distance: string,
        estimatedTime: string
      }
    }
  ]
}
```

#### **3.4 Booking Model**

```javascript
// Expected response structure for /transporters/bookings
{
  success: true,
  bookings: [
    {
      id: string,
      type: 'instant' | 'scheduled',
      status: 'pending' | 'active' | 'completed' | 'cancelled',
      fromLocation: string,
      toLocation: string,
      productType: string,
      weight: string,
      client: {
        name: string,
        phone: string,
        email: string
      },
      pricing: {
        total: number,
        paid: number,
        pending: number
      },
      schedule: {
        pickupDate: timestamp,
        deliveryDate: timestamp
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]
}
```

---

## 🚀 **IMPLEMENTATION PRIORITY & TIMELINE**

### **Phase 1: Critical Endpoints (Week 1)**

1. ✅ `/transporters/profile/me` - Transporter profile endpoint
2. ✅ `/transporters/incoming-requests` - Available requests endpoint
3. ✅ `/transporters/route-loads` - Route-based loads endpoint
4. ✅ `/transporters/bookings` - Transporter bookings endpoint
5. ✅ `/bookings/:type/transporter` - Assigned jobs by type endpoint

### **Phase 2: Supporting Endpoints (Week 2)**

1. ✅ `/transporters/drivers` - Driver management endpoint
2. ✅ `/transporters/vehicles` - Vehicle management endpoint
3. ✅ `/auth/resend-email-code` - Email verification resend
4. ✅ `/auth/resend-phone-code` - Phone verification resend

### **Phase 3: Enhancement (Week 3)**

1. ✅ Error handling improvements
2. ✅ Response validation
3. ✅ Performance optimization
4. ✅ Comprehensive testing

---

## 🧪 **TESTING REQUIREMENTS**

### **4.1 API Testing Checklist**

- [ ] All endpoints return 200 status for valid requests
- [ ] Authentication required for protected endpoints
- [ ] Proper error responses for invalid requests
- [ ] Data validation working correctly
- [ ] Response times under 2 seconds

### **4.2 Frontend Integration Testing**

- [ ] Transporter dashboard loads without errors
- [ ] Incoming requests display correctly
- [ ] Route loads show available opportunities
- [ ] Bookings display current assignments
- [ ] Profile information updates correctly

---
