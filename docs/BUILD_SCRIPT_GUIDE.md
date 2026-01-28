# TRUKAPP Build Script Guide

**Version:** 2.0  
**Last Updated:** January 28, 2026  
**Status:** ✅ Production Ready

## Overview

The TRUKAPP build script provides a robust, multi-platform build management system that supports:

- **Local Builds**: APK (Android) builds on your machine
- **Cloud Builds**: EAS (Expo Application Services) for APK, AAB (Android App Bundle), and IPA (iOS)
- **Multiple Environments**: Preview and Production
- **Comprehensive Validation**: Version checking, configuration validation, and dependency management

---

## Quick Start

### Make the Script Executable
```bash
chmod +x ./build.sh
```

### Run in Interactive Mode
```bash
./build.sh
```

This will show an interactive menu with all available build options.

### Run Specific Command
```bash
./build.sh apk-prod        # Build APK for production
./build.sh all-platforms-prod  # Build everything for production
./build.sh validate        # Just check configuration
```

---

## System Requirements

### Required
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Expo**: v51.0.0 or higher

### Optional (Based on Build Type)
- **Java JDK**: v11+ for local Android builds
- **Android SDK**: For local Android builds
- **Gradle**: Automatically used via gradle wrapper
- **Xcode**: For local iOS builds (macOS only)
- **jq**: For JSON validation (optional)

### Verify Requirements
```bash
node --version      # Should be v18+
npm --version       # Should be v9+
java -version       # For local Android builds
```

---

## Available Build Commands

### Interactive Mode
```bash
./build.sh
```

Shows a menu with all options:
1. **APK (Local)** - Debug build on your machine
2. **APK (Preview)** - Cloud preview build
3. **APK (Production)** - Cloud production APK
4. **AAB (Production)** - App Bundle for Google Play
5. **IPA (Preview)** - Cloud iOS preview build
6. **IPA (Production)** - Cloud iOS production build
7. **Batch All Android** - Both APK and AAB (production)
8. **Batch All Platforms** - APK + AAB + IPA (production)
9. **Install Dependencies** - npm install
10. **Clean Artifacts** - Remove build caches
11. **Validate Configuration** - Check setup only

### Command Line Mode

#### Build APK
```bash
# Local debug build (requires Android SDK)
./build.sh apk-local

# Cloud preview APK
./build.sh apk-preview

# Cloud production APK
./build.sh apk-prod
```

#### Build Android App Bundle (AAB)
```bash
# For Google Play Store
./build.sh aab-prod
```

#### Build iOS App (IPA)
```bash
# Cloud preview iOS build
./build.sh ipa-preview

# Cloud production iOS build
./build.sh ipa-prod
```

#### Batch Builds
```bash
# Build both APK and AAB for production
./build.sh all-android-prod

# Build everything (APK + AAB + IPA) for production
./build.sh all-platforms-prod
```

#### Utilities
```bash
# Validate configuration only
./build.sh validate

# Install/update dependencies
./build.sh install-deps

# Clean build artifacts and caches
./build.sh clean

# Show help
./build.sh help
```

---

## Pre-Build Validation

The script automatically performs these checks before every build:

### Version Checks ✅
- Node.js version >= 18.0.0
- npm version >= 9.0.0
- Expo CLI version >= 51.0.0

### Configuration Validation ✅
- `package.json` exists and is valid
- `app.json` exists and is valid
- `eas.json` exists and is configured
- `app.config.js` exists
- `tsconfig.json` exists
- All required configuration files present

### Dependency Checks ✅
- `node_modules` is present (auto-installs if missing)
- Expo dependencies are installed
- All required npm packages available

### Build-Specific Checks
- **Local Android**: Java JDK and Gradle wrapper
- **Local iOS**: Xcode and build tools
- **EAS Builds**: EAS CLI configured

---

## Build Profiles Explained

### Preview Profile
- **Purpose**: Testing and internal distribution
- **Signing**: Test signing certificates
- **Distribution**: Internal sharing only
- **Use Case**: Pre-release testing before production
- **Example**: `./build.sh apk-preview`

### Production Profile
- **Purpose**: Public release
- **Signing**: Production signing certificates
- **Distribution**: App stores
- **Use Case**: Final release to users
- **Example**: `./build.sh apk-prod`

---

## Build Output Locations

### Local Builds
```
APK (Local):     ./frontend/android/app/build/outputs/apk/release/
```

### EAS Cloud Builds
All builds are accessible from the **EAS Dashboard**:
- URL: https://expo.dev
- Check build status, download APK/IPA
- View build logs
- Manage code signing

---

## Common Build Scenarios

### Scenario 1: First Time Setup
```bash
# Make script executable
chmod +x ./build.sh

# Validate everything is set up
./build.sh validate

# If any issues, install dependencies
./build.sh install-deps

# Try a preview build
./build.sh apk-preview
```

### Scenario 2: Production Android Release
```bash
# Clean previous builds
./build.sh clean

# Validate configuration
./build.sh validate

# Build both APK and AAB
./build.sh all-android-prod

# Builds are processed in EAS cloud
# Check https://expo.dev for download links
```

### Scenario 3: Production Multi-Platform Release
```bash
# One command to build everything
./build.sh all-platforms-prod

# This builds:
# - APK (Android instant install)
# - AAB (Android App Bundle for Play Store)
# - IPA (iOS for App Store)

# Check https://expo.dev for all downloads
```

### Scenario 4: Quick Local Testing
```bash
# If you have Android SDK configured
./build.sh apk-local

# APK will be at:
# ./frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### Error: "Node.js is not installed"
```bash
# Install Node.js v18+
# macOS/Linux:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18

# Windows: Download from https://nodejs.org
```

### Error: "npm modules not found"
```bash
# Install dependencies
./build.sh install-deps

# Or manually:
cd frontend
npm install --legacy-peer-deps
```

### Error: "Java is required for local Android builds"
```bash
# Install Java JDK 11+
# macOS:
brew install openjdk@11

# Linux:
sudo apt-get install openjdk-11-jdk

# Windows: Download from https://www.oracle.com/java/technologies/javase-jdk11-downloads.html
```

### Error: "Android SDK not configured"
```bash
# For local builds, set ANDROID_HOME:
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export ANDROID_HOME=%LOCALAPPDATA%\Android\sdk # Windows

# Add to your shell profile (.bashrc, .zshrc, etc.) for permanence
```

### Build Hangs or Stalls
```bash
# Clear all caches
./build.sh clean

# Reinstall dependencies
./build.sh install-deps

# Try again
./build.sh apk-preview
```

### "eas.json not found"
```bash
# Ensure you're in the project root:
cd /path/to/TRUKAPP

# Verify eas.json exists:
ls -la frontend/eas.json

# If missing, check with:
./build.sh validate
```

### TypeScript Errors During Build
```bash
# Check for TypeScript errors:
cd frontend
npx tsc --noEmit

# Fix any reported issues before building again
```

---

## Environment Variables

The script uses these environment variables if set:

```bash
# Android Development
ANDROID_HOME=/path/to/android/sdk
JAVA_HOME=/path/to/java/home

# Optional: EAS credentials
EAS_TOKEN=your_eas_token  # For CI/CD automation
```

---

## Configuration Files Reference

### package.json
- Lists all npm dependencies
- Defines build scripts
- Required for npm install

**Location**: `./frontend/package.json`

### app.json
- Expo app configuration
- App name, version, icon
- Platform-specific settings

**Location**: `./frontend/app.json`

### eas.json
- EAS build profiles
- Development, Preview, Production configurations
- SDK versions and build settings

**Location**: `./frontend/eas.json`

### app.config.js
- Dynamic app configuration
- Environment-specific settings
- Firebase and API configuration

**Location**: `./frontend/app.config.js`

---

## Build Process Details

### Before Build (Pre-Build Checks)
1. ✅ Verify Node.js, npm, Expo versions
2. ✅ Validate all configuration files
3. ✅ Check dependencies are installed
4. ✅ Verify build tools (Java, Android SDK, Xcode)

### During Build
1. 📦 Clean previous builds
2. 🔨 Build using EAS or local tools
3. 📝 Generate signing certificates (if needed)
4. 🎯 Compile and bundle app code
5. 📊 Generate build artifacts

### After Build (Success)
1. ✅ Verify build output
2. 📍 Show file location
3. 📈 Display file size
4. 🎉 Confirm success message

### After Build (Failure)
1. ❌ Display error details
2. 📋 Show relevant logs
3. 💡 Suggest solutions
4. 🔗 Link to documentation

---

## Performance Tips

### Faster Builds
```bash
# 1. Use EAS cloud builds (more powerful servers)
./build.sh apk-prod

# 2. Clean before build if having issues
./build.sh clean

# 3. Use preview profile for testing (faster)
./build.sh apk-preview

# 4. Batch builds are more efficient
./build.sh all-android-prod  # vs individual builds
```

### Faster Validation
```bash
# Just validate, don't build
./build.sh validate

# This takes 30 seconds vs 15+ minutes for actual build
```

### Parallel Builds (Command Line)
```bash
# Start preview build in background
./build.sh apk-preview &

# Then check production build
./build.sh ipa-prod
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build and Deploy

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Make build script executable
        run: chmod +x ./build.sh
      
      - name: Validate configuration
        run: ./build.sh validate
      
      - name: Build production APK
        run: ./build.sh apk-prod
        env:
          EAS_TOKEN: ${{ secrets.EAS_TOKEN }}
```

---

## Monitoring Builds

### Check EAS Dashboard
- URL: https://expo.dev
- View all builds in progress
- Download completed builds
- Check build logs

### Local Logs
- Stored in: `./.build-logs/`
- Contains detailed build output
- Useful for debugging

### Real-time Monitoring
```bash
# Run with verbose output
./build.sh all-platforms-prod 2>&1 | tee build-$(date +%s).log
```

---

## Support & Help

### Get Help
```bash
./build.sh help       # Show available commands
```

### Check Configuration
```bash
./build.sh validate   # Comprehensive validation report
```

### Debug Issues
```bash
# Check system state
node --version
npm --version
expo --version
eas --version

# Validate config files
./build.sh validate

# Clean and reinstall
./build.sh clean
./build.sh install-deps
```

### Report Issues
If you encounter problems:
1. Run `./build.sh validate`
2. Check the detailed error message
3. Consult the Troubleshooting section above
4. Review build logs for details

---

## Version History

### v2.0 (January 28, 2026)
- ✅ Complete rewrite for robustness
- ✅ Enhanced error handling
- ✅ Comprehensive validation checks
- ✅ Better user feedback
- ✅ Support for all build types
- ✅ CI/CD ready

### v1.0 (Previous)
- Basic EAS build support
- Limited error handling

---

## Security Notes

### Signing Certificates
- Production builds use secure signing
- Managed by EAS
- Credentials stored securely
- Never committed to git

### Environment Variables
- Never commit `.env` files
- Use GitHub Secrets for CI/CD
- Store API keys securely
- Use EAS_TOKEN for automation

### Build Artifacts
- APK/IPA files are not committed
- Stored locally or in EAS
- Downloaded as needed
- Consider storage limits

---

## Summary

| Task | Command |
|------|---------|
| Interactive menu | `./build.sh` |
| Validate setup | `./build.sh validate` |
| Production APK | `./build.sh apk-prod` |
| Production AAB | `./build.sh aab-prod` |
| Production iOS | `./build.sh ipa-prod` |
| All production | `./build.sh all-platforms-prod` |
| Install deps | `./build.sh install-deps` |
| Clean artifacts | `./build.sh clean` |
| Show help | `./build.sh help` |

---

**Happy building! 🚀**

For more information, visit:
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/eas-update/introduction/)
- [React Native](https://reactnative.dev)
