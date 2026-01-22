# EAS AAB Build Fix

## Issue
AAB builds are failing on EAS cloud builds, while IPA and local builds work fine.

## Root Causes Identified

### 1. Missing Android Version Configuration
- `app.config.js` was missing explicit `versionCode` and `versionName` for Android
- While EAS has `autoIncrement: true`, explicit configuration ensures consistency

### 2. Missing SDK Version Configuration
- Missing `compileSdkVersion`, `targetSdkVersion`, and `minSdkVersion` in `app.config.js`
- These are critical for AAB builds to ensure proper compatibility

### 3. AAB-Specific Build Settings
- Missing explicit build type and ProGuard settings
- AAB builds require stricter configuration than APK builds

## Fixes Applied

### 1. Updated `app.config.js`
Added explicit Android configuration:
```javascript
android: {
  package: "com.truk.trukapp",
  versionCode: 1,              // ✅ Added
  versionName: "1.0.0",        // ✅ Added
  compileSdkVersion: 35,       // ✅ Added
  targetSdkVersion: 35,        // ✅ Added
  minSdkVersion: 24,           // ✅ Added
  buildType: "release",        // ✅ Added
  enableProguardInReleaseBuilds: false,  // ✅ Added
  enableShrinkResourcesInReleaseBuilds: false  // ✅ Added
  // ... rest of config
}
```

### 2. Updated `eas.json`
Added explicit Gradle command for production AAB builds:
```json
"production": {
  "autoIncrement": true,
  "android": {
    "buildType": "app-bundle",
    "gradleCommand": ":app:bundleRelease"  // ✅ Added
  }
}
```

## Additional Troubleshooting Steps

If AAB builds still fail, check:

### 1. Signing Configuration
Ensure you have a keystore configured in EAS:
```bash
eas credentials
```
- Check if Android keystore exists
- Verify keystore is properly configured for production builds

### 2. Check Build Logs
Look for specific errors in EAS build logs:
```bash
eas build:list
eas build:view [BUILD_ID]
```

Common AAB-specific errors:
- **Signing errors**: Missing or incorrect keystore
- **Version code conflicts**: Version code already exists in Play Store
- **ProGuard/R8 errors**: Code obfuscation issues
- **Missing metadata**: Required app metadata not set

### 3. Verify Dependencies
AAB builds are stricter about dependencies. Check for:
- Duplicate dependencies
- Conflicting versions
- Missing transitive dependencies

### 4. Test Locally First
Before cloud build, test AAB locally:
```bash
cd frontend/android
./gradlew bundleRelease
```

## Expected Behavior

After fixes:
- ✅ AAB builds should succeed on EAS cloud
- ✅ Version code will auto-increment with each build
- ✅ Proper SDK versions will be used
- ✅ Build configuration matches APK builds

## Verification

1. Run production build:
   ```bash
   cd frontend
   eas build --profile production --platform android
   ```

2. Check build status:
   ```bash
   eas build:list
   ```

3. Download and verify AAB:
   - AAB should be downloadable from EAS dashboard
   - Can be uploaded to Google Play Console for testing

## Notes

- **Version Code**: EAS will auto-increment this with `autoIncrement: true`
- **Version Name**: Update manually in `app.config.js` when needed
- **SDK Versions**: Match what's in `android/build.gradle` for consistency
- **ProGuard**: Disabled for now to avoid obfuscation issues (can enable later if needed)

## If Issues Persist

1. Check EAS build logs for specific error messages
2. Verify keystore configuration: `eas credentials`
3. Try building APK first to isolate AAB-specific issues
4. Check for dependency conflicts: `npm ls` in frontend directory
5. Verify all Android permissions are correctly declared
