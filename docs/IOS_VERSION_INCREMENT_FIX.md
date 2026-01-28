# iOS Version Increment Fix

## Issue
When uploading a new iOS IPA build, App Store Connect rejects it with:
```
Invalid Pre-Release Train. The train version '1.0.0' is closed for new build submissions
```

## Root Cause
Version 1.0.0 has already been approved and delivered to App Store Connect. Apple doesn't allow new builds to be submitted with the same version number once it's been approved.

## Solution

### 1. Updated Version Number
- Changed version from `1.0.0` to `1.0.1` in `app.config.js`
- This is a patch version increment (bug fixes, minor updates)

### 2. Added iOS Build Number
- Added `buildNumber: "1"` to iOS configuration
- EAS will auto-increment this for each build

### 3. Enabled Auto-Increment for iOS
- Added `"autoIncrement": true` to iOS production and appstore profiles in `eas.json`
- This ensures build numbers increment automatically

## Version Numbering Strategy

### Version Format: `MAJOR.MINOR.PATCH`
- **MAJOR** (1.x.x): Breaking changes, major feature releases
- **MINOR** (x.1.x): New features, backward compatible
- **PATCH** (x.x.1): Bug fixes, small improvements

### Build Number
- Increments automatically with each build
- Used internally by App Store Connect
- Doesn't affect user-facing version

## Next Steps

1. **Build new IPA**:
   ```bash
   cd frontend
   eas build --profile production --platform ios
   ```

2. **Upload to App Store Connect**:
   - The new build will have version `1.0.1`
   - Build number will auto-increment

3. **Future Updates**:
   - For bug fixes: Increment PATCH (1.0.1 → 1.0.2)
   - For new features: Increment MINOR (1.0.1 → 1.1.0)
   - For major changes: Increment MAJOR (1.0.1 → 2.0.0)

## EAS Auto-Increment

With `"autoIncrement": true`:
- EAS automatically increments build numbers
- Version number in `app.config.js` controls the version string
- You only need to update `app.config.js` version when you want to change the user-facing version

## Manual Version Update

If you need to manually update the version:

1. Edit `frontend/app.config.js`:
   ```javascript
   version: "1.0.2", // Update this
   ```

2. For iOS, also update buildNumber if needed:
   ```javascript
   ios: {
     buildNumber: "2", // Update this if needed
   }
   ```

3. Build:
   ```bash
   eas build --profile production --platform ios
   ```

## Verification

After building, verify the version:
- Check EAS build logs for version number
- Verify in App Store Connect that the new version is accepted
- The build should upload successfully without the "closed train" error
