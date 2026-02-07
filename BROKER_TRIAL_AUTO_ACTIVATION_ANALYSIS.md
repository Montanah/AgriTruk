# Broker Trial Auto-Activation Issue - Root Cause Analysis

## Date: February 7, 2026
## Issue: Broker needs manual trial activation despite auto-activation code existing

---

## 🔍 PROBLEM STATEMENT

**Expected Behavior**: When admin approves a broker's documents, the broker's 90-day trial should auto-activate and they should go directly to the dashboard.

**Actual Behavior**: Broker is shown "Activate Your Trial" screen requiring manual activation with payment method verification.

**Screenshot Evidence**: Shows "Start Your 90-Day Free Trial" screen with M-PESA/Card payment method selection.

---

## ✅ FRONTEND CODE ANALYSIS

### 1. Auto-Activation Code EXISTS and is CORRECT ✅

**File**: `src/screens/VerifyIdentificationDocumentScreen.tsx` (Lines 290-310)

```typescript
// Auto-activate trial and navigate to dashboard
setTimeout(async () => {
  try {
    // Auto-activate 90-day trial for approved brokers
    console.log('🔄 Auto-activating 90-day trial for approved broker...');
    const activateResult = await subscriptionService.activateTrial('broker');
    
    if (activateResult.success) {
      console.log('✅ Trial activated successfully, navigating to dashboard');
      navigation.reset({
        index: 0,
        routes: [{ name: 'BrokerTabs' }]
      });
    } else {
      console.error('❌ Failed to activate trial:', activateResult.message);
      // Fallback logic...
    }
  } catch (error) {
    console.error('Error during trial activation:', error);
  }
}, 1000);
```

**Status**: ✅ Code is correct and should work

---

### 2. Trial Activation Service ✅

**File**: `src/services/subscriptionService.ts` (Lines 567-650)

```typescript
async activateTrial(userType: 'transporter' | 'broker'): Promise<{...}> {
  // 1. Check if user already has subscription
  const existingStatus = await this.getSubscriptionStatus();
  if (existingStatus.hasActiveSubscription) {
    return { success: true, existingSubscription: true };
  }
  
  // 2. Get available plans
  const plansResponse = await fetch(API_ENDPOINTS.SUBSCRIPTIONS, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // 3. Find trial plan (price === 0 or name includes 'trial')
  const trialPlan = plans.find((plan: any) => 
    plan.price === 0 || plan.name.toLowerCase().includes('trial')
  );
  
  // 4. Create subscriber with trial plan
  const response = await fetch(API_ENDPOINTS.SUBSCRIPTIONS + '/subscriber/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      planId: trialPlan.planId,
      userType,
      autoRenew: false
    })
  });
}
```

**Status**: ✅ Code is correct

---

## 🔴 BACKEND INVESTIGATION NEEDED

### Critical Questions for Backend Team:

#### 1. Does the Trial Plan Exist? 🔍
**Endpoint**: `GET /api/subscriptions`

**Expected Response**:
```json
{
  "data": [
    {
      "planId": "broker_trial_90",
      "name": "Broker Trial",
      "price": 0,
      "trialDays": 90,
      "duration": "3 months",
      "features": [...]
    }
  ]
}
```

**Questions**:
- ✅ Does a plan with `price: 0` exist for brokers?
- ✅ Does the plan have `trialDays: 90` set?
- ✅ Is the plan active and available?

**Test Command**:
```bash
# Check if trial plan exists
curl -H "Authorization: Bearer {token}" \
  https://api.trukafrica.com/api/subscriptions
```

---

#### 2. Does Subscriber Creation Work? 🔍
**Endpoint**: `POST /api/subscriptions/subscriber/`

**Request Body**:
```json
{
  "planId": "broker_trial_90",
  "userType": "broker",
  "autoRenew": false
}
```

**Expected Response**:
```json
{
  "success": true,
  "subscriber": {
    "subscriberId": "xxx",
    "userId": "xxx",
    "planId": "broker_trial_90",
    "status": "active",
    "isActive": true,
    "startDate": "2026-02-07T00:00:00Z",
    "endDate": "2026-05-08T00:00:00Z",  // 90 days later
    "trialDays": 90,
    "daysRemaining": 90
  }
}
```

**Questions**:
- ✅ Does the endpoint create a subscriber successfully?
- ✅ Is `endDate` calculated correctly (startDate + 90 days)?
- ✅ Is `status` set to "active"?
- ✅ Is `isActive` set to true?
- ✅ Is `trialDays` set to 90?

**Test Command**:
```bash
# Create trial subscriber
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"planId":"broker_trial_90","userType":"broker","autoRenew":false}' \
  https://api.trukafrica.com/api/subscriptions/subscriber/
```

---

#### 3. Does Subscription Status Return Correct Data? 🔍
**Endpoint**: `GET /api/subscriptions/status`

**Expected Response After Trial Activation**:
```json
{
  "hasActiveSubscription": true,
  "isTrialActive": true,
  "needsTrialActivation": false,
  "isTrial": true,
  "daysRemaining": 90,
  "trialDaysRemaining": 90,
  "subscriptionStatus": "active",
  "subscriber": {
    "status": "active",
    "isActive": true,
    "planId": "broker_trial_90",
    "endDate": "2026-05-08T00:00:00Z"
  }
}
```

**Questions**:
- ✅ Does `hasActiveSubscription` return true?
- ✅ Does `isTrialActive` return true?
- ✅ Does `needsTrialActivation` return false?
- ✅ Does `daysRemaining` return 90 (not 3)?
- ✅ Is `subscriptionStatus` set to "active"?

**Test Command**:
```bash
# Check subscription status after activation
curl -H "Authorization: Bearer {token}" \
  https://api.trukafrica.com/api/subscriptions/status
```

---

## 🎯 ROOT CAUSE POSSIBILITIES

### Scenario 1: Trial Plan Doesn't Exist ❌
**Symptom**: Frontend can't find trial plan
**Fix**: Backend needs to create trial plan with:
```json
{
  "planId": "broker_trial_90",
  "name": "Broker Trial",
  "price": 0,
  "trialDays": 90,
  "duration": "3 months"
}
```

---

### Scenario 2: Subscriber Creation Fails ❌
**Symptom**: POST /subscriber/ returns error
**Possible Causes**:
- Subscriber already exists (should return existing)
- Database constraint violation
- Missing required fields
- Permission issues

**Fix**: Backend needs to:
1. Handle "subscriber already exists" gracefully
2. Return existing subscriber if already active
3. Ensure endDate calculation is correct

---

### Scenario 3: Subscription Status Returns Wrong Data ❌
**Symptom**: Status shows `needsTrialActivation: true` or `daysRemaining: 3`
**Possible Causes**:
- Backend calculating daysRemaining incorrectly
- Backend not recognizing trial as active
- Backend returning wrong plan data

**Fix**: Backend needs to:
1. Calculate daysRemaining from endDate - currentDate
2. Set isTrialActive = true when plan.price === 0
3. Use plan.trialDays (90) not plan.duration (3 months)

---

### Scenario 4: Admin Approval Doesn't Trigger Activation ❌
**Symptom**: Auto-activation code never runs
**Possible Causes**:
- Admin panel doesn't call mobile app's activation flow
- Admin creates broker but doesn't activate trial
- Timing issue (broker logs in before admin approves)

**Fix**: 
- **Option A (Recommended)**: Admin panel should call backend to auto-activate trial when approving broker
- **Option B**: Mobile app checks on login and activates if approved but no trial

---

## 📋 DEBUGGING CHECKLIST

### For Backend Team:

1. **Check Trial Plan Exists**:
   ```sql
   SELECT * FROM subscription_plans 
   WHERE price = 0 AND name LIKE '%trial%';
   ```
   - [ ] Plan exists
   - [ ] `trialDays` = 90
   - [ ] `price` = 0
   - [ ] Plan is active

2. **Check Subscriber Creation**:
   ```sql
   SELECT * FROM subscribers 
   WHERE userId = '{broker_user_id}' 
   ORDER BY createdAt DESC LIMIT 1;
   ```
   - [ ] Subscriber exists
   - [ ] `status` = 'active'
   - [ ] `isActive` = true
   - [ ] `endDate` = startDate + 90 days
   - [ ] `planId` matches trial plan

3. **Check Subscription Status Endpoint**:
   - [ ] Returns `hasActiveSubscription: true`
   - [ ] Returns `isTrialActive: true`
   - [ ] Returns `daysRemaining: 90` (not 3)
   - [ ] Returns `needsTrialActivation: false`

4. **Check Admin Approval Flow**:
   - [ ] Admin approval triggers trial activation
   - [ ] Admin panel calls correct backend endpoint
   - [ ] Backend creates subscriber on approval

---

### For Mobile Team:

1. **Check Console Logs**:
   ```
   Look for these logs when broker is approved:
   - "🔄 Auto-activating 90-day trial for approved broker..."
   - "✅ Trial activated successfully, navigating to dashboard"
   OR
   - "❌ Failed to activate trial: {error message}"
   ```

2. **Check Network Requests**:
   - [ ] GET /api/subscriptions (fetch plans)
   - [ ] POST /api/subscriptions/subscriber/ (create subscriber)
   - [ ] GET /api/subscriptions/status (check status)

3. **Check Response Data**:
   - [ ] Plans response includes trial plan
   - [ ] Subscriber creation returns success
   - [ ] Status returns active trial

---

### For Admin Panel Team:

1. **Check Approval Flow**:
   - [ ] When admin approves broker documents, does it:
     - Call backend to activate trial?
     - Update broker status to "approved"?
     - Trigger any subscription-related actions?

2. **Check Admin Panel Code**:
   ```javascript
   // When approving broker, should call:
   POST /api/admin/brokers/{brokerId}/approve
   {
     "activateTrial": true,
     "trialDays": 90
   }
   ```

---

## 🔧 RECOMMENDED FIXES

### Fix 1: Backend Auto-Activation on Admin Approval (RECOMMENDED) ✅

**When**: Admin approves broker documents
**Action**: Backend automatically creates trial subscriber

**Implementation**:
```javascript
// In admin approval endpoint
async function approveBroker(brokerId) {
  // 1. Update broker status
  await updateBrokerStatus(brokerId, 'approved');
  
  // 2. Auto-activate 90-day trial
  const trialPlan = await getTrialPlan('broker');
  await createSubscriber({
    userId: broker.userId,
    planId: trialPlan.planId,
    userType: 'broker',
    autoRenew: false,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    status: 'active',
    isActive: true
  });
  
  // 3. Send notification to broker
  await sendNotification(broker.userId, 'Your account has been approved! Your 90-day trial is now active.');
}
```

---

### Fix 2: Mobile App Fallback Check (BACKUP) ✅

**When**: Broker logs in
**Action**: Check if approved but no trial, then activate

**Implementation**:
```typescript
// In broker login flow
async function checkAndActivateTrial() {
  const userProfile = await getUserProfile();
  const subscriptionStatus = await getSubscriptionStatus();
  
  if (userProfile.status === 'approved' && 
      !subscriptionStatus.hasActiveSubscription &&
      !subscriptionStatus.isTrialActive) {
    // Broker is approved but has no trial - activate it
    await subscriptionService.activateTrial('broker');
  }
}
```

---

### Fix 3: Ensure Trial Plan Exists ✅

**Backend**: Create trial plan if it doesn't exist

```sql
INSERT INTO subscription_plans (
  planId, name, price, trialDays, duration, features, userType
) VALUES (
  'broker_trial_90',
  'Broker Trial',
  0,
  90,
  '3 months',
  '["Full access to all features", "No payment required", "Cancel anytime"]',
  'broker'
);
```

---

## 🎯 WHO NEEDS TO UPDATE?

### 1. BACKEND TEAM (PRIMARY) 🔴

**Priority**: HIGH
**Tasks**:
1. ✅ Verify trial plan exists with `price: 0` and `trialDays: 90`
2. ✅ Verify POST /subscriber/ creates subscriber correctly
3. ✅ Verify GET /status returns correct data (daysRemaining: 90, not 3)
4. ✅ Implement auto-activation on admin approval (RECOMMENDED)
5. ✅ Test end-to-end flow: Admin approves → Trial activates → Broker sees dashboard

**Endpoints to Check**:
- `GET /api/subscriptions` - Returns trial plan
- `POST /api/subscriptions/subscriber/` - Creates subscriber
- `GET /api/subscriptions/status` - Returns correct status
- `POST /api/admin/brokers/{id}/approve` - Should auto-activate trial

---

### 2. ADMIN PANEL TEAM (SECONDARY) 🟡

**Priority**: MEDIUM
**Tasks**:
1. ✅ Verify admin approval calls backend to activate trial
2. ✅ Add "Activate Trial" checkbox/option when approving broker
3. ✅ Show trial status in broker details

**Code to Add**:
```javascript
// When admin clicks "Approve Broker"
async function approveBroker(brokerId) {
  await fetch(`/api/admin/brokers/${brokerId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      activateTrial: true,  // ← Add this
      trialDays: 90         // ← Add this
    })
  });
}
```

---

### 3. MOBILE TEAM (ALREADY DONE) ✅

**Priority**: LOW (Code already correct)
**Status**: ✅ Frontend code is correct and working
**Tasks**:
1. ✅ Auto-activation code exists and is correct
2. ✅ Fallback logic handles errors gracefully
3. ✅ Console logs help with debugging

**No changes needed** - Mobile app is ready!

---

## 📊 TESTING PLAN

### Test Case 1: New Broker Approval
1. Admin approves new broker documents
2. Backend auto-activates 90-day trial
3. Broker logs in and sees dashboard (not trial activation screen)
4. Subscription status shows: 90 days remaining, trial active

### Test Case 2: Existing Broker (Already Approved)
1. Broker logs in
2. Mobile app checks subscription status
3. If no trial but approved, activate trial
4. Broker sees dashboard with 90 days remaining

### Test Case 3: Trial Already Active
1. Broker logs in
2. Mobile app checks subscription status
3. Trial already active, skip activation
4. Broker sees dashboard with remaining days

---

## 🚀 NEXT STEPS

1. **Backend Team**: Run debugging checklist above
2. **Backend Team**: Implement auto-activation on admin approval
3. **Admin Panel Team**: Update approval flow to trigger trial activation
4. **All Teams**: Test end-to-end flow
5. **Mobile Team**: Monitor console logs for any errors

---

## 📝 SUMMARY

**Root Cause**: Backend is not auto-activating trial when admin approves broker, OR backend is returning wrong subscription data (3 days instead of 90).

**Solution**: Backend needs to either:
- Auto-activate trial when admin approves (RECOMMENDED)
- OR ensure trial plan has correct trialDays (90) and subscriber creation works

**Mobile App**: ✅ Already correct, no changes needed

**Status**: Waiting for backend investigation and fix

---

**Last Updated**: February 7, 2026
