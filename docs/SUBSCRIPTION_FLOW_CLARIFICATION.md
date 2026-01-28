# Subscription Flow Clarification & Implementation

## Flow Summary

### 1. **Trial Activation** (Automatic via Backend)
- **When**: User profile is approved by admin
- **Who**: Backend automatically creates trial subscription
- **User Action**: None required - trial is automatically active
- **Duration**: 90 days (3 months)

### 2. **Trial Expiry** (User Purchases Paid Plan)
- **When**: Trial expires after 90 days
- **Who**: User must purchase a paid plan
- **User Action**: Select payment method and complete purchase
- **Screen**: `SubscriptionTrialScreen` (reused with different messaging)

## Implementation Details

### SubscriptionTrialScreen Updates

The screen now handles **two scenarios**:

#### Scenario 1: Trial Activation (Shouldn't happen - admin creates trials)
- **Title**: "Activate Your Trial"
- **Message**: "Start Your 90-Day Free Trial"
- **Button**: "Activate Trial"
- **Benefits**: Trial-specific (no payment charged, test charge refunded)

#### Scenario 2: Renewal/Purchase (When trial expires)
- **Title**: "Subscribe to Plan"
- **Message**: "Choose Your Subscription Plan"
- **Button**: "Subscribe Now"
- **Benefits**: Subscription-specific (unlimited access, cancel anytime, secure payment)

### Detection Logic

```typescript
const isForRenewal = isRenewal || subscriptionStatus?.isExpired || subscriptionStatus?.needsRenewal;
```

### Navigation Flow

**When Trial Expires**:
1. User sees `SubscriptionExpiredScreen`
2. User clicks "Renew Subscription"
3. Navigates to `SubscriptionTrialScreen` with `isRenewal: true`
4. User selects payment method (M-PESA or Card)
5. User completes payment
6. `createSubscription()` is called (not `activateTrial()`)
7. User redirected to dashboard

**When No Subscription** (New User):
1. User completes profile
2. Admin approves → Backend creates trial automatically
3. User goes directly to dashboard (no payment screen)

## Files Modified

1. **`frontend/src/screens/SubscriptionExpiredScreen.tsx`**
   - Updated `handleRenewSubscription()` to navigate to `SubscriptionTrialScreen` with `isRenewal: true`

2. **`frontend/src/screens/SubscriptionTrialScreen.tsx`**
   - Added `isRenewal` flag detection
   - Dynamic title, messages, and button text based on context
   - Updated `activateTrial()` to call `createSubscription()` for renewals
   - Updated benefits section to show appropriate content
   - Loads paid plans for renewal, trial plan for activation

3. **`frontend/src/components/common/EnhancedSubscriptionStatusCard.tsx`**
   - Capped trial days display at 90 (protects against backend errors)

4. **Navigation Updates**:
   - Removed navigation to `SubscriptionTrial` for new users (admin creates trials)
   - Kept navigation for expired subscriptions (users purchase plans)

## Key Changes

### Before:
- Users activated trials themselves with payment method selection
- Same screen for trial activation and renewal

### After:
- Admin creates trials automatically (no user action)
- Users only see payment screen when trial expires
- Same screen reused but with context-aware messaging

## Testing Checklist

- [ ] New user completes profile → Goes to dashboard (no payment screen)
- [ ] Admin approves user → Trial automatically active
- [ ] Trial expires → User sees expired screen
- [ ] User clicks "Renew" → Sees "Subscribe to Plan" screen
- [ ] User selects payment method → Sees appropriate messaging
- [ ] User completes payment → Subscription created successfully
- [ ] Trial days display correctly (max 90 days)



