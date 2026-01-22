# Backend Requirements: Company Registration Requirement & Trial Fix

## Overview

This document outlines the backend requirements for two critical features:
1. **Company Registration Requirement** - Mandatory registration after 5 completed trips
2. **Trial Subscription Fix** - Correct trial duration calculation

---

## Part 1: Company Registration Requirement Feature

### Feature Description

Company transporters can skip providing registration number during initial profile setup. However, after accumulating 5 completed trips (by any driver under the company), registration number becomes mandatory. All drivers under the company are notified and services are temporarily paused until the company updates the registration number.

### API Endpoints Required

#### 1. Check Registration Status

**Endpoint**: `GET /api/companies/:companyId/registration-status`

**Description**: Returns registration requirement status for a company

**Response**:
```json
{
  "success": true,
  "registrationRequired": true,
  "registrationProvided": false,
  "completedTrips": 6,
  "tripsThreshold": 5,
  "registrationNumber": null,
  "message": "Registration required after 5 completed trips"
}
```

**Logic**:
- Count all completed trips for the company (across all drivers)
- If `completedTrips >= tripsThreshold` (5), set `registrationRequired = true`
- Check if company has `registration` field (registration number)
- If `registration` exists and is not empty, set `registrationProvided = true`
- Otherwise, `registrationProvided = false`

**Implementation Notes**:
```javascript
// Pseudo-code
const completedTrips = await countCompletedTripsForCompany(companyId);
const registrationRequired = completedTrips >= 5;
const registrationProvided = !!(company.registration && company.registration.trim().length > 0);
```

---

#### 2. Update Company Registration

**Endpoint**: `PATCH /api/companies/:companyId`

**Description**: Updates company registration number

**Request Body**:
```json
{
  "registration": "CPR/2023/123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Company registration updated successfully",
  "company": {
    "id": "company123",
    "companyName": "Acme Transporters",
    "registration": "CPR/2023/123456",
    "registrationRequired": false,
    "registrationProvided": true
  }
}
```

**Validation**:
- `registration` must be a non-empty string
- `registration` must be provided (required field)

**Side Effects**:
- After updating registration, check if `registrationRequired && registrationProvided` is now true
- If true, notify all drivers under the company that services are reactivated
- Update company status to allow services to continue

---

#### 4. Count Completed Trips for Company

**Helper Function**: Count all completed trips for a company

**Logic**:
```javascript
// Count trips where:
// - booking.transporterId === companyId OR booking.companyId === companyId
// - booking.status === 'completed' OR 'delivered'
// - Include trips completed by any driver under the company

const countCompletedTripsForCompany = async (companyId) => {
  const bookings = await db.collection('bookings')
    .where('companyId', '==', companyId)
    .where('status', 'in', ['completed', 'delivered'])
    .get();
  
  return bookings.size;
};
```

**Note**: This should count trips completed by ANY driver under the company, not just the company owner.

---

### Database Schema Updates

#### Company Collection

Add/Update fields:
```javascript
{
  // Existing fields...
  companyName: string,
  companyContact: string,
  companyEmail: string,
  
  // NEW/UPDATE fields:
  registration: string | null,  // Optional initially, required after 5 trips
  
  // Computed fields (can be calculated on-the-fly or cached):
  completedTripsCount: number,  // Optional: cache for performance
  registrationRequired: boolean,  // Optional: cache for performance
  registrationProvided: boolean,  // Optional: cache for performance
}
```

---

### Notification System

#### When Registration Becomes Required

**Trigger**: After a trip is completed and total completed trips >= 5

**Actions**:
1. Update company document: `registrationRequired = true`
2. Send notification to company owner/admin
3. Send notification to all drivers under the company
4. Block services for all drivers (check in driver endpoints)

**Notification Message**:
```
"Your company has completed 5 trips. Registration number is now required to continue using TRUKapp services. Please update your company profile."
```

#### When Registration is Provided

**Trigger**: Company updates registration number

**Actions**:
1. Update company document: `registrationProvided = true`
2. Send notification to all drivers: "Registration number verified. Services are now active."
3. Unblock services for all drivers

---

### Service Blocking Logic

#### Driver Endpoints to Check Registration

Add registration check to these endpoints:

1. **Accept Job**: `POST /api/bookings/:bookingId/accept`
   - Check `registrationRequired && !registrationProvided`
   - If true, return error: `403 Forbidden - Registration required`

2. **Start Trip**: `POST /api/bookings/:bookingId/start`
   - Same check as above

3. **Complete Trip**: `POST /api/bookings/:bookingId/complete`
   - Allow completion (trip already started)
   - But check registration after completion

4. **Driver Profile**: `GET /api/drivers/profile`
   - Include registration status in response
   - Frontend will show blocking modal if required

**Error Response**:
```json
{
  "success": false,
  "error": "REGISTRATION_REQUIRED",
  "message": "Company registration number is required to continue using services. Please contact your company administrator.",
  "registrationStatus": {
    "registrationRequired": true,
    "registrationProvided": false,
    "completedTrips": 6,
    "tripsThreshold": 5
  }
}
```

---

### Migration Script

**For Existing Companies**:

```javascript
// Run once to initialize registration status for existing companies
async function initializeRegistrationStatus() {
  const companies = await db.collection('companies').get();
  
  for (const companyDoc of companies.docs) {
    const company = companyDoc.data();
    const companyId = companyDoc.id;
    
    // Count completed trips
    const completedTrips = await countCompletedTripsForCompany(companyId);
    const registrationRequired = completedTrips >= 5;
    const registrationProvided = !!(company.registration && company.registration.trim().length > 0);
    
    // Update company document
    await companyDoc.ref.update({
      completedTripsCount: completedTrips,
      registrationRequired,
      registrationProvided,
      // Ensure registration field exists (set to null if missing)
      registration: company.registration || null,
    });
  }
}
```

---

## Part 2: Trial Subscription Fix

### Issue Summary

Trial subscriptions are showing incorrect `daysRemaining` (e.g., 2724 days instead of 0-90 days) due to incorrect date calculation in `createSubscriber` function.

### Root Cause

**File**: `backend/controllers/subscriptionController.js`  
**Line**: 233

**Current Code** (WRONG):
```javascript
endDate.setMonth(endDate.getMonth() + plan.duration);
```

**Problem**: This adds **months** instead of **days**. If `plan.duration = 90`, it adds 90 months (7.5 years) instead of 90 days.

### Fix Required

**File**: `backend/controllers/subscriptionController.js`  
**Line**: 231-234

**Fixed Code**:
```javascript
const startDate = new Date(Date.now());
const endDate = new Date(startDate);

// For trial plans (price === 0), use plan.trialDays if available, otherwise plan.duration
if (plan.price === 0) {
  // Trial plan - use trialDays if available, otherwise duration (should be in days)
  const trialDays = plan.trialDays || plan.duration || 90;
  endDate.setDate(endDate.getDate() + trialDays);
} else {
  // Paid plan - duration should be in days for consistency
  endDate.setDate(endDate.getDate() + plan.duration);
}
```

### Data Migration

**File**: `backend/fix-trial-duration.js` (already exists)

**Action**: Run this script for all affected subscribers:

```javascript
// Fix all trial subscribers with incorrect endDate
const subscribers = await db.collection('subscribers')
  .where('planId', '==', trialPlanId)
  .get();

for (const subDoc of subscribers.docs) {
  const subscriber = subDoc.data();
  const plan = await getSubscriptionPlan(subscriber.planId);
  
  if (plan.price === 0) {
    // Recalculate correct endDate
    const startDate = subscriber.startDate.toDate();
    const correctEndDate = new Date(startDate);
    const trialDays = plan.trialDays || plan.duration || 90;
    correctEndDate.setDate(correctEndDate.getDate() + trialDays);
    
    // Update subscriber
    await subDoc.ref.update({
      endDate: admin.firestore.Timestamp.fromDate(correctEndDate)
    });
  }
}
```

### Plan Model Updates

**File**: `backend/models/SubscriptionsPlans.js`

**Ensure trial plans have**:
```javascript
{
  name: "Free Trial",
  price: 0,
  duration: 90,  // Keep for backward compatibility (in days)
  trialDays: 90, // Explicit trial days field
  billingCycle: "trial",
  isActive: true
}
```

---

## Implementation Priority

### High Priority (Critical)
1. ✅ Fix trial subscription date calculation (`setMonth` → `setDate`)
2. ✅ Run migration script for existing trial subscribers
3. ✅ Add registration status endpoint (`GET /api/companies/:companyId/registration-status`)

### Medium Priority (Important)
4. ✅ Add registration update endpoint (`PATCH /api/companies/:companyId`)
5. ✅ Add registration check to driver service endpoints (accept job, start trip, etc.)
6. ✅ Implement notification system for registration requirement

### Low Priority (Nice to Have)
8. ✅ Cache `completedTripsCount` and `registrationRequired` in company document
9. ✅ Add admin dashboard to view companies requiring registration
10. ✅ Add analytics for registration compliance

---

## Testing Checklist

### Registration Requirement
- [ ] Company can create profile without registration
- [ ] After 5 completed trips, registration becomes required
- [ ] Drivers are blocked from accepting new jobs when registration required
- [ ] Company can update registration via profile
- [ ] After registration update, drivers can continue using services
- [ ] Notifications are sent to company and drivers

### Trial Fix
- [ ] New trial subscriptions have correct `endDate` (startDate + 90 days)
- [ ] `daysRemaining` calculation returns 0-90 for trials
- [ ] `daysRemaining` decreases daily
- [ ] Expired trials return `daysRemaining: 0`
- [ ] Existing trial subscribers are fixed via migration script

---

## API Integration Examples

### Frontend: Check Registration Status

```typescript
// Frontend already implements this in companyRegistrationService.ts
const status = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/registration-status`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Frontend: Update Registration

```typescript
// Frontend already implements this in ManageTransporterScreen.tsx
await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    registration: registrationNumber
  })
});
```

---

## Summary

### Registration Requirement
- **New Feature**: Optional registration number initially, mandatory after 5 trips
- **Endpoints**: 2 new endpoints (status, update)
- **Database**: Add `registration` field (registration number only)
- **Notifications**: Notify company and drivers when required/provided
- **Blocking**: Block driver services when required but not provided

### Trial Fix
- **Bug Fix**: Change `setMonth` to `setDate` in `createSubscriber`
- **Migration**: Run script to fix existing trial subscribers
- **Plan Model**: Ensure `trialDays: 90` field exists
