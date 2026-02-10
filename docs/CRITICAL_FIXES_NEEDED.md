# Critical Fixes Needed - Disclosure & Subscription Issues

**Date:** February 10, 2026  
**Status:** 🔴 URGENT - Google Play Rejection Issues

---

## Issue 1: Prominent Disclosure Not Showing

### Problem
The background location disclosure modal is NOT showing up for users, which is causing Google Play to reject the app. The disclosure is required by Google Play Store policy.

### Root Cause
The disclosure consent is being saved to AsyncStorage after the first time it's shown. Once saved, it never shows again - even for new installs or after app updates.

**Current Flow:**
1. User opens app for first time
2. Disclosure shows (if user needs background location)
3. User accepts/declines
4. Consent saved to AsyncStorage: `@trukapp:background_location_consent`
5. **Disclosure NEVER shows again** - even after reinstall or update

### Why This Is a Problem
1. **Google Play reviewers** install the app fresh and expect to see the disclosure
2. **After app updates**, users should see the disclosure again if permissions changed
3. **Testing is impossible** - can't verify disclosure without clearing app data

### Solution Needed

**Option 1: Show disclosure on every app launch (until permission granted)**
```typescript
// In App.tsx - Check BOTH consent AND actual permission status
const hasConsent = await locationService.hasBackgroundLocationConsent();
const hasPermission = await locationService.hasBackgroundLocationPermission();

// Show disclosure if:
// 1. No consent given yet, OR
// 2. Consent given but permission not granted (user might have denied in system settings)
if (!hasConsent || !hasPermission) {
  setShowGlobalBackgroundLocationDisclosure(true);
}
```

**Option 2: Clear consent on app version change**
```typescript
// Check app version and clear consent if version changed
const CURRENT_VERSION = '1.0.3';
const LAST_VERSION_KEY = '@trukapp:last_app_version';

const lastVersion = await AsyncStorage.getItem(LAST_VERSION_KEY);
if (lastVersion !== CURRENT_VERSION) {
  // New version - clear consent to show disclosure again
  await AsyncStorage.removeItem('@trukapp:background_location_consent');
  await AsyncStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION);
}
```

**Option 3: Add "Reset Disclosure" button in settings (for testing)**
```typescript
// In settings screen
const resetDisclosure = async () => {
  await AsyncStorage.removeItem('@trukapp:background_location_consent');
  Alert.alert('Success', 'Disclosure will be shown again on next app launch');
};
```

---

## Issue 2: Trial Subscription Showing "Activate Now" Instead of "Trial Active"

### Problem
Even though the trial subscription is already active (90 days remaining), the UI shows:
- "Trial Available"
- "Activate Now" button

Instead of:
- "Free Trial" or "Trial Active"
- "90 days remaining"
- "Manage" button

### Root Cause
The backend is returning BOTH flags as true simultaneously:
```javascript
{
  isTrialActive: true,        // ✅ Trial IS active
  needsTrialActivation: true, // ❌ But also says needs activation
  daysRemaining: 90
}
```

This contradictory data causes the UI to show "Activate Now" button even though trial is already active.

### Where This Happens

**Backend (`subscriptionController.js`):**
```javascript
// Backend is setting both flags to true
const status = {
  isTrialActive: true,
  needsTrialActivation: true, // ❌ Should be false if trial is active
  daysRemaining: 90
};
```

**Frontend (`UnifiedSubscriptionCard.tsx`):**
```typescript
// UI logic (already fixed in our code)
// PRIORITY 1: isTrialActive (shows "Trial Active")
if (subscriptionStatus.isTrialActive) {
  planName = "Free Trial";
  statusText = "Trial Active";
}
// PRIORITY 4: needsTrialActivation (shows "Activate Now")
else if (subscriptionStatus.needsTrialActivation && !subscriptionStatus.isTrialActive) {
  planName = "Trial Available";
  statusText = "Activate Now";
}
```

### Solution Needed

**Backend Fix (`backend/controllers/subscriptionController.js`):**
```javascript
// When checking subscription status
const subscriber = await Subscribers.getByUserId(userId);

if (subscriber && subscriber.isActive && subscriber.status === 'active') {
  // Trial IS active - don't set needsTrialActivation
  return {
    isTrialActive: true,
    needsTrialActivation: false, // ✅ Set to false when trial is active
    hasActiveSubscription: true,
    daysRemaining: calculateDaysRemaining(subscriber.endDate),
    subscriptionStatus: 'active'
  };
} else {
  // No active subscription - needs activation
  return {
    isTrialActive: false,
    needsTrialActivation: true, // ✅ Only true when NO active subscription
    hasActiveSubscription: false,
    daysRemaining: 0,
    subscriptionStatus: 'none'
  };
}
```

---

## Testing Checklist

### Test Disclosure

- [ ] Clear app data completely
- [ ] Install app fresh
- [ ] Sign up as transporter
- [ ] Complete profile
- [ ] Get approved by admin
- [ ] **Verify disclosure shows BEFORE dashboard**
- [ ] Accept disclosure
- [ ] **Verify Android permission dialog shows**
- [ ] Grant permission
- [ ] **Verify disclosure doesn't show again (same session)**
- [ ] Close app completely
- [ ] Reopen app
- [ ] **Verify disclosure shows again (new session)** ← This is what Google reviewers will see

### Test Subscription UI

- [ ] Sign up as transporter
- [ ] Complete profile
- [ ] Get approved by admin
- [ ] Auto-trial activates (90 days)
- [ ] Go to dashboard
- [ ] **Verify shows "Trial Active - 90 days remaining"**
- [ ] **Verify shows "Manage" button (NOT "Activate Trial")**
- [ ] Click "Manage"
- [ ] **Verify can see subscription details**
- [ ] **Verify can upgrade to paid plan**

---

## Files That Need Changes

### For Disclosure Issue

1. **`src/services/locationService.ts`**
   - Add method to check actual permission status
   - Modify consent logic to show disclosure more frequently

2. **`App.tsx`**
   - Update disclosure trigger logic
   - Check both consent AND permission status
   - Consider showing on every launch until permission granted

3. **`src/screens/SettingsScreen.tsx`** (if exists)
   - Add "Reset Disclosure" button for testing

### For Subscription Issue

1. **`backend/controllers/subscriptionController.js`**
   - Fix logic to NOT set both `isTrialActive` and `needsTrialActivation` to true
   - Ensure `needsTrialActivation` is false when trial is active

2. **`backend/models/Subscribers.js`**
   - Verify status calculation logic
   - Ensure consistent status values

---

## Priority

🔴 **CRITICAL - Must fix before Google Play submission**

1. **Disclosure not showing** - Google will reject without this
2. **Subscription UI wrong** - Confuses users and looks broken

---

## Recommended Approach

### For Disclosure (Quick Fix)
Show disclosure on EVERY app launch for users who need background location, until they grant the permission in system settings. This ensures Google reviewers always see it.

### For Subscription (Backend Fix)
Update backend to return consistent data - never set both `isTrialActive` and `needsTrialActivation` to true simultaneously.

---

## Next Steps

1. **Fix disclosure logic** - Show on every launch until permission granted
2. **Fix backend subscription status** - Return consistent flags
3. **Test thoroughly** - Clear app data and test fresh install
4. **Record video** - Show disclosure appearing for Google Play submission
5. **Submit to Google Play** - With video demonstration

---

**These fixes are CRITICAL for Google Play approval!** 🚨
