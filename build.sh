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
    
    # Simply ensure iOS buildNumber exists if it doesn't already
    # Don't overwrite the entire file - just ensure critical settings are present
    if [ -f "frontend/app.config.js" ]; then
        # Ensure iOS buildNumber exists
        if ! grep -q "buildNumber:" frontend/app.config.js; then
            print_status "Adding iOS buildNumber to app.config.js..."
            sed -i '/bundleIdentifier: "com\.truk\.trukapp",/a\      buildNumber: "1",' frontend/app.config.js
        fi
        
        # Extract and show current version
        local current_version=$(grep -oP 'version:\s*["\047]?\K[0-9]+\.[0-9]+\.[0-9]+' frontend/app.config.js 2>/dev/null | head -1)
        if [ -n "$current_version" ]; then
            print_status "Using existing version: $current_version"
        fi
    else
        print_error "app.config.js not found! Cannot proceed."
        exit 1
    fi
    
    print_success "App configuration verified for production builds"
    
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
    
    # Try to check credentials with a short timeout and kill signal
    # Use a background process with timeout to prevent hanging
    local creds_output=""
    local temp_file=$(mktemp)
    
    if command -v timeout >/dev/null 2>&1; then
        # Use timeout with kill signal - 5 seconds should be enough
        # Redirect input from /dev/null to prevent interactive prompts
        (timeout -k 2 5 $eas_cmd credentials --platform ios < /dev/null 2>&1 | grep -i "production\|store\|configured" | head -5 > "$temp_file" 2>&1) &
        local creds_pid=$!
        
        # Wait for process with timeout
        local wait_count=0
        while kill -0 $creds_pid 2>/dev/null && [ $wait_count -lt 6 ]; do
            sleep 1
            wait_count=$((wait_count + 1))
        done
        
        # Kill if still running
        if kill -0 $creds_pid 2>/dev/null; then
            kill $creds_pid 2>/dev/null || true
            sleep 1
            kill -9 $creds_pid 2>/dev/null || true
        fi
        
        # Read output if available
        if [ -f "$temp_file" ]; then
            creds_output=$(cat "$temp_file" 2>/dev/null || echo "")
        fi
        rm -f "$temp_file"
    else
        # Quick check without timeout - use background process
        ($eas_cmd credentials --platform ios < /dev/null 2>&1 | grep -i "production\|store\|configured" | head -5 > "$temp_file" 2>&1) &
        local creds_pid=$!
        
        # Wait max 5 seconds
        local wait_count=0
        while kill -0 $creds_pid 2>/dev/null && [ $wait_count -lt 5 ]; do
            sleep 1
            wait_count=$((wait_count + 1))
        done
        
        # Kill if still running
        if kill -0 $creds_pid 2>/dev/null; then
            kill $creds_pid 2>/dev/null || true
            sleep 1
            kill -9 $creds_pid 2>/dev/null || true
        fi
        
        # Read output if available
        if [ -f "$temp_file" ]; then
            creds_output=$(cat "$temp_file" 2>/dev/null || echo "")
        fi
        rm -f "$temp_file"
    fi
    
    cd ..
    
    if [ -n "$creds_output" ]; then
        print_success "iOS credentials appear to be configured"
        return 0
    else
        print_warning "Could not verify iOS credentials automatically (check skipped to prevent hanging)"
        print_warning "Build will proceed - EAS will handle credentials during build if needed"
        return 1
    fi
}

# Function to build IPA with EAS
build_ipa_eas() {
    print_header "Building IPA with EAS (Cloud Build)"
    print_warning "This will build IPA using EAS cloud servers for Apple App Store"
    echo ""
    
    # Check EAS login
    print_status "Checking EAS login..."
    cd frontend
    local eas_cmd=$(get_eas_cmd)
    local login_check=$(timeout 5 $eas_cmd whoami 2>&1 | head -1 || echo "")
    cd ..
    
    if [ -z "$login_check" ] || echo "$login_check" | grep -qi "error\|not logged\|unauthorized"; then
        print_error "EAS login check failed or timed out."
        print_status "Please login first: cd frontend && eas login"
        exit 1
    else
        print_success "EAS login verified: $login_check"
    fi
    echo ""
    
    # Verify iOS settings
    print_status "Verifying iOS Info.plist settings..."
    if ! verify_ios_info_plist_settings; then
        print_warning "Some settings may be missing. The build script will add them."
    fi
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Final verification
    if ! verify_ios_info_plist_settings; then
        print_error "CRITICAL: iOS Info.plist settings verification failed!"
        exit 1
    fi
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Starting EAS iOS build..."
    echo ""
    print_warning "⚠️  IMPORTANT: iOS builds require Apple Developer credentials"
    print_status "If credentials aren't set up, the build will hang."
    echo ""
    
    # Check credentials BEFORE building to avoid hangs
    print_status "Checking iOS credentials setup..."
    cd frontend
    
    # Try to check credentials status (non-blocking)
    local creds_check=$(timeout 10 $eas_cmd credentials --platform ios --profile production 2>&1 | grep -i "configured\|production\|store\|app.*id\|team" | head -3 || echo "")
    
    if [ -z "$creds_check" ]; then
        print_warning "Could not verify credentials automatically."
        print_status ""
        read -p "Have you set up iOS credentials? (y/n): " has_creds
        if [ "$has_creds" != "y" ] && [ "$has_creds" != "Y" ]; then
            print_error ""
            print_error "❌ Please set up credentials first!"
            print_status ""
            print_status "Run these commands:"
            print_status "  cd frontend"
            print_status "  eas credentials --platform ios --profile production"
            print_status ""
            print_status "Follow the prompts to set up your Apple Developer account."
            cd ..
            exit 1
        fi
    else
        print_success "Credentials check passed"
    fi
    echo ""
    
    print_status "Starting build..."
    print_status "Note: Uploads can take 5-10 minutes - please be patient!"
    echo ""
    
    # Use a background process with monitoring to handle hangs
    local build_log=$(mktemp)
    local build_pid_file=$(mktemp)
    
    # Set up trap for cleanup
    trap "rm -f $build_log $build_pid_file 2>/dev/null; cd .. 2>/dev/null; exit 130" INT TERM
    
    # Start build in background
    (
        $eas_cmd build --platform ios --profile production --non-interactive > "$build_log" 2>&1
        echo $? > "$build_pid_file"
    ) &
    local build_pid=$!
    
    # Monitor the build process
    local elapsed=0
    local max_wait=600  # 10 minutes for uploads/builds
    local last_output_size=0
    local last_output_time=$(date +%s)
    local no_output_threshold=180  # 3 minutes without output = potential hang
    
    print_status "Build started (PID: $build_pid)"
    print_status "Monitoring build progress (uploads can take several minutes)..."
    echo ""
    
    while kill -0 $build_pid 2>/dev/null && [ $elapsed -lt $max_wait ]; do
        sleep 5
        elapsed=$((elapsed + 5))
        
        # Check if output is growing (build is progressing)
        local current_size=$(wc -c < "$build_log" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        
        if [ $current_size -gt $last_output_size ]; then
            # Output is growing - show recent lines
            local recent_lines=$(tail -3 "$build_log" 2>/dev/null | grep -v "^$" | tail -1)
            if [ -n "$recent_lines" ]; then
                echo "$recent_lines"
            fi
            last_output_size=$current_size
            last_output_time=$current_time
        else
            # No new output - check how long it's been
            local time_since_output=$((current_time - last_output_time))
            
            # Check if process is still active (not hung)
            if command -v ps >/dev/null 2>&1; then
                # Check if process is consuming CPU or has network activity
                local proc_state=$(ps -o state= -p $build_pid 2>/dev/null || echo "")
                if [ "$proc_state" != "T" ] && [ "$proc_state" != "Z" ]; then
                    # Process is running (not stopped/zombie) - likely uploading
                    if [ $time_since_output -gt $no_output_threshold ]; then
                        # Been too long without output, but process is active
                        # Check if it's actually uploading (check for upload keywords in last output)
                        local last_line=$(tail -1 "$build_log" 2>/dev/null || echo "")
                        if echo "$last_line" | grep -qi "upload\|compress\|building\|preparing"; then
                            # Likely still uploading/processing - reset timer
                            last_output_time=$current_time
                            print_status "Still uploading/processing... ($(($elapsed / 60))m $(($elapsed % 60))s)"
                        fi
                    fi
                fi
            fi
        fi
        
        # Show progress every 30 seconds
        if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            local minutes=$((elapsed / 60))
            local seconds=$((elapsed % 60))
            print_status "Build in progress... (${minutes}m ${seconds}s)"
        fi
    done
    
    # Check if build is still running
    if kill -0 $build_pid 2>/dev/null; then
        # Check if we timed out or if it's actually hung
        local time_since_output=$(($(date +%s) - last_output_time))
        local last_line=$(tail -1 "$build_log" 2>/dev/null || echo "")
        
        # If last line mentions upload/compress, allow much more time (uploads are slow)
        if echo "$last_line" | grep -qi "upload\|compress\|uploading"; then
            print_warning ""
            print_warning "Build is uploading files (this can take 10+ minutes for large projects)"
            print_status "Continuing to monitor upload progress..."
            print_status "Press Ctrl+C to cancel if needed"
            echo ""
            
            # Continue monitoring during upload - don't kill it
            while kill -0 $build_pid 2>/dev/null; do
                sleep 10
                local current_size=$(wc -c < "$build_log" 2>/dev/null || echo 0)
                if [ $current_size -gt $last_output_size ]; then
                    # New output - show it
                    tail -1 "$build_log" 2>/dev/null
                    last_output_size=$current_size
                    last_output_time=$(date +%s)
                else
                    # Still no output - check if still uploading
                    local current_line=$(tail -1 "$build_log" 2>/dev/null || echo "")
                    if ! echo "$current_line" | grep -qi "upload\|compress"; then
                        # No longer uploading - might be done or error
                        break
                    fi
                    # Still uploading - show status
                    local elapsed_total=$(($(date +%s) - (last_output_time - time_since_output)))
                    local elapsed_min=$((elapsed_total / 60))
                    if [ $((elapsed_total % 60)) -eq 0 ] && [ $elapsed_min -gt 0 ]; then
                        print_status "Still uploading... (${elapsed_min}m elapsed)"
                    fi
                fi
            done
        elif [ $time_since_output -gt $no_output_threshold ]; then
            # Build appears hung - kill it
            print_error ""
            print_error "❌ Build appears to be hanging (no output for $(($time_since_output / 60)) minutes)"
            print_status "Killing build process..."
            kill $build_pid 2>/dev/null
            sleep 2
            kill -9 $build_pid 2>/dev/null
            rm -f "$build_log" "$build_pid_file"
            cd ..
            trap - INT TERM
            
            print_error ""
            print_error "Build was cancelled due to hang."
            print_status ""
            print_status "If this was during upload, your network may be slow."
            print_status "Try again or check: cd frontend && eas build:list"
            exit 1
        else
            # Just hit max wait time - let it continue
            print_warning ""
            print_warning "Build is taking longer than expected, but appears to be progressing..."
            print_status "Continuing to monitor..."
        fi
    fi
    
    # Wait for build to finish
    wait $build_pid 2>/dev/null
    local build_result=$(cat "$build_pid_file" 2>/dev/null || echo 1)
    
    # Show full output
    echo ""
    print_status "Build output:"
    cat "$build_log"
    echo ""
    
    # Cleanup
    rm -f "$build_log" "$build_pid_file"
    cd ..
    trap - INT TERM
    
    # Check result
    if [ "$build_result" = "0" ]; then
        print_success ""
        print_success "✅ IPA build initiated successfully!"
        print_status "Check EAS dashboard for build progress: https://expo.dev/accounts/truk/projects/TRUKapp/builds"
        print_status "Once complete, download the IPA and upload to App Store Connect."
        return 0
    else
        print_error ""
        print_error "❌ Build failed with exit code $build_result"
        print_status ""
        print_status "Common causes:"
        print_status "  • Missing iOS credentials (run: cd frontend && eas credentials --platform ios --profile production)"
        print_status "  • Network/API issues (check: https://status.expo.dev)"
        print_status "  • Configuration errors"
        exit 1
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