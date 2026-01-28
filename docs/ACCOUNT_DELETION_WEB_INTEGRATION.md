# Account Deletion Web Integration

## Overview

The account deletion flow has been updated to redirect users to a web page (`https://trukafrica.com/delete-account`) instead of calling the API directly. This aligns with Google Play Store requirements for account deletion.

## Implementation

### Flow

1. **User clicks "Delete Account"** → Modal appears asking for reason
2. **User provides reason and confirms** → App generates authentication parameters
3. **App redirects to web page** with the following URL parameters:
   - `token`: Firebase Auth token (JWT)
   - `uid`: User's Firebase UID
   - `email`: User's email address
   - `ts`: Current Unix timestamp in seconds

### URL Format

```
https://trukafrica.com/delete-account?token=AUTH_TOKEN&uid=USER_UID&email=user@email.com&ts=1736345600
```

### Web Page Validation

The web page (`https://trukafrica.com/delete-account`) validates:
- Timestamp (`ts`) must be within 10 minutes (600 seconds)
- If expired, shows error message
- If valid, shows "Authenticated via TRUK App" and allows user to complete deletion form

## Files Updated

### 1. `frontend/src/screens/AccountScreen.tsx`
- Added `Linking` import
- Updated `handleDeleteAccount` to build URL and redirect to web page

### 2. `frontend/src/screens/BrokerProfileScreen.tsx`
- Added `Linking` import
- Updated `handleDeleteAccount` to build URL and redirect to web page

### 3. `frontend/src/screens/ManageTransporterScreen.tsx`
- Added `Linking` import
- Updated `handleDeleteAccount` to build URL and redirect to web page

### 4. `frontend/src/screens/DriverProfileScreen.tsx`
- Added `Linking` import
- Updated `handleDeleteAccount` to build URL and redirect to web page

### 5. `frontend/src/screens/business/BusinessProfileScreen.tsx`
- Added `Linking` import
- Updated `handleDeleteAccount` to build URL and redirect to web page

## Code Pattern

All `handleDeleteAccount` functions now follow this pattern:

```typescript
const handleDeleteAccount = async (reason: string) => {
  const user = auth.currentUser;
  if (!user?.uid) {
    Alert.alert('Error', 'User not authenticated.');
    return;
  }

  setDeletingAccount(true);
  try {
    // Get auth token
    const token = await user.getIdToken();
    
    // Get user email
    const email = user.email || '';
    if (!email) {
      Alert.alert('Error', 'Email address not found. Please ensure your account has an email.');
      setDeletingAccount(false);
      return;
    }

    // Generate Unix timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000);

    // Build URL with required parameters
    const deleteAccountUrl = `https://trukafrica.com/delete-account?token=${encodeURIComponent(token)}&uid=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(email)}&ts=${timestamp}`;

    console.log('Redirecting to delete account page:', deleteAccountUrl);

    // Close modal first
    setShowDeleteAccountModal(false);
    setDeletingAccount(false);

    // Open web page in browser
    const canOpen = await Linking.canOpenURL(deleteAccountUrl);
    if (canOpen) {
      await Linking.openURL(deleteAccountUrl);
    } else {
      Alert.alert(
        'Error',
        'Unable to open delete account page. Please try again or contact support.'
      );
    }
  } catch (error: any) {
    console.error('Delete account error:', error);
    Alert.alert(
      'Delete Account Failed',
      error.message || 'Failed to open delete account page. Please try again or contact support.'
    );
    setDeletingAccount(false);
  }
};
```

## Google Play Store Compliance

This implementation meets Google Play Store requirements:

✅ **Account deletion available outside the app**: Users can delete their account via the web page  
✅ **Readily discoverable**: "Delete Account" button is visible in all profile screens  
✅ **Web resource URL**: `https://trukafrica.com/delete-account` can be entered in Google Play Console  

## Testing

To test the implementation:

1. **Open any profile screen** (Account, Broker, Transporter, Driver, Business)
2. **Click "Delete Account"** button
3. **Enter reason** (minimum 10 characters)
4. **Click "Delete Account"** in modal
5. **Verify browser opens** with URL containing:
   - `token` parameter (JWT token)
   - `uid` parameter (Firebase UID)
   - `email` parameter (user email)
   - `ts` parameter (Unix timestamp)
6. **Verify web page** validates timestamp and shows authentication status

## Security Notes

- **Token expiration**: Tokens are valid for 1 hour by default (Firebase Auth)
- **Timestamp validation**: Web page validates timestamp is within 10 minutes
- **URL encoding**: All parameters are properly URL-encoded
- **Error handling**: App handles errors gracefully if browser cannot open URL

## Next Steps

1. ✅ Update all profile screens to redirect to web page
2. ✅ Add proper error handling
3. ✅ Add URL encoding for parameters
4. ⏳ Test on Android device
5. ⏳ Test on iOS device
6. ⏳ Verify web page integration works correctly
7. ⏳ Add URL to Google Play Console Data Safety form

---

**Last Updated**: January 2025  
**Status**: ✅ Implementation Complete
