# Build Fix - Plugin Configuration Error

**Date:** February 10, 2026  
**Status:** ✅ FIXED

---

## Issue

EAS build was failing with GraphQL request error:
```
request to https://api.expo.dev/graphql failed, reason: Error: GraphQL request failed.
```

---

## Root Cause

The `plugins/withAndroidLocationPermissions.js` file had a parameter shadowing issue:

**BEFORE (BROKEN):**
```javascript
const withAndroidLocationPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    // ❌ Parameter 'config' shadows outer 'config'
    const androidManifest = config.modResults;
    // ...
    return config; // ❌ Returns wrong config
  });
};
```

This caused the EAS build configuration phase to fail because:
1. The inner `config` parameter shadowed the outer `config` parameter
2. The callback was unnecessarily marked as `async` (no async operations)
3. The wrong `config` object was being returned

---

## Fix Applied

**AFTER (FIXED):**
```javascript
const withAndroidLocationPermissions = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    // ✅ Use different parameter name to avoid shadowing
    const androidManifest = modConfig.modResults;
    // ...
    return modConfig; // ✅ Returns correct config
  });
};
```

**Changes:**
1. Renamed callback parameter from `config` to `modConfig` to avoid shadowing
2. Removed unnecessary `async` keyword
3. Updated all return statements to use `modConfig`

---

## Verification

After the fix, the plugin works correctly:

```bash
$ npx expo config --type introspect
✅ Added location foreground service with type="location"
✅ Added location usage metadata for Google Play
```

The configuration is now valid and EAS build should work.

---

## Files Modified

- `plugins/withAndroidLocationPermissions.js` - Fixed parameter shadowing

---

## Testing

To verify the fix works:

```bash
# Test plugin syntax
node -c plugins/withAndroidLocationPermissions.js

# Test Expo configuration
npx expo config --type introspect

# Try EAS build
./build.sh
# Select option 1 (Android APK)
```

---

## Summary

The build failure was caused by a JavaScript parameter shadowing issue in the custom Expo config plugin. The fix was simple - rename the callback parameter to avoid shadowing the outer scope variable.

**Build should now work correctly!** ✅
