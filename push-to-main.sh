#!/bin/bash

# Script to push changes to main branch (includes backend folder)
# This should be used when you want to push backend changes

echo "🚀 Starting push to main branch process"

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
    echo "💡 Please commit or stash your changes before pushing to main."
    echo "   Current changes:"
    git status --short
    exit 1
fi

# Switch to main branch
echo "🔄 Switching to main branch..."
git checkout main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to switch to main branch"
    exit 1
fi

# Fetch latest changes from remote
echo "📥 Fetching latest changes from remote..."
git fetch origin

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Merge current branch into main
if [ "$current_branch" != "main" ]; then
    echo "🔀 Merging $current_branch into main..."
    git merge $current_branch
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Merge failed. Please resolve conflicts manually."
        echo "💡 After resolving conflicts, run:"
        echo "   git add ."
        echo "   git commit"
        exit 1
    fi
fi

# Push to remote main
echo "📤 Pushing to remote main..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push to remote main"
    exit 1
fi

echo "✅ Successfully pushed to main branch!"
echo "📊 Current status:"
git status --short

echo ""
echo "🔄 Next steps:"
echo "   1. Switch back to your working branch: git checkout $current_branch"
echo "   2. Update mobile branch: ./merge-main-to-mobile.sh"
