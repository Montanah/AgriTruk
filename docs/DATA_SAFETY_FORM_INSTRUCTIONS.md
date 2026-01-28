# Google Play Console - Data Safety Form Step-by-Step Instructions

## 🎯 Quick Start

1. Go to Google Play Console
2. Select your app: **TRUKapp**
3. Navigate to: **Policy** → **App content** → **Data safety**
4. Follow the steps below

---

## Step 1: Data Collection Question

### Location: "Data collection and security" section

**Question**: "Does your app collect or share any of the required user data types?"

**Action**: 
- ✅ **Select "Yes"** (Currently you have "No" selected - THIS IS WRONG)

**Why**: Your app collects:
- Personal information (name, email, phone, address)
- Location data (foreground and background)
- Financial information (payment details)
- Photos (profile photos, documents)
- Device information (IP address, device ID)

---

## Step 2: Declare Data Types

After selecting "Yes", you'll see a list of data types. Declare each one:

### 📍 Location

**Question**: "Does your app collect location data?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **Approximate location**: ✅ Collected
  - Purpose: Show position on maps, calculate routes
  - Shared: ✅ Yes (with clients for active bookings)
  
- **Precise location**: ✅ Collected
  - Purpose: Real-time tracking during active trips, provide delivery ETAs
  - Shared: ✅ Yes (with clients for active bookings only)
  - Collection: Background location (only when actively transporting goods)

**Additional Details:**
- Location is collected in the background for transporters/drivers only
- Requires explicit user consent via prominent disclosure
- Location updates every 10 seconds or when user moves 100 meters
- Users can disable location tracking at any time

---

### 👤 Personal Information

**Question**: "Does your app collect personal information?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **Name**: ✅ Collected
  - Purpose: Account creation, user identification
  - Shared: ✅ Yes (with verified recruiters for driver profiles)
  
- **Email address**: ✅ Collected
  - Purpose: Account creation, communication, authentication
  - Shared: ❌ No
  
- **Phone number**: ✅ Collected
  - Purpose: Account creation, communication, authentication, OTP verification
  - Shared: ✅ Yes (with verified recruiters for driver profiles)
  
- **Address**: ✅ Collected
  - Purpose: Delivery addresses, user location
  - Shared: ❌ No

---

### 💳 Financial Information

**Question**: "Does your app collect financial information?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **Payment information**: ✅ Collected
  - Purpose: Process payments, subscriptions
  - Shared: ✅ Yes (with payment processors: M-PESA, Paystack)
  - Encrypted: ✅ Yes (TLS/HTTPS, PCI-compliant)

---

### 📸 Photos & Videos

**Question**: "Does your app collect photos or videos?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **Photos**: ✅ Collected
  - Purpose: User profiles, document verification (National ID, driving license, certificates)
  - Shared: ✅ Yes (with verified recruiters for driver profiles)

---

### 📱 Device Information

**Question**: "Does your app collect device information?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **Device ID**: ✅ Collected
  - Purpose: Security, fraud prevention
  - Shared: ❌ No
  
- **IP address**: ✅ Collected
  - Purpose: Security, fraud prevention, analytics
  - Shared: ❌ No

---

### 📊 App Activity

**Question**: "Does your app collect app activity?"

**Answer**: ✅ **Yes**

**Details to fill:**
- **App interactions**: ✅ Collected
  - Purpose: Improve platform performance, analytics
  - Shared: ❌ No

---

## Step 3: Data Encryption

**Question**: "Is all of the user data collected by your app encrypted in transit?"

**Answer**: ✅ **Yes**

**Reason**: All data is encrypted using TLS/HTTPS protocols.

---

## Step 4: Account Creation Methods

**Question**: "Which of the following methods of account creation does your app support? Select all that apply."

**Select:**
- ✅ **Username and password** (Email + Password)
- ✅ **Username and other authentication** (Phone + OTP)
- ✅ **Username, password and other authentication** (Email/Phone + Password + OTP)

---

## Step 5: Delete Account URL ⭐ CRITICAL

**Question**: "Add a link that users can use to request that their account and associated data be deleted."

**Action**: 
- Enter URL: `https://www.trukafrica.com/delete-account`

**What this URL should contain:**
- Instructions on how to delete account via app
- Instructions on how to request deletion via email
- Contact information for account deletion requests
- Information about data retention policies

**Note**: 
- If you don't have a website yet, you can use: `mailto:hello@trukafrica.com?subject=Account%20Deletion%20Request`
- However, Google prefers web pages over email links
- The `delete-account.html` file has been created for you - upload it to your website

---

## Step 6: Review and Submit

1. Review all your answers
2. Make sure all data types are declared
3. Verify the Delete Account URL is entered
4. Click **"Save"** or **"Submit"**

---

## ✅ Verification Checklist

Before submitting, verify:

- [ ] Selected "Yes" for data collection
- [ ] Declared Location data (Approximate + Precise)
- [ ] Declared Personal Information (Name, Email, Phone, Address)
- [ ] Declared Financial Information
- [ ] Declared Photos & Videos
- [ ] Declared Device Information
- [ ] Declared App Activity
- [ ] Selected "Yes" for encryption in transit
- [ ] Selected account creation methods
- [ ] Entered Delete Account URL
- [ ] All shared data marked correctly
- [ ] All purposes clearly stated

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Don't select "No" for data collection** - Your app clearly collects data
2. ❌ **Don't forget Background Location** - This is critical for transporters
3. ❌ **Don't leave Delete Account URL empty** - This will cause rejection
4. ❌ **Don't mark everything as "Not shared"** - You share data with clients, recruiters, payment processors
5. ❌ **Don't skip data types** - Declare everything your app collects

---

## 📞 Need Help?

If you encounter issues:
- Email: hello@trukafrica.com
- Phone: +254 758 594 951

---

**Last Updated**: January 2025
