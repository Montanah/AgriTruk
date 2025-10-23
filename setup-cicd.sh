#!/bin/bash

# TRUKAPP CI/CD Setup Script
# This script helps set up the CI/CD environment for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if we're in the right directory
    if [ ! -d "frontend" ] || [ ! -f "frontend/package.json" ]; then
        print_error "Please run this script from the TRUKAPP root directory"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first"
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Function to setup EAS CLI
setup_eas_cli() {
    print_header "Setting up EAS CLI"
    
    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        print_status "Installing EAS CLI..."
        npm install -g eas-cli
    else
        print_status "EAS CLI is already installed"
    fi
    
    # Check EAS login status
    if ! (cd frontend && npx eas whoami >/dev/null 2>&1); then
        print_warning "Not logged in to EAS. Please run:"
        print_warning "  cd frontend && npx eas login"
        print_warning "Then run this script again"
        exit 1
    fi
    
    local current_user=$(cd frontend && npx eas whoami 2>/dev/null)
    print_success "Logged in to EAS as: $current_user"
}

# Function to setup GitHub repository
setup_github_repo() {
    print_header "Setting up GitHub Repository"
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        print_error "Not in a git repository. Please initialize git first:"
        print_error "  git init"
        print_error "  git remote add origin <your-repo-url>"
        exit 1
    fi
    
    # Check if GitHub remote is configured
    if ! git remote get-url origin | grep -q "github.com"; then
        print_warning "GitHub remote not detected. Please add your GitHub repository:"
        print_warning "  git remote add origin https://github.com/username/repository.git"
        print_warning "  git push -u origin main"
    fi
    
    print_success "GitHub repository is configured"
}

# Function to create GitHub secrets template
create_secrets_template() {
    print_header "Creating GitHub Secrets Template"
    
    cat > GITHUB_SECRETS_TEMPLATE.md << 'EOF'
# GitHub Secrets Required for CI/CD

Add these secrets to your GitHub repository:
Settings → Secrets and variables → Actions → New repository secret

## Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXPO_TOKEN` | Expo access token for EAS builds | Run: `cd frontend && npx eas login` then `npx eas whoami` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Google Play Console service account JSON | Google Play Console → Setup → API access → Service accounts |
| `APPLE_ID` | Apple Developer account email | Your Apple Developer account email |
| `APPLE_PASSWORD` | Apple Developer account password | Your Apple Developer account password |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Apple Developer → Membership → Team ID |
| `ASC_APP_ID` | App Store Connect App ID | App Store Connect → My Apps → App ID |

## Optional Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | Slack → Apps → Incoming Webhooks |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | Discord → Server Settings → Integrations → Webhooks |

## Setup Instructions

1. **Expo Token**:
   ```bash
   cd frontend
   npx eas login
   # Copy the token from ~/.expo/state.json or run: npx eas whoami
   ```

2. **Google Play Service Account**:
   - Go to Google Play Console
   - Setup → API access
   - Create service account
   - Download JSON key file
   - Copy entire JSON content as secret value

3. **Apple Developer Credentials**:
   - Use your Apple Developer account credentials
   - Team ID can be found in Apple Developer portal
   - App Store Connect App ID is in App Store Connect

## Testing Secrets

After adding secrets, test the workflow:
1. Push to development branch → Should trigger development builds
2. Push to main branch → Should trigger production builds
3. Create a release → Should trigger store submissions (if configured)
EOF

    print_success "GitHub secrets template created: GITHUB_SECRETS_TEMPLATE.md"
}

# Function to setup branch protection
setup_branch_protection() {
    print_header "Setting up Branch Protection"
    
    print_status "To set up branch protection rules:"
    print_status "1. Go to your GitHub repository"
    print_status "2. Settings → Branches"
    print_status "3. Add rule for 'main' branch:"
    print_status "   - Require pull request reviews before merging"
    print_status "   - Require status checks to pass before merging"
    print_status "   - Require branches to be up to date before merging"
    print_status "   - Restrict pushes that create files larger than 100MB"
    print_status "4. Add rule for 'development' branch (optional):"
    print_status "   - Require pull request reviews before merging"
    print_status "   - Allow force pushes (for quick fixes)"
}

# Function to test CI/CD setup
test_cicd_setup() {
    print_header "Testing CI/CD Setup"
    
    print_status "To test the CI/CD setup:"
    print_status "1. Make a small change to any file"
    print_status "2. Commit and push to development branch:"
    print_status "   git add ."
    print_status "   git commit -m 'test: CI/CD setup'"
    print_status "   git push origin development"
    print_status "3. Check GitHub Actions tab for running workflows"
    print_status "4. Check EAS dashboard for build progress"
    
    print_warning "Note: First build may take longer due to dependency installation"
}

# Function to show next steps
show_next_steps() {
    print_header "Next Steps"
    
    echo "1. Add GitHub secrets (see GITHUB_SECRETS_TEMPLATE.md)"
    echo "2. Set up branch protection rules"
    echo "3. Test the CI/CD pipeline"
    echo "4. Configure store submission credentials"
    echo "5. Set up monitoring and notifications"
    echo ""
    echo "Documentation:"
    echo "- CI/CD Workflow: CI_CD_WORKFLOW.md"
    echo "- Build Script: ./build.sh"
    echo "- EAS Configuration: frontend/eas.json"
    echo ""
    echo "Quick commands:"
    echo "- Local build: ./build.sh"
    echo "- EAS build: cd frontend && npx eas build --profile development --platform android"
    echo "- Check status: cd frontend && npx eas build:list"
}

# Main execution
main() {
    print_header "TRUKAPP CI/CD Setup"
    echo "This script will help you set up the CI/CD environment for TRUKAPP"
    echo ""
    
    check_prerequisites
    setup_eas_cli
    setup_github_repo
    create_secrets_template
    setup_branch_protection
    test_cicd_setup
    show_next_steps
    
    print_success "CI/CD setup completed!"
    print_status "Please follow the next steps above to complete the configuration"
}

# Run main function
main "$@"