# TRUKapp Local Build Guide

This guide helps you build APK and IPA files locally while EAS builds run in the background.

## 🚀 Quick Start

1. **Setup Environment** (run once):
   ```bash
   ./setup-local-builds.sh
   ```

2. **Build APK** (Android):
   ```bash
   ./build-android-local.sh
   ```

3. **Build IPA** (iOS - macOS only):
   ```bash
   ./build-ios-local.sh
   ```

4. **Interactive Menu**:
   ```bash
   ./quick-build.sh
   ```

## 📋 Prerequisites

### For Android APK Builds:
- ✅ Node.js 16+ 
- ✅ Java JDK 11+
- ✅ Android Studio (or Android SDK)
- ✅ Linux/macOS/Windows

### For iOS IPA Builds:
- ✅ macOS (required)
- ✅ Xcode 12+
- ✅ Apple Developer Account (for signing)
- ✅ CocoaPods

## 🔧 Environment Setup

### 1. Install Node.js Dependencies
```bash
# Install global tools
npm install -g @expo/cli eas-cli

# Install project dependencies
cd frontend
npm install
cd ..
```

### 2. Android Setup
```bash
# Install Android Studio from:
# https://developer.android.com/studio

# Set environment variables (add to ~/.bashrc or ~/.zshrc):
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Install Java JDK (Ubuntu/Debian):
sudo apt install openjdk-11-jdk

# Or download from: https://adoptium.net/
```

### 3. iOS Setup (macOS only)
```bash
# Install Xcode from App Store
# Install Command Line Tools:
xcode-select --install

# Install CocoaPods:
sudo gem install cocoapods
```

## 📱 Build Process

### Android APK Build
```bash
./build-android-local.sh
```

**What it does:**
1. Runs `expo prebuild --platform android --clean`
2. Builds APK with Gradle: `./gradlew assembleRelease`
3. Copies APK to project root as `TRUKapp-release.apk`
4. Opens file manager to show the APK

**Output:**
- APK file: `TRUKapp-release.apk`
- Size: ~15-25 MB
- Installable on any Android device

### iOS IPA Build
```bash
./build-ios-local.sh
```

**What it does:**
1. Runs `expo prebuild --platform ios --clean`
2. Installs CocoaPods dependencies
3. Builds archive with Xcode
4. Exports IPA (requires code signing)

**Output:**
- IPA file: `TRUKapp-release.ipa` (if signing works)
- Archive: `ios/TRUKapp.xcarchive` (always created)
- Size: ~20-30 MB

## 🎯 Build Outputs

### File Locations:
```
TRUKapp-release.apk          # Android APK
TRUKapp-release.ipa          # iOS IPA (if signed)
build-outputs/               # Build logs and artifacts
ios/TRUKapp.xcarchive        # iOS archive (always created)
```

### Installation:
- **Android**: Transfer APK to device and install
- **iOS**: Install via Xcode or TestFlight (requires Apple Developer account)

## 🔍 Troubleshooting

### Common Android Issues:

**"ANDROID_HOME not set"**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**"Java not found"**
```bash
# Ubuntu/Debian:
sudo apt install openjdk-11-jdk

# macOS:
brew install openjdk@11
```

**"Gradle build failed"**
- Check Android SDK is properly installed
- Ensure Java version is 11+
- Try: `cd frontend/android && ./gradlew clean`

### Common iOS Issues:

**"Xcode not found"**
```bash
# Install Xcode from App Store
# Or install Command Line Tools:
xcode-select --install
```

**"Code signing failed"**
- Open `ios/TRUKapp.xcworkspace` in Xcode
- Set your Apple Developer Team ID
- Or use manual signing in Xcode

**"CocoaPods not found"**
```bash
sudo gem install cocoapods
```

## ⚡ Performance Tips

### Faster Builds:
1. **Keep EAS running**: Don't cancel EAS builds - they're for production
2. **Use local builds**: For testing and development
3. **Clean builds**: Use `--clean` flag for fresh builds
4. **Parallel builds**: Run Android and iOS builds simultaneously

### Build Times:
- **Android APK**: 2-5 minutes
- **iOS IPA**: 5-10 minutes (depending on signing)
- **EAS builds**: 30-120 minutes (but better for distribution)

## 🚨 Important Notes

### EAS vs Local Builds:
- **EAS builds**: For production, app stores, and distribution
- **Local builds**: For testing, development, and quick iterations
- **Keep both running**: EAS for production, local for testing

### Security:
- Local builds use your development certificates
- EAS builds use production certificates
- Never commit certificates or keys to git

### File Management:
- APK/IPA files are large (15-30 MB)
- Consider adding to `.gitignore`:
  ```
  *.apk
  *.ipa
  build-outputs/
  ```

## 📞 Support

If you encounter issues:
1. Check the build logs in `build-outputs/`
2. Verify all prerequisites are installed
3. Try cleaning and rebuilding: `expo prebuild --clean`
4. Check EAS build status: `eas build:list`

## 🎉 Success!

Once builds complete:
- **Android**: Install `TRUKapp-release.apk` on your device
- **iOS**: Install via Xcode or TestFlight
- **EAS**: Download from EAS dashboard when ready

Happy building! 🚀
