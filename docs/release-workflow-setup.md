# Release Workflow Setup - TODO

## Production Release Workflow Added

A GitHub Actions workflow has been created at `.github/workflows/release.yml` for production releases.

### What it does:
- Triggers on version tags (e.g., v0.0.1, 0.0.1) pushed to main branch
- Runs full test suite across Node 18, 20, and 21
- Performs security audit
- Builds and verifies the package
- Publishes to npm
- Creates GitHub release with changelog

### TODO - Setup Required:
1. Add `NPM_TOKEN` secret to GitHub repository settings
   - Get automation token from npm
   - Add as repository secret in Settings > Secrets

2. Test the workflow:
   ```bash
   npm version patch  # or minor/major
   git push origin main
   git push origin --tags
   ```

3. Add status badges to README.md (optional):
   - See comments in `.github/workflows/release.yml` for badge URLs

### Notes:
- Beta releases from develop branch continue to work as before
- This workflow only runs on tags pushed to main branch
- The workflow verifies tag version matches package.json version

**Action Required**: Add NPM_TOKEN before first production release