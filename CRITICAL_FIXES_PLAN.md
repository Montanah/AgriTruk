# Critical Fixes Plan for TRUKapp

## Issues Identified & Fixes Required

### 1. BROKER TRIAL AUTO-ACTIVATION (3 Days Remaining Issue)
**Problem**: Broker shows "3 days remaining" instead of auto-activating like company transporters

**Root Cause**:
- Brokers require manual trial activation via SubscriptionTrialScreen
- Company transporters get auto-activated in TransporterCompletionScreen
- Backend calculates trial days but frontend doesn't auto-activate for brokers

**Fix Required**:
```typescript
// In src/screens/auth/BrokerCompletionScreen.tsx or equivalent
// After broker email verification, auto-activate trial:
const activateBrokerTrial = async () => {
  try {
    const result = await subscriptionService.activateTrial('broker');
    if (result.success) {
      // Navigate to broker home
      navigation.reset({
        index: 0,
        routes: [{ name: 'BrokerTabs' }]
      });
    }
  } catch (error) {
    console.error('Failed to activate broker trial:', error);
  }
};
```

**Files to Modify**:
- Check if `BrokerCompletionScreen.tsx` exists, if not, add auto-activation logic after broker signup
- Ensure broker trial activation happens automatically after email verification

---

### 2. DRIVER RECRUITMENT STRUCTURE
**Problem**: Need to align frontend with backend logic for driver recruitment

**Current Flow**:
1. Job seeker signs up → JobSeekerCompletionScreen
2. Submits profile with documents
3. Status: pending_approval → approved → recruited

**Backend Expected Structure** (Need to verify):
- `/api/job-seekers/user/{userId}` - Get job seeker profile
- `/api/job-seekers/{id}/recruit` - Recruit a driver
- `/api/drivers` - Driver management after recruitment

**Issues**:
- No clear recruitment request flow from companies
- Document rejection workflow incomplete
- Email verification required but generated emails need manual update

**Fixes Required**:
1. Add recruitment request flow for companies to browse and request drivers
2. Implement document rejection workflow with resubmission
3. Auto-update generated emails or prompt user immediately
4. Add driver marketplace for companies to browse available drivers

---

### 3. BROKER REQUEST PLACEMENT ERRORS
**Problem**: Errors when broker places requests on behalf of clients

**Current Issues**:
- No client ownership validation
- Consolidation logic moved to RequestForm but management screen still shows old UI
- Stats calculation has multiple fallback methods

**Fixes Required**:
```typescript
// In src/components/common/RequestForm.tsx
// Add client ownership validation:
const validateClientOwnership = async (clientId: string) => {
  const response = await fetch(`${API_ENDPOINTS.BROKERS}/validate-client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error('You do not have permission to create requests for this client');
  }
};

// Before creating request:
if (mode === 'broker' && clientId) {
  await validateClientOwnership(clientId);
}
```

**Files to Modify**:
- `src/components/common/RequestForm.tsx` - Add client validation
- `src/screens/BrokerManagementScreen.tsx` - Remove old consolidation UI
- `src/services/unifiedBookingService.ts` - Standardize API response handling

---

### 4. PLAN UPGRADE & MPESA STK PUSH
**Problem**: Plan upgrade should trigger M-PESA STK push when user selects M-PESA payment

**Current Issues**:
- M-PESA STK polling implemented but not fully integrated
- No clear STK push trigger in payment flow
- Payment status polling incomplete

**Fixes Required**:
```typescript
// In src/services/mpesaPaymentService.ts
export async function initiateMpesaSTKPush(
  phoneNumber: string,
  amount: number,
  accountReference: string
): Promise<{ success: boolean; checkoutRequestId?: string; error?: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/mpesa/stk-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        amount,
        accountReference,
        description: `Subscription payment for ${accountReference}`
      })
    });

    if (!response.ok) {
      throw new Error(`STK Push failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      checkoutRequestId: data.checkoutRequestId
    };
  } catch (error) {
    console.error('M-PESA STK Push error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Poll for payment status
export async function pollMpesaPaymentStatus(
  checkoutRequestId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ success: boolean; status?: string; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${API_ENDPOINTS.PAYMENTS}/mpesa/status/${checkoutRequestId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          return { success: true, status: 'completed' };
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          return { success: false, status: data.status };
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Payment status check attempt ${attempt + 1} failed:`, error);
    }
  }

  return { success: false, error: 'Payment verification timeout' };
}
```

**Files to Modify**:
- `src/services/mpesaPaymentService.ts` - Add STK push and polling
- `src/screens/PaymentScreen.tsx` - Integrate STK push flow
- `src/screens/SubscriptionTrialScreen.tsx` - Add M-PESA payment option

---

### 5. CARD VALIDATION - ONLY ACCEPT VALID & IN-USE CARDS
**Problem**: Need to validate cards are not only valid format but also active/in-use

**Current Implementation**:
- Luhn algorithm validates card number format
- Expiry date validation checks format only
- No BIN (Bank Identification Number) validation
- No card status check (active/inactive/blocked)

**Enhanced Validation Required**:
```typescript
// In src/utils/cardValidation.ts
// Add BIN validation
export async function validateCardBIN(cardNumber: string): Promise<{
  isValid: boolean;
  cardBrand?: string;
  cardType?: string; // debit, credit, prepaid
  bankName?: string;
  countryCode?: string;
  error?: string;
}> {
  try {
    // Extract BIN (first 6-8 digits)
    const bin = cardNumber.replace(/\D/g, '').substring(0, 8);
    
    // Call backend BIN validation endpoint
    const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/validate-bin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bin })
    });

    if (!response.ok) {
      return { isValid: false, error: 'BIN validation failed' };
    }

    const data = await response.json();
    return {
      isValid: true,
      cardBrand: data.brand,
      cardType: data.type,
      bankName: data.bank,
      countryCode: data.country
    };
  } catch (error) {
    console.error('BIN validation error:', error);
    return { isValid: false, error: 'BIN validation service unavailable' };
  }
}

// Enhanced card validation with BIN check
export async function validateCardWithBIN(cardData: CardData): Promise<{
  isValid: boolean;
  cardInfo?: any;
  errors?: string[];
}> {
  const errors: string[] = [];
  
  // 1. Format validation (existing Luhn algorithm)
  const formatValidation = validateFullCard(cardData);
  if (!formatValidation.overall.isValid) {
    errors.push(formatValidation.overall.errorMessage || 'Invalid card format');
  }

  // 2. BIN validation
  const binValidation = await validateCardBIN(cardData.number);
  if (!binValidation.isValid) {
    errors.push('Card not recognized or not supported');
  }

  // 3. Expiry validation (enhanced)
  const expiryValidation = validateExpiryDate(cardData.expiry);
  if (!expiryValidation.isValid) {
    errors.push(expiryValidation.errorMessage || 'Card expired');
  }

  return {
    isValid: errors.length === 0,
    cardInfo: binValidation,
    errors: errors.length > 0 ? errors : undefined
  };
}
```

**Files to Modify**:
- `src/utils/cardValidation.ts` - Add BIN validation
- `src/components/common/SmartPaymentForm.tsx` - Integrate BIN validation
- `src/services/paymentService.ts` - Add card verification before payment

---

### 6. PAYSTACK INTEGRATION
**Problem**: Paystack not fully implemented on backend, but frontend should be ready

**Current State**:
- Payment service has Stripe integration
- M-PESA integration exists
- Paystack mentioned but not implemented

**Paystack Integration Required**:
```typescript
// In src/services/paystackService.ts (NEW FILE)
import { API_ENDPOINTS } from '../constants/api';

export interface PaystackPaymentData {
  email: string;
  amount: number; // in kobo (multiply by 100)
  currency: string;
  reference?: string;
  callback_url?: string;
  metadata?: any;
}

class PaystackService {
  /**
   * Initialize Paystack payment
   */
  async initializePayment(paymentData: PaystackPaymentData): Promise<{
    success: boolean;
    authorizationUrl?: string;
    accessCode?: string;
    reference?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/paystack/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`Paystack initialization failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference
      };
    } catch (error) {
      console.error('Paystack initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(
        `${API_ENDPOINTS.PAYMENTS}/paystack/verify/${reference}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Payment verification failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.status === 'success',
        status: data.status,
        amount: data.amount
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async getAuthToken(): Promise<string> {
    const { getAuth } = require('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  }
}

export default new PaystackService();
```

**Files to Create**:
- `src/services/paystackService.ts` - Paystack integration service
- Update `src/screens/PaymentScreen.tsx` - Add Paystack payment option

---

## Implementation Priority

### HIGH PRIORITY (Fix Immediately):
1. ✅ Broker trial auto-activation
2. ✅ M-PESA STK push integration
3. ✅ Broker request placement validation
4. ✅ Card BIN validation

### MEDIUM PRIORITY (Fix Soon):
5. Driver recruitment structure alignment
6. Paystack integration preparation
7. Document rejection workflow

### LOW PRIORITY (Enhancement):
8. Subscription cache optimization
9. Payment method storage
10. Enhanced error logging

---

## Testing Checklist

### Broker Features:
- [ ] Broker auto-activates trial after signup
- [ ] Broker can create requests for owned clients only
- [ ] Broker stats calculate correctly
- [ ] Consolidation display works properly

### Payment Features:
- [ ] M-PESA STK push triggers correctly
- [ ] Payment status polling works
- [ ] Card validation rejects invalid cards
- [ ] Card BIN validation works
- [ ] Plan upgrade flow completes successfully

### Driver Recruitment:
- [ ] Job seeker profile completion works
- [ ] Document upload and validation works
- [ ] Email verification required
- [ ] Recruitment status tracking accurate

---

## Backend API Endpoints Required

### Subscription:
- `POST /api/subscriptions/activate-trial` - Auto-activate trial
- `GET /api/subscriptions/subscriber/status` - Get subscription status
- `POST /api/subscriptions/upgrade` - Upgrade plan

### Payment:
- `POST /api/payments/mpesa/stk-push` - Initiate M-PESA payment
- `GET /api/payments/mpesa/status/{checkoutRequestId}` - Check payment status
- `POST /api/payments/validate-bin` - Validate card BIN
- `POST /api/payments/paystack/initialize` - Initialize Paystack payment
- `GET /api/payments/paystack/verify/{reference}` - Verify Paystack payment

### Broker:
- `GET /api/brokers/validate-client/{clientId}` - Validate client ownership
- `GET /api/brokers/clients-with-requests` - Get clients with request stats

### Driver Recruitment:
- `GET /api/job-seekers/user/{userId}` - Get job seeker profile
- `POST /api/job-seekers/{id}/recruit` - Recruit a driver
- `GET /api/job-seekers/marketplace` - Browse available drivers
- `POST /api/job-seekers/{id}/documents/resubmit` - Resubmit rejected documents

---

## Next Steps

1. Review this plan with backend team
2. Confirm API endpoints match expected structure
3. Implement fixes in priority order
4. Test each fix thoroughly
5. Deploy and monitor for issues
