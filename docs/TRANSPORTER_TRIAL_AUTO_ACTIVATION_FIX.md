# Transporter Trial Auto-Activation - Implementation Guide

**Objective:** Make transporter trial activation automatic (like brokers) when admin approves documents

**Status:** Ready for Implementation  
**Priority:** HIGH  
**Complexity:** MEDIUM

---

## Quick Overview

**Problem:** When admin approves a transporter, no trial subscription is created. User must manually activate or wait.

**Solution:** Add auto-trial creation code to `adminController.reviewTransporter()` when status becomes 'approved'.

**Precedent:** Broker already has this working in `brokerController.reviewBroker()`.

---

## Step 1: Understand Current Broker Implementation

**File:** `backend/controllers/brokerController.js` (lines ~1234-1250)

```javascript
if (action === 'approve') {
  const updateData = {
    status: 'approved',
    approvedBy: adminId,
    idExpiryDate: idExpiryDate || null,
    idVerified: true,
    accountStatus: true
  };
  await Broker.update(brokerId, updateData);
  await logAdminActivity(adminId, 'approve_broker', req);

  // ⭐ AUTO-ACTIVATE TRIAL SUBSCRIPTION FOR BROKER IF ELIGIBLE
  try {
    const RecruiterPlans = require('../models/RecruiterPlans');
    const RecruiterSubscribers = require('../models/RecruiterSubscribers');
    const RecruiterSubscriptionService = require('../services/RecruiterSubscriptionService');
    
    // Check if broker's user has used a trial
    const hasUsedTrial = await RecruiterSubscribers.hasUsedTrial(user.id);
    if (!hasUsedTrial) {
      const trialPlan = await RecruiterPlans.getTrialPlan();
      if (trialPlan && trialPlan.id) {
        await RecruiterSubscriptionService.startSubscription(user.id, trialPlan.id);
      }
    }
  } catch (trialErr) {
    console.error('Error auto-activating broker trial:', trialErr);
  }

  // Send approval email
  await sendEmail({...});
  return res.status(200).json({...});
}
```

**Key Points:**
1. ✅ Gets user object (has user.id)
2. ✅ Checks if trial already used
3. ✅ Gets trial plan
4. ✅ Creates subscription via service
5. ✅ Logs errors without blocking

---

## Step 2: Locate Transporter Approval Code

**File:** `backend/controllers/adminController.js`

**Function:** `reviewTransporter()`

**Current Implementation:** Lines with `status: 'approved'` 

Currently, the code only does:
```javascript
updates = {
  ...updates,
  status: 'approved',
  updatedAt: admin.firestore.Timestamp.now(),
};
await Transporter.update(transporterId, updates);
```

**No trial creation code.**

---

## Step 3: Identify Required Imports

For transporter, we need:

```javascript
const Subscribers = require("../models/Subscribers");  // Same as Broker
const SubscriptionPlans = require("../models/SubscriptionPlans");  // Standard plans
const User = require('../models/User');  // Already imported

// OR use subscription service if available:
// const subscriptionController = require('./subscriptionController');
```

**Note:** Transporter uses standard `Subscribers` model (not Recruiter version), so adapt broker code accordingly.

---

## Step 4: Implementation Code

### Add this block to `adminController.js` in the `reviewTransporter()` function

**Location:** After status is changed to 'approved' (where `updates.status = 'approved'`)

```javascript
// When all documents are approved (driverLicenseapproved, insuranceapproved, idapproved)
if (transporter.driverLicenseapproved && transporter.insuranceapproved) {
  updates = {
    ...updates,
    status: 'approved',
    accountStatus: true,
    updatedAt: admin.firestore.Timestamp.now(),
  };
  await Transporter.update(transporterId, updates);

  // ⭐ NEW: AUTO-ACTIVATE TRIAL SUBSCRIPTION FOR TRANSPORTER
  try {
    const Subscribers = require("../models/Subscribers");
    const SubscriptionPlans = require("../models/SubscriptionPlans");
    
    console.log(`🔄 Auto-activating trial for transporter: ${transporter.userId}`);
    
    // Get the user to ensure userId is correct
    const user = await User.get(transporter.userId);
    if (!user) {
      console.warn(`⚠️ User not found for transporter: ${transporter.userId}`);
      return;
    }
    
    // Check if this user has already used a trial
    const hasUsedTrial = await Subscribers.hasUsedTrial(user.uid);
    
    if (hasUsedTrial) {
      console.log(`ℹ️ Transporter already used trial: ${user.uid}`);
      return;
    }
    
    // Get the trial plan (price = 0, trialDays = 90)
    const trialPlan = await SubscriptionPlans.getTrialPlan();
    
    if (!trialPlan || !trialPlan.id) {
      console.error('❌ Trial plan not found');
      return;
    }
    
    console.log(`📋 Trial plan found: ${trialPlan.id}, duration: ${trialPlan.trialDays} days`);
    
    // Calculate trial dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    const trialDuration = trialPlan.trialDays || 90;
    endDate.setDate(endDate.getDate() + trialDuration);
    
    // Create subscriber record
    const subscriber = await Subscribers.create({
      userId: user.uid,
      planId: trialPlan.id,
      status: 'active',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      isActive: true,
      paymentStatus: 'pending',
      autoRenew: false,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`✅ Trial activated for transporter ${user.uid}`);
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   End: ${endDate.toISOString()}`);
    console.log(`   Days: ${trialDuration}`);
    
    // Send notification email to user
    await sendEmail({
      to: user.email,
      subject: 'Your TRUK Trial Has Been Activated!',
      html: `
        <p>Congratulations! Your TRUK transporter account has been approved.</p>
        <p><strong>Your 90-day free trial is now active!</strong></p>
        <p>
          <strong>Trial Period:</strong> ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}<br>
          <strong>Duration:</strong> ${trialDuration} days
        </p>
        <p>During your trial, you can:</p>
        <ul>
          <li>Create and manage your company profile</li>
          <li>Recruit and manage drivers</li>
          <li>Assign vehicles and accept jobs</li>
          <li>Access all platform features</li>
        </ul>
        <p>Log in to your account to get started!</p>
        <p>Best regards,<br>TRUK Team</p>
      `,
      text: `Your TRUK trial has been activated for ${trialDuration} days!`
    });
    
  } catch (trialErr) {
    console.error('❌ Error auto-activating transporter trial:', trialErr);
    // Don't block the approval if trial activation fails
    // Admin can manually activate later if needed
  }

  // Existing approval email code
  await sendEmail({
    to: transporter.email,
    subject: 'Transporter Approved',
    html: getRejectTemplate("Transporter Approved", `<br> <br> Your transporter account has been approved. <br> <br> Thank you for using our services. <br> <br> Best regards, <br>  ${process.env.APP_NAME}`, transporter),
    text: 'Your transporter account has been approved. Welcome to Truk!'
  });

  await logAdminActivity(
    req.user.uid,
    'approve_transporter',
    req,
    { type: 'transporter', id: transporterId }
  );
}
```

---

## Step 5: Verify Models Have Required Methods

### Check `Subscribers.js` Model

Make sure it has:
```javascript
// Method 1: Check if user already used trial
static async hasUsedTrial(userId) {
  const snapshot = await db.collection('subscribers')
    .where('userId', '==', userId)
    .where('isTrial', '==', true)
    .limit(1)
    .get();
  return !snapshot.empty;
}

// Method 2: Create subscriber
static async create(data) {
  const docRef = db.collection('subscribers').doc();
  await docRef.set({
    id: docRef.id,
    ...data
  });
  return { id: docRef.id, ...data };
}
```

### Check `SubscriptionPlans.js` Model

Make sure it has:
```javascript
// Get trial plan (price = 0)
static async getTrialPlan() {
  const snapshot = await db.collection('subscriptionPlans')
    .where('price', '==', 0)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  return snapshot.docs[0].data();
}
```

**If methods are missing, create them** (see Step 6).

---

## Step 6: Add Missing Model Methods

If methods don't exist, add them:

### In `backend/models/Subscribers.js`

```javascript
// Add this method if not present
async hasUsedTrial(userId) {
  try {
    const snapshot = await db.collection('subscribers')
      .where('userId', '==', userId)
      .where('isTrial', '==', true)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if user has used trial:', error);
    return false; // Default to allowing trial if error
  }
}
```

### In `backend/models/SubscriptionPlans.js`

```javascript
// Add this method if not present
static async getTrialPlan() {
  try {
    const snapshot = await db.collection('subscriptionPlans')
      .where('price', '==', 0)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.warn('No trial plan found in subscriptionPlans collection');
      return null;
    }
    
    const trialPlan = snapshot.docs[0].data();
    trialPlan.id = snapshot.docs[0].id; // Add document ID
    return trialPlan;
  } catch (error) {
    console.error('Error fetching trial plan:', error);
    return null;
  }
}
```

---

## Step 7: Update Frontend - SubscriptionTrialScreen.tsx

Update messaging to show trial is auto-activated:

### In `frontend/src/screens/SubscriptionTrialScreen.tsx`

Find this section:
```typescript
<Text style={styles.welcomeSubtitle}>
  You have been approved for a 90-day free trial. Your trial will be activated by our admin team shortly.
</Text>
```

Replace with:
```typescript
<Text style={styles.welcomeSubtitle}>
  Your account has been approved! Your 90-day free trial is now active and ready to use.
</Text>
```

### In the same file, update the benefits section:

Find:
```typescript
<Text style={styles.welcomeSubtitle}>
  You have been approved for a 90-day free trial. Your trial will be activated by our admin team shortly.
</Text>
```

Replace with:
```typescript
<View style={styles.benefitItem}>
  <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
  <Text style={styles.benefitText}>Your trial is active right now - no waiting!</Text>
</View>
```

---

## Step 8: Update App.tsx - Routing Logic

When approved transporter logs in, subscription should already exist.

Find this section in `App.tsx`:
```typescript
// Check subscription status for approved transporters
console.log('App.tsx: Profile completed and approved - checking subscription status');

const needsTrialActivation = subscriptionStatus?.needsTrialActivation === true;
```

Update the route logic:
```typescript
// If subscription still shows needsTrialActivation, show warning
if (subscriptionStatus?.needsTrialActivation) {
  console.warn('⚠️ Transporter approved but trial not auto-activated. Showing manual activation screen.');
  // User can still manually activate, but this shouldn't happen
  initialRouteName = 'SubscriptionTrial';
} else {
  // Trial was auto-activated
  console.log('✅ Trial auto-activated on approval. Routing to dashboard.');
  initialRouteName = 'TransporterTabs';
}
```

---

## Step 9: Test the Implementation

### Manual Testing

1. **Create test transporter account**
   - Sign up with company name, contact, etc.
   - Status: `pending`

2. **Approve in admin panel**
   - Run approval endpoint with action='approve-dl' (then others)
   - Check backend logs for:
     ```
     🔄 Auto-activating trial for transporter: [userId]
     📋 Trial plan found: [planId], duration: 90 days
     ✅ Trial activated for transporter [userId]
     ```

3. **Check Firestore**
   - Open `subscribers` collection
   - New document should exist with:
     - `userId`: [approved transporter's uid]
     - `planId`: trial plan ID
     - `status`: 'active'
     - `isActive`: true
     - `startDate`: approval date
     - `endDate`: +90 days from approval

4. **Log in as transporter**
   - Go to dashboard
   - Should see: "90 days remaining"
   - No SubscriptionTrialScreen

5. **Check expiry calculation**
   - Days should decrease daily
   - At 7 days: warning badge
   - At 0 days: expired screen

### Automated Testing

```javascript
// test/transporter-trial.test.js
describe('Transporter Trial Auto-Activation', () => {
  
  test('Should create trial subscription when admin approves', async () => {
    // 1. Create transporter
    const transporter = await createTestTransporter();
    
    // 2. Approve
    await approveTransporter(transporter.id);
    
    // 3. Verify subscriber created
    const subscriber = await Subscribers.getByUserId(transporter.userId);
    expect(subscriber).toBeDefined();
    expect(subscriber.status).toBe('active');
    expect(subscriber.isActive).toBe(true);
  });
  
  test('Should not create trial if already used', async () => {
    const user = await createTestUser();
    
    // Use trial once
    await createTrialSubscription(user.uid);
    
    // Create transporter as same user
    const transporter = await createTestTransporter(user.uid);
    
    // Approve
    await approveTransporter(transporter.id);
    
    // Verify only 1 trial subscription
    const subscribers = await Subscribers.getByUserId(user.uid);
    expect(subscribers.filter(s => s.isTrial).length).toBe(1);
  });
  
  test('Should set correct trial dates', async () => {
    const beforeTime = new Date();
    
    // Create and approve
    const transporter = await createTestTransporter();
    await approveTransporter(transporter.id);
    
    const afterTime = new Date();
    const subscriber = await Subscribers.getByUserId(transporter.userId);
    
    // Start should be between beforeTime and afterTime
    expect(subscriber.startDate.toDate()).toBeGreaterThanOrEqual(beforeTime);
    expect(subscriber.startDate.toDate()).toBeLessThanOrEqual(afterTime);
    
    // End should be ~90 days later
    const expectedEnd = new Date(subscriber.startDate.toDate());
    expectedEnd.setDate(expectedEnd.getDate() + 90);
    
    const actualEnd = subscriber.endDate.toDate();
    const daysDiff = Math.abs(actualEnd - expectedEnd) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeLessThan(1); // Within 1 day
  });
});
```

---

## Step 10: Error Handling & Rollback

If trial activation fails:
- ✅ Approval is NOT blocked (try-catch)
- ✅ User can manually activate
- ✅ Admin can retry via special endpoint (optional)

### Optional: Add Manual Retry Endpoint

```javascript
// POST /api/subscriptions/admin/activate-trial
exports.adminActivateTrial = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check user exists
    const user = await User.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check not already used
    const hasUsedTrial = await Subscribers.hasUsedTrial(user.uid);
    if (hasUsedTrial) {
      return res.status(400).json({ success: false, message: 'Trial already used' });
    }
    
    // Get trial plan
    const trialPlan = await SubscriptionPlans.getTrialPlan();
    if (!trialPlan) {
      return res.status(500).json({ success: false, message: 'Trial plan not found' });
    }
    
    // Create subscription
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (trialPlan.trialDays || 90));
    
    await Subscribers.create({
      userId: user.uid,
      planId: trialPlan.id,
      status: 'active',
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      isActive: true,
      paymentStatus: 'pending',
      autoRenew: false,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Trial activated successfully',
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Admin trial activation error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate trial' });
  }
};
```

---

## Deployment Checklist

- [ ] Code changes in `adminController.js` added
- [ ] Model methods verified/added if missing
- [ ] Frontend messaging updated
- [ ] App.tsx routing logic updated
- [ ] Test approval flow end-to-end
- [ ] Check Firestore subscribers collection
- [ ] Verify days remaining shows correctly
- [ ] Verify expiry screen appears at 0 days
- [ ] Test with second signup (trial already used)
- [ ] Monitor backend logs for errors
- [ ] Test with multiple concurrent approvals

---

## Expected Results

### Before Fix
1. Admin approves transporter → ❌ No subscription created
2. User logs in → ⚠️ Routed to manual SubscriptionTrialScreen
3. User confused: "What should I do?"

### After Fix
1. Admin approves transporter → ✅ Trial auto-created
2. User logs in → ✅ Dashboard shows "90 days remaining"
3. User clarity: "I have 90 days to use the platform"
4. At expiry → ✅ Auto-routed to upgrade screen
5. Company drivers dependent on subscription status ✅

---

## Rollback Plan

If issues arise:

1. **Comment out trial code** in adminController.js
2. **Status reverts to:** User must manually activate
3. **No data corruption:** Trial code doesn't delete anything
4. **Users can wait** and manually activate later

---

## Monitoring

After deployment, monitor:

1. **Backend logs** for auto-trial activations
   ```
   grep "Auto-activating trial" logs/
   ```

2. **Firestore queries**
   ```sql
   SELECT COUNT(*) FROM subscribers 
   WHERE isTrial = true AND status = 'active'
   ```

3. **User behavior**
   - Transporter reaching dashboard without SubscriptionTrialScreen
   - Days remaining counting down daily

4. **Support tickets**
   - Decreased confusion about trial activation

---

## Success Metrics

- ✅ All approved transporters have trial subscription
- ✅ No users stuck in SubscriptionTrialScreen
- ✅ Days remaining showing correctly
- ✅ Expiry routing working
- ✅ Zero backend errors in trial activation

