# iOS IPA Build GraphQL Error Fix

## Issue
iOS IPA builds are failing with:
```
Error: GraphQL request failed.
```

## Root Cause
This is typically a temporary EAS API service issue or network connectivity problem. The GraphQL API endpoint (`https://api.expo.dev/graphql`) is experiencing intermittent failures.

## Solution Implemented

### 1. Added Retry Logic
The build script now automatically retries up to 3 times when a GraphQL error is detected:
- Waits 10 seconds between retries
- Only retries on GraphQL errors (not other errors)
- Provides clear error messages and next steps

### 2. Better Error Detection
The script now:
- Detects GraphQL errors specifically
- Distinguishes between GraphQL errors and other build failures
- Provides actionable troubleshooting steps

## How It Works

When you run `./build.sh` and select option 5 (Build IPA):

1. **First Attempt**: Build starts normally
2. **If GraphQL Error**: 
   - Script detects the error
   - Waits 10 seconds
   - Retries automatically (up to 3 times)
3. **If Success**: Build continues normally
4. **If All Retries Fail**: 
   - Shows clear error message
   - Provides troubleshooting steps
   - Exits with helpful information

## Troubleshooting

If GraphQL errors persist after retries:

### 1. Check EAS Service Status
Visit: https://status.expo.dev
- Check if there are any ongoing incidents
- Look for API/GraphQL service issues

### 2. Check Network Connection
```bash
# Test connectivity to EAS API
curl -I https://api.expo.dev

# Check DNS resolution
nslookup api.expo.dev
```

### 3. Try Building Directly
```bash
cd frontend
eas build --platform ios --profile production
```

### 4. Check Authentication
```bash
cd frontend
eas whoami
# Should show your username
```

### 5. Wait and Retry
GraphQL errors are often temporary. Wait 5-10 minutes and try again.

## Common Causes

1. **Temporary EAS Service Issues**: Most common cause
2. **Network Connectivity**: Firewall, proxy, or DNS issues
3. **Rate Limiting**: Too many requests in short time
4. **Authentication Issues**: Expired or invalid tokens

## Prevention

- The retry logic handles most temporary issues automatically
- Check EAS status before building during known incidents
- Ensure stable network connection
- Don't run multiple builds simultaneously

## Verification

After the fix:
- ✅ Build script automatically retries on GraphQL errors
- ✅ Clear error messages for troubleshooting
- ✅ Distinguishes GraphQL errors from other failures
- ✅ Provides actionable next steps

## Next Steps

1. **Try building again**: The retry logic should handle temporary issues
2. **If it still fails**: Check EAS status and network connectivity
3. **For persistent issues**: Contact EAS support or check GitHub issues
