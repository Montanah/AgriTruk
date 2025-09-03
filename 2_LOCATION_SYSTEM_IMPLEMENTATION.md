# Location System - Backend Implementation

## ✅ **What's Already Working - Foundation Exists**

### **1. Location Data Structure**

- **✅ `lastKnownLocation`** - Field exists in Transporter model
- **✅ `currentRoute`** - Field exists for location history
- **✅ Location fields** - Database structure is ready

### **2. Location Route**

- **✅ `POST /api/transporters/update-location`** - Route exists in transportRoutes.js
- **✅ Authentication** - Requires valid transporter token
- **✅ Swagger documentation** - API is documented

### **3. Location Utilities**

- **✅ `haversineDistance`** - Distance calculation function exists
- **✅ `calculateDistance`** - Wrapper function for location objects
- **✅ Geo utilities** - Location math functions ready

### **4. Location Usage in Matching**

- **✅ Location filtering** - Matching service uses location for 50km radius
- **✅ Distance calculation** - Used in transporter matching algorithm
- **✅ Location validation** - Checks for valid location data

---

## ❌ **What's Missing - Critical Implementation Needed**

### **1. Location Update Controller Function**

**Problem:** The route exists but the `updateLocation` function is NOT implemented in `transporterController.js`

**Add to `backend/controllers/transporterController.js`:**

```javascript
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude and longitude must be numbers.',
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.',
      });
    }

    const newLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    // Update currentRoute with time-based pruning (keep last 48 hours)
    const transporter = await Transporter.get(userId);
    const currentRoute = transporter.currentRoute || [];
    const maxAgeHours = 48;
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const filteredRoute = currentRoute.filter((entry) => new Date(entry.timestamp) >= cutoffTime);

    filteredRoute.push({
      location: newLocation,
      timestamp: new Date(),
    });

    // Prepare updates
    const updates = {
      currentRoute: filteredRoute,
      lastKnownLocation: newLocation,
      updatedAt: new Date(),
    };

    // Update transporter document
    await Transporter.update(userId, updates);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: newLocation,
      routeLength: filteredRoute.length,
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
```

---

### **2. Enhanced Location Methods in Transporter Model**

**Add to `backend/models/Transporter.js`:**

```javascript
// Add these methods to the Transporter object

async updateLocation(transporterId, location) {
  const updates = {
    lastKnownLocation: location,
    updatedAt: admin.firestore.Timestamp.now(),
  };
  await db.collection('transporters').doc(transporterId).update(updates);
  return updates;
},

async addToRoute(transporterId, location) {
  const transporter = await this.get(transporterId);
  const currentRoute = transporter.currentRoute || [];

  // Add new location to route
  currentRoute.push({
    location: location,
    timestamp: admin.firestore.Timestamp.now(),
  });

  // Keep only last 48 hours of route data
  const maxAgeHours = 48;
  const cutoffTime = admin.firestore.Timestamp.fromMillis(
    Date.now() - maxAgeHours * 60 * 60 * 1000
  );

  const filteredRoute = currentRoute.filter(
    (entry) => entry.timestamp >= cutoffTime
  );

  const updates = {
    currentRoute: filteredRoute,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await db.collection('transporters').doc(transporterId).update(updates);
  return updates;
},

async getNearbyTransporters(location, radiusKm = 50) {
  const snapshot = await db.collection('transporters')
    .where('acceptingBooking', '==', true)
    .where('status', '==', 'approved')
    .get();

  const nearbyTransporters = [];

  for (const doc of snapshot.docs) {
    const transporter = { id: doc.id, ...doc.data() };

    if (transporter.lastKnownLocation) {
      const distance = calculateDistance(location, transporter.lastKnownLocation);
      if (distance <= radiusKm) {
        transporter.distance = distance;
        nearbyTransporters.push(transporter);
      }
    }
  }

  // Sort by distance
  nearbyTransporters.sort((a, b) => a.distance - b.distance);
  return nearbyTransporters;
},
```

---

### **3. Location Validation Middleware**

**Create `backend/middlewares/locationValidation.js`:**

```javascript
const validateLocation = (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required',
    });
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude must be numbers',
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      message: 'Latitude must be between -90 and 90 degrees',
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      message: 'Longitude must be between -180 and 180 degrees',
    });
  }

  next();
};

module.exports = { validateLocation };
```

**Update the route in `backend/routes/transportRoutes.js`:**

```javascript
const { validateLocation } = require('../middlewares/locationValidation');

// Update the location route to include validation
router.post(
  '/update-location',
  authenticateToken,
  requireRole('transporter'),
  validateLocation,
  updateLocation,
);
```

---

## 🚀 **Frontend Features Ready to Use**

### **1. Automatic Location Tracking**

- **✅ GPS monitoring** - Every 30 seconds
- **✅ Background tracking** - Continues when app is minimized
- **✅ Battery optimization** - Distance-based updates (100m minimum)
- **✅ Permission handling** - Automatic permission requests

### **2. Location Display**

- **✅ Real-time coordinates** - Shows current latitude/longitude
- **✅ Last update time** - Displays when location was last updated
- **✅ Tracking status** - Visual indicators for tracking state
- **✅ Location toggle** - Start/stop tracking with one click

---

## 🔧 **Backend Integration Status**

### **✅ Already Working:**

- **✅ Location route** - `/api/transporters/update-location` exists
- **✅ Location fields** - Database structure ready
- **✅ Location utilities** - Distance calculations implemented
- **✅ Location matching** - Used in transporter matching

### **❌ Missing Implementation:**

- **❌ Location controller** - `updateLocation` function not implemented
- **❌ Location validation** - No input validation middleware
- **❌ Route management** - No automatic route pruning
- **❌ Location methods** - Missing model methods for location updates

---

## 🧪 **Testing After Implementation**

### **Location System Testing:**

- [ ] Location updates are received by backend
- [ ] Location data is stored correctly in database
- [ ] Route history is maintained and pruned
- [ ] Location validation works properly
- [ ] Distance calculations are accurate
- [ ] Location matching uses updated coordinates
- [ ] Authentication prevents unauthorized access

---

## 📋 **Summary**

### **✅ Backend Status: PARTIAL**

- **✅ Location infrastructure** - Database fields and utilities exist
- **✅ Location route** - API endpoint is defined
- **❌ Location controller** - Core function not implemented
- **❌ Location validation** - No input validation

### **✅ Frontend Status: READY**

- **✅ Location service** - Complete location tracking service
- **✅ Location integration** - Integrated into transporter screens
- **✅ Location controls** - User interface for tracking management
- **✅ Location display** - Real-time location information

### **🚀 Implementation Required:**

- **❌ Implement `updateLocation` controller function**
- **❌ Add location validation** - Create validation middleware
- **❌ Enhance Transporter model with location methods**
- **❌ Test location update functionality**

---

## 🎯 **Next Steps**

1. **Implement location controller** - Add the missing `updateLocation` function
2. **Add location validation** - Create validation middleware
3. **Enhance location model** - Add location-specific methods
4. **Test location system** - Verify frontend-backend integration

---

**Backend Engineer**: The location system has a good foundation but is missing the core implementation. The route exists but the controller function is not implemented. You need to add the `updateLocation` function and related location management features.
