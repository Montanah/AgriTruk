#!/bin/bash

# Interactive build script for TRUK App
set -e

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to show interactive menu
show_menu() {
    clear
    print_header "🚀 TRUK App Build Script"
    echo ""
    echo "Select build option:"
    echo ""
    echo "  1) Build Android APK (preview/testing)"
    echo "  2) Build Android AAB (Google Play Store)"
    echo "  3) Build iOS IPA (Apple App Store)"
    echo "  4) Build all platforms (APK + AAB + IPA)"
    echo "  5) Build APK locally (requires Android SDK)"
    echo "  6) Exit"
    echo ""
    echo -n "Enter your choice [1-6]: "
}

# Function to confirm action
confirm_action() {
    echo ""
    echo -n "Are you sure you want to proceed? (y/n): "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            print_warning "Action cancelled"
            return 1
            ;;
    esac
}

# Function to build Android APK via EAS
build_apk() {
    print_header "📱 Building Android APK"
    print_info "This will create an APK for testing/preview"
    
    if confirm_action; then
        echo ""
        print_info "Starting EAS build..."
        npx eas build -p android --profile preview
        
        if [ $? -eq 0 ]; then
            print_success "APK build completed!"
        else
            print_error "APK build failed!"
            return 1
        fi
    fi
}

# Function to build Android AAB via EAS
build_aab() {
    print_header "📦 Building Android App Bundle"
    print_info "This will create an AAB for Google Play Store"
    
    if confirm_action; then
        echo ""
        print_info "Starting EAS build..."
        npx eas build -p android --profile production
        
        if [ $? -eq 0 ]; then
            print_success "AAB build completed!"
        else
            print_error "AAB build failed!"
            return 1
        fi
    fi
}

# Function to build iOS IPA via EAS
build_ios() {
    print_header "🍎 Building iOS IPA"
    print_info "This will create an IPA for Apple App Store"
    
    if confirm_action; then
        echo ""
        print_info "Starting EAS build..."
        npx eas build -p ios --profile appstore
        
        if [ $? -eq 0 ]; then
            print_success "IPA build completed!"
        else
            print_error "IPA build failed!"
            return 1
        fi
    fi
}

# Function to build all platforms
build_all() {
    print_header "🌍 Building All Platforms"
    print_info "This will build APK, AAB, and IPA"
    
    if confirm_action; then
        echo ""
        
        # Build APK
        print_info "Step 1/3: Building APK..."
        npx eas build -p android --profile preview
        
        # Build AAB
        print_info "Step 2/3: Building AAB..."
        npx eas build -p android --profile production
        
        # Build iOS
        print_info "Step 3/3: Building IPA..."
        npx eas build -p ios --profile appstore
        
        print_success "All builds completed!"
    fi
}

# Function to build locally
build_local() {
    print_header "🔧 Building APK Locally"
    print_warning "This requires Android SDK to be installed"
    
    if confirm_action; then
        echo ""
        
        # Check if Android SDK is available
        if ! command -v gradle &> /dev/null && [ ! -f "android/gradlew" ]; then
            print_error "Android SDK not found!"
            print_info "Please install Android Studio and SDK first"
            return 1
        fi
        
        # Clean and prebuild
        print_info "Cleaning and prebuilding..."
        npx expo prebuild --clean
        
        # Build APK
        print_info "Building APK..."
        cd android
        ./gradlew assembleRelease
        cd ..
        
        # Check if APK was created
        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            print_success "APK built successfully!"
            print_info "Location: $APK_PATH"
            print_info "Size: $(du -h "$APK_PATH" | cut -f1)"
        else
            print_error "APK not found after build"
            return 1
        fi
    fi
}

# Function to show help
show_help() {
    print_header "📖 TRUK App Build Script Help"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  apk        Build Android APK (preview/testing)"
    echo "  aab        Build Android App Bundle (Google Play Store)"
    echo "  ios        Build iOS IPA (Apple App Store)"
    echo "  all        Build all platforms (APK + AAB + IPA)"
    echo "  local      Build APK locally (requires Android SDK)"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0           # Interactive mode (recommended)"
    echo "  $0 apk       # Build APK directly"
    echo "  $0 aab       # Build AAB directly"
    echo "  $0 ios       # Build IPA directly"
    echo "  $0 all       # Build everything"
    echo ""
    echo "Note: Running without arguments starts interactive mode"
    echo ""
}

# Main script logic
if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                build_apk
                ;;
            2)
                build_aab
                ;;
            3)
                build_ios
                ;;
            4)
                build_all
                ;;
            5)
                build_local
                ;;
            6)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6"
                ;;
        esac
        
        # Pause before showing menu again
        echo ""
        echo -n "Press Enter to continue..."
        read -r
    done
else
    # Command-line mode
    case "$1" in
        apk)
            build_apk
            ;;
        aab)
            build_aab
            ;;
        ios)
            build_ios
            ;;
        all)
            build_all
            ;;
        local)
            build_local
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
fi