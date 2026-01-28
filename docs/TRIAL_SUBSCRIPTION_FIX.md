# Trial Subscription Duration Fix - 90 Days

## Issue
The trial subscription was showing **1 day remaining** instead of **90 days**, causing users to see an incorrect subscription expiration countdown.

## Root Cause
The subscription trial plan in Firebase Firestore was created with `duration: 1` instead of `duration: 90`. The system relies on the plan's duration field to calculate the subscription end date.

## Solution Implemented

### 1. **Updated Subscription Plans Model** (`backend/models/SubscriptionsPlans.js`)
Added support for `trialDays` field in subscription plans:
- For trial plans (price === 0), `trialDays` defaults to 90 days
- This field is explicitly stored and used for trial duration calculations

### 2. **Updated Subscription Controller** (`backend/controllers/subscriptionController.js`)
Enhanced trial plan handling in three key endpoints:

#### a. `createSubscriptionPlan` 
- Now accepts `trialDays` parameter
- Auto-sets `trialDays` to 90 for trial plans (price = 0)

#### b. `createSubscriber`
- Uses priority: `plan.trialDays` → `plan.duration` → default `90`
- Properly calculates 90-day trial end date

#### c. `paymentCallback`
- Consistent with above logic for processing paid subscription confirmations

### 3. **Migration Script** (`backend/fix-trial-plans.js`)
Automated script to fix existing trial data:
```bash
# Run from backend directory
node fix-trial-plans.js
```

This script:
1. Updates all trial plans (price = 0) to have `duration: 90` and `trialDays: 90`
2. Fixes existing trial subscribers with incorrect end dates
3. Reports which records were updated

## Implementation Details

### Trial Duration Logic
```javascript
if (plan.price === 0) {
  // Trial plan: use trialDays if available, otherwise use duration, fallback to 90
  const trialDays = plan.trialDays || plan.duration || 90;
  endDate.setDate(endDate.getDate() + trialDays);
}
```

### Days Remaining Calculation (Backend)
The `getSubcriberStatus` endpoint calculates:
```javascript
const daysRemaining = isActive 
  ? Math.max(0, Math.ceil((endDateMillis - currentTime) / (1000 * 60 * 60 * 24))) 
  : 0;
```

## Trial Features (90 Days + 5 Shipments)

The trial subscription includes:
- **Duration**: 90 days (3 months)
- **Shipment/Trip Limit**: 5 shipments/trips maximum
- **User Types**: Brokers and Transporters

### Shipment Limit Enforcement
The 5-shipment limit is tracked in the `currentUsage` field of the `subscribers` collection:
- Frontend validates via `bookingService.validateBookingEligibility()`
- Backend enforces in booking controller
- After 5 shipments, users see a modal prompting subscription upgrade

## Testing the Fix

### 1. Verify Trial Plan Setup
```javascript
// Check Firestore: subscriptionPlans collection
// Trial plan should have:
{
  name: "Free Trial",
  price: 0,
  duration: 90,
  trialDays: 90,
  isActive: true
}
```

### 2. Create New Trial Subscription
1. Create new user in app
2. Activate trial via SubscriptionTrialScreen
3. Days should show 90 days remaining

### 3. Verify Days Remaining Calculation
- Check `BrokerHomeScreen.tsx` line 565
- Should display correct days remaining from subscriber.endDate

## Files Modified

1. **Backend**:
   - `models/SubscriptionsPlans.js` - Added trialDays field
   - `controllers/subscriptionController.js` - Enhanced trial duration logic
   - `fix-trial-plans.js` - Migration script (new file)

2. **Frontend**:
   - No changes needed (already uses backend daysRemaining calculation)

## API Endpoints

### Get Subscriber Status
```
GET /api/subscriptions/subscriber-status
Response:
{
  "data": {
    "hasActiveSubscription": false,
    "isTrialActive": true,
    "needsTrialActivation": false,
    "currentPlan": {...},
    "daysRemaining": 90,
    "subscriptionStatus": "trial",
    "isTrial": true,
    "trialDaysRemaining": 90
  }
}
```

### Create New Subscription Plan (Admin)
```
POST /api/subscriptions/plans
Body:
{
  "name": "Free Trial",
  "duration": 90,
  "trialDays": 90,
  "price": 0,
  "isActive": true,
  "features": [...]
}
```

## Next Steps

1. **Deploy backend changes** to production
2. **Run migration script** on production database:
   ```bash
   node fix-trial-plans.js
   ```
3. **Verify** by checking an existing trial user's subscription status
4. **Monitor** logs for trial activation by new users

## Monitoring

Check backend logs for:
```
🔧 Creating trial subscriber with 90 days (plan.trialDays: 90, plan.duration: 90)
📊 Subscriber status check: { isTrialActive: true, daysRemaining: 90, ... }
```

## Related Code References

- Frontend display: [BrokerHomeScreen.tsx#L564-L590](../../frontend/src/screens/BrokerHomeScreen.tsx)
- Trial activation: [SubscriptionTrialScreen.tsx](../../frontend/src/screens/SubscriptionTrialScreen.tsx)
- Backend calculation: [subscriptionController.js#L500-L545](subscriptionController.js)
- Booking validation: [bookingController.js](./bookingController.js) (enforces 5-shipment limit)
