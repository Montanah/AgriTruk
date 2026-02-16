# Quick Start Testing Guide

## What Was Fixed

### ✅ Permission Request After Disclosure
When users accept the background location disclosure, the app now:
1. Saves their consent
2. **Immediately requests foreground location permission**
3. **Immediately requests background location permission**
4. **Prompts user to turn on location if it's off**

This ensures Google Play compliance and better user experience.

## How to Test

### Step 1: Build the App

```bash
./build.sh
```

Select option 1 for APK (testing) or option 2 for AAB (Google Play).

### Step 2: Install on Physical Device

**Important**: Must test on physical Android device, not emulator!

```bash
# After build completes, download APK and install on device
# Or use: adb install path/to/app.apk
```

### Step 3: Test Permission Flow

1. **Fresh Install Test**
   - Uninstall app completely from device
   - Install fresh APK
   - Open app
   - Login as transporter or driver
   - ✅ Verify disclosure appears
   - Tap "Accept"
   - ✅ Verify foreground permission dialog appears
   - Tap "Allow"
   - ✅ Verify background permission dialog appears
   - Tap "Allow all the time"
   - ✅ Verify app navigates to dashboard

2. **Location Off Test**
   - Go to device Settings → Location
   - Turn OFF location
   - Uninstall and reinstall app
   - Login as transporter or driver
   - Accept disclosure
   - ✅ Verify Android prompts to turn on location
   - Turn on location
   - Grant permissions
   - ✅ Verify app works correctly

3. **Permission Denial Test**
   - Uninstall and reinstall app
   - Login as transporter or driver
   - Accept disclosure
   - Tap "Deny" on foreground permission
   - ✅ Verify app doesn't crash
   - Close and reopen app
   - ✅ Verify disclosure appears again

### Step 4: Check Logs

Connect device via USB and check logs:

```bash
adb logcat | grep -E "📍|📢|LOCATION"
```

Look for:
- "📍 Requesting foreground location permission..."
- "📍 Foreground permission status: granted"
- "📍 Requesting background location permission..."
- "📍 Background permission status: granted"

## Expected Results

### ✅ Success Indicators
- Disclosure appears on fresh install
- Permission dialogs appear immediately after accepting disclosure
- Android prompts to turn on location if it's off
- App continues even if permissions denied
- Disclosure reappears on next launch if permissions not granted

### ❌ Failure Indicators
- Disclosure doesn't appear
- Permission dialogs don't appear after accepting
- App crashes when permissions denied
- Location prompt doesn't appear when location is off

## Trial Subscription Issue

If you see "Trial Available, Activate Now" when trial should be active:

### Quick Debug

1. **Check API Response**
   - Open app
   - Navigate to subscription screen
   - Check console logs for: `📊 Subscription Status:`
   - Verify values:
     - `isTrialActive` should be `true`
     - `needsTrialActivation` should be `false`
     - `daysRemaining` should be > 0

2. **Clear Cache**
   - Force close app
   - Clear app data in device settings
   - Reopen app and login
   - Check if issue persists

3. **Check Database**
   - Open Firebase Console
   - Go to Firestore
   - Find `subscribers` collection
   - Find user's subscription document
   - Verify:
     - `isActive` is `true`
     - `endDate` is in the future
     - Plan has `price: 0`

## Common Issues

### Issue: TypeScript errors in IDE
**Solution**: Restart TypeScript server or IDE. Code compiles correctly.

### Issue: Permission dialogs don't appear
**Solution**: Check that methods are being called in App.tsx. Look for logs starting with "📍".

### Issue: App crashes on permission denial
**Solution**: Check error handling in App.tsx onAccept handler. Should have try-catch blocks.

### Issue: Disclosure doesn't reappear
**Solution**: Check `shouldShowBackgroundLocationDisclosure()` logic in locationService.ts.

## Files to Check

If issues occur, check these files:

1. **src/services/locationService.ts**
   - Lines 107-143: Permission request methods
   - Verify methods exist and are exported

2. **App.tsx**
   - Lines 1180-1250: Disclosure modal handlers
   - Verify permission requests are called in onAccept

3. **Console Logs**
   - Look for "📍" emoji logs
   - Check for error messages
   - Verify permission status values

## Success Checklist

Before submitting to Google Play:

- [ ] Fresh install shows disclosure
- [ ] Accepting disclosure prompts for permissions
- [ ] Location off prompts to turn on location
- [ ] Permission denial doesn't crash app
- [ ] Disclosure reappears until permissions granted
- [ ] App navigates correctly after permissions granted
- [ ] Location tracking works in background
- [ ] No console errors during flow

## Need Help?

Check these documentation files:

- `docs/PERMISSION_REQUEST_IMPLEMENTATION.md` - Detailed implementation
- `docs/TRIAL_SUBSCRIPTION_UI_INVESTIGATION.md` - Trial issue investigation
- `docs/SESSION_SUMMARY_PERMISSION_AND_TRIAL.md` - Complete session summary
- `docs/DISCLOSURE_FIX_COMPLETE.md` - Previous disclosure fix
- `docs/CRITICAL_FIXES_NEEDED.md` - Overview of issues

## Build Commands

```bash
# Build APK for testing
./build.sh
# Select: 1

# Build AAB for Google Play
./build.sh
# Select: 2

# Check logs
adb logcat | grep -E "📍|📢|LOCATION"

# Install APK
adb install path/to/app.apk

# Uninstall app
adb uninstall com.trukapp
```

## Ready to Submit?

Once all tests pass:

1. Build AAB: `./build.sh` → Select 2
2. Upload to Google Play Console
3. Update store listing
4. Submit for review

Good luck! 🚀
