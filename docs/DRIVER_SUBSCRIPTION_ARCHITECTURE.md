# Driver Subscription Architecture

**Date:** February 10, 2026  
**Status:** ✅ DOCUMENTED

---

## Overview

In TRUKapp, **drivers do NOT manage their own subscriptions**. Instead, drivers are covered under their parent company's subscription plan. This is a fleet management model where:

- **Company** = Fleet owner/manager (has subscription)
- **Driver** = Employee of the company (covered by company's subscription)

---

## Architecture

### Subscription Hierarchy

```
Company (Transporter)
├── Subscription Plan (e.g., Fleet Pro - 10 drivers, 15 vehicles)
│   ├── Trial: 90 days free
│   ├── Basic: 5 drivers, 5 vehicles
│   ├── Pro: 10 drivers, 15 vehicles
│   └── Enterprise: Unlimited drivers & vehicles
│
├── Driver 1 (covered by company subscription)
├── Driver 2 (covered by company subscription)
├── Driver 3 (covered by company subscription)
└── ...
```

### Key Principles

1. **Company Pays** - Only the company has a subscription and pays for it
2. **Drivers Are Free** - Drivers don't pay anything; they're employees
3. **Plan Limits** - Company subscription determines how many drivers can be added
4. **Shared Access** - All drivers under a company share the company's subscription benefits

---

## Implementation Details

### 1. Driver Creation

When a company adds a driver:

**Backend (`companyController.js`):**
```javascript
exports.createDriver = async (req, res) => {
  const companyId = req.params.companyId;
  
  // Check if company exists and is approved
  const company = await Company.get(companyId);
  if (company.status !== "approved") {
    return res.status(400).json({ message: "Company is not approved" });
  }
  
  // Create driver (no subscription check here - handled by middleware)
  const driver = await Driver.create(companyId, driverData);
  
  // Auto-activate trial subscription for driver
  const hasUsedTrial = await Subscribers.hasUsedTrial(userId);
  if (!hasUsedTrial) {
    const trialPlan = await SubscriptionPlans.getTrialPlan();
    await Subscribers.create({
      userId,
      planId: trialPlan.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
      status: "active",
    });
  }
};
```

**Middleware (`subscriptionMiddleware.js`):**
```javascript
exports.validateDriverAddition = async (req, res, next) => {
  const companyId = req.params.companyId;
  
  // Get company's subscription status
  const subscription = await getCompanySubscription(companyId);
  
  // Check if company can add more drivers
  const currentDriverCount = await Driver.countByCompany(companyId);
  const driverLimit = subscription.plan.limits.drivers;
  
  if (driverLimit !== -1 && currentDriverCount >= driverLimit) {
    return res.status(403).json({
      message: "Driver limit reached for your subscription plan",
      currentCount: currentDriverCount,
      limit: driverLimit,
    });
  }
  
  next();
};
```

### 2. Driver Access to Jobs

When a driver views available jobs:

**Frontend (`AllAvailableJobsScreen.tsx`):**
```typescript
// Drivers use /available endpoint which checks company subscription
const isDriver = await checkIfDriver(userId);
if (isDriver) {
  endpoint = `${API_ENDPOINTS.BOOKINGS}/available`;
  console.log('Driver detected - using /available endpoint (checks company subscription)');
}
```

**Backend (`bookingRoutes.js`):**
```javascript
// Driver endpoint - checks company subscription
router.get('/available', 
  authenticateToken, 
  requireRole('driver'), 
  requireActiveSubscription, // Checks company's subscription
  bookingController.getAllAvailableBookings
);
```

### 3. Subscription Validation

**Service (`subscriptionValidationService.ts`):**
```typescript
export class SubscriptionValidationService {
  /**
   * Validates if a company can add a new driver based on their subscription plan
   */
  public validateDriverAddition(
    subscription: CompanySubscription,
    additionalDrivers: number = 1
  ): ValidationResult {
    const { plan, currentDriverCount } = subscription;
    
    const canAdd = canAddDriver(plan, currentDriverCount + additionalDrivers - 1);
    
    if (!canAdd) {
      return {
        isValid: false,
        message: `Driver limit reached. Your ${plan.name} plan allows ${plan.limits.drivers} drivers.`,
        currentCount: currentDriverCount,
        limit: plan.limits.drivers,
      };
    }
    
    return { isValid: true };
  }
}
```

---

## User Flows

### Company Flow

1. **Sign Up** as company transporter
2. **Complete Profile** (name, contact, logo)
3. **Admin Approves** company
4. **Auto-Activate Trial** (90 days, e.g., 5 drivers, 5 vehicles)
5. **Add Drivers** (up to plan limit)
6. **Upgrade Plan** if need more drivers/vehicles
7. **Manage Subscription** (renew, upgrade, cancel)

### Driver Flow

1. **Company Creates Driver** account
2. **Driver Receives Email** with credentials
3. **Driver Logs In** (no subscription needed)
4. **Driver Accesses Dashboard** (covered by company subscription)
5. **Driver Views Jobs** (filtered by company subscription)
6. **Driver Accepts Jobs** (no subscription check)
7. **Driver Completes Trips** (tracked under company)

---

## Subscription Plans

### Trial Plan (90 days)
- **Drivers:** 5
- **Vehicles:** 5
- **Cost:** Free
- **Auto-activated** after company approval

### Basic Plan
- **Drivers:** 5
- **Vehicles:** 5
- **Cost:** $X/month
- **Features:** Basic fleet management

### Pro Plan
- **Drivers:** 10
- **Vehicles:** 15
- **Cost:** $Y/month
- **Features:** Advanced fleet management

### Enterprise Plan
- **Drivers:** Unlimited
- **Vehicles:** Unlimited
- **Cost:** $Z/month
- **Features:** Full fleet management + priority support

---

## Database Schema

### Companies Collection
```javascript
{
  id: "company123",
  name: "ABC Transport Ltd",
  registration: "REG123456",
  status: "approved",
  subscriptionId: "sub_abc123",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Drivers Collection
```javascript
{
  id: "driver123",
  companyId: "company123", // Links to parent company
  name: "John Doe",
  email: "john@example.com",
  phone: "+254712345678",
  status: "approved",
  createdAt: Timestamp,
  updatedAt: Timestamp
  // NO subscriptionId - uses company's subscription
}
```

### Subscriptions Collection
```javascript
{
  id: "sub_abc123",
  userId: "company123", // Company ID, NOT driver ID
  planId: "plan_pro",
  startDate: Timestamp,
  endDate: Timestamp,
  isActive: true,
  status: "active",
  currentDriverCount: 3, // Tracked automatically
  currentVehicleCount: 5, // Tracked automatically
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## API Endpoints

### Company Endpoints (Require Company Subscription)

```javascript
// Add driver (checks company subscription)
POST /api/companies/:companyId/drivers
Middleware: authenticateToken, requireRole('transporter'), validateDriverAddition

// Get drivers (checks company subscription)
GET /api/companies/:companyId/drivers
Middleware: authenticateToken, requireRole('transporter'), requireActiveSubscription

// Add vehicle (checks company subscription)
POST /api/companies/:companyId/vehicles
Middleware: authenticateToken, requireRole('transporter'), validateVehicleAddition
```

### Driver Endpoints (Use Company Subscription)

```javascript
// Get available jobs (checks company subscription)
GET /api/bookings/available
Middleware: authenticateToken, requireRole('driver'), requireActiveSubscription

// Accept job (checks company subscription)
POST /api/bookings/:bookingId/accept
Middleware: authenticateToken, requireRole('driver'), requireActiveSubscription

// Update location (checks company subscription)
PATCH /api/companies/:companyId/updateRoute
Middleware: authenticateToken, requireRole('driver'), requireActiveSubscription
```

---

## Validation Logic

### When Adding a Driver

```javascript
// 1. Check company exists and is approved
const company = await Company.get(companyId);
if (company.status !== "approved") {
  throw new Error("Company not approved");
}

// 2. Get company's subscription
const subscription = await Subscription.getByUserId(companyId);
if (!subscription || !subscription.isActive) {
  throw new Error("No active subscription");
}

// 3. Check driver limit
const currentDriverCount = await Driver.countByCompany(companyId);
const driverLimit = subscription.plan.limits.drivers;

if (driverLimit !== -1 && currentDriverCount >= driverLimit) {
  throw new Error(`Driver limit reached (${driverLimit})`);
}

// 4. Create driver
const driver = await Driver.create(companyId, driverData);
```

### When Driver Accesses Jobs

```javascript
// 1. Verify driver exists and is approved
const driver = await Driver.get(driverId);
if (driver.status !== "approved") {
  throw new Error("Driver not approved");
}

// 2. Get company's subscription (NOT driver's)
const subscription = await Subscription.getByUserId(driver.companyId);
if (!subscription || !subscription.isActive) {
  throw new Error("Company subscription inactive");
}

// 3. Allow access to jobs
const jobs = await Booking.getAvailableForCompany(driver.companyId);
```

---

## Frontend Components

### Company Dashboard
- Shows subscription status
- Shows driver count vs limit
- Shows vehicle count vs limit
- Allows adding drivers (if under limit)
- Allows upgrading plan

### Driver Dashboard
- Shows company name
- Shows available jobs (filtered by company subscription)
- NO subscription management (managed by company)
- NO payment options (company pays)

---

## Important Notes

1. **Drivers Never Pay** - All subscription costs are borne by the company
2. **Company Controls Access** - Company can add/remove drivers based on their plan
3. **Shared Limits** - All drivers share the company's subscription limits
4. **No Individual Trials** - Drivers don't get individual trials; they use company's subscription
5. **Automatic Tracking** - System automatically tracks driver/vehicle counts per company

---

## Summary

The driver subscription architecture follows a **fleet management model** where:

✅ **Companies** have subscriptions and pay for them  
✅ **Drivers** are employees covered by company subscription  
✅ **Plan limits** determine how many drivers a company can add  
✅ **Validation** happens at company level, not driver level  
✅ **Access control** is based on company's subscription status  

This architecture ensures:
- Simple billing (only companies pay)
- Clear hierarchy (company → drivers)
- Easy management (company controls everything)
- Scalable pricing (pay per driver/vehicle)

---

**This architecture is already correctly implemented in the codebase!** ✅
