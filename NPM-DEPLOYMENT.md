# NPM Package Deployment

This document outlines the process for deploying the Digital Samba MCP Server as an NPM package.

## Prerequisites

- NPM account with publish access
- GitHub repository with GitHub Actions enabled
- NPM access token with read/write permissions

## Setting Up NPM Deployment

### 1. Create NPM Access Token

1. Log in to your NPM account at [npmjs.com](https://www.npmjs.com/)
2. Go to your profile and select "Access Tokens"
3. Create a new token with "Automation" type (read/write)
4. Copy the generated token

### 2. Add NPM Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token you created
6. Click "Add secret"

### 3. Enable GitHub Actions Workflow

The repository comes with a pre-configured GitHub Actions workflow for automated NPM publishing. To enable it:

1. Uncomment the publishing steps in `.github/workflows/ci-cd.yml`
2. Commit the changes to the repository

## Release Process

To release a new version:

1. Update your local repository:
   ```bash
   git pull origin main
   ```

2. Run the version command to update package.json and create a tag:
   ```bash
   npm version [patch|minor|major]
   ```
   - Use `patch` for bug fixes (0.1.0 → 0.1.1)
   - Use `minor` for new features (0.1.0 → 0.2.0)
   - Use `major` for breaking changes (0.1.0 → 1.0.0)

3. Push the changes and tags:
   ```bash
   git push origin main --tags
   ```

4. The GitHub Actions workflow will automatically:
   - Run tests
   - Build the package
   - Create a GitHub release
   - Publish to NPM

## Manual Publishing (if needed)

If you need to publish manually:

1. Ensure you're logged in to NPM:
   ```bash
   npm login
   ```

2. Build the package:
   ```bash
   npm run build
   ```

3. Publish the package:
   ```bash
   npm publish
   ```

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- MAJOR version for incompatible API changes
- MINOR version for backward-compatible functionality additions
- PATCH version for backward-compatible bug fixes

## Changelog Management

The GitHub Actions workflow automatically generates a changelog based on commit messages when creating a release. For best results:

- Use conventional commit messages (feat:, fix:, docs:, etc.)
- Reference issue numbers in commit messages when applicable

## Package Configuration

The package is configured in package.json with:

- Binary executable: `digital-samba-mcp`
- Main entry point: `dist/index.js`
- Included files: `dist`, `README.md`, `PACKAGE.md`, `TROUBLESHOOTING.md`, `LICENSE`

## Post-Release Validation

After a release:

1. Verify the package is available on NPM:
   ```bash
   npm view digital-samba-mcp
   ```

2. Test installation in a clean environment:
   ```bash
   npm install -g digital-samba-mcp
   digital-samba-mcp --version
   ```

## Troubleshooting

If you encounter issues with NPM deployment:

1. Verify the NPM token is still valid
2. Check GitHub Actions logs for errors
3. Ensure version number in package.json is updated
4. Verify package contents before publishing: `npm pack`