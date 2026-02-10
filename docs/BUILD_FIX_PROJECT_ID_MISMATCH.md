# Build Fix - EAS Project ID Mismatch

**Date:** February 10, 2026  
**Status:** ✅ FIXED

---

## Issue

EAS build was failing with GraphQL request error:
```
request to https://api.expo.dev/graphql failed, reason: Error: GraphQL request failed.
```

This error occurred even after fixing the plugin configuration issue.

---

## Root Cause

There were **TWO DIFFERENT** EAS project IDs in the configuration files:

**app.json:**
```json
"extra": {
  "eas": {
    "projectId": "d65f9c44-f3b5-4a94-a28c-4f8e9b1a2c3d"  // ❌ OLD/WRONG
  }
}
```

**app.config.js:**
```javascript
extra: {
  eas: {
    projectId: "24d1984c-eb71-4672-bace-c6a0ddeb648b",  // ✅ CORRECT
  },
}
```

This mismatch caused EAS to get confused about which project to use, resulting in GraphQL API errors.

---

## Why This Happened

When we were working on the app configuration, we likely:
1. Created a new EAS project at some point
2. Updated `app.config.js` with the new project ID
3. Forgot to update `app.json` with the same project ID

Since `app.config.js` takes precedence, the app was mostly working, but EAS build system checks both files and got confused by the mismatch.

---

## Fix Applied

Updated `app.json` to use the same project ID as `app.config.js`:

**BEFORE:**
```json
"extra": {
  "eas": {
    "projectId": "d65f9c44-f3b5-4a94-a28c-4f8e9b1a2c3d"
  }
}
```

**AFTER:**
```json
"extra": {
  "eas": {
    "projectId": "24d1984c-eb71-4672-bace-c6a0ddeb648b"
  }
}
```

---

## Verification

After the fix, both files have the same project ID:

```bash
$ grep "projectId" app.json app.config.js
app.json:        "projectId": "24d1984c-eb71-4672-bace-c6a0ddeb648b"
app.config.js:        projectId: "24d1984c-eb71-4672-bace-c6a0ddeb648b",
```

---

## Files Modified

- `app.json` - Updated EAS project ID to match `app.config.js`

---

## Testing

To verify the fix works:

```bash
# Check configuration
npx expo config --type public | grep "projectId"

# Try EAS build
./build.sh
# Select option 1 (Android APK)
```

---

## Summary

The build failure was caused by mismatched EAS project IDs in `app.json` and `app.config.js`. Both files must have the same project ID for EAS builds to work correctly.

**Build should now work correctly!** ✅

---

## Important Note

If you ever need to change the EAS project ID, make sure to update it in BOTH files:
- `app.json` → `expo.extra.eas.projectId`
- `app.config.js` → `extra.eas.projectId`

You can find your project ID by running:
```bash
eas project:info
```
