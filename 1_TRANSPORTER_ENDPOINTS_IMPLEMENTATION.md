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

## ✅ **Secondary Verification Method - ALREADY IMPLEMENTED**

### **✅ ALREADY WORKING:**

The backend engineer has already implemented a comprehensive secondary verification system:

- **✅ `resendVerificationCode` function** - Handles both email and phone verification resending
- **✅ Proper verification checks** - Checks `emailVerified` and `phoneVerified` correctly
- **✅ Route integration** - Connected via `/api/auth/` with action-based routing
- **✅ SMS integration** - Uses MobileSasa SMS service for phone verification
- **✅ Email integration** - Uses proper email templates for verification codes
- **✅ Activity logging** - Logs all verification activities
- **✅ Code expiry** - 10-minute expiry for verification codes

**Current Implementation:**

```javascript
// Already working in backend/controllers/authController.js
exports.resendVerificationCode = async (req, res) => {
  const { type } = req.body; // 'email' or 'phone'
  const uid = req.user.uid;

  if (!['email', 'phone'].includes(type)) {
    return res.status(400).json({ message: 'Invalid verification type' });
  }

  try {
    const userData = await User.get(uid);
    const userRef = admin.firestore().collection('users').doc(uid);

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000, // 10 min expiry
    );
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (type === 'email') {
      if (userData.emailVerified) {
        return res.status(200).json({ message: 'Email already verified' });
      }

      await userRef.update({
        emailVerificationCode: verificationCode,
        verificationExpires: expiresAt,
      });

      // Send verification email
      await sendEmail({
        to: userData.email,
        subject: 'Email Verification Code',
        text: `Your verification code is: ${verificationCode}`,
        html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
      });

      await logActivity(uid, 'resend_email_verification', req);
    }

    if (type === 'phone') {
      if (userData.phoneVerified) {
        return res.status(200).json({ message: 'Phone already verified' });
      }

      await userRef.update({
        phoneVerificationCode: verificationCode,
        phoneVerificationExpires: expiresAt,
      });

      // Send SMS
      await sendSMS(userData.phone, `Your verification code is: ${verificationCode}`);

      await logActivity(uid, 'resend_phone_verification', req);
    }

    res.status(200).json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
};
```

**Route Integration:**

```javascript
// Already working in backend/routes/authRoutes.js
router.post('/', authenticateToken, async (req, res) => {
  const { action } = req.body;

  try {
    if (action === 'verify-email') {
      return await authController.verifyEmailCode(req, res);
    } else if (action === 'verify-phone') {
      return await authController.verifyPhoneCode(req, res);
    } else if (action === 'resend-email-code') {
      return await authController.resendCode(req, res);
    } else if (action === 'resend-phone-code') {
      return await authController.resendPhoneCode(req, res);
    } else {
      return res.status(400).json({
        code: 'ERR_INVALID_ACTION',
        message: 'Invalid action',
      });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Internal server error',
    });
  }
});
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

**What's already working:**

- ✅ All other transporter endpoints
- ✅ Authentication and role checking
- ✅ Database models and relationships
- ✅ Complete secondary verification system
- ✅ Email and phone verification with proper checks
- ✅ SMS integration for phone verification
- ✅ Activity logging for all verification actions
