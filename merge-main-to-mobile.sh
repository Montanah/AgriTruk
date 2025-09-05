#!/bin/bash

# Script to merge main branch into mobile branch
# This ensures mobile branch stays in sync with main while excluding backend folder

echo "🔄 Starting merge process: main → mobile"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Switch to mobile branch
echo "🔄 Switching to mobile branch..."
git checkout mobile

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to switch to mobile branch"
    exit 1
fi

# Fetch latest changes from remote
echo "📥 Fetching latest changes from remote..."
git fetch origin

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

echo "✅ Merge completed successfully!"
echo "📊 Current status:"
git status --short

echo ""
echo "🚀 Next steps:"
echo "   1. Review the changes: git log --oneline -10"
echo "   2. Push to remote: git push origin mobile"
echo "   3. Switch back to your working branch: git checkout $current_branch"
