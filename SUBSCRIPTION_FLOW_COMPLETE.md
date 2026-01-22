# Complete Subscription Flow - Transporters & Brokers

## ✅ Confirmation: Expiry Screen & Renewal Flow

### Expiry Screen Implementation

**Status**: ✅ **FULLY IMPLEMENTED** for both transporters and brokers

The `SubscriptionExpiredScreen` is properly triggered whenever a subscription expires and provides a clear path to renewal.

### Flow Summary

#### **1. Trial Activation** (Automatic - No User Action)
- **When**: Admin approves user profile
- **Who**: Backend automatically creates 90-day trial
- **User Action**: None - trial is automatically active
- **Applies to**: Both transporters (individual & company) and brokers

#### **2. Subscription Expiry** (User Must Renew)
- **When**: Trial expires after 90 days OR paid subscription expires
- **Who**: User must purchase a paid plan
- **User Action**: Select payment method and complete purchase
- **Applies to**: Both transporters (individual & company) and brokers

### Expiry Screen Triggers

#### **For Transporters**:
1. ✅ `TransporterProcessingScreen` - When subscription expires
2. ✅ `TransporterCompletionScreen` - When subscription expires  
3. ✅ `App.tsx` - When transporter subscription status is 'expired'

#### **For Brokers**:
1. ✅ `BrokerSubscriptionChecker` - When subscription expires
2. ✅ `VerifyIdentificationDocumentScreen` - When broker subscription expires
3. ✅ `App.tsx` - When broker subscription status is 'expired'

### Renewal Flow (Both User Types)

**When subscription expires**:
1. User sees `SubscriptionExpiredScreen` with:
   - Clear expired status message
   - List of missing features (user-type specific)
   - Renewal options
   - Support contact options
2. User clicks **"Renew Subscription"** button
3. Navigates to `SubscriptionTrialScreen` with:
   - `isRenewal: true` (shows "Subscribe to Plan" instead of "Activate Trial")
   - `userType: 'broker' | 'individual' | 'company'`
   - `subscriptionStatus.isExpired: true`
4. User selects payment method:
   - **M-PESA**: Enter phone number
   - **Card**: Smart card input (auto-detects card type, groups digits, validates)
5. User completes payment
6. `createSubscription()` is called (creates paid subscription)
7. User redirected to dashboard:
   - Transporters → `TransporterTabs`
   - Brokers → `BrokerTabs`

### User Type Handling

#### **Transporters**:
- **Individual**: `userType: 'individual'`
- **Company**: `userType: 'company'`
- Both use same expiry screen and renewal flow
- Both can purchase subscriptions

#### **Brokers**:
- **Broker**: `userType: 'broker'`
- Uses same expiry screen and renewal flow
- Can purchase subscriptions

### Key Features

✅ **Expiry Screen**: Shows for both transporters and brokers when subscription expires
✅ **Renewal Button**: Navigates to payment screen for both user types
✅ **Payment Method Selection**: M-PESA and Card options for both
✅ **Smart Card**: Auto-detection, validation, and formatting for both
✅ **Subscription Creation**: `createSubscription()` works for both user types
✅ **Dashboard Navigation**: Proper routing after renewal for both

### Files Verified

1. ✅ `SubscriptionExpiredScreen.tsx` - Handles both transporters and brokers
2. ✅ `SubscriptionTrialScreen.tsx` - Handles renewal for both user types
3. ✅ `TransporterProcessingScreen.tsx` - Triggers expiry screen for transporters
4. ✅ `BrokerSubscriptionChecker.tsx` - Triggers expiry screen for brokers
5. ✅ `App.tsx` - Routes to expiry screen for both user types
6. ✅ `TransporterCompletionScreen.tsx` - Handles transporter expiry

## Summary

✅ **Expiry screen is fully implemented and triggers for both transporters and brokers**
✅ **Renewal flow works for both user types**
✅ **Subscription purchase happens for both transporters and brokers**
✅ **Same payment screen reused with context-aware messaging**
✅ **Smart card implementation works for both**

The complete flow is:
- **Trial**: Automatic via backend (admin approval)
- **Expiry**: User sees expiry screen
- **Renewal**: User purchases paid plan via payment screen
- **Works for**: Both transporters (individual & company) and brokers



