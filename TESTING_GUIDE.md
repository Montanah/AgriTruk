# App Launch and Login Flow Testing Guide

## Pre-Testing Checklist

### Environment Setup
- [ ] Firebase configuration is complete with all required keys
- [ ] Backend API endpoints are responding
- [ ] Test user accounts exist for all roles
- [ ] Internet connection is stable

### Device/Emulator Setup
- [ ] Device has sufficient storage (> 1GB)
- [ ] Device OS is supported (iOS 12+ / Android 8+)
- [ ] Location permissions are not pre-granted
- [ ] AsyncStorage is available and working

## Test Scenarios

### Scenario 1: Initial App Launch (No User)
**Expected Flow**: Welcome Screen → Login
1. Uninstall app completely
2. Install fresh build
3. Launch app
4. **Expected**: Welcome screen appears, no errors
5. **Verify**:
   - ✅ No "Something went wrong" error
   - ✅ "Get Started" button is visible
   - ✅ Navigation options appear
   - ✅ Console shows: "Loading..." then navigation completed

### Scenario 2: Login with Email (Shipper)
**Expected Flow**: LoginScreen → Verification (if needed) → MainTabs
1. From Welcome screen, go to Sign In
2. Enter valid shipper credentials
3. **Expected**: User is logged in and routed to MainTabs
4. **Verify**:
   - ✅ No background location disclosure shown (shippers don't need it)
   - ✅ MainTabs navigation appears
   - ✅ Dashboard shows user data
   - ✅ Console shows: "User verification status: verified"

### Scenario 3: Login with Transporter (Individual)
**Expected Flow**: LoginScreen → BackgroundLocationDisclosure → TransporterTabs
1. From Welcome screen, go to Sign In
2. Enter valid individual transporter credentials
3. **Expected**: Background Location disclosure appears
4. **Verify on First Login**:
   - ✅ BackgroundLocationDisclosureModal appears
   - ✅ Modal shows "Allow Background Location" button
   - ✅ Modal shows "Not Now" button
   - ✅ Modal cannot be dismissed by back button
   - ✅ Navigation is blocked (loading state maintained)
5. **Accept Disclosure**:
   - ✅ Modal closes
   - ✅ TransporterTabs navigation loads
   - ✅ User redirected to dashboard
   - ✅ Consent saved in AsyncStorage
6. **Verify on Second Login**:
   - ✅ No disclosure shown (consent already saved)
   - ✅ TransporterTabs loads immediately

### Scenario 4: Login with Company Transporter
**Expected Flow**: LoginScreen → BackgroundLocationDisclosure → CompanyDashboard
1. From Welcome screen, go to Sign In
2. Enter valid company transporter credentials
3. **Expected**: Background Location disclosure appears (different text for company)
4. **Verify**:
   - ✅ Disclosure mentions "fleet vehicles"
   - ✅ Disclosure mentions "your company and clients"
   - ✅ Modal closes after acceptance
   - ✅ Company dashboard loads
   - ✅ Console shows: "Setting disclosure for company transporter"

### Scenario 5: Login with Driver
**Expected Flow**: LoginScreen → BackgroundLocationDisclosure → DriverTabs
1. From Welcome screen, go to Sign In
2. Enter valid driver credentials
3. **Expected**: Background Location disclosure appears (different text for drivers)
4. **Verify**:
   - ✅ Disclosure mentions "deliveries"
   - ✅ Disclosure mentions "your company and clients"
   - ✅ Modal content differs from transporter disclosure
   - ✅ Driver dashboard loads after acceptance
   - ✅ Console shows: "Setting disclosure for driver role"

### Scenario 6: Network Error During Login
**Expected Flow**: Show Connection Error → Retry
1. Disable network connectivity
2. Try to log in
3. **Expected**: Connection error screen appears
4. **Verify**:
   - ✅ Error icon appears
   - ✅ Error message displays
   - ✅ "Retry" button appears
   - ✅ No app crash with "Something went wrong"
   - ✅ Console shows: "Connection error"
5. Enable network and tap Retry
6. **Expected**: Login completes successfully

### Scenario 7: Firebase Not Initialized
**Expected Flow**: Connection error message
1. Build with missing Firebase env vars (for testing only)
2. Launch app
3. **Expected**: Connection error screen
4. **Verify**:
   - ✅ Error message: "Firebase initialization failed"
   - ✅ No crash to "Something went wrong"
   - ✅ Console shows: "CRITICAL: Firebase not properly initialized"

### Scenario 8: Firestore Query Fails
**Expected Flow**: Graceful fallback, then re-authentication
1. (Requires backend simulation)
2. Simulate Firestore being unavailable
3. **Expected**: App shows connection error
4. **Verify**:
   - ✅ App doesn't crash
   - ✅ Error is caught and logged
   - ✅ Retry works after Firestore recovers

### Scenario 9: Background Location Disclosure Decline
**Expected Flow**: LoginScreen → Disclosure → Decline → Dashboard (without background tracking)
1. Login as transporter for first time
2. Tap "Not Now" on disclosure
3. **Expected**: User routed to dashboard
4. **Verify**:
   - ✅ Consent saved as "declined"
   - ✅ Dashboard loads normally
   - ✅ No location tracking in background
   - ✅ Console shows: "User declined background location disclosure"
5. Logout and login again
6. **Expected**: Disclosure doesn't appear again

### Scenario 10: Subscription States
**Expected Flow**: Correct screen based on subscription status

#### 10A: Transporter with Active Subscription
1. Login as transporter with active subscription
2. **Expected**: TransporterTabs loads after disclosure
3. **Verify**:
   - ✅ Dashboard appears
   - ✅ All features available
   - ✅ No subscription screens

#### 10B: Transporter with Expired Subscription
1. Login as transporter with expired subscription
2. **Expected**: SubscriptionExpired screen appears
3. **Verify**:
   - ✅ Expired message displays
   - ✅ Renewal options available
   - ✅ Cannot access dashboard

#### 10C: Broker with Trial Available
1. Login as broker needing trial activation
2. **Expected**: SubscriptionTrial screen
3. **Verify**:
   - ✅ Trial activation options appear
   - ✅ Can activate trial or enter payment

### Scenario 11: App Error Boundary
**Expected Flow**: Error is caught and displayed gracefully
1. (Requires injecting test error)
2. Trigger a runtime error
3. **Expected**: Error boundary catches it
4. **Verify**:
   - ✅ "Something went wrong" screen appears (expected error)
   - ✅ Error details shown in dev mode
   - ✅ "Try Again" button resets app

### Scenario 12: Multiple Role Changes
**Expected Flow**: Proper routing based on role updates
1. Login as shipper
2. Logout
3. Login as transporter
4. **Expected**: Different UI, disclosure shown if needed
5. **Verify**:
   - ✅ Role changes work correctly
   - ✅ Disclosure rules applied per role
   - ✅ No errors during role switching

## Error Scenario Recovery Tests

### Error Test 1: AsyncStorage Failure
1. Simulate AsyncStorage error
2. Try to save background location consent
3. **Expected**: Error logged but app continues
4. **Verify**:
   - ✅ Navigation proceeds
   - ✅ Disclosure shown again on next launch (expected)
   - ✅ No crash

### Error Test 2: Location Service Error
1. Deny location permissions
2. Try to start location tracking
3. **Expected**: Graceful handling
4. **Verify**:
   - ✅ Error logged
   - ✅ App continues working
   - ✅ User can still access dashboard

### Error Test 3: Notification Service Error
1. Simulate notification helper error
2. Complete login
3. **Expected**: Login succeeds despite notification error
4. **Verify**:
   - ✅ User logged in
   - ✅ Dashboard loads
   - ✅ Error logged but not shown to user

## Console Log Verification

### Expected Logs During Successful Login

```
App.tsx: Routing decision - user: true role: transporter isVerified: true
App.tsx: User verification status: { isVerified: true, ... }
📢 App.tsx: User needs background location - checking disclosure consent
📢 App.tsx: Background location consent check result: false
📢 App.tsx: No consent found - will show global prominent disclosure BEFORE navigation
📢 BACKGROUND_LOCATION_DISCLOSURE_MODAL: Modal is now VISIBLE
✅ App.tsx: User accepted global background location disclosure
✅ LOCATION_SERVICE: Requesting BACKGROUND_LOCATION permission
App.tsx: Has active subscription - routing to transporter dashboard
App.tsx: ========== DRIVER CHECK COMPLETE ==========
```

### Expected Logs on Error

```
App.tsx: Error fetching user data from Firestore: [Error details]
App.tsx: Unhandled error in auth state listener: [Error details]
CRITICAL: Firebase not properly initialized. Auth: false Firestore: false
```

## Performance Benchmarks

### Expected Timing
- App launch to screen: < 2 seconds
- Login to dashboard: < 5 seconds
- Background disclosure appearance: < 1 second after auth
- Error screen appearance: < 1 second

## Compatibility Matrix

| Feature | iOS 12+ | Android 8+ | Web |
|---------|---------|-----------|-----|
| Basic Auth | ✅ | ✅ | ✅ |
| Background Location Disclosure | ✅ | ✅ | N/A |
| AsyncStorage | ✅ | ✅ | ✅ |
| Firebase | ✅ | ✅ | ✅ |
| Error Boundary | ✅ | ✅ | ✅ |

## Sign-Off Checklist

Before considering testing complete:
- [ ] All 12 scenarios pass without crashes
- [ ] All error scenarios handled gracefully
- [ ] No "Something went wrong" screens appear unexpectedly
- [ ] Background location disclosure shows for correct roles
- [ ] All console logs appear as expected
- [ ] Performance benchmarks met
- [ ] Works on both iOS and Android (if applicable)
- [ ] Works on both phone and tablet
- [ ] Works with multiple network conditions
- [ ] Play Store compliance verified (background location)
- [ ] App Store compliance verified (error handling)
