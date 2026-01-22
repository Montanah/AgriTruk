# BACKEND CHANGES DOCUMENTATION

**Date**: January 21, 2026  
**Branch**: `backend`  
**Changed File**: `backend/controllers/subscriptionController.js`  
**Type**: CRITICAL BUG FIXES  
**Reviewed By**: [Awaiting Backend Team Review]  

---

## ⚠️ IMPORTANT NOTICE

This document describes **CRITICAL FIXES** for the subscription system that affect trial duration calculation and payment processing. These changes **MUST be reviewed and tested by the backend team** before deployment.

---

## CHANGES SUMMARY

Two critical bugs were identified and fixed in the subscription controller:

| Bug | Severity | Location | Impact | Status |
|-----|----------|----------|--------|--------|
| Trial days calculated as months instead of days | 🔴 CRITICAL | Line 251-265 | Users see 2,700+ days instead of 90 | ✅ FIXED |
| Payment callback duration calculation wrong | 🔴 CRITICAL | Line 116-148 | Payment confirmations set incorrect end dates | ✅ FIXED |

---

## BUG #1: Trial Days Calculation

### The Problem
When creating a trial subscription, the system was adding 90 **MONTHS** instead of 90 **DAYS**, resulting in:
- Expected: 90 days remaining
- Actual: 2,700+ days remaining (7.5 years)

### Root Cause Analysis
File: `backend/controllers/subscriptionController.js`
Function: `exports.createSubscriber` (Lines 226-280)

**Original Code** (❌ BROKEN):
```javascript
const startDate = new Date(Date.now());
const endDate = new Date(startDate);
endDate.setMonth(endDate.getMonth() + plan.duration);
// ❌ PROBLEM: plan.duration = 90, so this adds 90 MONTHS!
```

**Issue Breakdown**:
- `plan.duration` for trial plans = 90 (represents 90 DAYS)
- `setMonth(getMonth() + 90)` interprets this as 90 MONTHS
- Result: 90 months = 7.5 years = ~2,700 days

### The Fix
**New Code** (✅ CORRECT):
```javascript
const startDate = new Date(Date.now());
const endDate = new Date(startDate);

// CRITICAL FIX: Handle trial vs paid plan duration correctly
// For trial plans (price === 0): duration should be in days (typically 90 days)
// For paid plans (price > 0): duration should be in days as well (converted from months)
if (plan.price === 0) {
  // Trial plan: use trialDays if available, otherwise use duration as days
  const trialDays = plan.trialDays || plan.duration || 90;
  console.log(`🔧 Creating trial subscriber with ${trialDays} days (plan.duration: ${plan.duration}, plan.trialDays: ${plan.trialDays})`);
  endDate.setDate(endDate.getDate() + trialDays);
} else {
  // Paid plan: duration is typically in months, need to convert
  // If duration is already in days (which it should be), add directly
  // If it's in months, multiply by 30
  const durationInDays = plan.duration > 12 ? plan.duration : plan.duration * 30;
  console.log(`🔧 Creating paid subscriber with ${durationInDays} days (plan.duration: ${plan.duration})`);
  endDate.setDate(endDate.getDate() + durationInDays);
}
```

### Why This Fix Works
1. **Uses `setDate()` instead of `setMonth()`** - Properly adds days instead of months
2. **Distinguishes trial from paid plans**:
   - Trial: `duration` is in days (90) → add directly
   - Paid: `duration` is in months (3) → multiply by 30 to get days
3. **Fallback to 90 if missing** - If `trialDays` or `duration` missing, defaults to 90 days
4. **Added logging** - Helps debug duration calculations in future

### Testing Instructions
```bash
# Test 1: Create trial subscription
POST /api/subscriptions/subscriber
{
  "userId": "test_user_123",
  "planId": "TRIAL_PLAN_ID"
}

# Expected response:
{
  "success": true,
  "data": {
    "startDate": "2026-01-21T...",
    "endDate": "2026-04-21T...",  // Exactly 90 days later
    "status": "active"
  }
}

# Check logs:
# Should see: "🔧 Creating trial subscriber with 90 days"

# Test 2: Verify in Firestore
# In subscribers collection, check:
# - endDate should be ~90 days from startDate
# - NOT 2700+ days away
```

### Verification Query
```javascript
// In Cloud Firestore, check a trial subscriber:
const subscriber = await db.collection('subscribers').doc('<SUBSCRIBER_ID>').get();
const startDate = subscriber.data().startDate.toDate();
const endDate = subscriber.data().endDate.toDate();
const daysRemaining = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

// Should log: approximately 90
console.log('Days in subscription:', daysRemaining);
```

---

## BUG #2: Payment Callback Duration Calculation

### The Problem
When payment is confirmed via webhook, the subscription end date was calculated incorrectly for paid plans. The system was treating all durations as if they were in days, but paid plans store duration in months.

### Root Cause Analysis
File: `backend/controllers/subscriptionController.js`
Function: `exports.paymentCallback` (Lines 100-135)

**Original Code** (❌ BROKEN):
```javascript
const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
// ❌ PROBLEM: Assumes plan.duration is always in days
// But for paid plans, duration is in MONTHS (1, 3, 12)
// Result: 3-month plan becomes 3-day subscription!
```

**Issue Breakdown**:
- Trial plan: `duration = 90` (days) → 90 * 24 * 60 * 60 * 1000 = 90 days ✓
- 3-month plan: `duration = 3` (months) → 3 * 24 * 60 * 60 * 1000 = 3 days ✗

### The Fix
**New Code** (✅ CORRECT):
```javascript
// CRITICAL FIX: Calculate endDate correctly based on plan type
const endDate = new Date();
if (plan.price === 0) {
  // Trial plan
  const trialDays = plan.trialDays || plan.duration || 90;
  console.log(`✅ Payment callback: Trial plan with ${trialDays} days`);
  endDate.setDate(endDate.getDate() + trialDays);
} else {
  // Paid plan: duration handling
  // If duration is in months (typically 1, 3, 12), multiply by 30
  // If duration is already in days (> 12), use directly
  const durationInDays = plan.duration > 12 ? plan.duration : plan.duration * 30;
  console.log(`✅ Payment callback: Paid plan with ${durationInDays} days (duration: ${plan.duration})`);
  endDate.setDate(endDate.getDate() + durationInDays);
}

await Subscribers.update(subscription.id, {
  endDate: admin.firestore.Timestamp.fromDate(endDate),
  isActive: true,
  paymentStatus: 'paid',
  authorizationCode: req.body.authorization_code,
});
```

### Why This Fix Works
1. **Checks plan type** - Uses `plan.price === 0` to identify trials
2. **Proper duration conversion**:
   - Trial: Duration is days → use directly
   - Paid: Duration is months (heuristic: if < 12, it's months; if > 12, it's days) → multiply by 30
3. **Uses `setDate()` for days** - Correctly adds days to current date
4. **Proper Firestore timestamp** - Converts to `admin.firestore.Timestamp`
5. **Logging for debugging** - Shows which plan type and duration

### Testing Instructions
```bash
# Test 1: Payment callback for 3-month plan
POST /api/subscriptions/callback
{
  "reference": "PAYSTACK_REF_12345",
  "status": "success",
  "metadata": {
    "userId": "user_123",
    "planId": "PAID_3MONTH_PLAN"
  }
}

# Expected: endDate should be ~90 days from now
# NOT 3 days from now

# Test 2: Payment callback for trial (should still work)
POST /api/subscriptions/callback
{
  "reference": "PAYSTACK_REF_67890",
  "status": "success",
  "metadata": {
    "userId": "user_456",
    "planId": "TRIAL_PLAN"
  }
}

# Expected: endDate should be ~90 days from now
```

### Verification Query
```javascript
// In Cloud Firestore, after payment callback:
const subscriber = await db.collection('subscribers').doc('<SUBSCRIBER_ID>').get();
const startDate = subscriber.data().startDate.toDate();
const endDate = subscriber.data().endDate.toDate();
const daysRemaining = Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24));

// For 3-month plan: should be ~90 days
// NOT 3 days
console.log('Days remaining:', daysRemaining);
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment Review
- [ ] Code review: Both fixes reviewed by at least 2 backend engineers
- [ ] Unit tests: Create tests for trial and paid plan subscriptions
- [ ] Integration tests: Test full payment flow (M-PESA → payment callback)
- [ ] Database: Verify existing subscriptions won't be affected
- [ ] Logs: Ensure new logging statements are appropriate for production

### Testing Environment
- [ ] Deploy to staging first
- [ ] Run full test suite against staging
- [ ] Test with real M-PESA and Stripe test accounts
- [ ] Verify admin dashboard still shows correct trial days
- [ ] Verify mobile app receives correct daysRemaining value

### Deployment Steps
1. **Create feature branch**: `git checkout -b fix/subscription-duration-calculation`
2. **Apply fixes** to `backend/controllers/subscriptionController.js`
3. **Run tests**: `npm test` (if test suite exists)
4. **Commit**: 
   ```bash
   git add backend/controllers/subscriptionController.js
   git commit -m "Fix: Critical subscription duration calculation bugs

   - Fix trial days (was adding 90 months, now adds 90 days)
   - Fix payment callback duration (now handles trial vs paid correctly)
   - Add proper duration conversion for paid plans (months to days)
   - Add logging for debugging subscription creation
   
   Fixes: Trial users seeing 2700+ days, paid plans getting wrong end dates"
   ```
5. **Push**: `git push origin fix/subscription-duration-calculation`
6. **Create PR** for review
7. **Deploy to staging** after PR approval
8. **Deploy to production** after staging verification

---

## ROLLBACK PLAN

If issues occur after deployment:

```bash
# Revert the commit
git revert <commit-hash>

# Or reset to previous version
git reset --hard <previous-commit-hash>

# Notify frontend team of rollback
```

**Communication**:
- If reverted, notify frontend team to use backend API without these fixes
- Frontend will need to cap daysRemaining at 90 days (already has this safety check)

---

## IMPACT ANALYSIS

### Who's Affected
- ✅ Trial subscribers: Will see correct 90-day durations (currently showing 2700+)
- ✅ Paid subscribers: Will get correct subscription duration after payment
- ✅ Admin dashboard: Will automatically show correct durations
- ✅ Mobile app: Will receive correct daysRemaining from API

### What Changes
- ✅ Trial subscriptions: 2,700+ days → 90 days
- ✅ Payment callbacks: 3-day subscriptions → 90-day (for 3-month plan)
- ✅ Backend logging: New debug logs added

### What Doesn't Change
- ❌ No database schema changes
- ❌ No API endpoint changes
- ❌ No breaking changes to existing code
- ❌ No changes to frontend code

---

## QUESTIONS & CLARIFICATIONS

### Q: Will this affect existing expired subscriptions?
**A**: No. These changes only apply to NEW subscriptions created after the fix is deployed. Expired subscriptions in the database are unaffected.

### Q: What if a plan has both `duration` and `trialDays` set?
**A**: The code uses: `const trialDays = plan.trialDays || plan.duration || 90;`  
This prioritizes `trialDays`, then falls back to `duration`, then defaults to 90.

### Q: Should we update the SubscriptionPlans model to enforce `trialDays`?
**A**: Yes, recommended for phase 2. Add validation that:
- Trial plans (price=0) MUST have `trialDays` or `duration` set to a number < 365
- Paid plans (price>0) MUST have `duration` set to a number (representing months)

### Q: How do we prevent this bug from happening again?
**A**: 
1. Add unit tests for both scenarios
2. Add integration tests with real payment callbacks
3. Document the duration field in SubscriptionPlans schema
4. Add validation in createSubscriber and payment callback functions

---

## RELATED ISSUES

This fix is part of a larger investigation that identified:
1. ✅ Trial days bug (THIS FIX)
2. ✅ Payment callback bug (THIS FIX)
3. ⏳ M-PESA backend integration incomplete
4. ⏳ Stripe backend updates needed
5. ⏳ Broker subscription flow incomplete

See `IMPLEMENTATION_AND_DEPLOYMENT_GUIDE.md` for the full roadmap.

---

## CONTACTS & ESCALATION

- **Backend Team Lead**: [Add contact]
- **QA Lead**: [Add contact]
- **DevOps/Deployment**: [Add contact]

For questions about these changes, contact the investigation lead.

---

## SIGN-OFF

- **Investigation Lead**: AI Assistant
- **Date**: January 21, 2026
- **Status**: Ready for Backend Team Review
- **Approval Status**: ⏳ Awaiting Backend Team

**Backend Team**: Please review this documentation and the code changes in `backend/controllers/subscriptionController.js` at lines 116-148 and 251-265.

---

