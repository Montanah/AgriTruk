# Git Workflow Guide for AgriTruk

This guide explains how to manage changes between frontend, backend, and main branches for deployment.

## 🌿 Branch Structure

- **`main`** - Production branch (used for Render deployment)
- **`mobile`** - Development branch (your current working branch)
- **`backend`** - Backend-specific branch (from remote)
- **`develop`** - Alternative development branch

## 🔄 Workflow for Changes

### Option 1: Direct Development on Main (Recommended for Solo Development)

```bash
# 1. Always work on main branch
git checkout main
git pull origin main

# 2. Make your changes (frontend or backend)
# ... make changes ...

# 3. Commit and push directly to main
git add .
git commit -m "Your commit message"
git push origin main

# 4. Render will automatically deploy from main branch
```

### Option 2: Feature Branch Workflow (Recommended for Team Development)

```bash
# 1. Create a feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Make your changes
# ... make changes ...

# 3. Commit your changes
git add .
git commit -m "Add your feature"

# 4. Push feature branch
git push origin feature/your-feature-name

# 5. Merge to main (via GitHub PR or locally)
git checkout main
git merge feature/your-feature-name
git push origin main

# 6. Clean up feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## 🚀 Current Status

Your current setup:
- ✅ **Main branch**: Contains all merged changes (frontend + backend + deployment config)
- ✅ **Mobile branch**: Your development branch with all recent changes
- ✅ **Render deployment**: Configured to deploy from main branch

## 📋 Recommended Workflow Going Forward

### For Frontend Changes:
```bash
# 1. Switch to main branch
git checkout main
git pull origin main

# 2. Make frontend changes
cd frontend
# ... make your changes ...

# 3. Test locally
npm install
npx expo start

# 4. Commit and push
cd ..
git add .
git commit -m "Update frontend: describe your changes"
git push origin main
```

### For Backend Changes:
```bash
# 1. Switch to main branch
git checkout main
git pull origin main

# 2. Make backend changes
cd backend
# ... make your changes ...

# 3. Test locally
npm install
npm start

# 4. Commit and push
cd ..
git add .
git commit -m "Update backend: describe your changes"
git push origin main
```

### For Both Frontend and Backend Changes:
```bash
# 1. Switch to main branch
git checkout main
git pull origin main

# 2. Make changes to both
# ... make frontend changes ...
# ... make backend changes ...

# 3. Test both locally
cd frontend && npm install && npx expo start &
cd ../backend && npm install && npm start &

# 4. Commit and push
cd ..
git add .
git commit -m "Update both frontend and backend: describe your changes"
git push origin main
```

## 🔧 Render Deployment Configuration

Your Render services are configured to:
- **Backend Service**: Deploy from `main` branch, root directory `backend`
- **Frontend Service**: Deploy from `main` branch, root directory `frontend`

## 📝 Best Practices

### 1. Always Pull Before Making Changes
```bash
git checkout main
git pull origin main
```

### 2. Test Locally Before Pushing
```bash
# Test backend
cd backend && npm install && npm start

# Test frontend
cd frontend && npm install && npx expo start
```

### 3. Use Descriptive Commit Messages
```bash
git commit -m "Add user authentication to frontend"
git commit -m "Fix transporter location update API"
git commit -m "Update subscription payment flow"
```

### 4. Keep Main Branch Clean
- Only push working, tested code to main
- Use feature branches for experimental changes
- Regularly sync with remote

## 🚨 Emergency Rollback

If you need to rollback a deployment:

```bash
# 1. Check recent commits
git log --oneline -5

# 2. Revert to previous commit
git revert <commit-hash>

# 3. Push the revert
git push origin main
```

## 🔍 Monitoring Deployments

1. **Render Dashboard**: Check deployment status and logs
2. **GitHub**: Monitor commits and branch status
3. **Application URLs**: Test deployed services

## 📞 Troubleshooting

### If Main Branch Gets Out of Sync:
```bash
# Force sync with remote
git checkout main
git fetch origin
git reset --hard origin/main
```

### If You Need to Merge Mobile Branch Again:
```bash
git checkout main
git merge mobile
git push origin main
```

### If You Want to Keep Mobile Branch Updated:
```bash
git checkout mobile
git merge main
git push origin mobile
```

## 🎯 Quick Commands Reference

```bash
# Switch to main and pull latest
git checkout main && git pull origin main

# Make changes, then commit and push
git add . && git commit -m "Your message" && git push origin main

# Check current branch and status
git branch && git status

# View recent commits
git log --oneline -5
```

## 📋 Deployment Checklist

Before pushing to main:
- [ ] Code tested locally
- [ ] No console errors
- [ ] Environment variables updated if needed
- [ ] Dependencies updated if needed
- [ ] Commit message is descriptive
- [ ] Ready for production deployment

Remember: Every push to main triggers an automatic deployment on Render!
