# Google Maps API Troubleshooting Guide

## 🚨 Current Issue: Places API Error

If you're getting "Places API error" despite having the correct API key, follow these steps:

### 🔍 Step 1: Run Diagnostics

1. Open the GoogleMapsTest component in your app
2. Click "🔍 Run Full Diagnostics"
3. Check the console output for specific error details

### 🔧 Step 2: Check Google Cloud Console

#### 2.1 Verify APIs are Enabled

Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Library and ensure these are enabled:

- ✅ **Places API** (most important for location search)
- ✅ **Geocoding API**
- ✅ **Directions API**
- ✅ **Distance Matrix API**

#### 2.2 Check API Key Restrictions

Go to APIs & Services → Credentials → Your API Key:

- **Application restrictions**: Should be set to "Android apps" or "None" for testing
- **API restrictions**: Should include "Places API" or be set to "Don't restrict key"

#### 2.3 Verify Billing

Go to Billing → Account Management:

- ✅ Billing account is active
- ✅ No payment issues
- ✅ Quota not exceeded

### 🧪 Step 3: Test Your API Key

#### 3.1 Test in Browser

Open this URL in your browser (replace YOUR_API_KEY):

```
https://maps.googleapis.com/maps/api/place/textsearch/json?query=Nairobi&key=YOUR_API_KEY
```

**Expected Response:**

```json
{
  "status": "OK",
  "results": [...]
}
```

**If you get "REQUEST_DENIED":**

- Check if Places API is enabled
- Verify API key restrictions
- Ensure billing is set up

#### 3.2 Test with curl

```bash
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Nairobi&key=YOUR_API_KEY"
```

### 🔄 Step 4: Restart and Test

1. **Stop your development server** (Ctrl+C)
2. **Clear Metro cache:**
   ```bash
   npx expo start --clear
   ```
3. **Restart the app**
4. **Test location search again**

### 📱 Step 5: Test in App

1. Open the GoogleMapsTest component
2. Click "🔍 Run Full Diagnostics"
3. Check the results and follow the troubleshooting steps provided

### 🚨 Common Error Codes

| Error Code         | Meaning                       | Solution                                 |
| ------------------ | ----------------------------- | ---------------------------------------- |
| `REQUEST_DENIED`   | API key invalid or restricted | Check API key, restrictions, and billing |
| `OVER_QUERY_LIMIT` | Quota exceeded                | Check billing and usage limits           |
| `INVALID_REQUEST`  | Bad request format            | Check API parameters                     |
| `ZERO_RESULTS`     | No results found              | This is normal, not an error             |

### 📞 Still Having Issues?

If the diagnostics show the API key is working but Places API still fails:

1. **Check API quotas** in Google Cloud Console
2. **Verify your project** is the correct one
3. **Check if you have multiple API keys** and are using the right one
4. **Ensure the API key has no IP restrictions** (for mobile testing)

### 🔑 Quick API Key Test

Test this exact URL in your browser:

```
https://maps.googleapis.com/maps/api/geocode/json?address=Nairobi&key=YOUR_API_KEY
```

If it works, the issue is in the app. If it fails, the issue is in Google Cloud Console configuration.
