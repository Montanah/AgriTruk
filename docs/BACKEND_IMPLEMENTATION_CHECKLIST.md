# Backend Implementation Checklist - Trial Subscription System

**Date:** January 27, 2026  
**For:** Backend Development Team  
**Priority:** HIGH - Blocks frontend from fully functioning

---

## Quick Start

### What Frontend Expects
1. **GET** `/api/subscriptions/subscriber/status` - Check subscription
2. **POST** `/api/subscriptions/subscriber` - Create subscription
3. **POST** `/api/subscriptions/subscriber/pay` - Process payment
4. **GET** `/api/subscriptions` - Get available plans

### What Frontend Does
- Calls these endpoints automatically
- Caches responses for 30 seconds
- Retries on error with fallback routing
- Expects consistent response format

---

## Implementation Checklist

### Database Schema

#### Subscriptions Collection
```
□ Create 'subscriptions' collection
□ Document structure:
  ├─ id (auto-generated)
  ├─ userId (Firebase UID) [INDEX]
  ├─ planId (trial_plan, individual_pro, etc.) [INDEX]
  ├─ status ('active', 'expired', 'inactive')
  ├─ startDate (ISO timestamp)
  ├─ endDate (ISO timestamp)
  ├─ isActive (boolean)
  ├─ autoRenew (boolean)
  ├─ paymentStatus ('pending', 'completed', 'failed')
  ├─ transactionId (payment reference)
  ├─ createdAt (timestamp)
  └─ updatedAt (timestamp)
```

#### Plans Collection
```
□ Create 'plans' collection
□ Document structure:
  ├─ id (trial_plan, individual_pro, etc.)
  ├─ name (Trial, Pro, etc.)
  ├─ price (0 for trial, price for paid)
  ├─ duration (30 for monthly, 365 for yearly)
  ├─ trialDays (90 for trials, 0 for paid plans)
  ├─ currency ('KES')
  ├─ features (array)
  └─ isActive (boolean)
```

---

### API Endpoints

#### 1. Get Subscription Status
```
✅ ROUTE: GET /api/subscriptions/subscriber/status
✅ AUTH: Bearer token (Firebase)
✅ PARAMS: None (userId from token)

IMPLEMENTATION:
□ Authenticate user from Firebase token
□ Query subscriptions collection WHERE userId = auth.uid
□ If no subscription found:
  └─ Return { needsTrialActivation: true, hasActiveSubscription: false }
□ If subscription found:
  ├─ Calculate daysRemaining = (endDate - now) / (86400000 ms)
  ├─ If daysRemaining < 0:
  │  └─ Set status = 'expired', isActive = false
  ├─ If plan.price === 0:
  │  └─ Set isTrialActive = true, hasActiveSubscription = false
  ├─ Else:
  │  └─ Set hasActiveSubscription = true, isTrialActive = false
  └─ Return full status object

RESPONSE FORMAT:
{
  "success": true,
  "data": {
    "hasActiveSubscription": boolean,
    "isTrialActive": boolean,
    "needsTrialActivation": boolean,
    "currentPlan": { id, name, price, duration },
    "daysRemaining": number,
    "subscriptionStatus": "active" | "expired" | "trial" | "none",
    "subscriber": { ... raw subscription object }
  }
}

ERRORS:
□ 401: User not authenticated
□ 500: Server error
□ Return status with fallback values on error
```

#### 2. Create Subscription (Auto-triggered or Manual)
```
✅ ROUTE: POST /api/subscriptions/subscriber
✅ AUTH: Bearer token (Firebase)
✅ BODY:
  {
    "userId": "user_uid",
    "planId": "trial_plan",
    "paymentStatus": "pending",
    "autoRenew": false
  }

IMPLEMENTATION:
□ Authenticate user from token
□ Validate planId exists in plans collection
□ Check if user already has active subscription
□ If yes:
  └─ Return error: "User already has active subscription"
□ If no:
  ├─ Get plan from plans collection
  ├─ Calculate endDate = now + (plan.trialDays * 86400000)
  ├─ Create subscription document:
  │  ├─ userId: auth.uid
  │  ├─ planId: request.planId
  │  ├─ status: 'active'
  │  ├─ startDate: now
  │  ├─ endDate: calculated above
  │  ├─ isActive: true
  │  ├─ paymentStatus: request.paymentStatus || 'pending'
  │  ├─ autoRenew: request.autoRenew
  │  ├─ createdAt: now
  │  └─ updatedAt: now
  └─ Return created subscription

RESPONSE:
{
  "success": true,
  "data": {
    "id": "sub_123",
    "userId": "user_uid",
    "planId": "trial_plan",
    "status": "active",
    "startDate": "2026-01-27T...",
    "endDate": "2026-04-27T...",
    "isActive": true
  }
}

ERRORS:
□ 400: Invalid planId
□ 409: User already has subscription
□ 401: User not authenticated
```

#### 3. Process Payment (M-PESA/Card)
```
✅ ROUTE: POST /api/subscriptions/subscriber/pay
✅ AUTH: Bearer token
✅ BODY:
  {
    "planId": "individual_pro",
    "paymentMethod": "mpesa" | "stripe",
    "phoneNumber": "+254712345678" (for M-PESA)
  }

IMPLEMENTATION:
□ Authenticate user
□ Validate planId
□ If paymentMethod === 'mpesa':
  ├─ Validate phone number (Kenyan format)
  ├─ Call M-PESA API
  ├─ Return STK prompt response
  └─ Store pending transaction
□ If paymentMethod === 'stripe':
  ├─ Initiate Stripe payment
  ├─ Return payment intent
  └─ Store pending transaction
□ On payment success:
  ├─ Create subscription (see above)
  ├─ Update transaction status
  └─ Return subscription details

RESPONSE:
{
  "success": true,
  "data": {
    "subscription": { ... },
    "transaction": {
      "id": "txn_123",
      "status": "completed",
      "amount": 599,
      "currency": "KES"
    }
  }
}

ERRORS:
□ 400: Invalid plan or payment method
□ 402: Payment failed
□ 401: User not authenticated
```

#### 4. Get Available Plans
```
✅ ROUTE: GET /api/subscriptions
✅ AUTH: Bearer token
✅ PARAMS: None

IMPLEMENTATION:
□ Authenticate user
□ Get all active plans from plans collection
□ Filter by userType (optional)
□ Return array of plans

RESPONSE:
{
  "success": true,
  "data": [
    {
      "id": "trial_plan",
      "name": "Trial",
      "price": 0,
      "duration": 90,
      "trialDays": 90,
      "features": [...]
    },
    {
      "id": "individual_pro",
      "name": "Pro",
      "price": 599,
      "duration": 30,
      "trialDays": 0,
      "features": [...]
    }
  ]
}
```

---

### Automatic Trial Creation

#### Trigger: When Profile Approved
```
EVENT: Transporter profile marked as 'approved'
  └─ transporterStatus = 'approved'

LOGIC:
□ Listen for profile approval update
□ Check if user has existing subscription
│ ├─ If yes: Do nothing
│ └─ If no: Continue
□ Check if user has used trial before
│ ├─ If yes (trial already used): Do nothing
│ └─ If no: Create trial
□ Create subscription with planId = 'trial_plan'
  ├─ status = 'active'
  ├─ startDate = now
  ├─ endDate = now + 90 days
  ├─ isActive = true
  ├─ paymentStatus = 'pending' (no actual payment)
  └─ autoRenew = false

VERIFICATION:
□ Frontend calls GET /api/subscriptions/subscriber/status
□ Response includes isTrialActive = true, daysRemaining = 90
```

---

### Subscription Status Calculation

#### Function: Calculate Subscription Status
```typescript
function calculateSubscriptionStatus(subscription, plan) {
  const now = Date.now();
  const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
  const isExpired = subscription.endDate < now;
  const isPricedZero = plan.price === 0;
  
  return {
    hasActiveSubscription: subscription.isActive && !isExpired && !isPricedZero,
    isTrialActive: subscription.isActive && !isExpired && isPricedZero,
    needsTrialActivation: false,
    currentPlan: plan,
    daysRemaining: Math.max(daysRemaining, 0),
    subscriptionStatus: isExpired ? 'expired' : (subscription.isActive ? 'active' : 'inactive'),
    subscription: subscription
  };
}
```

---

### Error Handling

#### API Error Responses
```
□ Always include 'success' field
□ Include 'error' message for failures
□ Use appropriate HTTP status codes:
  ├─ 200: Success
  ├─ 400: Bad request (invalid data)
  ├─ 401: Unauthorized (not authenticated)
  ├─ 403: Forbidden (no permission)
  ├─ 409: Conflict (already has subscription)
  ├─ 500: Server error
  └─ 503: Service unavailable

EXAMPLE ERROR:
{
  "success": false,
  "error": "User already has active subscription",
  "code": "SUBSCRIPTION_EXISTS"
}
```

---

### Testing Requirements

#### Unit Tests
```
□ Test subscription status calculation
□ Test trial creation on profile approval
□ Test payment processing
□ Test error handling
□ Test edge cases (expired, no subscription, etc.)
```

#### Integration Tests
```
□ Test complete trial flow
□ Test renewal flow
□ Test payment flow
□ Test concurrent requests (race conditions)
```

#### Manual Tests
```
□ Create transporter and approve profile (verify trial created)
□ Check subscription status (verify correct response)
□ Process payment for renewal (verify subscription updated)
□ Check expired subscription (verify status changes)
□ Test with multiple users simultaneously
```

---

### Dependency Requirements

```
□ Firestore (or similar database)
□ Firebase Admin SDK
□ M-PESA API integration
□ Stripe API integration
□ Timestamp library (for date calculations)
□ Authentication middleware
```

---

### Implementation Order (Recommended)

1. **Database Schema** (Day 1)
   - [ ] Create subscriptions collection
   - [ ] Create plans collection
   - [ ] Add sample plans

2. **Get Status Endpoint** (Day 1-2)
   - [ ] Implement GET /api/subscriptions/subscriber/status
   - [ ] Test with existing data

3. **Create Subscription** (Day 2)
   - [ ] Implement POST /api/subscriptions/subscriber
   - [ ] Setup automatic trial creation
   - [ ] Test manual creation

4. **Get Plans** (Day 2)
   - [ ] Implement GET /api/subscriptions
   - [ ] Test plan filtering

5. **Payment Processing** (Day 3-4)
   - [ ] Integrate M-PESA API
   - [ ] Integrate Stripe API
   - [ ] Implement POST /api/subscriptions/subscriber/pay
   - [ ] Test payment flows

6. **Testing & Integration** (Day 4-5)
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Manual E2E tests
   - [ ] Fix issues

---

### Success Criteria

- [ ] All 4 endpoints implemented
- [ ] Frontend successfully calls all endpoints
- [ ] Trial automatically created on profile approval
- [ ] Subscription status correctly calculated
- [ ] Payment processing works for both M-PESA and Card
- [ ] All error cases handled gracefully
- [ ] No database inconsistencies
- [ ] Response times < 500ms
- [ ] All tests passing
- [ ] Frontend routing works correctly

---

### Frontend Integration Points

**Frontend will:**
1. Call `GET /api/subscriptions/subscriber/status` every 5 seconds
2. Call `POST /api/subscriptions/subscriber/pay` when user confirms payment
3. Call `GET /api/subscriptions` to show available plans
4. Display status based on response

**Frontend expects:**
- Consistent response format
- Proper error codes and messages
- Fast response times (< 1 second)
- No breaking changes to response format

---

## Questions?

Reference: `/home/clintmadeit/Projects/TRUKAPP/TRIAL_ACTIVATION_FLOW_GUIDE.md`

For detailed implementation context, see complete guide above.
