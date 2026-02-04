#!/bin/bash

# Simple build script for TRUK App
set -e

echo "🚀 TRUK App Build Script"
echo "========================"

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  apk        Build Android APK (preview)"
    echo "  aab        Build Android App Bundle (production)"
    echo "  ios        Build iOS IPA (production)"
    echo "  all        Build all platforms"
    echo "  local      Build APK locally (requires Android SDK)"
    echo "  help       Show this help message"
    echo ""
}

# Function to build Android APK via EAS
build_apk() {
    echo "📱 Building Android APK..."
    npx eas build -p android --profile preview
}

# Function to build Android AAB via EAS
build_aab() {
    echo "📦 Building Android App Bundle..."
    npx eas build -p android --profile production
}

# Function to build iOS IPA via EAS
build_ios() {
    echo "🍎 Building iOS IPA..."
    npx eas build -p ios --profile appstore
}

# Function to build locally
build_local() {
    echo "🔧 Building APK locally..."
    echo "⚠️  This requires Android SDK to be installed"
    
    # Clean and prebuild
    npx expo prebuild --clean
    
    # Build APK
    cd android
    ./gradlew assembleRelease
    cd ..
    
    # Check if APK was created
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        echo "✅ APK built successfully!"
        echo "📍 Location: $APK_PATH"
        echo "📏 Size: $(du -h "$APK_PATH" | cut -f1)"
    else
        echo "❌ APK not found after build"
        exit 1
    fi
}

# Main script logic
case "${1:-help}" in
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
        echo "🌍 Building all platforms..."
        build_apk
        build_aab
        build_ios
        echo "✅ All builds completed!"
        ;;
    local)
        build_local
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

echo "🎉 Build script completed!"