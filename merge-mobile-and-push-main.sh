#!/bin/bash

# Script to merge main into mobile branch and then push to main
# This ensures mobile branch stays in sync and main gets updated

echo "🔄 Starting mobile branch sync and main push workflow"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "💡 Please commit or stash your changes before proceeding."
    echo "   Current changes:"
    git status --short
    exit 1
fi

# Fetch latest changes from remote
echo "📥 Fetching latest changes from remote..."
git fetch origin

# Switch to mobile branch
echo "🔄 Switching to mobile branch..."
git checkout mobile

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to switch to mobile branch"
    exit 1
fi

# Merge main into mobile
echo "🔀 Merging main into mobile..."
git merge origin/main

if [ $? -ne 0 ]; then
    echo "❌ Error: Merge failed. Please resolve conflicts manually."
    echo "💡 After resolving conflicts, run:"
    echo "   git add ."
    echo "   git commit"
    exit 1
fi

# Ensure backend folder is still ignored
echo "🔍 Checking backend folder status..."
if git ls-files | grep -q "^backend/"; then
    echo "⚠️  Warning: Backend folder is still tracked. Removing from index..."
    git rm -r --cached backend/ 2>/dev/null || true
    git add .gitignore
    git commit -m "Ensure backend folder remains excluded from mobile branch" || true
fi

# Push mobile branch
echo "📤 Pushing mobile branch..."
git push origin mobile

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push mobile branch"
    exit 1
fi

# Switch to main branch
echo "🔄 Switching to main branch..."
git checkout main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to switch to main branch"
    exit 1
fi

# Pull latest changes from remote main
echo "📥 Pulling latest changes from remote main..."
git pull origin main

# Push to main (this will include backend changes)
echo "📤 Pushing to main branch (production)..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push to main branch"
    exit 1
fi

echo "✅ Successfully completed mobile sync and main push!"
echo "📊 Current status:"
git status --short

echo ""
echo "🔄 Next steps:"
echo "   1. Switch back to your working branch: git checkout $current_branch"
echo "   2. Continue development on: $current_branch"

# Optional: Switch back to original branch
read -p "🔄 Switch back to $current_branch? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout $current_branch
    echo "✅ Switched back to $current_branch"
fi
