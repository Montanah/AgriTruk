#!/bin/bash

# TRUKAPP Unified Build Script
# This script provides interactive options for building APK, AAB, and IPA files
# All operations work from the root directory

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check if we're in the right directory
check_directory() {
    if [ ! -d "frontend" ] || [ ! -f "frontend/package.json" ]; then
        print_error "Please run this script from the TRUKAPP root directory"
        print_error "Current directory: $(pwd)"
        print_error "Expected to find: frontend/package.json"
        exit 1
    fi
}

# Function to get the EAS command to use
get_eas_cmd() {
    if command -v eas >/dev/null 2>&1; then
        echo "eas"
    elif command -v npx >/dev/null 2>&1; then
        echo "npx eas-cli@latest"
    else
        print_error "Neither 'eas' nor 'npx' found. Please install eas-cli: npm install -g eas-cli"
        exit 1
    fi
}

# Function to check EAS login
check_eas_login() {
    print_status "Checking EAS login status..."
    
    # Determine which eas command to use
    local eas_cmd=$(get_eas_cmd)
    print_status "Using EAS command: $eas_cmd"
    
    # Change to frontend directory first
    cd frontend
    
    # Try to get current user with timeout
    local whoami_output
    local whoami_exit_code
    
    # Use a more aggressive timeout approach
    if command -v timeout >/dev/null 2>&1; then
        # Use timeout with kill signal after 10 seconds
        whoami_output=$(timeout -k 5 10 $eas_cmd whoami 2>&1 || echo "TIMEOUT_OR_ERROR")
        whoami_exit_code=$?
    else
        # Fallback: try to use a background process with timeout simulation
        local temp_file=$(mktemp)
        ($eas_cmd whoami > "$temp_file" 2>&1) &
        local pid=$!
        local count=0
        while [ $count -lt 10 ]; do
            if ! kill -0 $pid 2>/dev/null; then
                # Process finished
                break
            fi
            sleep 1
            count=$((count + 1))
        done
        if kill -0 $pid 2>/dev/null; then
            # Still running, kill it
            kill $pid 2>/dev/null
            whoami_output="TIMEOUT_OR_ERROR"
            whoami_exit_code=124
        else
            whoami_output=$(cat "$temp_file" 2>/dev/null || echo "ERROR")
            whoami_exit_code=$?
            rm -f "$temp_file"
        fi
    fi
    
    # Go back to root directory
    cd ..
    
    # If timeout or failed, try once more with shorter timeout
    if [ $whoami_exit_code -ne 0 ] || [ -z "$whoami_output" ] || [ "$whoami_output" = "TIMEOUT_OR_ERROR" ]; then
        print_warning "First login check failed or timed out, retrying..."
        sleep 2
        cd frontend
        if command -v timeout >/dev/null 2>&1; then
            whoami_output=$(timeout -k 3 8 $eas_cmd whoami 2>&1 || echo "TIMEOUT_OR_ERROR")
            whoami_exit_code=$?
        else
            # Quick retry without timeout
            whoami_output=$($eas_cmd whoami 2>&1 | head -20 || echo "ERROR")
            whoami_exit_code=$?
        fi
        cd ..
    fi
    
    # Check for timeout first
    if [ "$whoami_output" = "TIMEOUT_OR_ERROR" ] || [ $whoami_exit_code -eq 124 ]; then
        print_warning "EAS login check timed out after multiple attempts."
        print_warning "This may be due to network issues or EAS service problems."
        print_status "Proceeding with build - EAS will handle authentication during build."
        print_status "If build fails due to authentication, run: cd frontend && eas login"
        return 0  # Don't exit, allow build to proceed
    fi
    
    # Check for network/DNS errors first
    if echo "$whoami_output" | grep -qi "getaddrinfo EAI_AGAIN\|ECONNREFUSED\|ETIMEDOUT\|DNS\|network\|connection refused"; then
        print_error "Network/DNS error detected when checking EAS login status."
        print_error "Error: $whoami_output"
        print_error "Cannot connect to api.expo.dev. Please check:"
        print_status "  1. Your internet connection"
        print_status "  2. DNS settings (try: nslookup api.expo.dev)"
        print_status "  3. Firewall/proxy settings"
        print_status "  4. Try: ping api.expo.dev"
        print_error "Build cannot proceed without network connectivity."
        exit 1
    fi
    
    # Check if we got a valid username (non-empty and not an error message)
    if [ $whoami_exit_code -ne 0 ] || [ -z "$whoami_output" ] || echo "$whoami_output" | grep -qi "error\|not logged\|unauthorized\|Please log in"; then
        print_error "Not logged in to EAS or connection failed."
        print_status "Output: $whoami_output"
        print_status "Attempting automatic login..."
        
        cd frontend
        # Try to login automatically (this will prompt if needed, but we'll handle it)
        local login_output
        login_output=$($eas_cmd login --non-interactive 2>&1 || echo "LOGIN_FAILED")
        cd ..
        
        if echo "$login_output" | grep -qi "successfully\|already logged\|logged in"; then
            print_success "Successfully logged in to EAS"
            # Get username after login
            cd frontend
            local current_user=$($eas_cmd whoami 2>/dev/null | head -n1 | tr -d '\n\r' || echo "")
            cd ..
            if [ -n "$current_user" ] && [ "$current_user" != "" ]; then
                print_success "Logged in as: $current_user"
            fi
        else
            print_warning "Automatic login failed or requires interactive input."
            print_status "You may already be logged in. Proceeding with build..."
            print_status "If build fails, run manually: cd frontend && eas login"
            # Don't exit - allow build to proceed
        fi
    else
        # Successfully got username - extract it from output
        # Output format: version warnings, then "username", then "Accounts:" section
        # Filter out version warnings and empty lines, get the username line
        local current_user=$(echo "$whoami_output" | \
            grep -v "^★" | \
            grep -v "^eas-cli@" | \
            grep -v "^To upgrade" | \
            grep -v "^Proceeding" | \
            grep -v "^Accounts:" | \
            grep -v "^$" | \
            head -n1 | \
            tr -d '\n\r' | \
            awk '{print $1}')
        
        # Clean up the username
        current_user=$(echo "$current_user" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
        
        if [ -n "$current_user" ] && [ "$current_user" != "" ] && [ "$current_user" != "whoami" ] && [ "$current_user" != "eas-cli" ]; then
            print_success "Logged in to EAS as: $current_user"
            # Show accounts if available
            cd frontend
            local accounts_output=$($eas_cmd whoami 2>/dev/null || echo "")
            cd ..
            if echo "$accounts_output" | grep -qE "^•|^Accounts:"; then
                echo "$accounts_output" | grep -E "^•|^Accounts:" || true
            fi
        else
            # If we can't parse username but command succeeded, assume we're logged in
            print_success "EAS login check passed ✓"
            print_status "Login verified (username parsing skipped)"
        fi
    fi
}

# Function to clean up project
clean_project() {
    print_status "Cleaning up project..."
    
    # Remove APK/AAB files from root
    find . -maxdepth 1 -name "*.apk" -type f -delete 2>/dev/null || true
    find . -maxdepth 1 -name "*.aab" -type f -delete 2>/dev/null || true
    
    # Remove Android directory
    rm -rf frontend/android 2>/dev/null || true
    
    # Remove backup files
    rm -f frontend/App-*.tsx frontend/.env.backup 2>/dev/null || true
    rm -f frontend/screenshot*.png 2>/dev/null || true
    
    # Remove build artifacts
    rm -rf frontend/build frontend/dist frontend/.gradle 2>/dev/null || true
    rm -rf frontend/.expo 2>/dev/null || true
    rm -rf frontend/node_modules/.cache 2>/dev/null || true
    rm -f frontend/bundletool.jar 2>/dev/null || true
    
    print_success "Project cleaned up"
}

# Function to install dependencies
install_deps() {
    print_status "Installing dependencies..."
    cd frontend
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install
    cd ..
    print_success "Dependencies installed"
}

# Function to clean up development dependencies
cleanup_dev_deps() {
    print_status "Cleaning up development dependencies..."
    cd frontend
    npm uninstall expo-dev-client expo-dev-launcher expo-dev-menu expo-dev-menu-interface 2>/dev/null || true
    npm install
    cd ..
    print_success "Development dependencies cleaned up"
}

# Function to verify critical iOS Info.plist settings
verify_ios_info_plist_settings() {
    print_status "Verifying critical iOS Info.plist settings in app.config.js..."
    
    local config_file="frontend/app.config.js"
    
    if [ ! -f "$config_file" ]; then
        print_error "app.config.js not found at $config_file"
        return 1
    fi
    
    local missing_settings=()
    
    # Critical settings that prevent crashes
    local critical_settings=(
        "CADisableMinimumFrameDurationOnPhone"
        "GMSApiKey"
        "NSLocationWhenInUseUsageDescription"
        "NSCameraUsageDescription"
        "NSPhotoLibraryUsageDescription"
    )
    
    for setting in "${critical_settings[@]}"; do
        if ! grep -q "$setting" "$config_file" 2>/dev/null; then
            missing_settings+=("$setting")
        fi
    done
    
    if [ ${#missing_settings[@]} -gt 0 ]; then
        print_error "Missing critical iOS Info.plist settings:"
        for setting in "${missing_settings[@]}"; do
            print_error "  - $setting"
        done
        print_error "This may cause iOS crashes. Please ensure app.config.js includes all required settings."
        return 1
    fi
    
    # Verify CADisableMinimumFrameDurationOnPhone is set to true
    if ! grep -q "CADisableMinimumFrameDurationOnPhone.*true" "$config_file" 2>/dev/null; then
        print_warning "CADisableMinimumFrameDurationOnPhone may not be set to true"
        print_warning "This setting is critical to prevent iOS crashes"
        return 1
    fi
    
    print_success "All critical iOS Info.plist settings verified ✓"
    return 0
}

# Function to update app config for production
update_app_config_for_production() {
    print_status "Updating app configuration for production builds..."
    
    cat > frontend/app.config.js << 'EOF'
module.exports = {
  expo: {
    name: "TRUKapp",
    slug: "TRUKapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "trukapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.truk.trukapp",
      supportsTablet: true,
      icon: "./assets/images/ios-icon-1024.png",
      config: {
        googleMapsApiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4"
      },
      infoPlist: {
        // ============================================
        // CRITICAL iOS Info.plist SETTINGS - EXPLICITLY ENFORCED
        // These settings are REQUIRED to prevent iOS crashes
        // DO NOT REMOVE OR MODIFY WITHOUT TESTING
        // ============================================
        
        // Performance fix to prevent crashes - CRITICAL
        CADisableMinimumFrameDurationOnPhone: true,
        
        // Google Maps API Key - REQUIRED for map functionality
        GMSApiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
        
        // Encryption declaration - REQUIRED for App Store submission
        ITSAppUsesNonExemptEncryption: false,
        
        // Minimum iOS version - REQUIRED
        LSMinimumSystemVersion: "12.0",
        
        // App Transport Security settings - REQUIRED for network requests
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true
        },
        
        // Location permissions - REQUIRED for location features
        NSLocationAlwaysAndWhenInUseUsageDescription: "Allow TRUKapp to use your location to show your position on the map and calculate routes.",
        NSLocationAlwaysUsageDescription: "Allow TRUKapp to access your location",
        NSLocationWhenInUseUsageDescription: "This app needs access to location to show your position on the map and calculate routes.",
        
        // Camera permission - REQUIRED for camera features
        NSCameraUsageDescription: "Allow TRUKapp to use your camera to capture relevant images.",
        
        // Photo library permission - REQUIRED for photo uploads
        NSPhotoLibraryUsageDescription: "Allow TRUKapp to upload images from your photo library",
        
        // URL schemes for deep linking - REQUIRED for app links
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "trukapp",
              "com.truk.trukapp"
            ]
          }
        ],
        
        // Launch screen - REQUIRED
        UILaunchStoryboardName: "SplashScreen",
        
        // UI settings - REQUIRED for proper display
        UIRequiresFullScreen: false,
        UIStatusBarStyle: "UIStatusBarStyleDefault",
        UIUserInterfaceStyle: "Automatic",
        UIViewControllerBasedStatusBarAppearance: false,
        
        // Supported orientations - REQUIRED
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ]
        
        // ============================================
        // END OF CRITICAL iOS Info.plist SETTINGS
        // ============================================
      }
    },
    android: {
      package: "com.truk.trukapp",
      icon: "./assets/images/android-icon-512.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon-foreground.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      config: {
        googleMaps: {
          apiKey: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4"
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "*.trukapp.com"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-document-picker",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow TRUKapp to use your location to show your position on the map and calculate routes."
        }
      ],
      "expo-asset",
      "expo-font",
      "expo-maps",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "24d1984c-eb71-4672-bace-c6a0ddeb648b"
      },
      // Environment variables
      EXPO_PUBLIC_API_URL: "https://agritruk.onrender.com",
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSyCXdOCFJZUxcJMDn7Alip-JfIgOrHpT_Q4",
      EXPO_PUBLIC_FIREBASE_API_KEY: "AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "agritruk-d543b.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "agritruk-d543b",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "agritruk-d543b.firebasestorage.app",
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "86814869135",
      EXPO_PUBLIC_FIREBASE_APP_ID: "1:86814869135:web:49d6806e9b9917eb6e92fa",
    }
  }
};
EOF
    
    print_success "App configuration updated for production builds"
    
    # CRITICAL: Verify iOS Info.plist settings are explicitly enforced
    print_status "Verifying iOS Info.plist settings are explicitly enforced..."
    if ! verify_ios_info_plist_settings; then
        print_error "CRITICAL: iOS Info.plist settings verification failed!"
        print_error "The build will ABORT to prevent iOS crashes."
        print_error "Please check app.config.js and ensure all required settings are present."
        exit 1
    fi
    
    # Double-check that CADisableMinimumFrameDurationOnPhone is explicitly set
    if ! grep -q "CADisableMinimumFrameDurationOnPhone.*true" frontend/app.config.js 2>/dev/null; then
        print_error "CRITICAL: CADisableMinimumFrameDurationOnPhone is not set to true!"
        print_error "This will cause iOS crashes. Aborting build."
        exit 1
    fi
    
    print_success "✅ iOS Info.plist settings explicitly enforced and verified"
}

# Function to build APK locally
build_apk_local() {
    print_header "Building APK Locally (Fast Build)"
    print_warning "This will build APK on your local machine without EAS"
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Generating Android project..."
    cd frontend
    npx expo prebuild --platform android --clean
    
    print_step "Building APK with Gradle..."
    cd android
    ./gradlew assembleRelease
    
    # Copy APK to root directory
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local apk_name="TRUKapp-${timestamp}.apk"
    
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        cp app/build/outputs/apk/release/app-release.apk "../../${apk_name}"
        cd ../..
        print_success "APK built successfully: ${apk_name}"
        
        # Show file info
        ls -lh "${apk_name}"
        
        # Create sharing info
        create_apk_sharing_info "${apk_name}"
    else
        cd ../..
        print_error "APK build failed. Check the logs above for errors."
        exit 1
    fi
}

# Function to build AAB locally
build_aab_local() {
    print_header "Building AAB Locally (Fast Build)"
    print_warning "This will build AAB on your local machine without EAS"
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Generating Android project..."
    cd frontend
    npx expo prebuild --platform android --clean
    
    print_step "Building AAB with Gradle..."
    cd android
    ./gradlew bundleRelease
    
    # Copy AAB to root directory
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local aab_name="TRUKapp-${timestamp}.aab"
    
    if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
        cp app/build/outputs/bundle/release/app-release.aab "../../${aab_name}"
        cd ../..
        print_success "AAB built successfully: ${aab_name}"
        
        # Show file info
        ls -lh "${aab_name}"
        
        # Create sharing info
        create_aab_sharing_info "${aab_name}"
    else
        cd ../..
        print_error "AAB build failed. Check the logs above for errors."
        exit 1
    fi
}

# Function to build APK with EAS
build_apk_eas() {
    print_header "Building APK with EAS (Cloud Build)"
    print_warning "This will build APK using EAS cloud servers"
    
    check_eas_login
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Starting EAS build (APK for testing)..."
    cd frontend
    local eas_cmd=$(get_eas_cmd)
    $eas_cmd build --platform android --profile production-apk --non-interactive
    cd ..
    
    print_success "APK build initiated on EAS! Check EAS dashboard for progress."
    print_status "Once complete, you can download the APK from EAS dashboard."
}

# Function to build AAB with EAS
build_aab_eas() {
    print_header "Building AAB with EAS (Cloud Build)"
    print_warning "This will build AAB using EAS cloud servers for Google Play Store"
    
    # Check network connectivity first
    if ! check_network; then
        print_error "Network connectivity check failed. Please fix network issues and try again."
        exit 1
    fi
    
    check_eas_login
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Starting EAS build (AAB for Google Play Store)..."
    cd frontend
    
    # Retry logic for network failures
    local max_retries=3
    local retry_count=0
    local build_success=false
    
    while [ $retry_count -lt $max_retries ]; do
        if [ $retry_count -gt 0 ]; then
            print_warning "Retry attempt $retry_count of $max_retries..."
            sleep 5
        fi
        
        # Capture both stdout and stderr
        local eas_cmd=$(get_eas_cmd)
        local build_output
        build_output=$($eas_cmd build --platform android --profile production --non-interactive 2>&1)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            build_success=true
            break
        else
            print_error "Build command failed with exit code $exit_code"
            # Check if it's a network error
            if echo "$build_output" | grep -q "getaddrinfo EAI_AGAIN\|ECONNREFUSED\|ETIMEDOUT\|EAI_AGAIN"; then
                print_warning "Network error detected. Will retry..."
                retry_count=$((retry_count + 1))
            else
                print_error "Non-network error detected:"
                echo "$build_output" | tail -20
                print_error "Stopping retries."
                break
            fi
        fi
    done
    
    cd ..
    
    if [ "$build_success" = true ]; then
        print_success "AAB build initiated on EAS! Check EAS dashboard for progress."
        print_status "Once complete, you can download the AAB and upload to Google Play Store."
        print_warning "Note: AAB is the preferred format for Google Play Store."
    else
        print_error "AAB build failed after $max_retries attempts."
        print_status "Please check:"
        print_status "  1. Your internet connection"
        print_status "  2. DNS settings (try: nslookup api.expo.dev)"
        print_status "  3. Firewall/proxy settings"
        print_status "  4. EAS service status: https://status.expo.dev"
        exit 1
    fi
}

# Function to check network connectivity
check_network() {
    print_status "Checking network connectivity to Expo servers..."
    if ! curl -s --max-time 5 https://api.expo.dev > /dev/null 2>&1; then
        print_error "Cannot reach Expo servers. Please check your internet connection."
        print_status "Trying DNS resolution..."
        if ! nslookup api.expo.dev > /dev/null 2>&1; then
            print_error "DNS resolution failed. Please check your DNS settings or try:"
            print_status "  - Restart your network connection"
            print_status "  - Try using a different DNS server (e.g., 8.8.8.8)"
            print_status "  - Check if you're behind a firewall/proxy"
            return 1
        fi
        return 1
    fi
    print_success "Network connectivity OK"
    return 0
}

# Function to verify iOS credentials are set up
verify_ios_credentials() {
    print_status "Verifying iOS credentials setup..."
    cd frontend
    local eas_cmd=$(get_eas_cmd)
    
    # Try to check credentials with a short timeout
    local creds_output
    if command -v timeout >/dev/null 2>&1; then
        creds_output=$(timeout 10 $eas_cmd credentials --platform ios 2>&1 | grep -i "production\|store\|configured" | head -5 || echo "")
    else
        # Quick check without timeout
        creds_output=$($eas_cmd credentials --platform ios 2>&1 | grep -i "production\|store\|configured" | head -5 || echo "")
    fi
    
    cd ..
    
    if [ -n "$creds_output" ]; then
        print_success "iOS credentials appear to be configured"
        return 0
    else
        print_warning "Could not verify iOS credentials automatically"
        print_warning "If build hangs, credentials may need to be set up"
        return 1
    fi
}

# Function to build IPA with EAS
build_ipa_eas() {
    print_header "Building IPA with EAS (Cloud Build)"
    print_warning "This will build IPA using EAS cloud servers for Apple App Store"
    
    check_eas_login
    
    # Check network connectivity
    if ! check_network; then
        print_error "Network connectivity check failed. Please fix network issues and try again."
        exit 1
    fi
    
    # Verify credentials (non-blocking)
    verify_ios_credentials || true
    
    # Verify iOS settings BEFORE updating config (in case update fails)
    print_status "Pre-build verification: Checking iOS Info.plist settings..."
    if ! verify_ios_info_plist_settings; then
        print_warning "Some critical settings may be missing. Continuing anyway..."
        print_warning "The build script will attempt to add them."
    fi
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production (this will add all required settings)
    update_app_config_for_production
    
    # Final verification after config update
    print_status "Post-config verification: Ensuring all settings are present..."
    if ! verify_ios_info_plist_settings; then
        print_error "CRITICAL: iOS Info.plist settings verification failed after config update!"
        print_error "This may cause iOS crashes. Aborting build."
        exit 1
    fi
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Starting EAS build (IPA for Apple App Store)..."
    print_warning "Note: iOS builds require Apple Developer credentials to be set up first."
    print_status "If this is your first iOS build, you may need to run:"
    print_status "  cd frontend && eas credentials"
    print_status "This will set up your Apple Developer certificates and provisioning profiles."
    echo ""
    
    cd frontend
    local eas_cmd=$(get_eas_cmd)
    
    echo ""
    print_status "Starting EAS build process..."
    print_status "Command: $eas_cmd build --platform ios --profile production --non-interactive"
    print_warning "If the build hangs, it may be waiting for credentials setup."
    print_warning "Press Ctrl+C to cancel, then run: cd frontend && eas credentials --platform ios"
    echo ""
    
    # Run build command directly without capturing output
    # This allows real-time output and prevents hanging issues
    # The --non-interactive flag should prevent prompts, but if credentials
    # aren't set up, it may still hang - user can Ctrl+C and set up credentials
    
    if command -v timeout >/dev/null 2>&1; then
        # Use timeout of 2 minutes for initial validation
        # If credentials are set up, the build should start quickly
        # If it hangs longer, it's likely waiting for credentials
        print_status "Starting build (2-minute timeout for initial validation)..."
        print_status "If it hangs, press Ctrl+C and set up credentials first."
        echo ""
        
        if timeout 120 $eas_cmd build --platform ios --profile production --non-interactive; then
            print_success ""
            print_success "IPA build initiated on EAS! Check EAS dashboard for progress."
            print_status "Once complete, you can download the IPA and upload to App Store Connect."
            print_warning "Note: You'll need an Apple Developer account for App Store submission."
            cd ..
            return 0
        else
            local exit_code=$?
            cd ..
            if [ $exit_code -eq 124 ]; then
                print_error ""
                print_error "Build command timed out after 2 minutes."
                print_error "This usually means it's waiting for iOS credentials setup."
                print_status ""
                print_status "To fix this, run:"
                print_status "  cd frontend"
                print_status "  eas credentials --platform ios"
                print_status ""
                print_status "Then run the build again."
                exit 1
            else
                print_error "Build command failed with exit code $exit_code"
                print_status "Check the output above for details."
                exit 1
            fi
        fi
    else
        # No timeout available - run directly
        print_status "Starting build (no timeout - if it hangs, press Ctrl+C)..."
        echo ""
        
        if $eas_cmd build --platform ios --profile production --non-interactive; then
            print_success ""
            print_success "IPA build initiated on EAS! Check EAS dashboard for progress."
            print_status "Once complete, you can download the IPA and upload to App Store Connect."
            print_warning "Note: You'll need an Apple Developer account for App Store submission."
            cd ..
            return 0
        else
            local exit_code=$?
            cd ..
            print_error "Build command failed with exit code $exit_code"
            print_status "Check the output above for details."
            print_status ""
            print_status "If it hung, you may need to set up credentials:"
            print_status "  cd frontend"
            print_status "  eas credentials --platform ios"
            exit 1
        fi
    fi
}

# Function to create APK sharing info
create_apk_sharing_info() {
    local apk_file="$1"
    
    cat > "APK_SHARING_INFO.txt" << EOF
TRUKAPP APK for Testing
=======================

File: $apk_file
Size: $(ls -lh "$apk_file" | awk '{print $5}')
Date: $(date)

Installation:
1. Enable "Install from Unknown Sources" on Android device
2. Transfer this APK file to your Android device
3. Open the APK file and install

Notes:
- This is a production build for testing
- Contains all latest features and fixes
- Safe to install on test devices

Build Environment:
- Node.js: $(node --version)
- Build Date: $(date)
- Build Type: Local Build
EOF
    
    print_success "APK sharing info created: APK_SHARING_INFO.txt"
}

# Function to create AAB sharing info
create_aab_sharing_info() {
    local aab_file="$1"
    
    cat > "AAB_SHARING_INFO.txt" << EOF
TRUKAPP AAB for Google Play Store
=================================

File: $aab_file
Size: $(ls -lh "$aab_file" | awk '{print $5}')
Date: $(date)

Usage:
- This is an Android App Bundle (AAB) file
- Upload this file to Google Play Console for store submission
- AAB is the preferred format for Google Play Store
- Contains optimized APKs for different device configurations

Notes:
- This is a production build for Google Play Store
- Contains all latest features and fixes
- Ready for store submission

Build Environment:
- Node.js: $(node --version)
- Build Date: $(date)
- Build Type: Local Build

Google Play Console Upload:
1. Go to Google Play Console
2. Select your app
3. Go to Production > Create new release
4. Upload this AAB file
5. Complete the release process
EOF
    
    print_success "AAB sharing info created: AAB_SHARING_INFO.txt"
}

# Function to set up iOS credentials
setup_ios_credentials() {
    print_header "Setting up iOS Credentials for EAS"
    print_warning "This will help you set up Apple Developer certificates and provisioning profiles"
    print_status "You'll need an Apple Developer account ($99/year) to build iOS apps"
    echo ""
    
    cd frontend
    print_step "Starting EAS credentials setup..."
    local eas_cmd=$(get_eas_cmd)
    $eas_cmd credentials
    cd ..
    
    print_success "iOS credentials setup completed!"
    print_status "You can now run option 5 to build iOS IPA files"
}

# Function to show build status
show_build_status() {
    print_status "Checking EAS build status..."
    cd frontend
    local eas_cmd=$(get_eas_cmd)
    $eas_cmd build:list --limit 10
    cd ..
}

# Function to install APK on emulator
install_apk_emulator() {
    print_status "Installing APK on emulator..."
    
    # Check if emulator is running
    if ! adb devices | grep -q "emulator"; then
        print_error "No emulator detected. Please start an Android emulator first"
        exit 1
    fi
    
    # Find the latest APK
    LATEST_APK=$(ls -t *.apk 2>/dev/null | head -n1)
    
    if [ -z "$LATEST_APK" ]; then
        print_error "No APK files found. Please build an APK first"
        exit 1
    fi
    
    print_status "Installing $LATEST_APK..."
    adb install -r "$LATEST_APK"
    print_success "APK installed successfully"
}

# Function to show help
show_help() {
    echo "TRUKAPP Unified Build Script"
    echo "============================"
    echo ""
    echo "This script provides interactive options for building:"
    echo "  • APK files (Android testing)"
    echo "  • AAB files (Google Play Store)"
    echo "  • IPA files (Apple App Store)"
    echo ""
    echo "Build Options:"
    echo "  Local Builds:"
    echo "    - Fast builds on your machine"
    echo "    - Available for Android (APK/AAB) only"
    echo "    - No EAS account required"
    echo "    - Files saved to project root"
    echo ""
    echo "  EAS Builds:"
    echo "    - Cloud builds using Expo's servers"
    echo "    - Available for all platforms"
    echo "    - Requires EAS login"
    echo "    - Files available via EAS dashboard"
    echo ""
    echo "Usage: ./build.sh"
    echo "  Run without arguments for interactive menu"
    echo ""
    echo "Command line options:"
    echo "  apk-local        - Build APK locally"
    echo "  apk-eas          - Build APK with EAS"
    echo "  aab-local        - Build AAB locally"
    echo "  aab-eas          - Build AAB with EAS"
    echo "  ipa-eas          - Build IPA with EAS"
    echo "  ios-credentials  - Setup iOS credentials"
    echo "  verify-ios       - Verify iOS Info.plist settings"
    echo "  clean            - Clean project"
    echo "  deps             - Install dependencies"
    echo "  status           - Show EAS build status"
    echo "  install          - Install APK on emulator"
    echo "  help             - Show this help"
    echo ""
    echo "Prerequisites:"
    echo "  • Node.js and npm installed"
    echo "  • Android SDK (for local Android builds)"
    echo "  • EAS CLI and login (for cloud builds)"
    echo "  • Apple Developer account (for iOS builds)"
    echo ""
}

# Main interactive menu
main_menu() {
    while true; do
        echo ""
        echo "=========================================="
        echo "        TRUKAPP Unified Build Script"
        echo "=========================================="
        echo ""
        echo "Android Builds:"
        echo "  1) Build APK (Local - Fast)"
        echo "  2) Build APK (EAS - Cloud)"
        echo "  3) Build AAB (Local - Fast)"
        echo "  4) Build AAB (EAS - Cloud)"
        echo ""
        echo "iOS Builds:"
        echo "  5) Build IPA (EAS - Cloud)"
        echo ""
        echo "Utilities:"
        echo "  6) Clean project"
        echo "  7) Install dependencies"
        echo "  8) Show EAS build status"
        echo "  9) Install APK on emulator"
        echo "  10) Setup iOS credentials (for IPA builds)"
        echo "  11) Verify iOS Info.plist settings"
        echo "  12) Show help"
        echo "  0) Exit"
        echo ""
        read -p "Select an option (0-12): " choice
        
        case $choice in
            1)
                build_apk_local
                ;;
            2)
                build_apk_eas
                ;;
            3)
                build_aab_local
                ;;
            4)
                build_aab_eas
                ;;
            5)
                build_ipa_eas
                ;;
            6)
                clean_project
                ;;
            7)
                install_deps
                ;;
            8)
                show_build_status
                ;;
            9)
                install_apk_emulator
                ;;
            10)
                setup_ios_credentials
                ;;
            11)
                if verify_ios_info_plist_settings; then
                    print_success "iOS Info.plist settings verification passed!"
                else
                    print_error "iOS Info.plist settings verification failed!"
                    print_status "Please check frontend/app.config.js and ensure all required settings are present."
                fi
                ;;
            12)
                show_help
                ;;
            0)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 0-12"
                ;;
        esac
    done
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    # Check directory first
    check_directory
    main_menu
else
    case $1 in
        apk-local)
            check_directory
            build_apk_local
            ;;
        apk-eas)
            check_directory
            build_apk_eas
            ;;
        aab-local)
            check_directory
            build_aab_local
            ;;
        aab-eas)
            check_directory
            build_aab_eas
            ;;
        ipa-eas)
            check_directory
            build_ipa_eas
            ;;
        clean)
            check_directory
            clean_project
            ;;
        deps)
            check_directory
            install_deps
            ;;
        status)
            check_directory
            show_build_status
            ;;
        install)
            check_directory
            install_apk_emulator
            ;;
        ios-credentials)
            check_directory
            setup_ios_credentials
            ;;
        verify-ios)
            check_directory
            if verify_ios_info_plist_settings; then
                print_success "iOS Info.plist settings verification passed!"
                exit 0
            else
                print_error "iOS Info.plist settings verification failed!"
                exit 1
            fi
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
fi