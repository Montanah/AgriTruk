#!/usr/bin/env bash
set -euo pipefail

# Interactive EAS build helper (root build.sh)
# Prompts which artifacts to build and runs them sequentially.
# Logs are saved to ./build-logs/

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOG_DIR="$ROOT_DIR/build-logs"
mkdir -p "$LOG_DIR"

EAS_CMD=${EAS_CLI:-npx eas}
NON_INTERACTIVE_FLAG=""
if [ "${EAS_NONINTERACTIVE:-0}" = "1" ]; then
    NON_INTERACTIVE_FLAG="--non-interactive"
fi

echo "Starting interactive production build helper: $(date)" | tee "$LOG_DIR/build_all.log"

run_build() {
    local platform=$1
    local profile=$2
    local label=$3
    local out_log="$LOG_DIR/${label// /_}.log"

    echo "\n===== BUILD: $label ($platform / profile=$profile) =====" | tee -a "$LOG_DIR/build_all.log"
    echo "Command: $EAS_CMD build -p $platform --profile $profile $NON_INTERACTIVE_FLAG" | tee -a "$LOG_DIR/build_all.log"

    # Run build and tee output
    $EAS_CMD build -p "$platform" --profile "$profile" $NON_INTERACTIVE_FLAG 2>&1 | tee "$out_log"
    local rc=${PIPESTATUS[0]:-0}
    if [ "$rc" -ne 0 ]; then
        echo "Build failed: $label (exit $rc). See $out_log" | tee -a "$LOG_DIR/build_all.log"
        return $rc
    fi

    echo "Build finished: $label. Log: $out_log" | tee -a "$LOG_DIR/build_all.log"
    return 0
}

print_menu() {
    echo "\nSelect which builds to run:"
    echo "  1) Android APK (production-apk)"
    echo "  2) Android AAB (production)"
    echo "  3) iOS IPA (appstore)"
    echo "  4) All of the above"
    echo "  q) Quit"
    echo "You can choose multiple by separating with commas, e.g. 1,3"
}

read_choices() {
    read -r -p $'Enter choice (default: 4 for All): ' CHOICE
    CHOICE=${CHOICE:-4}
    # Normalize: remove spaces
    CHOICE=$(echo "$CHOICE" | tr -d '[:space:]')
    # Support comma separated
    IFS=',' read -r -a SEL <<< "$CHOICE"
    BUILD_APK=0
    BUILD_AAB=0
    BUILD_IPA=0
    for c in "${SEL[@]}"; do
        case "$c" in
            1) BUILD_APK=1 ;;
            2) BUILD_AAB=1 ;;
            3) BUILD_IPA=1 ;;
            4) BUILD_APK=1; BUILD_AAB=1; BUILD_IPA=1 ;;
            q|Q) echo "Aborted by user."; exit 0 ;;
            *) echo "Ignoring unknown choice: $c" ;;
        esac
    done
}

confirm() {
    echo "\nSelected builds:"
    $BUILD_APK && echo " - Android APK"
    $BUILD_AAB && echo " - Android AAB"
    $BUILD_IPA && echo " - iOS IPA"
    read -r -p $'Proceed? (y/N): ' yn
    case "$yn" in
        [Yy]*) return 0 ;;
        *) echo "Aborted."; exit 0 ;;
    esac
}

# Check eas is available (npx will still work)
if ! command -v ${EAS_CLI:-eas} >/dev/null 2>&1; then
    echo "Note: 'eas' not found in PATH; npx will be used to invoke EAS if available." | tee -a "$LOG_DIR/build_all.log"
fi

# Check EAS login
if ! $EAS_CMD whoami >/dev/null 2>&1; then
    echo "You are not logged into EAS (or 'whoami' failed). The build may prompt for login." | tee -a "$LOG_DIR/build_all.log"
fi

print_menu
read_choices
confirm

RC=0

if [ "$BUILD_APK" -eq 1 ]; then
    run_build android production-apk "Android APK" || RC=$?
    if [ "$RC" -ne 0 ]; then
        echo "Stopping due to failure in Android APK build." | tee -a "$LOG_DIR/build_all.log"
        exit $RC
    fi
fi

if [ "$BUILD_AAB" -eq 1 ]; then
    run_build android production "Android AAB (App Bundle)" || RC=$?
    if [ "$RC" -ne 0 ]; then
        echo "Stopping due to failure in Android AAB build." | tee -a "$LOG_DIR/build_all.log"
        exit $RC
    fi
fi

if [ "$BUILD_IPA" -eq 1 ]; then
    run_build ios appstore "iOS IPA (App Store)" || RC=$?
    if [ "$RC" -ne 0 ]; then
        echo "iOS build failed. You may need to login to Apple/Configure credentials." | tee -a "$LOG_DIR/build_all.log"
        exit $RC
    fi
fi

echo "All selected builds completed successfully at $(date)" | tee -a "$LOG_DIR/build_all.log"
exit 0
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
