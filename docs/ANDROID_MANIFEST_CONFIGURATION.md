# Android Manifest Configuration for Google Play Compliance

**Date:** February 10, 2026  
**Status:** ✅ CONFIGURED

---

## Overview

The Android manifest configuration has been updated to ensure full compliance with Google Play's background location requirements. This document explains what's configured and why.

---

## Configuration Files

### 1. `app.config.js`

This is the main Expo configuration file that generates the Android manifest.

**Location Permissions Declared:**
```javascript
permissions: [
  "ACCESS_FINE_LOCATION",           // Precise location (foreground)
  "ACCESS_COARSE_LOCATION",         // Approximate location (foreground)
  "ACCESS_BACKGROUND_LOCATION",     // Background location (Android 10+)
  "FOREGROUND_SERVICE",             // Required for foreground services
  "FOREGROUND_SERVICE_LOCATION",    // Required for location foreground service (Android 14+)
  // ... other permissions
]
```

### 2. `plugins/withAndroidLocationPermissions.js`

Custom Expo config plugin that modifies the Android manifest to add:

1. **Foreground Service Declaration**
   ```xml
   <service
     android:name="expo.modules.location.LocationTaskService"
     android:foregroundServiceType="location"
     android:exported="false"
     android:enabled="true" />
   ```

2. **Location Usage Metadata**
   ```xml
   <meta-data
     android:name="com.google.android.gms.location.background_location_usage"
     android:value="real-time tracking, delivery updates, route optimization" />
   ```

3. **Required Permissions**
   - `ACCESS_FINE_LOCATION`
   - `ACCESS_COARSE_LOCATION`
   - `ACCESS_BACKGROUND_LOCATION`
   - `FOREGROUND_SERVICE`
   - `FOREGROUND_SERVICE_LOCATION`

---

## What Gets Generated

When you build the app with EAS Build, the following Android manifest entries are generated:

### Generated AndroidManifest.xml (Relevant Sections)

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.truk.trukapp">

    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Foreground Service Permissions (Android 9+) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    
    <!-- Foreground Service Type Permission (Android 14+) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    
    <!-- Other permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- ... -->

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="false"
        android:theme="@style/AppTheme">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true"
            android:resizeableActivity="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Location Foreground Service -->
        <service
            android:name="expo.modules.location.LocationTaskService"
            android:foregroundServiceType="location"
            android:exported="false"
            android:enabled="true" />

        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4" />

        <!-- Location Usage Metadata (for Google Play review) -->
        <meta-data
            android:name="com.google.android.gms.location.background_location_usage"
            android:value="real-time tracking, delivery updates, route optimization" />

    </application>

</manifest>
```

---

## Google Play Compliance

### Why These Configurations Matter

1. **`ACCESS_BACKGROUND_LOCATION` Permission**
   - Required for location access when app is in background
   - Must be declared in manifest
   - Must show prominent disclosure before requesting (✅ implemented in code)

2. **`FOREGROUND_SERVICE` Permission**
   - Required for Android 9+ (API 28+)
   - Allows app to run foreground service for location tracking
   - Shows persistent notification to user

3. **`FOREGROUND_SERVICE_LOCATION` Permission**
   - Required for Android 14+ (API 34+)
   - Specifies that foreground service is for location tracking
   - More granular permission control

4. **`android:foregroundServiceType="location"`**
   - Required for Android 10+ (API 29+)
   - Declares that foreground service is specifically for location
   - Google Play requires this for background location apps

5. **Location Usage Metadata**
   - Helps Google Play reviewers understand location usage
   - Lists specific features using background location
   - Matches the features in prominent disclosure

---

## Android Version Compatibility

| Android Version | API Level | Requirements |
|----------------|-----------|--------------|
| Android 9 (Pie) | 28 | `FOREGROUND_SERVICE` permission |
| Android 10 (Q) | 29 | `ACCESS_BACKGROUND_LOCATION` separate permission, `foregroundServiceType` required |
| Android 11 (R) | 30 | Background location must be requested separately from foreground |
| Android 12 (S) | 31 | More restrictive background location access |
| Android 13 (T) | 33 | Notification permission required |
| Android 14 (U) | 34 | `FOREGROUND_SERVICE_LOCATION` permission required |

**Our App Supports:** Android 5.0+ (API 21+) with proper handling for all versions

---

## How to Verify Configuration

### Method 1: Check Generated Manifest (After Build)

```bash
# Build the app
./build.sh
# Select option 2 (Android AAB)

# Extract AAB to inspect manifest
unzip -q build-logs/TRUKapp-*.aab -d build-logs/extracted/

# View manifest
cat build-logs/extracted/manifest/AndroidManifest.xml
```

### Method 2: Use EAS Build Logs

```bash
# Build with EAS
eas build --platform android --profile production

# Download build logs from EAS dashboard
# Search for "AndroidManifest.xml" in logs
```

### Method 3: Inspect APK

```bash
# Install APK on device
adb install build-logs/TRUKapp-*.apk

# Dump manifest
adb shell dumpsys package com.truk.trukapp | grep -A 50 "declared permissions"
```

---

## Testing Checklist

### Before Submitting to Google Play

- [ ] Build AAB with `./build.sh` (option 2)
- [ ] Verify manifest includes `ACCESS_BACKGROUND_LOCATION`
- [ ] Verify manifest includes `FOREGROUND_SERVICE_LOCATION`
- [ ] Verify service has `android:foregroundServiceType="location"`
- [ ] Test on Android 10+ device
- [ ] Test on Android 14+ device
- [ ] Verify prominent disclosure appears before permission request
- [ ] Verify foreground notification appears during location tracking
- [ ] Verify location tracking works in background

### On Physical Device

1. **Install app**
   ```bash
   adb install build-logs/TRUKapp-*.apk
   ```

2. **Test permission flow**
   - Open app as new transporter
   - Verify disclosure appears
   - Accept disclosure
   - Verify foreground permission dialog appears
   - Grant foreground permission
   - Verify background permission dialog appears
   - Grant background permission

3. **Test background tracking**
   - Start a trip
   - Press home button (app goes to background)
   - Verify notification shows "TRUKapp is using your location"
   - Verify location updates continue
   - Open app again
   - Verify tracking is still active

---

## Troubleshooting

### Issue: Background location not working

**Check:**
- [ ] `ACCESS_BACKGROUND_LOCATION` permission declared
- [ ] User granted background location permission
- [ ] Foreground service is running
- [ ] Android version is 10+ (API 29+)

**Fix:**
```bash
# Check permissions
adb shell dumpsys package com.truk.trukapp | grep permission

# Check if service is running
adb shell dumpsys activity services | grep LocationTaskService
```

### Issue: Foreground service crashes

**Check:**
- [ ] `FOREGROUND_SERVICE` permission declared
- [ ] `FOREGROUND_SERVICE_LOCATION` permission declared (Android 14+)
- [ ] Service has `android:foregroundServiceType="location"`
- [ ] Notification channel is created

**Fix:**
- Rebuild app with updated manifest
- Test on Android 14+ device

### Issue: Google Play rejects app

**Check:**
- [ ] Prominent disclosure text matches Google's format
- [ ] Disclosure appears BEFORE permission request
- [ ] Video demonstration uploaded
- [ ] Permissions Declaration Form completed
- [ ] Manifest includes all required permissions

**Fix:**
- Review `GOOGLE_PLAY_SUBMISSION_GUIDE.md`
- Verify disclosure text in `BackgroundLocationDisclosureModal.tsx`
- Create video demonstration
- Complete Play Console form

---

## Files Modified

1. ✅ `app.config.js` - Added location permissions and plugin
2. ✅ `plugins/withAndroidLocationPermissions.js` - Created new plugin
3. ✅ `src/components/common/BackgroundLocationDisclosureModal.tsx` - Updated disclosure text
4. ✅ `src/components/common/UnifiedSubscriptionCard.tsx` - Fixed trial UI

---

## Next Steps

1. **Build AAB**
   ```bash
   ./build.sh
   # Select option 2 (Android AAB)
   ```

2. **Test on Device**
   - Install on Android 10+ device
   - Test permission flow
   - Test background tracking

3. **Submit to Google Play**
   - Upload AAB
   - Complete Permissions Declaration Form
   - Upload video demonstration
   - Submit for review

---

## References

- [Android Foreground Services](https://developer.android.com/develop/background-work/services/foreground-services)
- [Android Location Permissions](https://developer.android.com/training/location/permissions)
- [Google Play Background Location Policy](https://support.google.com/googleplay/android-developer/answer/9799150)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)

---

## Summary

The Android manifest is now properly configured for Google Play compliance:

✅ All required permissions declared  
✅ Foreground service type set to "location"  
✅ Location usage metadata added  
✅ Compatible with Android 5.0+ through Android 14+  
✅ Custom config plugin ensures proper manifest generation  

The app is ready for building and submission to Google Play.
