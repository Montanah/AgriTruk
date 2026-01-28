# Comprehensive Issues Analysis - TRUK Africa App

**Date**: January 21, 2026  
**Investigation Focus**: Subscription Handling, Trial Days, Payment Flow, Broker Flow, iOS SDK Issue

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### 1. **CRITICAL BUG: Trial Days Calculation (2700+ Days Display)**

**Severity**: 🔴 CRITICAL  
**Status**: Confirmed and reproducible

#### Root Cause
Backend file: `backend/controllers/subscriptionController.js` - Line 234

```javascript
// ❌ WRONG - Adds MONTHS instead of DAYS
endDate.setMonth(endDate.getMonth() + plan.duration);
```

When `plan.duration = 90` (which represents 90 days):
- **Current behavior**: Adds 90 MONTHS = 7.5 years ≈ 2,739 days
- **Expected behavior**: Should add 90 DAYS
- **User impact**: Dashboard shows "90 days remaining" but mobile app shows "2,700+ days" because backend returns wrong calculation

#### Why Admin Dashboard Shows Correct Days
Admin dashboard uses different calculation method that's correct. The issue is only in the backend API response to mobile app.

#### Verification
- Backend subscription service (line 39 in `subscriptionService.js`): ✅ Correct - uses `setDate`
- Payment callback handler (line 117): ❌ Wrong - uses multiplication formula but still references wrong duration
- Create subscriber function (line 234): ❌ Wrong - uses `setMonth`

**Impact**: 
- Trial users see inconsistent day counts
- Mobile app displays days incorrectly
- Admin dashboard shows correct days (different code path)

---

### 2. **iOS SDK Version Issue (Build Error 90725)**

**Severity**: 🔴 CRITICAL  
**Status**: Blocking App Store release

#### Issue Details
Error Message: "This app was built with the iOS 18.5 SDK. Starting April 2026, all iOS and iPadOS apps must be built with the iOS 26 SDK or later."

#### Root Cause
- Current Expo version: `~53.0.25` (frontend/package.json)
- Latest available Expo SDK for iOS 26: Need Expo 52 or higher
- **Problem**: `expo 53.0.25` uses iOS 18.5 SDK internally
- Xcode version must support iOS 26 SDK

#### Frontend Configuration
- `app.config.js` - Line 17: `deploymentTarget: "13.4"` ✅ Correct
- `eas.json` - iOS build profile: ❌ Missing explicit iOS SDK version specification

#### Solution Required
1. Update Expo CLI to version compatible with iOS 26 SDK
2. Update Xcode build system
3. Rebuild IPA with latest SDK

---

### 3. **Subscription Status API Inconsistency**

**Severity**: 🟡 HIGH  
**Status**: Inconsistent endpoints

#### Issue
Two different endpoints return different formats:

**Endpoint 1**: `/api/subscriptions/subscriber/status` (Line 495)
- Function: `getSubcriberStatus` (line 412)
- Returns structured response with calculated values
- ✅ Used by mobile app frontend service

**Endpoint 2**: `/api/subscription/status/:userId` (Line 1018)
- Function: Different handler
- Uses `SubscriptionService.getSubscriptionStatus`
- Returns different structure
- ❌ Not used by mobile app, but exists

#### Data Flow Issues
```
Mobile App Request
    ↓
subscriptionService.ts → fetchSubscriptionStatus()
    ↓
API Call: /subscriber/status
    ↓
Backend getSubcriberStatus()
    ↓
BUG: endDate calculated with setMonth()
    ↓
Returns daysRemaining = 2,700+
    ↓
Frontend receives wrong value
    ↓
Frontend validation catches it and caps at 90 (safety measure)
    ↓
User sees 90 days (but only by luck of frontend validation)
```

---

### 4. **Payment Handling Flow Issues**

**Severity**: 🟡 HIGH  
**Status**: Incomplete implementation

#### Payment Methods
- ❌ M-PESA: Not fully integrated in subscription flow
- ⚠️ Stripe: Basic implementation exists
- ❌ Card validation: Insufficient error handling

#### Payment Callback Issues
File: `backend/controllers/subscriptionController.js` - Line 106-130

**Problem 1**: Wrong endDate calculation in callback
```javascript
const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
// This assumes plan.duration is in days, but:
// - For trial plans: duration = 90 (days) ✅ Works
// - For paid plans: duration = 3 (months) ❌ Fails - calculates 3 days instead of 3 months
```

**Problem 2**: Missing transaction validation
```javascript
if (subscription && subscription.transactionId === reference) {
  // Works for individual payment
  // BUT: What if same reference used twice? No idempotency check
}
```

**Problem 3**: Inconsistent payment status handling
- Trial creation: `paymentStatus = 'pending'` then expects webhook
- Paid plans: `paymentStatus = 'pending'` but flow unclear if webhook arrives

#### Frontend Payment Issues
File: `frontend/src/screens/SubscriptionTrialScreen.tsx`

**Problems**:
1. M-PESA integration incomplete - phone validation only
2. Stripe integration accepts card data but no proper tokenization
3. No payment success/failure confirmation flow
4. Error handling missing for payment timeouts

---

### 5. **Broker Flow Issues**

**Severity**: 🟡 HIGH  
**Status**: Incomplete flow

#### Problem 1: Broker Role Requirements
- Brokers require subscriptions (like transporters) ✅
- But broker subscription validation is incomplete ⚠️

File: `App.tsx` - Line 630-650
```typescript
// Broker subscription checking exists but:
// 1. No fallback if subscription check fails
// 2. No clear navigation if subscription expires
// 3. Inconsistent with transporter flow
```

#### Problem 2: Broker Trial Activation
- No clear trial flow for brokers ❌
- Different from transporter flow ⚠️
- Trial activation screen not reached for brokers ⚠️

#### Problem 3: Broker Payment Methods
- Only general payment handling exists
- No broker-specific payment UI
- M-PESA integration unclear for brokers

---

### 6. **Frontend-Backend Misalignment**

**Severity**: 🟡 HIGH  
**Status**: Multiple inconsistencies

#### Data Type Mismatches

**Issue 1**: Date Format Inconsistency
```javascript
// Backend returns:
endDate: Timestamp // Firestore Timestamp

// Frontend expects:
endDate: Date // JavaScript Date or ISO string

// Conversion happens in Subscribers model but not consistently
```

**Issue 2**: Days Remaining Calculation
```javascript
// Backend calculates (if working correctly):
daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

// Frontend ALSO calculates (safety measure):
if (daysRemaining > 90) { daysRemaining = 90; }

// This double-calculation is a band-aid, not a fix
```

**Issue 3**: Trial vs Active Subscription Logic
```javascript
// Backend defines:
- hasActiveSubscription = isActive && !isTrial
- isTrialActive = isTrial && isActive
- needsTrialActivation = !isActive && neverUsedTrialBefore

// Frontend sometimes checks just hasActiveSubscription
// Frontend sometimes checks isTrialActive
// Frontend sometimes checks subscriptionStatus === 'trial'
// Inconsistent usage throughout app
```

---

### 7. **Trial Subscription Model Issues**

**Severity**: 🟡 HIGH  
**Status**: Incomplete specification

#### Trial Duration Specification
**Files**: 
- `backend/models/SubscriptionsPlans.js`
- `backend/models/Subscribers.js`

**Issue**: Trial duration defined in multiple places inconsistently
1. `plan.duration` = 90 (should be in days)
2. `plan.trialDays` = Not consistently set
3. `plan.billingCycle` = 'trial' indicator

**Problem**: Confusion between:
- `duration` (supposed to be days for trials, months for paid plans)
- `trialDays` (explicit trial duration, often missing)
- `billingCycle` (should be primary indicator)

#### Subscriber Creation Issue
When creating subscriber from admin:
```javascript
// What gets stored?
{
  startDate: now,
  endDate: now + (plan.duration months), // WRONG!
  isTrial: determined by plan.price === 0,
  status: 'active'
}

// Should be:
{
  startDate: now,
  endDate: now + (plan.trialDays days), // or plan.duration if in days
  isTrial: plan.billingCycle === 'trial',
  status: 'active'
}
```

---

### 8. **Subscription State Management Issues**

**Severity**: 🟠 MEDIUM  
**Status**: Logic gaps

#### Race Conditions
File: `frontend/App.tsx` - Lines 318-338

```typescript
// Subscription listener added in useEffect
// But: What if subscription expires between checks?
// What if subscription data updates while navigating?
// No cleanup/re-fetch on navigation
```

#### Caching Issues
File: `frontend/src/services/subscriptionService.ts` - Lines 60-115

```typescript
// Cache duration: 30 seconds
// Problem: If user navigates between screens, subscription status may be stale
// Problem: No cache invalidation when subscription changes
// Problem: No force-refresh capability for user
```

#### Missing Validation States
- No explicit "checking subscription" state in App.tsx
- Loading screen duration unclear if subscription check slow
- Timeout handling not visible to user

---

## 📋 ISSUES SUMMARY TABLE

| Issue | Severity | Impact | Fix Complexity | Owner |
|-------|----------|--------|-----------------|-------|
| Trial days 2700+ display | 🔴 CRITICAL | Users see wrong remaining days | 🟢 Simple | Backend |
| iOS SDK version | 🔴 CRITICAL | App Store rejection | 🟡 Medium | Frontend |
| Payment flow incomplete | 🟡 HIGH | M-PESA/Stripe unreliable | 🟡 Medium | Backend |
| Broker flow incomplete | 🟡 HIGH | Brokers can't subscribe | 🟡 Medium | Backend/Frontend |
| Frontend-Backend mismatch | 🟡 HIGH | Inconsistent behavior | 🟡 Medium | Both |
| Trial duration definition | 🟡 HIGH | Confusion in codebase | 🟡 Medium | Backend |
| State management issues | 🟠 MEDIUM | Rare edge case bugs | 🟡 Medium | Frontend |
| API inconsistency | 🟠 MEDIUM | Confusion/maintenance burden | 🟢 Simple | Backend |

---

## 🔧 QUICK FIX SEQUENCE

### Phase 1: Critical Fixes (Do Immediately)
1. **Fix trial days calculation** - Change `setMonth` to `setDate` in createSubscriber
2. **Fix iOS SDK** - Update Expo and rebuild
3. **Fix payment callback** - Handle duration correctly for both trial/paid

### Phase 2: High Priority Fixes (This Week)
4. **Complete payment flow** - Add M-PESA validation and error handling
5. **Fix broker flow** - Implement complete broker subscription logic
6. **Align data types** - Standardize date format handling

### Phase 3: Medium Priority Fixes (Next Sprint)
7. **Fix state management** - Add proper subscription state validation
8. **Consolidate endpoints** - Remove duplicate API endpoints
9. **Improve caching** - Add cache invalidation logic

---

## 📊 BACKEND CODE LOCATIONS

| File | Line | Issue | Fix |
|------|------|-------|-----|
| subscriptionController.js | 234 | setMonth() instead of setDate() | Change to setDate() |
| subscriptionController.js | 117 | Wrong duration handling in callback | Handle trial vs paid duration |
| subscriptionController.js | 121 | Missing Firestore Timestamp conversion | Add timestamp.fromDate() |
| Subscribers.js | - | No explicit trialDays field | Add trialDays to model |
| SubscriptionsPlans.js | - | Inconsistent duration definition | Clarify duration vs trialDays |

---

## 📊 FRONTEND CODE LOCATIONS

| File | Line | Issue | Fix |
|------|------|-------|-----|
| subscriptionService.ts | 280 | Days capped at 90 (band-aid) | Fix backend instead |
| subscriptionService.ts | 115 | Cache never invalidated | Add invalidation method |
| App.tsx | 318-338 | Missing unsubscribe logic | Add proper cleanup |
| App.tsx | 1303 | Inconsistent state checks | Standardize logic |
| SubscriptionTrialScreen.tsx | 150 | M-PESA validation incomplete | Add proper validation |

---

## ✅ WHAT'S WORKING CORRECTLY

- ✅ Admin dashboard correctly displays trial days (different code path)
- ✅ Frontend validation catches and caps days at 90 (safety net)
- ✅ Firestore timestamp conversion works (when done correctly)
- ✅ Trial-only-once enforcement works (in Subscribers model)
- ✅ Basic payment initialization works

---

## 📝 NEXT STEPS

1. Create detailed implementation plan for Phase 1 fixes
2. Create backend fixes with tests
3. Rebuild frontend with iOS SDK fix
4. Test end-to-end subscription flow
5. Monitor in production for remaining issues

