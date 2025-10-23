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

# Function to check EAS login
check_eas_login() {
    print_status "Checking EAS login status..."
    if ! (cd frontend && npx eas whoami >/dev/null 2>&1); then
        print_error "Not logged in to EAS. Please run 'cd frontend && npx eas login' first"
        exit 1
    fi
    local current_user=$(cd frontend && npx eas whoami 2>/dev/null)
    print_success "Logged in to EAS as: $current_user"
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

# Function to update app config for production
update_app_config_for_production() {
    print_status "Updating app configuration for production builds..."
    
    cat > frontend/app.config.js << 'EOF'
const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_BUILD_MODE === 'production';

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
        NSLocationWhenInUseUsageDescription: "This app needs access to location to show your position on the map and calculate routes.",
        ITSAppUsesNonExemptEncryption: false
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
      // Cloudinary configuration
      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "trukapp",
      EXPO_PUBLIC_CLOUDINARY_PRESET: "trukapp_unsigned",
      EXPO_PUBLIC_CLOUDINARY_API_KEY: "your_cloudinary_api_key_here",
      EXPO_PUBLIC_CLOUDINARY_API_SECRET: "your_cloudinary_api_secret_here",
    }
  }
};
EOF
    
    print_success "App configuration updated for production builds"
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
    npx eas build --platform android --profile production-apk --non-interactive
    cd ..
    
    print_success "APK build initiated on EAS! Check EAS dashboard for progress."
    print_status "Once complete, you can download the APK from EAS dashboard."
}

# Function to build AAB with EAS
build_aab_eas() {
    print_header "Building AAB with EAS (Cloud Build)"
    print_warning "This will build AAB using EAS cloud servers for Google Play Store"
    
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
    npx eas build --platform android --profile production --non-interactive
    cd ..
    
    print_success "AAB build initiated on EAS! Check EAS dashboard for progress."
    print_status "Once complete, you can download the AAB and upload to Google Play Store."
    print_warning "Note: AAB is the preferred format for Google Play Store."
}

# Function to build IPA with EAS
build_ipa_eas() {
    print_header "Building IPA with EAS (Cloud Build)"
    print_warning "This will build IPA using EAS cloud servers for Apple App Store"
    
    check_eas_login
    
    # Clean up development dependencies
    cleanup_dev_deps
    
    # Update app config for production
    update_app_config_for_production
    
    # Set production environment
    export EXPO_PUBLIC_BUILD_MODE=production
    export NODE_ENV=production
    
    print_step "Starting EAS build (IPA for Apple App Store)..."
    print_warning "Note: iOS builds require Apple Developer credentials to be set up first."
    print_status "If this is your first iOS build, you may need to run:"
    print_status "  cd frontend && npx eas credentials"
    print_status "This will set up your Apple Developer certificates and provisioning profiles."
    echo ""
    
    cd frontend
    npx eas build --platform ios --profile production --non-interactive
    cd ..
    
    print_success "IPA build initiated on EAS! Check EAS dashboard for progress."
    print_status "Once complete, you can download the IPA and upload to App Store Connect."
    print_warning "Note: You'll need an Apple Developer account for App Store submission."
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
    npx eas credentials
    cd ..
    
    print_success "iOS credentials setup completed!"
    print_status "You can now run option 5 to build iOS IPA files"
}

# Function to show build status
show_build_status() {
    print_status "Checking EAS build status..."
    cd frontend
    npx eas build:list --limit 10
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
        echo "  11) Show help"
        echo "  0) Exit"
        echo ""
        read -p "Select an option (0-11): " choice
        
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
                show_help
                ;;
            0)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 0-11"
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