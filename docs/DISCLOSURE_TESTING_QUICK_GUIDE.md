# Disclosure Testing Quick Guide

## Quick Test on Physical Device

### Prerequisites
```bash
# 1. Build APK
npm run build:apk

# 2. Install on device
adb install path/to/app.apk

# 3. Enable logging
adb logcat | grep -E "BACKGROUND_LOCATION|📢|📍"
```

### Test 1: Fresh Install (Transporter)
```bash
# Clear app data
adb shell pm clear com.trukapp

# Launch app
adb shell am start -n com.trukapp/.MainActivity

# Watch logs for:
# ✅ "User needs background location - checking disclosure consent"
# ✅ "Should show background location disclosure: true"
# ✅ "Will show global prominent disclosure BEFORE navigation"
# ✅ "BACKGROUND_LOCATION_DISCLOSURE_MODAL: Modal is now VISIBLE"
```

**Expected Flow:**
1. Welcome screen
2. Sign up as transporter
3. Complete profile
4. **Disclosure modal appears** (full-screen, cannot dismiss)
5. Tap "Allow Background Location"
6. **Android permission dialog** (foreground)
7. **Android permission dialog** (background)
8. Navigate to dashboard

### Test 2: User Declines Disclosure
```bash
# Follow Test 1 but tap "Not Now" on disclosure
# Then navigate to a feature that needs location

# Watch logs for:
# ✅ "User DECLINED background location disclosure"
# ✅ "App will use foreground-only location tracking"
# ✅ Disclosure should appear again when needed
```

### Test 3: Permission Already Granted
```bash
# Grant permissions manually first
adb shell pm grant com.trukapp android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.trukapp android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant com.trukapp android.permission.ACCESS_BACKGROUND_LOCATION

# Launch app
# Disclosure should NOT appear (already granted)

# Watch logs for:
# ✅ "User has already consented AND granted permission - no need to show disclosure"
```

### Test 4: Business User (No Disclosure)
```bash
# Clear app data
adb shell pm clear com.trukapp

# Launch app and sign up as business user

# Watch logs for:
# ✅ "User doesn't need background location - mark as checked"
# ❌ Should NOT see disclosure modal
```

## Debugging Commands

### Check Current Permissions
```bash
# List all permissions for app
adb shell dumpsys package com.trukapp | grep permission

# Check specific permission
adb shell dumpsys package com.trukapp | grep ACCESS_BACKGROUND_LOCATION
```

### Reset Permissions
```bash
# Revoke all location permissions
adb shell pm revoke com.trukapp android.permission.ACCESS_FINE_LOCATION
adb shell pm revoke com.trukapp android.permission.ACCESS_COARSE_LOCATION
adb shell pm revoke com.trukapp android.permission.ACCESS_BACKGROUND_LOCATION
```

### Clear App Data
```bash
# Clear all app data (including AsyncStorage)
adb shell pm clear com.trukapp
```

### View AsyncStorage
```bash
# Check if consent is saved
adb shell run-as com.trukapp cat /data/data/com.trukapp/files/RCTAsyncLocalStorage_V1/@trukapp:background_location_consent
```

## Log Filters

### View Disclosure Logs Only
```bash
adb logcat | grep "BACKGROUND_LOCATION_DISCLOSURE_MODAL"
```

### View Permission Request Logs
```bash
adb logcat | grep "📍"
```

### View All Location Logs
```bash
adb logcat | grep -E "BACKGROUND_LOCATION|LOCATION_SERVICE|📢|📍"
```

## Common Issues

### Issue: Disclosure Not Showing
**Possible Causes:**
1. User role not set correctly
2. Consent already saved in AsyncStorage
3. Permission already granted

**Solution:**
```bash
# Clear app data and try again
adb shell pm clear com.trukapp

# Check logs for role
adb logcat | grep "User role:"

# Check logs for consent check
adb logcat | grep "shouldShowBackgroundLocationDisclosure"
```

### Issue: Permission Dialog Not Appearing
**Possible Causes:**
1. Permission already granted
2. Permission request method failing
3. Android version < 10

**Solution:**
```bash
# Check Android version
adb shell getprop ro.build.version.release

# Revoke permissions
adb shell pm revoke com.trukapp android.permission.ACCESS_BACKGROUND_LOCATION

# Check logs for permission request
adb logcat | grep "Requesting.*location permission"
```

### Issue: App Crashes After Disclosure
**Possible Causes:**
1. Navigation error
2. State management issue
3. Permission request error

**Solution:**
```bash
# View crash logs
adb logcat | grep -E "AndroidRuntime|FATAL"

# Check for JavaScript errors
adb logcat | grep "ReactNativeJS"
```

## Verification Checklist

- [ ] Disclosure appears for transporter (company)
- [ ] Disclosure appears for transporter (individual)
- [ ] Disclosure appears for driver
- [ ] Disclosure does NOT appear for business user
- [ ] Disclosure does NOT appear for broker user
- [ ] Disclosure is full-screen
- [ ] Disclosure cannot be dismissed with back button
- [ ] Disclosure shows BEFORE permission dialog
- [ ] Permission dialog appears AFTER accepting disclosure
- [ ] Foreground permission requested first
- [ ] Background permission requested second
- [ ] User can decline disclosure
- [ ] Disclosure appears again if user declines
- [ ] App functions normally after granting permissions
- [ ] App functions normally after declining disclosure

## Quick Test Script

```bash
#!/bin/bash

echo "🧪 Testing Background Location Disclosure"
echo "=========================================="

# Test 1: Fresh Install
echo "📱 Test 1: Fresh Install (Transporter)"
adb shell pm clear com.trukapp
adb shell am start -n com.trukapp/.MainActivity
echo "✅ App launched - check device for disclosure modal"
echo "Press Enter when done..."
read

# Test 2: Business User
echo "📱 Test 2: Business User (No Disclosure)"
adb shell pm clear com.trukapp
adb shell am start -n com.trukapp/.MainActivity
echo "✅ App launched - verify NO disclosure appears for business user"
echo "Press Enter when done..."
read

# Test 3: Permission Already Granted
echo "📱 Test 3: Permission Already Granted"
adb shell pm clear com.trukapp
adb shell pm grant com.trukapp android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.trukapp android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant com.trukapp android.permission.ACCESS_BACKGROUND_LOCATION
adb shell am start -n com.trukapp/.MainActivity
echo "✅ App launched - verify NO disclosure appears (already granted)"
echo "Press Enter when done..."
read

echo "🎉 Testing complete!"
```

Save as `test-disclosure.sh` and run:
```bash
chmod +x test-disclosure.sh
./test-disclosure.sh
```

## Recording Video for Google Play

### Using Android Screen Recorder
```bash
# Start recording
adb shell screenrecord /sdcard/disclosure-test.mp4

# Perform test (max 3 minutes)
# ...

# Stop recording (Ctrl+C)

# Pull video from device
adb pull /sdcard/disclosure-test.mp4 ./

# Clean up
adb shell rm /sdcard/disclosure-test.mp4
```

### Using scrcpy (Better Quality)
```bash
# Install scrcpy
# macOS: brew install scrcpy
# Linux: apt install scrcpy
# Windows: Download from GitHub

# Start scrcpy with recording
scrcpy --record disclosure-test.mp4

# Perform test
# ...

# Stop (Ctrl+C)
```

## Next Steps

1. ✅ Test on physical device
2. ✅ Verify disclosure appears for all relevant user types
3. ✅ Record video for Google Play submission
4. ✅ Upload video to Play Console
5. ✅ Resubmit app for review

## Support

If disclosure is not showing:
1. Check `docs/GOOGLE_PLAY_DISCLOSURE_ANALYSIS.md` for technical details
2. Check `docs/GOOGLE_PLAY_VIDEO_RECORDING_GUIDE.md` for recording instructions
3. Check logs using commands above
4. Verify implementation in:
   - `src/services/locationService.ts`
   - `App.tsx`
   - `src/components/common/BackgroundLocationDisclosureModal.tsx`
