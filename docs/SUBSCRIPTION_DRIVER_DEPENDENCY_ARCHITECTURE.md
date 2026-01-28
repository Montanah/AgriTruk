# Subscription-Driver Dependency Architecture

**Purpose:** Document how company subscriptions control driver operations  
**Status:** Design Ready for Implementation  
**Scope:** Company Transporters + Driver Operations

---

## Overview

```
Company Subscription Status
       ↓
   ┌─────────────────────┐
   │ ACTIVE (Trial/Paid)  │ → Drivers can operate ✅
   │ EXPIRED             │ → Drivers blocked ❌
   │ INACTIVE            │ → Drivers blocked ❌
   └─────────────────────┘
       ↓
   Driver Operations
   ├─ Accept job
   ├─ Start delivery
   ├─ Update location
   └─ Complete trip
```

---

## Current State

### ✅ Working
- Company profile created
- Trial activated on approval
- Days remaining calculated
- Expiry routing works

### ❌ Missing
- **No validation** before driver operations
- Drivers can accept jobs without active subscription
- No warning when subscription about to expire
- No blocking when subscription expired

---

## Required Implementation

### 1. Add Subscription Validation Middleware

**File:** `backend/middlewares/subscriptionValidator.js` (new file)

```javascript
const User = require('../models/User');
const Subscribers = require('../models/Subscribers');
const Transporter = require('../models/Transporter');

// Middleware to validate company subscription
module.exports = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get user's company (if they have one)
    const transporter = await Transporter.getByUserId(userId);
    
    if (!transporter) {
      // Not a company owner, let through
      return next();
    }

    // Get subscription
    const subscriber = await Subscribers.getByUserId(userId);
    
    if (!subscriber || !subscriber.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription is not active',
        subscriptionStatus: subscriber?.status || 'inactive',
        daysRemaining: 0
      });
    }

    // Check if expired
    const endDateMillis = subscriber.endDate.toMillis();
    const now = Date.now();
    
    if (endDateMillis <= now) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription has expired',
        daysRemaining: 0,
        expiryDate: new Date(endDateMillis).toISOString()
      });
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil((endDateMillis - now) / (1000 * 60 * 60 * 24));
    
    // Add to request for use in controller
    req.subscriptionStatus = {
      isActive: true,
      daysRemaining,
      expiryDate: new Date(endDateMillis).toISOString(),
      planId: subscriber.planId
    };

    // Warn if close to expiry
    if (daysRemaining <= 7 && daysRemaining > 0) {
      console.warn(`⚠️ Company subscription expiring soon: ${daysRemaining} days`);
      res.setHeader('X-Subscription-Warning', `${daysRemaining} days remaining`);
    }

    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
};
```

---

### 2. Add to Driver Routes

**File:** `backend/routes/driverRoutes.js`

```javascript
const subscriptionValidator = require('../middlewares/subscriptionValidator');
const driverController = require('../controllers/driverController');

// Routes that require active subscription
router.post(
  '/accept-job',
  authenticate,
  subscriptionValidator,  // ← Add this
  driverController.acceptJob
);

router.post(
  '/start-delivery/:jobId',
  authenticate,
  subscriptionValidator,  // ← Add this
  driverController.startDelivery
);

router.post(
  '/complete-trip/:jobId',
  authenticate,
  subscriptionValidator,  // ← Add this
  driverController.completeTrip
);

router.post(
  '/update-location',
  authenticate,
  subscriptionValidator,  // ← Add this
  driverController.updateLocation
);
```

---

### 3. Update Driver Controllers

**File:** `backend/controllers/driverController.js`

When rejecting request due to expired subscription, include recovery info:

```javascript
// In any driver operation controller
exports.acceptJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const driverId = req.user.uid;

    // Subscription already validated by middleware
    // If we get here, subscription is active
    
    // ... rest of accept job logic ...

  } catch (error) {
    // ... error handling ...
  }
};
```

---

### 4. Add Frontend Warning System

**File:** `frontend/src/screens/DriverHomeScreen.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import subscriptionService from '../services/subscriptionService';

export default function DriverHomeScreen() {
  const [subscriptionWarning, setSubscriptionWarning] = useState<string | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      
      // Check if subscription active
      if (!status.hasActiveSubscription && !status.isTrialActive) {
        setSubscriptionWarning('Company subscription has expired. Contact admin to renew.');
        return;
      }

      // Check if close to expiry
      if (status.daysRemaining <= 7 && status.daysRemaining > 0) {
        setSubscriptionWarning(
          `Company subscription expires in ${status.daysRemaining} days. Contact admin.`
        );
      }
    } catch (error) {
      console.error('Subscription check failed:', error);
    }
  };

  // Show warning banner
  if (subscriptionWarning) {
    return (
      <View style={styles.warningContainer}>
        <Ionicons name="alert-circle" size={24} color={colors.error} />
        <Text style={styles.warningText}>{subscriptionWarning}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.contactLink}>Contact Admin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show days remaining badge
  if (status?.daysRemaining) {
    return (
      <View style={styles.badge}>
        <Text>{status.daysRemaining} days remaining</Text>
      </View>
    );
  }

  return (
    // ... normal driver home screen ...
  );
}
```

---

### 5. Update Job Acceptance Flow

**File:** `frontend/src/screens/JobDetailsScreen.tsx` or similar

```typescript
const handleAcceptJob = async () => {
  try {
    // Check subscription before allowing acceptance
    const status = await subscriptionService.getSubscriptionStatus();
    
    if (!status.hasActiveSubscription && !status.isTrialActive) {
      Alert.alert(
        'Subscription Expired',
        'Your company subscription has expired. ' +
        'Contact your company admin to renew to accept jobs.',
        [
          {
            text: 'Contact Admin',
            onPress: () => openAdminContact()
          },
          { text: 'OK' }
        ]
      );
      return;
    }

    // Warn if close to expiry
    if (status.daysRemaining <= 7) {
      Alert.alert(
        `⚠️ Subscription Expiring Soon`,
        `Your company subscription expires in ${status.daysRemaining} days. ` +
        `After expiry, you won't be able to accept new jobs. ` +
        `Contact your company admin to renew.`,
        [
          {
            text: 'Renew Now',
            onPress: () => navigation.navigate('SubscriptionScreen')
          },
          { text: 'Continue', isPreferred: true }
        ]
      );
    }

    // Accept job via API
    const response = await apiRequest('/api/drivers/accept-job', {
      method: 'POST',
      body: JSON.stringify({ jobId: job.id })
    });

    // Handle success
    Alert.alert('Success', 'Job accepted!');
    navigation.goBack();
  } catch (error) {
    if (error.message.includes('subscription')) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Error', 'Failed to accept job. Please try again.');
    }
  }
};
```

---

### 6. Add Subscription Status to Dashboard

**File:** `frontend/src/screens/ManageTransporterScreen.tsx` (Company Dashboard)

```typescript
<View style={styles.subscriptionStatusCard}>
  <Text style={styles.title}>Subscription Status</Text>
  
  {subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isTrialActive ? (
    <>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[
          styles.value,
          { color: colors.success }
        ]}>
          {subscriptionStatus.isTrial ? '🆓 Trial Active' : '✅ Active'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Days Remaining:</Text>
        <Text style={[
          styles.value,
          { 
            color: subscriptionStatus.daysRemaining <= 7 ? colors.error : colors.success
          }
        ]}>
          {subscriptionStatus.daysRemaining} days
        </Text>
      </View>

      {subscriptionStatus.daysRemaining <= 7 && (
        <TouchableOpacity 
          style={styles.renewButton}
          onPress={() => navigation.navigate('SubscriptionScreen')}
        >
          <Text style={styles.renewButtonText}>Renew Now</Text>
        </TouchableOpacity>
      )}

      <View style={styles.driverStatusList}>
        <Text style={styles.label}>Driver Status:</Text>
        {drivers.map(driver => (
          <View key={driver.id} style={styles.driverRow}>
            <Text>{driver.name}</Text>
            <Ionicons 
              name={subscriptionStatus.hasActiveSubscription ? "checkmark-circle" : "close-circle"}
              size={20}
              color={subscriptionStatus.hasActiveSubscription ? colors.success : colors.error}
            />
          </View>
        ))}
      </View>
    </>
  ) : (
    <View style={styles.expiredContainer}>
      <Ionicons name="alert" size={32} color={colors.error} />
      <Text style={styles.expiredText}>Subscription Expired</Text>
      <Text style={styles.expiredSubtext}>
        Your drivers cannot accept new jobs until you renew.
      </Text>
      <TouchableOpacity 
        style={styles.renewButton}
        onPress={() => navigation.navigate('SubscriptionScreen')}
      >
        <Text style={styles.renewButtonText}>Renew Subscription</Text>
      </TouchableOpacity>
    </View>
  )}
</View>
```

---

## Validation Rules

### Operations Blocked When Subscription Inactive

| Operation | Block | Message | Recovery |
|-----------|-------|---------|----------|
| Accept Job | ✅ | "Subscription expired" | Renew now |
| Start Delivery | ✅ | "Cannot start - subscription inactive" | Renew now |
| Update Location | ✅ | "Location tracking disabled" | Renew now |
| Complete Trip | ✅ | "Cannot complete - subscription inactive" | Renew now |
| View Requests | ❌ | Allow read-only | N/A |
| View Dashboard | ❌ | Allow read-only | N/A |

---

## Warning Levels

### 1. Green Zone (30+ days remaining)
```
Status: ✅ Active
Message: None
Action: Normal operations
```

### 2. Yellow Zone (8-29 days remaining)
```
Status: ⚠️ Warning
Message: "Subscription expires in X days"
Action: Show renewal reminder, allow operations
```

### 3. Red Zone (1-7 days remaining)
```
Status: ⚠️ Critical
Message: "Subscription expires in X days - RENEW NOW"
Action: Block new jobs, show prominent renewal CTA
```

### 4. Expired (0 days)
```
Status: ❌ Expired
Message: "Subscription expired - renew to operate"
Action: Block all operations, show upgrade screen
```

---

## Database Queries for Monitoring

### Find companies with expiring subscriptions (next 7 days)

```sql
SELECT u.email, s.endDate, 
  TIMESTAMP_DIFF(s.endDate, CURRENT_TIMESTAMP(), DAY) as days_remaining
FROM subscribers s
JOIN users u ON s.userId = u.uid
WHERE s.isActive = true
  AND s.isTrial = false
  AND TIMESTAMP_DIFF(s.endDate, CURRENT_TIMESTAMP(), DAY) <= 7
  AND TIMESTAMP_DIFF(s.endDate, CURRENT_TIMESTAMP(), DAY) > 0
ORDER BY days_remaining ASC;
```

### Find expired subscriptions

```sql
SELECT u.email, s.endDate
FROM subscribers s
JOIN users u ON s.userId = u.uid
WHERE s.endDate < CURRENT_TIMESTAMP()
  AND s.isActive = true
ORDER BY s.endDate DESC;
```

### Find drivers of companies with expired subscriptions

```sql
SELECT d.name, d.email, c.companyName, s.endDate
FROM drivers d
JOIN companies c ON d.companyId = c.id
JOIN subscribers s ON c.userId = s.userId
WHERE s.endDate < CURRENT_TIMESTAMP()
  AND s.isActive = true
ORDER BY s.endDate DESC;
```

---

## Notification Strategy

### 1. Admin Notifications (Backend Cron Job)

**Run daily:** 6:00 AM

```javascript
// Send alerts for companies expiring in 7 days
const expiringSoon = await db.collection('subscribers')
  .where('endDate', '<', new Date(Date.now() + 7*24*60*60*1000))
  .where('endDate', '>', new Date(Date.now()))
  .where('isActive', '==', true)
  .get();

for (const doc of expiringSoon.docs) {
  const subscriber = doc.data();
  const user = await User.get(subscriber.userId);
  
  await sendEmail({
    to: 'admin@trukafrica.com',
    subject: `[ALERT] Company subscription expiring: ${user.email}`,
    text: `${user.email}'s subscription expires in 7 days.`
  });
}
```

### 2. Company Notifications (Frontend)

- **Dashboard banner:** Shows days remaining in green/yellow/red
- **Email notification:** 7 days before expiry
- **In-app notification:** 3 days and 1 day reminders

### 3. Driver Notifications (Frontend)

- **Warning on job acceptance:** If company subscription < 7 days
- **Dashboard banner:** Shows subscription status
- **In-app notification:** When subscription expires

---

## Testing Checklist

- [ ] Driver can accept job with active subscription
- [ ] Driver cannot accept job with expired subscription
- [ ] API returns 403 with descriptive error
- [ ] Frontend shows warning at 7 days
- [ ] Frontend blocks operations at 0 days
- [ ] Days remaining counts down daily
- [ ] Email notifications sent at correct times
- [ ] Multiple drivers all blocked when company subscription expires
- [ ] Dashboard shows subscription status for company
- [ ] Renewal flow works (subscription becomes active immediately)

---

## Rollback Plan

If issues arise:

1. **Disable middleware validation** (comment out in routes)
2. **Drivers can operate freely** (no blocking)
3. **No data loss**
4. **Can re-enable later**

---

## Success Metrics

- ✅ Zero unauthorized driver operations
- ✅ Zero completed jobs from expired companies
- ✅ 100% of companies notified before expiry
- ✅ Drivers understand why operations blocked
- ✅ Clear path to renewal for all users

