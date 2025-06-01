# 🚀 Deployment Guide

This repository uses automated deployment to NPM via GitHub Actions with separate beta and production release channels.

## 📋 Deployment Strategy

### Beta Releases (develop branch)
- **Trigger**: Push to `develop` branch
- **NPM Tag**: `beta`
- **Version**: Automatically appends `-beta.YYYYMMDDHHMMSS` timestamp
- **Install**: `npm install digital-samba-mcp-server@beta`

### Production Releases (main branch tags)
- **Trigger**: Git tags matching `v*.*.*` pattern (e.g., `v1.2.3`)
- **NPM Tag**: `latest`
- **Version**: Must match the git tag version
- **Install**: `npm install digital-samba-mcp-server`

## 🔧 Required GitHub Secrets

You need to configure these secrets in your GitHub repository settings:

### Repository Secrets (`Settings > Secrets and variables > Actions`)

| Secret Name | Required | Description | How to Get |
|-------------|----------|-------------|------------|
| `NPM_TOKEN` | ✅ **Required** | NPM authentication token for publishing packages | [See NPM Token Setup](#npm-token-setup) |
| `TEST_API_KEY` | ⚠️ Optional | Digital Samba API key for running integration tests | From your Digital Samba dashboard |

### Repository Environments (Optional but Recommended)

For better security, create these environments in `Settings > Environments`:

#### `npm-beta` Environment
- **Protection rules**: None (auto-deploy)
- **Secrets**: None (uses repository secrets)

#### `npm-production` Environment  
- **Protection rules**: 
  - ✅ Required reviewers (1-2 people)
  - ✅ Restrict to protected branches only
- **Secrets**: None (uses repository secrets)

## 🔑 NPM Token Setup

1. **Login to NPM**: Go to [npmjs.com](https://www.npmjs.com) and sign in
2. **Access Tokens**: Click your profile → "Access Tokens"
3. **Generate Token**: 
   - Click "Generate New Token"
   - Choose "Automation" type
   - Set expiration (recommend 1 year)
   - Copy the token (starts with `npm_`)
4. **Add to GitHub**:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## 🏗️ Workflow Files

### Primary Deployment Workflow
- **File**: `.github/workflows/npm-deploy.yml`
- **Purpose**: Handles all npm deployments (beta + production)
- **Triggers**: Push to develop, tags v*.*.*, manual dispatch

### Existing CI/CD Workflow
- **File**: `.github/workflows/ci-cd.yml` 
- **Purpose**: General testing and validation
- **Status**: Can coexist with npm-deploy.yml

## 📦 How to Deploy

### Beta Deployment (develop → npm@beta)
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR to develop
git push origin feature/my-feature
# Create PR: feature/my-feature → develop

# 4. Merge PR to develop (triggers beta deployment)
# The workflow will automatically:
# - Run tests
# - Build package
# - Publish to npm with beta tag
# - Version becomes: 1.5.0-beta.20241201123045
```

### Production Deployment (main → npm@latest)
```bash
# 1. Ensure develop is merged to main
git checkout main
git pull origin main

# 2. Update version in package.json
npm version patch  # 1.5.0 → 1.5.1
# or
npm version minor  # 1.5.0 → 1.6.0
# or  
npm version major  # 1.5.0 → 2.0.0

# 3. Push with tags (triggers production deployment)
git push origin main --tags

# The workflow will automatically:
# - Verify version matches tag
# - Run tests
# - Build package  
# - Create GitHub release
# - Publish to npm with latest tag
```

## 🔍 Monitoring Deployments

### GitHub Actions
- Go to your repo → Actions tab
- Monitor "NPM Deployment" workflow runs
- Check job logs for any issues

### NPM Package Status
- **Beta**: https://www.npmjs.com/package/digital-samba-mcp-server?activeTab=versions
- **Production**: https://www.npmjs.com/package/digital-samba-mcp-server

### Installation Testing
```bash
# Test beta install
npm install digital-samba-mcp-server@beta

# Test production install  
npm install digital-samba-mcp-server@latest
```

## 🚨 Troubleshooting

### Common Issues

#### ❌ "npm ERR! 403 Forbidden"
- **Cause**: Invalid or expired NPM_TOKEN
- **Fix**: Regenerate NPM token and update GitHub secret

#### ❌ "Version mismatch" 
- **Cause**: Git tag doesn't match package.json version
- **Fix**: Ensure `git tag v1.2.3` matches `"version": "1.2.3"` in package.json

#### ❌ "Tests failing in workflow"
- **Cause**: Missing TEST_API_KEY or code issues
- **Fix**: Add valid API key secret or fix test code

#### ❌ "Build artifacts not found"
- **Cause**: Build job failed or artifacts expired
- **Fix**: Check build job logs and fix any build errors

### Manual Recovery

If automatic deployment fails, you can deploy manually:

```bash
# 1. Build locally
npm run build:prod

# 2. Login to npm
npm login

# 3. Publish manually
npm publish --tag beta    # for beta
npm publish --tag latest  # for production
```

## 📚 Additional Resources

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)