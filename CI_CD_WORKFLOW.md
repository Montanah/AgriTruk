# TRUKAPP CI/CD & Release Workflow

## Overview
This document outlines the complete CI/CD pipeline for TRUKAPP mobile application, including branch strategy, automated builds, and store deployment workflows.

## Table of Contents
- [Branch Strategy](#branch-strategy)
- [EAS Build Profiles](#eas-build-profiles)
- [Local Development](#local-development)
- [CI/CD Implementation](#cicd-implementation)
- [Release Process](#release-process)
- [Store Deployment](#store-deployment)
- [Troubleshooting](#troubleshooting)
- [Security Guidelines](#security-guidelines)

## Branch Strategy

### Branch Structure
```
main (production)
├── development (staging)
    ├── feature/feature-name
    ├── bugfix/bug-description
    └── hotfix/critical-fix
```

### Branch Protection Rules
- **main**: Protected branch
  - Require pull request reviews (2 reviewers)
  - Require status checks to pass
  - Require branches to be up to date
  - Restrict pushes to main
- **development**: Semi-protected
  - Allow direct pushes for quick fixes
  - Require PR for major changes

### Branch Workflow
1. **Feature Development**
   - Create feature branch from `development`
   - Implement and test locally
   - Create PR to `development`
   - Merge after review and testing

2. **Release Process**
   - Create PR from `development` to `main`
   - Trigger automated production builds
   - Deploy to stores after approval

## EAS Build Profiles

### Profile Configuration
Located in `frontend/eas.json`:

| Profile | Purpose | Distribution | Android | iOS | Environment |
|---------|---------|--------------|---------|-----|-------------|
| `development` | Internal testing | internal | APK | Simulator | Development |
| `preview` | Stakeholder demos | internal | APK | Release | Production |
| `testing` | QA testing | internal | APK | Release | Production |
| `tester` | Beta testing | internal | APK | Release | Production |
| `production-apk` | Field testing | internal | APK | - | Production |
| `production` | Store release | store | AAB | Release | Production |
| `appstore` | iOS store | store | - | Release | Production |

### Environment Variables
All profiles include:
- `EXPO_PUBLIC_API_URL`: Backend API endpoint
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Maps integration
- `EXPO_PUBLIC_FIREBASE_*`: Firebase configuration
- `EXPO_PUBLIC_CLOUDINARY_*`: Image upload service

## Local Development

### Prerequisites
```bash
# Install dependencies
npm install -g @expo/cli eas-cli

# Login to EAS
cd frontend
npx eas login
```

### Development Commands
```bash
# Start development server
cd frontend
npx expo start

# Build for testing
./build.sh apk-local    # Local APK build
./build.sh aab-local    # Local AAB build

# EAS builds
./build.sh apk-eas      # EAS APK build
./build.sh aab-eas      # EAS AAB build
./build.sh ipa-eas      # EAS iOS build
```

### Build Script (`build.sh`)
The unified build script provides:
- Interactive menu for all build types
- Local and EAS cloud builds
- Automatic dependency management
- Production configuration updates
- Build artifact management

## CI/CD Implementation

### GitHub Actions Workflow

Create `.github/workflows/build-and-deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main, development]
  release:
    types: [published]

env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
  EAS_PROJECT_ID: 24d1984c-eb71-4672-bace-c6a0ddeb648b

jobs:
  # Development builds on development branch
  development-build:
    if: github.ref == 'refs/heads/development'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build development APK
        run: |
          cd frontend
          npx eas build --profile development --platform android --non-interactive
      
      - name: Build development iOS
        run: |
          cd frontend
          npx eas build --profile development --platform ios --non-interactive

  # Production builds on main branch
  production-build:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build production AAB
        run: |
          cd frontend
          npx eas build --profile production --platform android --non-interactive
      
      - name: Build production IPA
        run: |
          cd frontend
          npx eas build --profile production --platform ios --non-interactive
      
      - name: Submit to Google Play (optional)
        if: github.event_name == 'release'
        run: |
          cd frontend
          npx eas submit --platform android --profile production --non-interactive
      
      - name: Submit to App Store (optional)
        if: github.event_name == 'release'
        run: |
          cd frontend
          npx eas submit --platform ios --profile production --non-interactive

  # Code quality checks
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run linting
        run: |
          cd frontend
          npm run lint
      
      - name: Run type checking
        run: |
          cd frontend
          npx tsc --noEmit
```

### Required Secrets
Add these secrets to your GitHub repository:

| Secret | Description | Example |
|--------|-------------|---------|
| `EXPO_TOKEN` | Expo access token | `exp_...` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Google Play JSON key | `{"type": "service_account", ...}` |
| `APPLE_ID` | Apple Developer ID | `developer@example.com` |
| `APPLE_PASSWORD` | Apple Developer password | `password123` |
| `APPLE_TEAM_ID` | Apple Team ID | `ABC123DEF4` |
| `ASC_APP_ID` | App Store Connect App ID | `1234567890` |

### EAS Update Integration
For over-the-air updates:

```yaml
# Add to workflow
- name: Publish EAS Update
  run: |
    cd frontend
    npx eas update --branch production --message "Release ${{ github.ref_name }}"
```

## Release Process

### 1. Development to Staging
```bash
# Create feature branch
git checkout development
git pull origin development
git checkout -b feature/new-feature

# Develop and test
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR to development
# Merge after review
```

### 2. Staging to Production
```bash
# Create release PR
git checkout main
git pull origin main
git checkout -b release/v1.2.0

# Merge development
git merge development

# Push and create PR
git push origin release/v1.2.0
# Create PR: development → main
```

### 3. Automated Release
```bash
# Create and push tag
git tag v1.2.0
git push origin v1.2.0

# This triggers the release workflow
# Builds are created automatically
# Store submissions happen if configured
```

## Store Deployment

### Google Play Store
1. **Automatic Submission** (via CI/CD):
   ```yaml
   - name: Submit to Google Play
     run: |
       cd frontend
       npx eas submit --platform android --profile production
   ```

2. **Manual Submission**:
   ```bash
   cd frontend
   npx eas submit --platform android --profile production
   ```

### Apple App Store
1. **Automatic Submission** (via CI/CD):
   ```yaml
   - name: Submit to App Store
     run: |
       cd frontend
       npx eas submit --platform ios --profile production
   ```

2. **Manual Submission**:
   ```bash
   cd frontend
   npx eas submit --platform ios --profile production
   ```

### Store Configuration
Update `frontend/eas.json` submit section:
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **EAS Authentication Failed**
   ```bash
   cd frontend
   npx eas login
   ```

2. **Build Failures**
   ```bash
   # Clean and rebuild
   ./build.sh clean
   ./build.sh deps
   ./build.sh apk-local
   ```

3. **iOS Credentials Issues**
   ```bash
   cd frontend
   npx eas credentials
   ```

4. **Android Build Issues**
   - Ensure Android SDK is installed
   - Check Java version compatibility
   - Verify Gradle configuration

### Debug Commands
```bash
# Check EAS status
cd frontend && npx eas whoami

# List recent builds
cd frontend && npx eas build:list

# Check build logs
cd frontend && npx eas build:view [BUILD_ID]

# Update dependencies
cd frontend && npm update
```

## Security Guidelines

### Secrets Management
- Never commit API keys or credentials
- Use GitHub Secrets for CI/CD
- Rotate credentials regularly
- Use environment-specific configurations

### Code Security
- Review all PRs before merging
- Use automated security scanning
- Keep dependencies updated
- Follow secure coding practices

### Store Security
- Use signed builds only
- Enable app signing verification
- Monitor for security vulnerabilities
- Regular security audits

## Monitoring and Analytics

### Build Monitoring
- EAS Dashboard: Monitor build status
- GitHub Actions: Check CI/CD logs
- Slack/Email: Notifications for failures

### App Analytics
- Firebase Analytics: User behavior
- Crashlytics: Crash reporting
- Performance monitoring: App performance

## Best Practices

1. **Version Management**
   - Use semantic versioning (1.2.3)
   - Update version in `app.config.js`
   - Tag releases in Git

2. **Testing Strategy**
   - Unit tests for critical functions
   - Integration tests for API calls
   - E2E tests for user flows
   - Manual testing before releases

3. **Code Quality**
   - ESLint for code style
   - TypeScript for type safety
   - Prettier for formatting
   - Husky for pre-commit hooks

4. **Documentation**
   - Keep README updated
   - Document API changes
   - Maintain changelog
   - Update deployment guides

## Quick Reference

### Essential Commands
```bash
# Development
cd frontend && npx expo start

# Local builds
./build.sh apk-local
./build.sh aab-local

# EAS builds
./build.sh apk-eas
./build.sh aab-eas
./build.sh ipa-eas

# Store submission
cd frontend && npx eas submit --platform android
cd frontend && npx eas submit --platform ios

# Utilities
./build.sh clean
./build.sh deps
./build.sh status
```

### Branch Workflow
```bash
# Feature development
git checkout development
git checkout -b feature/name
# ... develop ...
git push origin feature/name
# Create PR to development

# Release
git checkout main
git checkout -b release/v1.2.0
git merge development
git push origin release/v1.2.0
# Create PR to main
```

This comprehensive workflow ensures reliable, automated builds and deployments while maintaining code quality and security standards.
