# Google Play Store Data Safety Form - Complete Guide

## 🚨 CRITICAL: Your App WAS REJECTED Due To:

1. **Invalid Data Safety Form** - You selected "No" to data collection, but your app DOES collect data
2. **Missing Prominent Disclosure** - Background location disclosure needs verification
3. **Missing Delete Account URL** - Required field is empty

---

## ✅ STEP 1: Fix Data Collection Question

### Current Status: ❌ WRONG
- You selected: **"No"** - "Does your app collect or share any of the required user data types?"

### Correct Answer: ✅ YES
- **Select: "Yes"** - Your app collects:
  - **Personal Information**: Name, email, phone, address
  - **Location Data**: Foreground AND Background location (for transporters)
  - **Financial Information**: Payment details, subscription history
  - **Device Information**: IP address, device info, usage patterns
  - **Documents**: National ID, driving license, certificates (for drivers/transporters)

---

## ✅ STEP 2: Complete Data Types Section

After selecting "Yes", you'll need to declare each data type:

### 1. Personal Information
- **Name**: ✅ Collected
- **Email**: ✅ Collected
- **Phone**: ✅ Collected
- **Address**: ✅ Collected
- **Purpose**: Account creation, user identification, communication
- **Shared**: ✅ Yes (with verified recruiters for driver profiles)

### 2. Location Data
- **Approximate Location**: ✅ Collected (Foreground)
- **Precise Location**: ✅ Collected (Background - transporters only)
- **Purpose**: 
  - Show position on maps
  - Calculate routes
  - Real-time tracking during active trips
  - Provide delivery ETAs
- **Shared**: ✅ Yes (with clients for active bookings only)
- **Collection**: 
  - Foreground: When app is open
  - Background: Only when actively transporting goods (with explicit consent)

### 3. Financial Information
- **Payment Info**: ✅ Collected
- **Purpose**: Process payments, subscriptions
- **Shared**: ✅ Yes (with payment processors: M-PESA, Paystack)
- **Encrypted**: ✅ Yes (TLS/HTTPS, PCI-compliant)

### 4. Photos & Videos
- **Photos**: ✅ Collected (Profile photos, document photos)
- **Purpose**: User profiles, document verification
- **Shared**: ✅ Yes (with verified recruiters for driver profiles)

### 5. Device Information
- **Device ID**: ✅ Collected
- **IP Address**: ✅ Collected
- **Purpose**: Security, fraud prevention, analytics
- **Shared**: ❌ No (only with trusted service providers)

### 6. App Activity
- **App Interactions**: ✅ Collected
- **Purpose**: Improve platform performance, analytics
- **Shared**: ❌ No

---

## ✅ STEP 3: Data Encryption

**Question**: "Is all of the user data collected by your app encrypted in transit?"
- **Answer**: ✅ **YES**
- **Reason**: All data is encrypted using TLS/HTTPS

---

## ✅ STEP 4: Account Creation Methods

**Question**: "Which of the following methods of account creation does your app support?"
- ✅ **Username and password** (Email + Password)
- ✅ **Username and other authentication** (Phone + OTP)
- ✅ **Username, password and other authentication** (Email/Phone + Password + OTP)

---

## ✅ STEP 5: Delete Account URL ⭐ CRITICAL

**This is the missing field causing your rejection!**

### Option 1: Web Page URL (RECOMMENDED)
**URL**: `https://www.trukafrica.com/delete-account`

**What to do:**
1. Host the `delete-account.html` file (provided below) on your website
2. Upload it to: `www.trukafrica.com/delete-account` or `www.trukafrica.com/delete-account.html`
3. Enter this URL in the Google Play Console

### Option 2: Email Link (QUICK FIX)
**URL**: `mailto:hello@trukafrica.com?subject=Account%20Deletion%20Request`

**Note**: Google prefers web pages, but email links are acceptable.

### Option 3: Support Form URL
If you have a support form, use that URL.

---

## ✅ STEP 6: Prominent Disclosure Verification

### What Google Requires:
1. ✅ **Full-screen modal** - Cannot be dismissed without action
2. ✅ **Shown BEFORE requesting permission** - Must appear before Android permission dialog
3. ✅ **Clear explanation** - States what data is collected and why
4. ✅ **Explicit consent** - User must tap "Accept" or "Decline"
5. ✅ **Privacy Policy link** - Must link to privacy policy

### Verification Checklist:
- [ ] Modal appears when transporter opens app
- [ ] Modal cannot be dismissed by back button
- [ ] Modal explains background location collection
- [ ] Modal appears BEFORE Android permission dialog
- [ ] Privacy Policy link works
- [ ] User can accept or decline

### How to Test:
1. Install app on Android device
2. Login as transporter
3. Verify modal appears immediately
4. Try pressing back button (should not dismiss)
5. Accept consent
6. Verify Android permission dialog appears AFTER modal

---

## ✅ STEP 7: Privacy Policy Updates

Your privacy policy should include:
- ✅ Background location disclosure (already included)
- ✅ Data collection details (already included)
- ✅ Account deletion instructions (already included)
- ✅ Contact information for data requests (already included)

**Privacy Policy URL**: `https://www.trukafrica.com/privacy-policy` or in-app link

---

## 📋 Complete Form Checklist

### Data Collection Section:
- [x] Select "Yes" for data collection
- [ ] Declare Personal Information
- [ ] Declare Location Data (Foreground + Background)
- [ ] Declare Financial Information
- [ ] Declare Photos & Videos
- [ ] Declare Device Information
- [ ] Declare App Activity

### Data Security Section:
- [ ] Select "Yes" for encryption in transit
- [ ] Select account creation methods

### Account Deletion:
- [ ] Enter Delete Account URL: `https://www.trukafrica.com/delete-account`

### Prominent Disclosure:
- [ ] Verify modal appears before permission request
- [ ] Verify modal cannot be dismissed
- [ ] Verify privacy policy link works

---

## 🎯 Quick Fix Summary

1. **Change "No" to "Yes"** for data collection
2. **Declare all data types** your app collects
3. **Add Delete Account URL**: `https://www.trukafrica.com/delete-account`
4. **Verify prominent disclosure** works correctly
5. **Submit updated form**

---

## 📞 Need Help?

If you need assistance:
- Email: hello@trukafrica.com
- Phone: +254 758 594 951

---

**Last Updated**: January 2025
