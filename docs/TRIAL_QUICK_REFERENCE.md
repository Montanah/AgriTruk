# Trial Activation Flow - Quick Reference Card

**Print this and keep it handy!**

---

## The System in 30 Seconds

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CREATES TRIALS                      │
│                                                               │
│  User Approved → Backend Creates Trial → Frontend Routes    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

User NEVER clicks "Activate Trial"
Admin/Backend handles it automatically
User just sees their status
```

---

## Frontend Routing Decision

```
Is profile approved?
  NO  → TransporterProcessingScreen
  YES → Check subscription status
         ├─ Expired? → SubscriptionExpiredScreen
         ├─ No subscription? → TransporterTabs (admin creating)
         └─ Has subscription? → TransporterTabs
```

---

## API Calls Frontend Makes

| Endpoint | When | Response |
|----------|------|----------|
| `GET /api/subscriptions/subscriber/status` | Every 5 seconds | Current subscription status |
| `POST /api/subscriptions/subscriber/pay` | User pays | Subscription created |
| `GET /api/subscriptions` | Load plans page | Available plans |

---

## Response Status Meanings

```json
{
  "hasActiveSubscription": true,    // Has paid plan, not trial
  "isTrialActive": true,             // Free trial active
  "needsTrialActivation": true,      // No subscription yet
  "subscriptionStatus": "active"     // Status enum
}
```

| Scenario | hasActive | isTrial | needsActivate | Where |
|----------|-----------|---------|---------------|--------|
| Trial active (90d) | false | true | false | Dashboard |
| Paid plan | true | false | false | Dashboard |
| No subscription | false | false | true | Dashboard* |
| Expired | false | false | false | Expired Screen |

*Backend will create trial automatically

---

## Key Numbers

```
Trial Duration:        90 days
Cache Duration:        30 seconds
Check Interval:        5 seconds
API Timeout:          10 seconds
Response Expected:    < 500ms
```

---

## Critical Code Paths

### 1. User Signup Flow
```
Sign Up → Verify Email/Phone → Complete Profile 
  → ADMIN APPROVES
    → GET /api/subscriptions/subscriber/status
      → BACKEND HAS CREATED TRIAL
        → Frontend sees isTrialActive = true
          → Route to TransporterTabs ✅
```

### 2. Trial Renewal Flow
```
Trial Expiring → GET status returns "expired"
  → Route to SubscriptionExpiredScreen
    → User clicks "Renew"
      → SubscriptionTrialDisclosureModal
        → User accepts
          → POST /api/subscriptions/subscriber/pay
            → Payment processing
              → Subscription created
                → Route to TransporterTabs ✅
```

### 3. Error Recovery Flow
```
API Error → subscriptionStatus.isApiError = true
  → Route to TransporterTabs (assume admin creating)
    → Frontend retries in 5 seconds
      → Status updates once backend has data ✅
```

---

## Debugging Checklist

### If trial not showing:
- [ ] User profile marked "approved" in Firebase?
- [ ] Backend created subscription document?
- [ ] Subscription endDate = now + 90 days?
- [ ] GET /api/subscriptions/subscriber/status returns isTrialActive = true?
- [ ] Frontend refresh to see update?

### If routing wrong:
- [ ] Which subscriptionStatus is being returned?
- [ ] Check all conditions in App.tsx lines 1318-1365
- [ ] Is API call succeeding?

### If payment not working:
- [ ] Is POST /api/subscriptions/subscriber/pay implemented?
- [ ] Does payment system (M-PESA/Stripe) work?
- [ ] Is subscription created after payment?

---

## File Map

```
Frontend Code:
├─ App.tsx (Main routing - Lines 1300-1400)
├─ subscriptionService.ts (API calls + caching)
├─ SubscriptionTrialScreen.tsx (Trial display)
├─ TransporterProcessingScreen.tsx (Status check)
└─ SubscriptionTrialDisclosureModal.tsx (PlayStore compliance)

Backend Needed:
├─ subscriptions collection (Firestore)
├─ GET /api/subscriptions/subscriber/status
├─ POST /api/subscriptions/subscriber
└─ POST /api/subscriptions/subscriber/pay
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Trial not showing | Backend didn't create | Approve profile → Check API |
| Routed to Expired | endDate in past | Backend: check date calculation |
| API error 404 | Endpoint missing | Backend: implement endpoint |
| State not updating | Cache too long | Frontend: checks every 5s |
| Disclosure not showing | isPaid plan | Check plan.price > 0 |

---

## Integration Checklist

```
BEFORE LIVE:
☐ All 4 API endpoints working
☐ Trial created on profile approval
☐ Subscription status correct
☐ Payment processing working
☐ Frontend routing working
☐ E2E test passed
☐ Disclosure showing correctly
☐ Error handling tested
☐ Load tested (multiple users)
☐ PlayStore review passed
```

---

## Quick Terminal Commands (Backend)

```bash
# Check subscription status for user
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/subscriptions/subscriber/status

# Create subscription manually (testing)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_uid","planId":"trial_plan"}' \
  http://localhost:3000/api/subscriptions/subscriber

# Get available plans
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/subscriptions
```

---

## Emergency Contacts

### If blocking issue found:
1. Check TRIAL_ACTIVATION_FLOW_GUIDE.md (detailed guide)
2. Check BACKEND_IMPLEMENTATION_CHECKLIST.md (implementation checklist)
3. Check App.tsx lines 1318-1370 (routing logic)

---

## Remember

✅ **DO:**
- Let admin/backend create trials
- Cache subscription status (30s)
- Check every 5 seconds
- Route based on subscriptionStatus
- Show disclosure for paid plans only

❌ **DON'T:**
- Ask user to activate trial
- Force payment before discount
- Ignore cache entirely
- Change 90-day trial length
- Use stale subscription data

---

**Last Updated:** January 27, 2026  
**Status:** Frontend Complete, Backend Needed  
**Priority:** HIGH
