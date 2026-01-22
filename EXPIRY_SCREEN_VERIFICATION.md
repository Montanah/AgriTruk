# Expiry Screen Verification & Flow

## ✅ Confirmation: Expiry Screen is Properly Implemented

### Expiry Screen Triggers

The `SubscriptionExpiredScreen` is triggered in the following scenarios:

#### **For Transporters** (Individual & Company):
1. **TransporterProcessingScreen**: When `subscriptionStatus === 'expired'` or `trialUsed === true`
2. **TransporterCompletionScreen**: When `subscriptionStatus === 'expired'` or `'inactive'`
3. **App.tsx**: When transporter subscription status is `'expired'`

#### **For Brokers**:
1. **BrokerSubscriptionChecker**: When `subscriptionStatus === 'expired'` or `'inactive'`
2. **VerifyIdentificationDocumentScreen**: When broker subscription is expired
3. **App.tsx**: When broker subscription status is `'expired'`

### Renewal Flow (Both Transporters & Brokers)

**When subscription expires**:
1. User sees `SubscriptionExpiredScreen`
2. Screen shows:
   - Expired status message
   - What features are missing
   - Renewal options
   - Support contact options
3. User clicks "Renew Subscription" button
4. Navigates to `SubscriptionTrialScreen` with:
   - `isRenewal: true`
   - `userType: 'broker' | 'individual' | 'company'`
   - `subscriptionStatus.isExpired: true`
5. User selects payment method (M-PESA or Card)
6. User completes payment
7. `createSubscription()` is called (not `activateTrial()`)
8. User redirected to appropriate dashboard

### User Type Handling

#### **Transporters**:
- **Individual**: `userType: 'individual'`
- **Company**: `userType: 'company'`
- Both use same expiry screen and renewal flow

#### **Brokers**:
- **Broker**: `userType: 'broker'`
- Uses same expiry screen and renewal flow

### Navigation Flow Verification

#### **Transporter Expiry Flow**:
```
TransporterProcessingScreen / TransporterCompletionScreen / App.tsx
  ↓ (subscriptionStatus === 'expired')
SubscriptionExpiredScreen
  ↓ (user clicks "Renew Subscription")
SubscriptionTrialScreen (isRenewal: true, userType: 'individual' | 'company')
  ↓ (user completes payment)
createSubscription() → Dashboard
```

#### **Broker Expiry Flow**:
```
BrokerSubscriptionChecker / VerifyIdentificationDocumentScreen / App.tsx
  ↓ (subscriptionStatus === 'expired')
SubscriptionExpiredScreen
  ↓ (user clicks "Renew Subscription")
SubscriptionTrialScreen (isRenewal: true, userType: 'broker')
  ↓ (user completes payment)
createSubscription() → Dashboard
```

## Files Updated

1. **`frontend/src/screens/SubscriptionExpiredScreen.tsx`**
   - Fixed `handleRenewSubscription()` to properly handle both transporters and brokers
   - Updated `getExpiredFeatures()` to correctly identify user type
   - Properly maps userType for navigation

2. **`frontend/src/screens/TransporterProcessingScreen.tsx`**
   - Fixed userType mapping for expired screen (company vs individual)

3. **`frontend/src/screens/auth/TransporterCompletionScreen.tsx`**
   - Fixed userType mapping for expired screen

4. **`frontend/App.tsx`**
   - Added `SubscriptionTrial` screen to navigation stack for both transporters and brokers
   - Ensures renewal flow is accessible

## Verification Checklist

- [x] Expiry screen triggers for transporters (individual & company)
- [x] Expiry screen triggers for brokers
- [x] Renewal button navigates to SubscriptionTrialScreen
- [x] SubscriptionTrialScreen handles both transporters and brokers
- [x] Payment method selection works for both user types
- [x] Smart card implementation works for both user types
- [x] `createSubscription()` is called (not `activateTrial()`) for renewals
- [x] Proper navigation to dashboard after renewal

## Summary

✅ **Expiry screen is properly implemented and triggers for both transporters and brokers**
✅ **Renewal flow works for both user types**
✅ **Same payment screen reused with context-aware messaging**
✅ **Subscription creation happens for both transporters and brokers**



