# Terminal Logging Guide for React Native App

## 🚀 WHERE TO SEE THE LOGS

Since this is a **React Native app** (not a web app), the logs appear in your **terminal/command prompt** where you're running the Metro bundler, NOT in browser dev tools.

### 1. **Start Your App**

```bash
# In your project root directory
npm start
# or
expo start
```

### 2. **Look for Logs in the Terminal**

- Open the terminal where you ran `npm start` or `expo start`
- This is where ALL console.log statements will appear
- Look for logs with `================================================================================` separators

### 3. **What You'll See**

#### **App Startup Logs:**

```
====================================================================================================
🚀 TRUKAPP STARTED - TERMINAL LOGGING ACTIVE
====================================================================================================
✅ App is starting up...
📱 This is a React Native app - logs appear in the Metro terminal
🔍 Look for API request logs with "================================================================================" separators
⏰ App start timestamp: 2025-01-03T17:44:23.710Z
====================================================================================================
```

#### **API Request Logs:**

```
====================================================================================================
🚀 STARTING API REQUEST - TERMINAL LOGGING ACTIVE
====================================================================================================
🔍 DEBUG: Starting API request...
🔍 DEBUG: Full URL will be: https://agritruk-backend.onrender.com/api/transporters/O955xz5IsSdrZxkPyQrVeejYiYy2
🔍 DEBUG: Firebase user: Authenticated
🔍 DEBUG: Firebase token obtained: Success
================================================================================
🚀 TRANSPORTER PROFILE REQUEST FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: https://agritruk-backend.onrender.com/api/transporters/O955xz5IsSdrZxkPyQrVeejYiYy2
📋 Method: GET
⏰ Request Timestamp: 2025-01-03T17:44:23.710Z
🔑 Auth Token Present: YES
🔑 Token Preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
👤 User UID: O955xz5IsSdrZxkPyQrVeejYiYy2
📋 Request Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
📦 Request Body: No body
================================================================================
```

### 4. **Test Logging is Working**

#### **Option 1: Use the Test Button**

1. Run your app
2. Navigate to Transporter Home screen
3. Tap "Test Terminal Logging" button
4. Check your terminal for the test message

#### **Option 2: Use Network Test**

1. Run your app
2. Navigate to Transporter Home screen
3. Use the Network Test component
4. Tap "Test Google" button
5. Check your terminal for network test logs

### 5. **Common Issues**

#### **If you don't see any logs:**

- Make sure you're looking in the correct terminal (where Metro is running)
- Check if the app is actually running
- Try the test buttons to verify logging is working

#### **If logs are too cluttered:**

- Look specifically for logs with `================================================================================` separators
- These are the important API request logs for the backend engineer

### 6. **Sharing Logs with Backend Engineer**

1. **Copy the entire log block** between the separator lines
2. **Include the separators** - they make it easy to identify the log blocks
3. **Share the raw terminal output** - don't format it

#### **Example of what to share:**

```
================================================================================
🚀 LOCATION UPDATE REQUEST FOR BACKEND ENGINEER
================================================================================
📍 Endpoint: https://agritruk-backend.onrender.com/api/transporters/update-location
📋 Method: POST
⏰ Request Timestamp: 2025-01-03T17:44:23.710Z
🔑 Auth Token Present: YES
🔑 Token Preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
👤 User UID: O955xz5IsSdrZxkPyQrVeejYiYy2
📦 Request Body: {
  "latitude": -1.2921,
  "longitude": 36.8219
}
================================================================================
```

### 7. **Log Categories You'll See**

- **🚀 API Requests**: All requests to backend endpoints
- **📊 API Responses**: Backend responses
- **❌ API Errors**: Any request failures
- **🧪 Test Logs**: When you use test buttons
- **🔍 Debug Logs**: Additional debugging information

---

**Remember**: This is a React Native app, so logs appear in your terminal, not in browser dev tools!
