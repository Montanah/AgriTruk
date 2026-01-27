#!/bin/bash

# TRUKAPP Simple Build Script - January 27, 2026
# Clean, straightforward build configuration
# No dependencies on external configs

set -e  # Exit on any error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
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

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    if ! command -v eas &> /dev/null; then
        print_warning "EAS CLI not found. Installing..."
        npm install -g eas-cli
        print_success "EAS CLI installed"
    else
        print_success "EAS CLI found: $(eas --version)"
    fi
    
    echo ""
}

# Install dependencies
install_deps() {
    print_header "Installing Dependencies"
    
    cd "$FRONTEND_DIR"
    
    # Clear npm cache
    npm cache clean --force
    
    # Install dependencies
    npm install
    
    print_success "Dependencies installed"
    echo ""
}

# Build APK locally
build_apk_local() {
    print_header "Building APK Locally (Expo)"
    
    cd "$FRONTEND_DIR"
    
    npx expo run:android --no-bundler
    
    print_success "APK built successfully"
    echo ""
}

# Build APK on EAS (development)
build_apk_eas_dev() {
    print_header "Building APK on EAS (Development Profile)"
    
    cd "$FRONTEND_DIR"
    
    print_warning "Building on EAS cloud..."
    eas build --platform android --profile development
    
    print_success "Development APK built on EAS"
    echo ""
}

# Build APK on EAS (production)
build_apk_eas_prod() {
    print_header "Building APK on EAS (Production Profile)"
    
    cd "$FRONTEND_DIR"
    
    print_warning "Building on EAS cloud..."
    eas build --platform android --profile production-apk
    
    print_success "Production APK built on EAS"
    echo ""
}

# Build AAB on EAS (production)
build_aab_eas_prod() {
    print_header "Building AAB on EAS (Production Profile - Store)"
    
    cd "$FRONTEND_DIR"
    
    print_warning "Building on EAS cloud..."
    eas build --platform android --profile production
    
    print_success "Production AAB built on EAS for Google Play Store"
    echo ""
}

# Build iOS on EAS
build_ios_eas() {
    print_header "Building iOS on EAS"
    
    cd "$FRONTEND_DIR"
    
    print_warning "Building on EAS cloud..."
    eas build --platform ios --profile production
    
    print_success "iOS build created on EAS"
    echo ""
}

# Development server
start_dev() {
    print_header "Starting Development Server"
    
    cd "$FRONTEND_DIR"
    
    npx expo start
    echo ""
}

# Clean build artifacts
clean() {
    print_header "Cleaning Build Artifacts"
    
    cd "$FRONTEND_DIR"
    
    rm -rf node_modules
    rm -rf .expo
    rm -rf android/build
    rm -rf ios/Pods
    rm -rf dist
    
    print_success "Build artifacts cleaned"
    echo ""
}

# Show help
show_help() {
    echo "TRUKAPP Simple Build Script"
    echo ""
    echo "Usage: ./simple-build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install          Install dependencies"
    echo "  dev              Start development server"
    echo "  apk-local        Build APK locally with Expo"
    echo "  apk-eas-dev      Build APK on EAS (development)"
    echo "  apk-eas-prod     Build APK on EAS (production)"
    echo "  aab-eas-prod     Build AAB on EAS (production - for Play Store)"
    echo "  ios-eas          Build iOS on EAS"
    echo "  clean            Clean all build artifacts"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./simple-build.sh install"
    echo "  ./simple-build.sh dev"
    echo "  ./simple-build.sh apk-eas-prod"
    echo "  ./simple-build.sh aab-eas-prod"
}

# Main script
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    # First check prerequisites
    check_prerequisites
    
    case "$1" in
        install)
            install_deps
            ;;
        dev)
            start_dev
            ;;
        apk-local)
            build_apk_local
            ;;
        apk-eas-dev)
            build_apk_eas_dev
            ;;
        apk-eas-prod)
            build_apk_eas_prod
            ;;
        aab-eas-prod)
            build_aab_eas_prod
            ;;
        ios-eas)
            build_ios_eas
            ;;
        clean)
            clean
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main
main "$@"
