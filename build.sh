#!/bin/bash

##############################################################################
#                                                                            #
#  TRUKAPP Build Script - Robust Multi-Platform Build Management           #
#                                                                            #
#  Supports:                                                                #
#  - Local builds (APK, IPA)                                               #
#  - Cloud builds via EAS (APK, AAB, IPA)                                  #
#  - Preview and Production environments                                    #
#  - Comprehensive version & configuration validation                      #
#                                                                            #
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT"
ANDROID_DIR="$FRONTEND_DIR/android"
IOS_DIR="$FRONTEND_DIR/ios"
BUILD_LOGS_DIR="$PROJECT_ROOT/.build-logs"

# Minimum versions required
MIN_NODE_VERSION="18.0.0"
MIN_NPM_VERSION="9.0.0"
MIN_EXPO_VERSION="51.0.0"

# Create build logs directory
mkdir -p "$BUILD_LOGS_DIR"

##############################################################################
# UTILITY FUNCTIONS
##############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
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

# Compare versions - returns 0 (success/true) if condition is met
version_gt() {
    # Returns true if $1 > $2
    test "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" != "$1"
}

version_gte() {
    # Returns true if $1 >= $2
    # Check if $1 == $2 OR if $1 > $2
    test "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" = "$2"
}

##############################################################################
# VERSION & CONFIGURATION CHECKS
##############################################################################

check_node_version() {
    print_info "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        return 1
    fi
    
    NODE_VERSION=$(node --version | cut -d 'v' -f 2)
    
    if version_gte "$NODE_VERSION" "$MIN_NODE_VERSION"; then
        print_success "Node.js $NODE_VERSION (required: >= $MIN_NODE_VERSION)"
        return 0
    else
        print_error "Node.js $NODE_VERSION (required: >= $MIN_NODE_VERSION)"
        return 1
    fi
}

check_npm_version() {
    print_info "Checking npm version..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        return 1
    fi
    
    NPM_VERSION=$(npm --version)
    
    if version_gte "$NPM_VERSION" "$MIN_NPM_VERSION"; then
        print_success "npm $NPM_VERSION (required: >= $MIN_NPM_VERSION)"
        return 0
    else
        print_error "npm $NPM_VERSION (required: >= $MIN_NPM_VERSION)"
        return 1
    fi
}

check_expo_version() {
    print_info "Checking Expo CLI version..."
    
    if ! command -v expo &> /dev/null; then
        print_warning "Expo CLI not found globally, will use npx expo"
        return 0
    fi
    
    EXPO_VERSION=$(expo --version)
    
    if version_gte "$EXPO_VERSION" "$MIN_EXPO_VERSION"; then
        print_success "Expo CLI $EXPO_VERSION (required: >= $MIN_EXPO_VERSION)"
        return 0
    else
        print_warning "Expo CLI $EXPO_VERSION (required: >= $MIN_EXPO_VERSION)"
        return 0
    fi
}

check_java() {
    print_info "Checking Java installation..."
    
    if ! command -v java &> /dev/null; then
        print_warning "Java is not installed (required for local Android builds)"
        print_info "Install Java JDK 11 or later"
        return 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | head -1)
    print_success "$JAVA_VERSION"
    return 0
}

check_gradle() {
    print_info "Checking Gradle..."
    
    if [ ! -f "$ANDROID_DIR/gradlew" ]; then
        print_warning "Gradle wrapper not found at $ANDROID_DIR/gradlew"
        return 1
    fi
    
    print_success "Gradle wrapper found"
    return 0
}

check_xcode() {
    if ! command -v xcode-select &> /dev/null; then
        print_info "Xcode not found (required for iOS builds)"
        return 1
    fi
    
    XCODE_PATH=$(xcode-select -p)
    print_success "Xcode found at $XCODE_PATH"
    return 0
}

check_eas_cli() {
    print_info "Checking EAS CLI..."
    
    if ! command -v eas &> /dev/null; then
        print_warning "EAS CLI not found globally, will use npx eas"
        return 0
    fi
    
    EAS_VERSION=$(eas --version)
    print_success "EAS CLI $EAS_VERSION"
    return 0
}

validate_config_files() {
    print_info "Validating configuration files..."
    
    local missing_files=0
    
    # Check essential files
    local required_files=(
        "$FRONTEND_DIR/package.json"
        "$FRONTEND_DIR/app.json"
        "$FRONTEND_DIR/eas.json"
        "$FRONTEND_DIR/app.config.js"
        "$FRONTEND_DIR/tsconfig.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found $(basename $file)"
        else
            print_error "Missing $file"
            missing_files=$((missing_files + 1))
        fi
    done
    
    if [ $missing_files -eq 0 ]; then
        print_success "All configuration files present"
        return 0
    else
        print_error "$missing_files configuration files missing"
        return 1
    fi
}

validate_package_json() {
    print_info "Validating package.json..."
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found, skipping JSON validation"
        return 0
    fi
    
    if jq empty "$FRONTEND_DIR/package.json" 2>/dev/null; then
        print_success "package.json is valid JSON"
        
        # Check for essential dependencies
        local expo_version=$(jq -r '.dependencies.expo // .devDependencies.expo // "not-found"' "$FRONTEND_DIR/package.json")
        if [ "$expo_version" != "not-found" ]; then
            print_success "Expo dependency found: $expo_version"
        else
            print_warning "Expo dependency not found in package.json"
        fi
        
        return 0
    else
        print_error "package.json is invalid JSON"
        return 1
    fi
}

validate_app_json() {
    print_info "Validating app.json..."
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found, skipping JSON validation"
        return 0
    fi
    
    if jq empty "$FRONTEND_DIR/app.json" 2>/dev/null; then
        print_success "app.json is valid JSON"
        
        local app_name=$(jq -r '.name // "not-found"' "$FRONTEND_DIR/app.json")
        print_info "App name: $app_name"
        
        return 0
    else
        print_error "app.json is invalid JSON"
        return 1
    fi
}

check_node_modules() {
    print_info "Checking node_modules..."
    
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_warning "node_modules not found, running npm install..."
        cd "$FRONTEND_DIR"
        npm install --legacy-peer-deps
        cd "$PROJECT_ROOT"
        print_success "Dependencies installed"
    else
        local modules_count=$(find "$FRONTEND_DIR/node_modules" -maxdepth 1 -type d | wc -l)
        print_success "node_modules found ($modules_count directories)"
    fi
}

run_all_checks() {
    print_header "RUNNING PRE-BUILD VALIDATION CHECKS"
    
    local check_failed=0
    
    # Version checks
    check_node_version || check_failed=1
    check_npm_version || check_failed=1
    check_expo_version || check_failed=1
    
    echo ""
    
    # Configuration checks
    validate_config_files || check_failed=1
    validate_package_json || check_failed=1
    validate_app_json || check_failed=1
    
    echo ""
    
    # Dependency checks
    check_node_modules || check_failed=1
    
    echo ""
    
    if [ $check_failed -eq 0 ]; then
        print_success "All validation checks passed!"
        return 0
    else
        print_error "Some validation checks failed"
        return 1
    fi
}

##############################################################################
# BUILD FUNCTIONS
##############################################################################

build_apk_local() {
    print_header "BUILDING APK (LOCAL - Android Debug)"
    
    print_warning "Local APK builds require Android SDK. Checking prerequisites..."
    
    check_java || {
        print_error "Java is required for local Android builds"
        return 1
    }
    
    check_gradle || {
        print_error "Gradle wrapper not found"
        return 1
    }
    
    print_info "Starting local APK build..."
    cd "$FRONTEND_DIR"
    
    # Clean build
    npx expo prebuild --clean || {
        print_error "Failed to prebuild Android"
        return 1
    }
    
    # Build APK
    cd "$ANDROID_DIR"
    ./gradlew assembleRelease || {
        print_error "Gradle build failed"
        return 1
    }
    
    cd "$PROJECT_ROOT"
    
    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        print_success "APK built successfully!"
        print_info "Location: $APK_PATH"
        print_info "Size: $(du -h "$APK_PATH" | cut -f1)"
        return 0
    else
        print_error "APK not found after build"
        return 1
    fi
}

build_apk_eas() {
    local profile=$1  # preview or production
    
    print_header "BUILDING APK (EAS CLOUD - $profile)"
    
    if [ "$profile" != "preview" ] && [ "$profile" != "production" ]; then
        print_error "Invalid profile: $profile (use 'preview' or 'production')"
        return 1
    fi
    
    print_info "Starting EAS APK build for $profile..."
    cd "$FRONTEND_DIR"
    
    npx eas build --platform android --profile $profile || {
        print_error "EAS APK build failed"
        return 1
    }
    
    print_success "EAS APK build completed successfully!"
    print_info "Check EAS Dashboard for build status: https://expo.dev"
    return 0
}

build_aab_eas() {
    local profile=$1  # production only
    
    print_header "BUILDING AAB (EAS CLOUD - Production)"
    
    if [ "$profile" != "production" ]; then
        print_warning "AAB builds are typically for production. Using production profile..."
        profile="production"
    fi
    
    print_info "Starting EAS AAB build..."
    cd "$FRONTEND_DIR"
    
    npx eas build --platform android --profile $profile || {
        print_error "EAS AAB build failed"
        return 1
    }
    
    print_success "EAS AAB build completed successfully!"
    print_info "Check EAS Dashboard for build status: https://expo.dev"
    return 0
}

build_ipa_eas() {
    local profile=$1  # preview or production
    
    print_header "BUILDING IPA (EAS CLOUD - $profile)"
    
    if [ "$profile" != "preview" ] && [ "$profile" != "production" ]; then
        print_error "Invalid profile: $profile (use 'preview' or 'production')"
        return 1
    fi
    
    print_info "Starting EAS iOS build for $profile..."
    cd "$FRONTEND_DIR"
    
    npx eas build --platform ios --profile $profile || {
        print_error "EAS iOS build failed"
        return 1
    }
    
    print_success "EAS iOS build completed successfully!"
    print_info "Check EAS Dashboard for build status: https://expo.dev"
    return 0
}

install_dependencies() {
    print_header "INSTALLING DEPENDENCIES"
    
    print_info "Running npm install in frontend directory..."
    cd "$FRONTEND_DIR"
    
    npm install --legacy-peer-deps || {
        print_error "npm install failed"
        return 1
    }
    
    print_success "Dependencies installed successfully"
    return 0
}

clean_build_artifacts() {
    print_header "CLEANING BUILD ARTIFACTS"
    
    print_info "Removing Expo cache..."
    rm -rf "$FRONTEND_DIR/.expo" || true
    
    print_info "Removing metro bundler cache..."
    rm -rf "$FRONTEND_DIR/.metro-cache" || true
    
    print_info "Removing Android build artifacts..."
    rm -rf "$ANDROID_DIR/build" || true
    rm -rf "$ANDROID_DIR/app/build" || true
    
    print_info "Removing iOS build artifacts..."
    rm -rf "$IOS_DIR/Pods" || true
    
    print_success "Build artifacts cleaned"
    return 0
}

##############################################################################
# INTERACTIVE MENU
##############################################################################

show_menu() {
    echo ""
    echo -e "${BLUE}TRUKAPP BUILD MANAGEMENT${NC}"
    echo -e "${BLUE}=======================\n${NC}"
    
    echo "Choose build option:"
    echo ""
    echo "  Local Builds (Requires Android SDK/Xcode):"
    echo "    1) Build APK (Android Debug - Local)"
    echo ""
    echo "  Cloud Builds (EAS - Recommended):"
    echo "    2) Build APK (Android - Preview)"
    echo "    3) Build APK (Android - Production)"
    echo "    4) Build AAB (Android App Bundle - Production)"
    echo "    5) Build IPA (iOS - Preview)"
    echo "    6) Build IPA (iOS - Production)"
    echo ""
    echo "  Batch Builds:"
    echo "    7) Build all Android (APK + AAB - Production)"
    echo "    8) Build all platforms (APK + AAB + IPA - Production)"
    echo ""
    echo "  Utilities:"
    echo "    9) Install/Update Dependencies"
    echo "   10) Clean Build Artifacts"
    echo "   11) Validate Configuration Only"
    echo ""
    echo "  Exit:"
    echo "    0) Exit"
    echo ""
}

interactive_build() {
    while true; do
        show_menu
        read -p "Enter your choice (0-11): " choice
        
        case $choice in
            0)
                print_info "Exiting build script"
                exit 0
                ;;
            1)
                run_all_checks || exit 1
                build_apk_local || exit 1
                ;;
            2)
                run_all_checks || exit 1
                build_apk_eas "preview" || exit 1
                ;;
            3)
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                ;;
            4)
                run_all_checks || exit 1
                build_aab_eas "production" || exit 1
                ;;
            5)
                run_all_checks || exit 1
                build_ipa_eas "preview" || exit 1
                ;;
            6)
                run_all_checks || exit 1
                build_ipa_eas "production" || exit 1
                ;;
            7)
                print_header "BATCH BUILD: All Android (Production)"
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                build_aab_eas "production" || exit 1
                print_success "All Android builds completed!"
                ;;
            8)
                print_header "BATCH BUILD: All Platforms (Production)"
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                build_aab_eas "production" || exit 1
                build_ipa_eas "production" || exit 1
                print_success "All platform builds completed!"
                ;;
            9)
                install_dependencies || exit 1
                ;;
            10)
                clean_build_artifacts || exit 1
                ;;
            11)
                run_all_checks || exit 1
                print_success "Configuration validation passed!"
                ;;
            *)
                print_error "Invalid choice. Please enter 0-11."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

##############################################################################
# COMMAND LINE ARGUMENTS
##############################################################################

show_help() {
    cat << EOF
TRUKAPP Build Script

Usage: $0 [OPTION]

Build Options:
  apk-local               Build APK locally (requires Android SDK)
  apk-preview             Build APK via EAS (preview)
  apk-prod                Build APK via EAS (production)
  aab-prod                Build AAB via EAS (production)
  ipa-preview             Build IPA via EAS (preview)
  ipa-prod                Build IPA via EAS (production)
  all-android-prod        Build APK + AAB (production)
  all-platforms-prod      Build APK + AAB + IPA (production)

Utility Options:
  validate                Validate configuration only
  install-deps            Install/update dependencies
  clean                   Clean build artifacts
  help                    Show this help message

Examples:
  $0 apk-prod             # Build APK for production
  $0 all-platforms-prod   # Build all platforms
  $0 validate             # Check configuration

EOF
}

##############################################################################
# MAIN SCRIPT
##############################################################################

main() {
    if [ $# -eq 0 ]; then
        # Interactive mode
        interactive_build
    else
        # Command-line mode
        case "$1" in
            apk-local)
                run_all_checks || exit 1
                build_apk_local || exit 1
                ;;
            apk-preview)
                run_all_checks || exit 1
                build_apk_eas "preview" || exit 1
                ;;
            apk-prod)
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                ;;
            aab-prod)
                run_all_checks || exit 1
                build_aab_eas "production" || exit 1
                ;;
            ipa-preview)
                run_all_checks || exit 1
                build_ipa_eas "preview" || exit 1
                ;;
            ipa-prod)
                run_all_checks || exit 1
                build_ipa_eas "production" || exit 1
                ;;
            all-android-prod)
                print_header "BATCH BUILD: All Android (Production)"
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                build_aab_eas "production" || exit 1
                print_success "All Android builds completed!"
                ;;
            all-platforms-prod)
                print_header "BATCH BUILD: All Platforms (Production)"
                run_all_checks || exit 1
                build_apk_eas "production" || exit 1
                build_aab_eas "production" || exit 1
                build_ipa_eas "production" || exit 1
                print_success "All platform builds completed!"
                ;;
            validate)
                run_all_checks || exit 1
                print_success "Configuration validation passed!"
                ;;
            install-deps)
                install_dependencies || exit 1
                ;;
            clean)
                clean_build_artifacts || exit 1
                ;;
            help)
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
}

# Make script executable and run main
chmod +x "$0"
main "$@"
