# URGENT: Fix Trial Duration in Firestore

**Issue:** Trial plans showing "1 days" instead of "90 days"  
**Root Cause:** Existing trial plans in Firestore database have `duration: 1`  
**Solution:** Run migration script to update Firestore data

---

## Quick Fix (Choose One)

### Option A: Run Migration Script (RECOMMENDED)

```bash
# 1. Navigate to backend directory
cd /home/clintmadeit/Projects/TRUKAPP/backend

# 2. Run the migration script
node fix-trial-plans.js

# 3. Script will:
#    - Find all trial plans (price = 0)
#    - Update duration to 90 days
#    - Update trialDays to 90
#    - Fix existing subscriber end dates
#    - Show progress in console
```

**What This Does:**
- ✅ Updates all trial plans from `duration: 1` to `duration: 90`
- ✅ Sets `trialDays: 90` for all trial plans
- ✅ Fixes existing subscriber records with incorrect end dates
- ✅ Updates timestamps
- ✅ Shows confirmation messages

**Expected Output:**
```
🔧 Fixing trial subscription plans to have 90-day duration...
✅ Found X trial plan(s)

📋 Trial Plan: "Free Trial"
   Current duration: 1 days
   Current trialDays: not set
   ✅ Updated to: 90 days

🔧 Fixing existing trial subscribers with incorrect endDates...
✅ Updated X subscriber records

✅ Trial plans fixed successfully!
```

### Option B: Manual Firestore Update

If you prefer to update manually through Firebase Console:

1. Go to Firebase Console → Firestore Database
2. Navigate to `subscriptionPlans` collection
3. For each plan with `price: 0`:
   - Set `duration: 90`
   - Set `trialDays: 90`
4. Save changes

---

## Verification Steps

**After Running Fix:**

1. **Check Firestore was updated:**
   ```bash
   # You can verify in Firebase Console
   # subscriptionPlans → Look for plans with price: 0
   # Should show: duration: 90, trialDays: 90
   ```

2. **Rebuild and test the app:**
   ```bash
   # Clear app cache on device
   # Uninstall app (or clear all data)
   # Rebuild frontend
   cd /home/clintmadeit/Projects/TRUKAPP/frontend
   eas build --platform android --profile production
   ```

3. **Test in app:**
   - Create new trial subscription
   - Should show "90 days" instead of "1 days"
   - Dashboard should display correct trial duration

---

## Why This Happened

1. **Backend Code:** ✅ Already fixed (uses `trialDays || duration || 90`)
2. **Frontend Code:** ✅ Already correct (displays backend value)
3. **Database:** ❌ Still has old data (duration: 1)

The backend code will **correctly calculate 90 days for NEW trials**, but existing plans in the database still have `duration: 1`, so **existing trials show 1 day**.

---

## Complete Solution Checklist

- [ ] Run migration script: `node fix-trial-plans.js`
- [ ] Verify in Firebase Console that plans are updated
- [ ] Clear app data and rebuild
- [ ] Test new trial activation
- [ ] Verify dashboard shows "90 days"
- [ ] Test with different user roles
- [ ] Confirm fix worked

---

## If Script Fails

**Check Firebase Credentials:**
```bash
# Make sure backend/config/firebase.js has valid credentials
# If you get auth errors, update your Firebase config:

cd backend
# Edit config/firebase.js with valid credentials
# Re-run: node fix-trial-plans.js
```

**Manual Database Check:**
1. Visit Firebase Console
2. Go to Firestore Database
3. Check `subscriptionPlans` collection
4. Look at trial plans (price = 0)
5. Manually update if needed

---

## After Fix - Deployment

Once database is fixed:

1. **Build new APK:**
   ```bash
   cd frontend
   eas build --platform android --profile production
   ```

2. **Test thoroughly:**
   - New trial activation
   - Dashboard display
   - All user roles
   - Duration calculation

3. **Deploy to PlayStore:**
   - Upload APK
   - Submit for review
   - Monitor approval status

---

## Timeline

- **Run Script:** 1-2 minutes
- **Database Update:** Automatic (Firestore)
- **App Rebuild:** 10-20 minutes
- **Test:** 5-10 minutes
- **Deploy:** Submit to PlayStore

---

**Status:** Run `node fix-trial-plans.js` ASAP to resolve this issue!

