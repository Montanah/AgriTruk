# Google Play Submission Guide - Background Location Compliance

**Date:** February 10, 2026  
**Status:** Ready for Submission

---

## Quick Start

Two critical fixes have been applied to make the app compliant with Google Play's background location requirements:

1. ✅ **Disclosure text updated** to match Google's exact required format
2. ✅ **Trial subscription UI fixed** to show correct status

---

## What Was Fixed

### 1. Background Location Disclosure Text

**New Text (Google-Compliant):**
```
"TRUKapp collects location data to enable real-time tracking, delivery updates, 
& route optimization even when the app is closed or not in use."
```

This matches Google's exact required format:
- Uses "to enable [feature], [feature], & [feature]" structure
- Lists specific features
- Includes exact phrase "even when the app is closed or not in use"

### 2. Trial Subscription UI

**Fixed Logic:**
- Active trials now show "Trial Active" with days remaining
- "Activate Trial" button only shows when trial is NOT active
- No more contradictory UI (showing both "Activate" and "Active")

---

## Testing Before Submission

### Test on Physical Android Device

1. **Install app on Android 10+ device**
   ```bash
   # Build and install APK
   ./build.sh
   # Select option 1 (Android APK)
   ```

2. **Test Background Location Disclosure**
   - Open app as new transporter/broker/driver
   - Verify disclosure appears with new text
   - Verify disclosure appears BEFORE permission request
   - Accept disclosure
   - Verify Android permission dialog appears
   - Grant permission
   - Verify location tracking starts

3. **Test Trial Subscription UI**
   - Login as transporter with active trial
   - Verify shows "Trial Active" with days remaining
   - Verify shows "Manage" button (not "Activate Trial")
   - Login as transporter without trial
   - Verify shows "Activate Trial" button

---

## Create Video Demonstration (REQUIRED)

Google Play requires a video showing the disclosure flow.

### Video Requirements

**What to Show:**
1. App launch
2. Prominent disclosure appearing (with new text clearly visible)
3. User tapping "Allow Background Location"
4. Android permission dialog appearing
5. User granting permission
6. Feature using background location (e.g., real-time tracking map)

**Technical Requirements:**
- Duration: 30-60 seconds
- Format: MP4, MOV, or AVI
- Max size: 30MB
- Resolution: 720p or higher
- Show disclosure text clearly (must be readable)

### How to Record

**Option 1: Android Screen Recording**
```bash
# Connect Android device via USB
adb shell screenrecord /sdcard/disclosure_demo.mp4

# Perform the flow (disclosure → permission → tracking)
# Stop recording (Ctrl+C after 30-60 seconds)

# Pull video from device
adb pull /sdcard/disclosure_demo.mp4 ./disclosure_demo.mp4
```

**Option 2: Use Screen Recording App**
- Install "AZ Screen Recorder" or similar
- Record the disclosure flow
- Export video
- Transfer to computer

---

## Play Console Submission

### Step 1: Complete Permissions Declaration Form

1. **Go to Play Console**
   - Navigate to your app
   - Click "App content" in left menu
   - Click "Sensitive app permissions"
   - Click "Location permissions"

2. **Answer Questions**

   **Q: What is the main purpose of your app?**
   ```
   Transportation & logistics - TRUKapp connects transporters with clients 
   for goods transportation services.
   ```

   **Q: Which features use background location?**
   ```
   - Real-time tracking: Track vehicle/driver location during active trips
   - Delivery updates: Provide accurate ETAs and delivery status
   - Route optimization: Optimize routes based on current location
   ```

   **Q: Why does your app need background location?**
   ```
   TRUKapp requires background location access to provide continuous real-time 
   tracking of vehicles and drivers during active transportation trips. This 
   allows clients to track their shipments in real-time and receive accurate 
   delivery updates even when the driver's app is in the background or the 
   screen is off. Background location is essential for the core functionality 
   of the app - without it, tracking would stop when the driver switches apps 
   or locks their phone, making the service unusable.
   ```

   **Q: How do you inform users about background location usage?**
   ```
   We show a prominent in-app disclosure before requesting background location 
   permission. The disclosure clearly states: "TRUKapp collects location data 
   to enable real-time tracking, delivery updates, & route optimization even 
   when the app is closed or not in use." Users must explicitly accept this 
   disclosure before we request the permission.
   ```

3. **Upload Video**
   - Click "Upload video"
   - Select your `disclosure_demo.mp4` file
   - Wait for upload to complete

4. **Submit**
   - Review all answers
   - Click "Submit"

### Step 2: Update App Store Listing

1. **App Description**
   
   Add this section to your app description:
   ```
   📍 LOCATION TRACKING
   TRUKapp uses background location to provide real-time tracking of your 
   vehicles and drivers during active trips. This allows clients to track 
   their shipments in real-time and receive accurate delivery updates. 
   Location tracking only occurs during active transportation jobs and can 
   be controlled from the app settings.
   ```

2. **Screenshots**
   
   Include a screenshot showing:
   - The background location disclosure modal
   - The real-time tracking map
   - The delivery updates screen

3. **Privacy Policy**
   
   Ensure your privacy policy mentions:
   - Background location collection
   - Purpose (real-time tracking)
   - When it's collected (during active trips)
   - How users can control it

### Step 3: Submit App Update

1. **Create New Release**
   - Go to "Production" or "Testing" track
   - Click "Create new release"

2. **Upload AAB**
   ```bash
   # Build production AAB
   ./build.sh
   # Select option 2 (Android AAB)
   ```
   
   - Upload the AAB file from `build-logs/`
   - Version should be 1.0.3 (or higher)

3. **Release Notes**
   ```
   Version 1.0.3
   - Improved background location disclosure for better transparency
   - Fixed trial subscription display
   - Enhanced user experience
   - Bug fixes and performance improvements
   ```

4. **Review and Rollout**
   - Review all information
   - Click "Review release"
   - Click "Start rollout to production"

---

## Expected Timeline

- **Submission:** Immediate (after video is ready)
- **Review:** 1-7 days (typically 2-3 days)
- **Approval:** Should be approved if all requirements met
- **Live:** Within 24 hours of approval

---

## If Rejected Again

If Google Play still rejects the app:

1. **Read Rejection Reason Carefully**
   - Check email from Google Play
   - Note specific issues mentioned

2. **Check Video Demonstration**
   - Ensure disclosure text is clearly visible
   - Ensure disclosure appears BEFORE permission request
   - Ensure video shows complete flow

3. **Verify Disclosure Text**
   - Must match exact format: "collects location data to enable [feature], [feature], & [feature] even when the app is closed or not in use"
   - Check for typos or formatting issues

4. **Contact Google Play Support**
   - Go to Play Console → Help → Contact Support
   - Provide app details and rejection reason
   - Ask for specific guidance

---

## Troubleshooting

### Issue: Disclosure not appearing

**Check:**
- User hasn't already given consent (check AsyncStorage)
- `showBackgroundLocationDisclosure` state is set to true
- Modal is rendered in the component tree

**Fix:**
```typescript
// Clear consent to test disclosure again
await AsyncStorage.removeItem('@trukapp:background_location_consent');
```

### Issue: Permission request fails

**Check:**
- Foreground permission granted first
- Background permission requested after foreground
- Android version (10+ required for background)

**Fix:**
- Request foreground permission first
- Then request background permission
- Handle permission denial gracefully

### Issue: Video upload fails

**Check:**
- File size < 30MB
- Format is MP4, MOV, or AVI
- Video is not corrupted

**Fix:**
- Compress video if too large
- Convert to MP4 format
- Re-record if corrupted

---

## Support

If you need help:

1. **Check Documentation**
   - [Google Play Background Location Policy](https://support.google.com/googleplay/android-developer/answer/9799150)
   - [Android Location Permissions](https://developer.android.com/training/location/permissions)

2. **Review Audit Document**
   - See `docs/GOOGLE_PLAY_BACKGROUND_LOCATION_COMPLIANCE_AUDIT.md`
   - See `docs/GOOGLE_PLAY_COMPLIANCE_FIX_COMPLETE.md`

3. **Contact Google Play Support**
   - Play Console → Help → Contact Support

---

## Checklist

Before submitting to Google Play:

- [ ] Test disclosure on physical Android device
- [ ] Verify disclosure text is correct
- [ ] Verify disclosure appears before permission request
- [ ] Test trial subscription UI
- [ ] Record video demonstration
- [ ] Complete Permissions Declaration Form
- [ ] Upload video to Play Console
- [ ] Update app store listing
- [ ] Build production AAB
- [ ] Submit app update
- [ ] Monitor review status

---

## Success Criteria

Your app should be approved if:

✅ Disclosure text matches Google's exact format  
✅ Disclosure appears before permission request  
✅ Video clearly shows disclosure flow  
✅ Permissions Declaration Form is complete  
✅ App store listing mentions background location  
✅ Privacy policy covers background location  

---

Good luck with your submission! 🚀
