# Missing Transporter Endpoints - Backend Implementation

## 🎯 **Priority: HIGH - 3 Missing Endpoints**

**Date:** September 3, 2025  
**Status:** Frontend ready, backend needs implementation  
**Estimated Time:** 1 day

---

## ❌ **Missing Endpoints That Need Implementation**

### **1. Transporter Profile Endpoint**

**Frontend calls:** `GET /api/transporters/profile/me`

**Add to `backend/routes/transportRoutes.js`:**

```javascript
// Get current transporter's profile
router.get(
  '/profile/me',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getTransporterProfile,
);
```

**Add to `backend/controllers/transporterController.js`:**

```javascript
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

---

### **2. Incoming Requests Endpoint**

**Frontend calls:** `GET /api/transporters/incoming-requests`

**Add to `backend/routes/transportRoutes.js`:**

```javascript
// Get incoming requests for transporters
router.get(
  '/incoming-requests',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getIncomingRequests,
);
```

**Add to `backend/controllers/transporterController.js`:**

```javascript
exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    const requests = await Booking.getAllAvailable();
    const transporter = await Transporter.getByUserId(userId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    // Filter requests based on transporter capabilities
    const filteredRequests = requests.filter((request) => {
      if (request.bookingType === 'Agri' && !transporter.canHandleAgri) return false;
      if (request.bookingType === 'Cargo' && !transporter.canHandleCargo) return false;
      if (request.perishable && !transporter.refrigerated && !transporter.humidityControl)
        return false;
      if (
        request.specialCargo &&
        request.specialCargo.length > 0 &&
        !transporter.specialFeatures?.length
      )
        return false;
      return true;
    });

    res.status(200).json({
      success: true,
      requests: filteredRequests,
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

---

### **3. Route Loads Endpoint**

**Frontend calls:** `GET /api/transporters/route-loads`

**Add to `backend/routes/transportRoutes.js`:**

```javascript
// Get route loads for transporters
router.get(
  '/route-loads',
  authenticateToken,
  requireRole('transporter'),
  transporterController.getRouteLoads,
);
```

**Add to `backend/controllers/transporterController.js`:**

```javascript
exports.getRouteLoads = async (req, res) => {
  try {
    const userId = req.user.uid;
    const routeLoads = await Booking.getTransporterRouteLoads(userId);

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

---

## 🔐 **Secondary Verification Method - NEEDS IMPLEMENTATION**

### **Problem:**

Users need to verify their secondary contact method (email if they signed up with phone, phone if they signed up with email).

### **Current Issue:**

The `exports.resendCode` function in `backend/controllers/authController.js` has a bug:

- It checks `userData.isVerified` instead of `userData.emailVerified`
- This prevents users from verifying their secondary contact method

### **Fix Required:**

**Update `backend/controllers/authController.js` in `exports.resendCode`:**

```javascript
exports.resendCode = async (req, res) => {
  const uid = req.user.uid;
  const email = req.user.email;
  const ipAddress = req.ip || 'unknown';

  try {
    const userData = await User.get(uid);

    // FIXED: Check email-specific verification, not general verification
    if (userData.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const newCode = generateOtp();

    await User.update(uid, {
      emailVerificationCode: newCode,
      verificationExpires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // ... rest of the function remains the same
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({
      code: 'ERR_RESEND_CODE_FAILED',
      message: 'Failed to resend verification code',
    });
  }
};
```

**Update `exports.resendPhoneCode` similarly:**

```javascript
exports.resendPhoneCode = async (req, res) => {
  // ... existing code ...

  try {
    const userData = await User.get(uid);

    // FIXED: Check phone-specific verification
    if (userData.phoneVerified) {
      return res.status(400).json({ message: 'Phone is already verified' });
    }

    // ... rest of the function remains the same
  } catch (error) {
    // ... error handling
  }
};
```

---

## 🧪 **Testing Checklist**

### **Transporter Endpoints:**

- [ ] `/api/transporters/profile/me` returns transporter profile
- [ ] `/api/transporters/incoming-requests` returns filtered requests
- [ ] `/api/transporters/route-loads` returns route loads
- [ ] All endpoints require proper authentication
- [ ] All endpoints handle errors gracefully

### **Secondary Verification:**

- [ ] Users can verify email after signing up with phone
- [ ] Users can verify phone after signing up with email
- [ ] Already verified methods show appropriate message
- [ ] Verification codes are sent correctly
- [ ] Codes expire after 10 minutes

---

## 📋 **Summary**

**What to implement:**

1. **3 missing transporter endpoints** - Profile, incoming requests, route loads
2. **Fix secondary verification bug** - Check specific verification status

**What's already working:**

- ✅ All other transporter endpoints
- ✅ Authentication and role checking
- ✅ Database models and relationships
- ✅ Basic verification system
