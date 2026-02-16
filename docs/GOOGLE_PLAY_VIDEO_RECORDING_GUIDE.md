# Google Play Video Recording Guide
## Background Location Disclosure Demonstration

## Purpose
Record video evidence showing that TRUKapp displays the required Prominent Disclosure for background location BEFORE requesting the BACKGROUND_LOCATION permission.

## Requirements
- Physical Android device (Android 10 or higher)
- Screen recording enabled
- Fresh app install (uninstall first to show first-time user experience)
- Test accounts for each user type

## Video Recording Scenarios

### Scenario 1: Company Transporter (Fresh Install)

**Steps:**
1. **Start screen recording**
2. **Uninstall app** (if previously installed)
3. **Install app** from APK or Play Store
4. **Open app** - should show Welcome screen
5. **Tap "Sign Up"**
6. **Select "Transporter"** role
7. **Complete signup** with test account:
   - Email: `test-transporter-company@trukapp.com`
   - Password: `Test123!`
   - Phone: `+1234567890`
8. **Verify email** (use test email or skip if in dev mode)
9. **Complete company profile**:
   - Company Name: "Test Transport Co"
   - Registration: "REG123456"
   - Contact: "+1234567890"
   - Email: "company@test.com"
10. **Submit profile** - status will be "pending"
11. **CRITICAL**: After profile submission, the app should show:
    - **Background Location Disclosure Modal** (full-screen)
    - Modal should display:
      - Title: "Background Location Access"
      - Prominent disclosure text: "TRUKapp collects location data to enable real-time tracking, delivery updates, & route optimization even when the app is closed or not in use."
      - Benefits list
      - Data usage information
      - Two buttons: "Allow Background Location" and "Not Now"
12. **Tap "Allow Background Location"**
13. **Android permission dialog** should appear:
    - "Allow TRUKapp to access this device's location?"
    - Options: "While using the app", "Only this time", "Don't allow"
14. **Select "While using the app"**
15. **Second Android permission dialog** should appear:
    - "Allow TRUKapp to access this device's location all the time?"
    - Options: "Allow all the time", "Allow only while using the app", "Don't allow"
16. **Select "Allow all the time"**
17. **App should navigate** to appropriate screen (TransporterProcessing or Dashboard)
18. **Stop screen recording**

**Expected Result:**
- ✅ Disclosure modal shown BEFORE any permission dialogs
- ✅ Disclosure modal is full-screen and cannot be dismissed
- ✅ Disclosure text matches Google Play requirements
- ✅ Permission dialogs appear AFTER user accepts disclosure
- ✅ App functions normally after permissions granted

---

### Scenario 2: Individual Transporter (Fresh Install)

**Steps:**
1. **Start screen recording**
2. **Uninstall app**
3. **Install app**
4. **Open app**
5. **Tap "Sign Up"**
6. **Select "Transporter"** role
7. **Complete signup** with test account:
   - Email: `test-transporter-individual@trukapp.com`
   - Password: `Test123!`
8. **Verify email**
9. **Complete individual transporter profile**:
   - Upload driver license
   - Upload insurance
   - Vehicle details
   - Upload vehicle images
10. **Submit profile**
11. **CRITICAL**: Background Location Disclosure Modal should appear
12. **Tap "Allow Background Location"**
13. **Grant permissions** in Android dialogs
14. **Stop screen recording**

---

### Scenario 3: Driver (Fresh Install)

**Steps:**
1. **Start screen recording**
2. **Uninstall app**
3. **Install app**
4. **Open app**
5. **Tap "Sign Up"**
6. **Select "Driver"** role (or be added by company)
7. **Complete signup** with test account:
   - Email: `test-driver@trukapp.com`
   - Password: `Test123!`
8. **Verify email**
9. **Complete driver profile**
10. **CRITICAL**: Background Location Disclosure Modal should appear
11. **Tap "Allow Background Location"**
12. **Grant permissions** in Android dialogs
13. **Stop screen recording**

---

### Scenario 4: User Declines Disclosure

**Steps:**
1. **Start screen recording**
2. **Follow Scenario 1** until disclosure modal appears
3. **Tap "Not Now"** instead of accepting
4. **App should continue** to next screen
5. **Verify**: No permission dialogs appear
6. **Navigate to settings** or feature that needs location
7. **CRITICAL**: Disclosure modal should appear again
8. **This time, tap "Allow Background Location"**
9. **Grant permissions** in Android dialogs
10. **Stop screen recording**

**Expected Result:**
- ✅ User can decline disclosure and continue using app
- ✅ Disclosure appears again when location feature is needed
- ✅ User can change their mind and accept later

---

### Scenario 5: Business User (No Disclosure Expected)

**Steps:**
1. **Start screen recording**
2. **Uninstall app**
3. **Install app**
4. **Open app**
5. **Tap "Sign Up"**
6. **Select "Business"** role
7. **Complete signup** with test account:
   - Email: `test-business@trukapp.com`
   - Password: `Test123!`
8. **Verify email**
9. **Complete business profile**
10. **CRITICAL**: NO disclosure modal should appear
11. **Navigate to tracking screen** (view only)
12. **Verify**: Can view tracking without providing location
13. **Stop screen recording**

**Expected Result:**
- ✅ NO disclosure modal appears for business users
- ✅ Business users can view tracking without granting location permissions
- ✅ App functions normally for business users

---

## Video Editing

### For Each Scenario:
1. **Trim video** to show only relevant parts
2. **Add text overlays** at key moments:
   - "Fresh Install - First Launch"
   - "Prominent Disclosure Appears BEFORE Permission Request"
   - "User Accepts Disclosure"
   - "Android Permission Dialog Appears AFTER Disclosure"
   - "Permissions Granted"
3. **Highlight** the disclosure modal with arrows or circles
4. **Add timestamps** showing the sequence of events

### Final Video Structure:
1. **Title slide**: "TRUKapp - Background Location Disclosure Demonstration"
2. **Scenario 1**: Company Transporter (2-3 minutes)
3. **Scenario 2**: Individual Transporter (2-3 minutes)
4. **Scenario 3**: Driver (2-3 minutes)
5. **Scenario 4**: User Declines (1-2 minutes)
6. **Scenario 5**: Business User (1 minute)
7. **Summary slide**: "Disclosure shown BEFORE permission request for all user types that need background location"

---

## Submission to Google Play

### In Play Console:
1. Go to **Policy** > **App content**
2. Find **Location permissions** section
3. Click **Manage**
4. Upload video(s) showing disclosure
5. Add description:

```
TRUKapp displays a prominent disclosure modal BEFORE requesting background location permission.

The disclosure:
- Is shown on first app launch for transporters and drivers
- Appears BEFORE any Android permission dialogs
- Clearly explains why background location is needed
- Uses the required format: "TRUKapp collects location data to enable [features] even when the app is closed or not in use"
- Cannot be dismissed without user action
- Provides detailed information about data collection, usage, and sharing

Background location is ONLY requested for:
- Transporters (company and individual) - to track vehicle location during deliveries
- Drivers - to track delivery progress during active trips

Business and broker users do NOT request background location - they only view tracking data.

The attached videos demonstrate the disclosure flow for all user types.
```

---

## Troubleshooting

### If Disclosure Doesn't Appear:
1. **Check logs** in Android Studio Logcat:
   - Filter for: `BACKGROUND_LOCATION_DISCLOSURE`
   - Look for: "Modal is now VISIBLE"
2. **Verify user role** is set correctly:
   - Filter for: "User role:"
3. **Check consent status**:
   - Filter for: "shouldShowBackgroundLocationDisclosure"
4. **Clear app data** and try again

### If Permission Dialog Doesn't Appear:
1. **Check logs** for permission request:
   - Filter for: "Requesting foreground location permission"
   - Filter for: "Requesting background location permission"
2. **Verify permissions in AndroidManifest.xml**:
   - `ACCESS_FINE_LOCATION`
   - `ACCESS_COARSE_LOCATION`
   - `ACCESS_BACKGROUND_LOCATION`
3. **Check Android version** (must be Android 10+)

---

## Test Accounts

Create test accounts for each scenario:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Company Transporter | `test-transporter-company@trukapp.com` | `Test123!` | Scenario 1 |
| Individual Transporter | `test-transporter-individual@trukapp.com` | `Test123!` | Scenario 2 |
| Driver | `test-driver@trukapp.com` | `Test123!` | Scenario 3 |
| Business | `test-business@trukapp.com` | `Test123!` | Scenario 5 |

---

## Checklist Before Recording

- [ ] Physical Android device (Android 10+)
- [ ] Screen recording app installed
- [ ] App uninstalled (fresh install)
- [ ] Test accounts created
- [ ] Internet connection stable
- [ ] Device charged (recording uses battery)
- [ ] Notifications disabled (to avoid interruptions)
- [ ] Device in portrait mode
- [ ] Screen brightness at 100%

---

## After Recording

- [ ] Review all videos
- [ ] Verify disclosure is clearly visible
- [ ] Verify sequence: Disclosure → Accept → Permission Dialog
- [ ] Edit videos if needed
- [ ] Add text overlays
- [ ] Compress videos (max 100MB per video)
- [ ] Upload to Google Play Console
- [ ] Add description
- [ ] Submit for review

---

## Expected Timeline

- Recording: 1-2 hours
- Editing: 1-2 hours
- Upload and submission: 30 minutes
- Google Play review: 1-3 days

---

## Contact

If you encounter issues during recording or submission, refer to:
- `docs/GOOGLE_PLAY_DISCLOSURE_ANALYSIS.md` - Technical analysis
- `docs/GOOGLE_PLAY_COMPLIANCE_FIX_COMPLETE.md` - Implementation details
- `docs/PERMISSION_REQUEST_IMPLEMENTATION.md` - Permission flow documentation
