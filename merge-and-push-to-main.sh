#!/bin/bash

# Enhanced script to merge current branch into main and push to production
# This script ensures main branch is always updated after merging

echo "🚀 Starting merge and push to main workflow"

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
    echo "💡 Please commit or stash your changes before merging to main."
    echo "   Current changes:"
    git status --short
    exit 1
fi

# Don't proceed if already on main branch
if [ "$current_branch" = "main" ]; then
    echo "ℹ️  Already on main branch. Pushing current changes..."
    git push origin main
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed to main branch!"
    else
        echo "❌ Failed to push to main branch"
        exit 1
    fi
    exit 0
fi

# Fetch latest changes from remote
echo "📥 Fetching latest changes from remote..."
git fetch origin

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

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull latest changes from main"
    exit 1
fi

# Merge current branch into main
echo "🔀 Merging $current_branch into main..."
git merge $current_branch

if [ $? -ne 0 ]; then
    echo "❌ Error: Merge failed. Please resolve conflicts manually."
    echo "💡 After resolving conflicts, run:"
    echo "   git add ."
    echo "   git commit"
    echo "   git push origin main"
    exit 1
fi

# Push to remote main
echo "📤 Pushing to remote main..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push to remote main"
    exit 1
fi

echo "✅ Successfully merged $current_branch into main and pushed to production!"
echo "📊 Current status:"
git status --short

echo ""
echo "🔄 Next steps:"
echo "   1. Switch back to your working branch: git checkout $current_branch"
echo "   2. Update mobile branch if needed: ./merge-main-to-mobile.sh"
echo "   3. Continue development on: $current_branch"

# Optional: Switch back to original branch
read -p "🔄 Switch back to $current_branch? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout $current_branch
    echo "✅ Switched back to $current_branch"
fi
