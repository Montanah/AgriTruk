# TRUKAPP AI Agent Instructions

## Project Overview
TRUKAPP is a multi-role logistics marketplace (Expo React Native) connecting shippers, brokers, business users, transporters, and drivers for cargo transportation across Kenya. Backend: Node.js on Render; Frontend: Expo managed app.

## Architecture & Core Patterns

### Role-Based Navigation (Critical)
User routing determined in [App.tsx](../frontend/App.tsx#L279):
- **`shipper`** → MainTabNavigator (instant requests)
- **`business`** → BusinessStackNavigator (consolidation, fleet management)
- **`transporter`** → TransporterTabNavigator (job management; `transporterType` field: 'company' or 'individual')
- **`broker`** → BrokerTabNavigator (client management)
- **`driver`** → DriverTabNavigator (assigned jobs, availability)
- **`job_seeker`** → JobSeekerTabNavigator (recruitment pool)

**Critical Workflow**: Authentication → Role detection → Verification check (email/phone OTP) → Profile completion check → Subscription check → Route to role-appropriate navigator.

### Multi-Transporter Types
`transporter` role supports two types:
- **Company transporters**: Multiple vehicles, fleet dashboard, company driver recruitment
- **Individual transporters**: Single operator (now deprecated in UI, backend still supports)

Check `userData?.transporterType` and `userData?.profileCompleted` in App.tsx routing logic.

### State Management
- **Firebase Auth**: Primary authentication (ID tokens for API calls)
- **Local Context** (Redux in package.json but not actively used):
  - [ConsolidationContext](../frontend/src/context/ConsolidationContext.tsx) for business consolidation flows
- **AsyncStorage**: Draft data persistence (e.g., `transporter_draft_${user.uid}`)

### API Communication
[API_ENDPOINTS](../frontend/src/constants/api.ts) centralized; all requests use [apiRequest()](../frontend/src/utils/api.ts):
- Automatically attaches Firebase ID token
- Retry mechanism with exponential backoff (default 3 attempts)
- Base URL: `https://agritruk.onrender.com` (production) or `EXPO_PUBLIC_API_URL` env var

**Key endpoints**:
- `/api/auth` - Sign up, login, verification
- `/api/bookings` - Create/manage bookings
- `/api/requests` - Instant/service requests
- `/api/transporters`, `/api/drivers`, `/api/job-seekers` - Role-specific operations
- `/api/chats` - WebSocket + REST for messaging

### Services Layer Pattern
Located in [src/services/](../frontend/src/services/), each service is a singleton class:
- `subscriptionService` - Plan validation, trial tracking
- `bookingSyncService`, `unifiedBookingService` - Booking lifecycle
- `realtimeChatService` - Socket.io + REST messaging
- `locationService` - Background location (Google Play compliance)
- `mpesaPaymentService` - M-Pesa integration

**Pattern**: Services expose static methods + internal state; screen components call `service.method()` directly.

### Navigation Conventions
- **Tab Navigators**: Role-specific dashboard entry points (5 tabs typical)
- **Stack Navigators**: Modal flows stacked on tabs (e.g., SubscriptionScreen, PaymentScreen)
- **Dynamic Routing**: `initialRouteName` changed in App.tsx based on auth state

## Project-Specific Conventions

### Build & Release
- **Monorepo structure**: Root `/frontend` (app code) + `/backend` (Node.js, only node_modules present)
- **Build command**: `cd frontend && ./build.sh` provides interactive menu for APK/AAB/IPA via EAS or local builds
- **EAS Profiles** (in [eas.json](../frontend/eas.json)):
  - `development` → APK for internal testing
  - `production` → AAB for Play Store
  - `appstore` → iOS release
- **Environment variables**: Loaded from EAS secrets; see [firebaseConfig.ts](../frontend/src/firebaseConfig.ts#L7) for pattern

### Google Play Compliance Critical
- **Background Location Disclosure**: [Global modal](../frontend/App.tsx#L292) shown once per role to all drivers/company transporters
  - Set `showGlobalBackgroundLocationDisclosure = true` after role detection
  - User must accept before navigation proceeds
  - Files: [PLAYSTORE_DISCLOSURE_IMPLEMENTATION.md](../PLAYSTORE_DISCLOSURE_IMPLEMENTATION.md), [BACKGROUND_LOCATION_DISCLOSURE_VERIFICATION.md](../BACKGROUND_LOCATION_DISCLOSURE_VERIFICATION.md)

### Subscription Model
- **Trial period**: 7 days, triggers [SubscriptionTrialScreen](../frontend/src/screens/SubscriptionTrialScreen.tsx)
- **Expired routing**: [SubscriptionExpiredScreen](../frontend/src/screens/SubscriptionExpiredScreen.tsx)
- **Plans**: [subscriptionPlans.ts](../frontend/src/constants/subscriptionPlans.ts) (INDIVIDUAL_PLANS, COMPANY_FLEET_PLANS)
- **Validation**: Check `subscriptionStatus?.subscriptionStatus` ('active'|'expired'|'trial') in routing

### Key Files for Different Tasks

| Task | Primary File(s) |
|------|-----------------|
| Add new role | [App.tsx](../frontend/App.tsx) routing + new Tab Navigator |
| New API endpoint | Add to [api.ts](../frontend/src/constants/api.ts), then call via `apiRequest()` |
| Background location | [locationService.ts](../frontend/src/services/locationService.ts) |
| Real-time messaging | [realtimeChatService.ts](../frontend/src/services/realtimeChatService.ts) (Socket.io) |
| Document uploads | [TransporterCompletionScreen.tsx](../frontend/src/screens/auth/TransporterCompletionScreen.tsx) pattern; backend handles Cloudinary |
| Subscription flow | [subscriptionService.ts](../frontend/src/services/subscriptionService.ts), [SubscriptionScreen.tsx](../frontend/src/screens/SubscriptionScreen.tsx) |
| Payment (M-Pesa) | [mpesaPaymentService.ts](../frontend/src/services/mpesaPaymentService.ts) |

## Common Developer Workflows

### Running Locally
```bash
cd frontend
npx expo start
# Scan QR code with Expo Go app, or press 'a' for Android emulator
```

### Testing New Feature on Real Device
```bash
cd frontend
./build.sh apk-eas  # Builds APK via EAS, distributes via internal link
# Or for faster local testing:
npx expo run:android  # Requires Android SDK
```

### Debugging API Issues
1. Check [src/utils/api.ts](../frontend/src/utils/api.ts#L62) `apiRequest()` logs (Firebase token, retry attempts)
2. Verify `EXPO_PUBLIC_API_URL` env var points to correct backend (default: agritruk.onrender.com)
3. Inspect backend health: `GET /api/health`

### Modifying Auth Flow
- Firebase Auth configuration: [firebaseConfig.ts](../frontend/src/firebaseConfig.ts)
- Phone OTP: [PhoneOTPScreen.tsx](../frontend/src/screens/auth/PhoneOTPScreen.tsx)
- Email verification: [EmailVerificationScreen.tsx](../frontend/src/screens/auth/EmailVerificationScreen.tsx)
- Profile completion: [TransporterCompletionScreen.tsx](../frontend/src/screens/auth/TransporterCompletionScreen.tsx) (transport-specific)

## Debugging Tips

- **App.tsx routing not firing**: Check `userData` is loaded (state in App.tsx L279); set breakpoint at role check
- **API calls failing silently**: Inspect Firebase token in [apiRequest()](../frontend/src/utils/api.ts#L62); check network tab
- **Subscription screen loops**: Verify `subscriptionStatus` object has all required fields; check `subscriptionValidationService`
- **Navigation state issues**: Use React Navigation DevTools (LogBox suppressed in App.tsx, search for `LogBox.ignoreLogs`)

## Patterns to Avoid

❌ **Don't**: Make API calls directly in components; create a service  
❌ **Don't**: Store auth tokens in AsyncStorage (use Firebase); only store non-sensitive drafts  
❌ **Don't**: Add new roles without updating App.tsx routing + navigation navigator  
❌ **Don't**: Bypass `apiRequest()` utility (won't include Firebase token)  

## Key Documentation Files

- [COMPREHENSIVE_API_DOCUMENTATION.md](../COMPREHENSIVE_API_DOCUMENTATION.md) — All API endpoints, data models
- [CI_CD_WORKFLOW.md](../CI_CD_WORKFLOW.md) — Build profiles, EAS setup, release process
- [PLAYSTORE_COMPLIANCE_COMPLETE_SUMMARY.md](../PLAYSTORE_COMPLIANCE_COMPLETE_SUMMARY.md) — Legal/compliance requirements
