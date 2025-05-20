# Semantic Versioning Strategy for Digital Samba MCP Server

This document outlines the semantic versioning strategy for the Digital Samba MCP Server npm package. We follow [Semantic Versioning 2.0.0](https://semver.org/) to ensure clear understanding of changes between releases.

## Version Format

We use the standard `MAJOR.MINOR.PATCH` format:

```
1.2.3
↑ ↑ ↑
│ │ └── Patch version: Backwards-compatible bug fixes
│ └──── Minor version: Backwards-compatible new features
└────── Major version: Backwards-incompatible changes
```

## Release Types

### Major Releases (X.0.0)

A major release indicates breaking changes that require updates to existing code. Examples include:

- Changing the API interface in a non-backwards-compatible way
- Removing or renaming public methods
- Significant changes to behavior that could break existing implementations
- Changes to the MCP server configuration format
- Updates to the minimum required Node.js version

### Minor Releases (0.X.0)

A minor release adds new functionality in a backwards-compatible manner. Examples include:

- Adding new tools or resources
- Expanding existing API capabilities
- Adding new optional parameters
- Performance improvements without API changes
- New features that don't affect existing functionality
- Non-breaking changes to Digital Samba API integration

### Patch Releases (0.0.X)

A patch release contains backwards-compatible bug fixes. Examples include:

- Bug fixes
- Security updates
- Documentation updates
- Minor optimizations
- Dependency updates that don't affect public API

## Pre-release Versions

Pre-release versions use the following format:

```
1.0.0-alpha.1
1.0.0-beta.1
1.0.0-rc.1
```

- **alpha**: Early development, incomplete features, likely to have bugs
- **beta**: Feature complete, possibly with bugs, ready for external testing
- **rc** (Release Candidate): Potentially final version awaiting testing

## Workflow for Version Updates

1. **Patch Update Process**:
   ```bash
   # Update version in package.json
   npm version patch
   # Push changes with tags
   git push --follow-tags
   ```

2. **Minor Update Process**:
   ```bash
   # Update version in package.json
   npm version minor
   # Push changes with tags
   git push --follow-tags
   ```

3. **Major Update Process**:
   ```bash
   # Update version in package.json
   npm version major
   # Push changes with tags
   git push --follow-tags
   ```

## Release Cadence

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Planned and announced well in advance

## Version Maintenance

We maintain:
- Latest version (active development)
- Last major release (critical bug fixes only)

## Documentation

Each release includes:
- A changelog describing all changes
- Migration guide for major version upgrades
- Updated documentation reflecting all changes

## Initial Version Strategy

- **0.1.x**: Initial development, alpha/beta quality
- **0.2.x**: Feature development, beta quality
- **1.0.0**: First stable release, production ready

## Changelog Generation

The changelog is automatically generated using the GitHub Actions workflow, based on conventional commit messages:

- **feat**: New feature (minor version bump)
- **fix**: Bug fix (patch version bump)
- **docs**: Documentation updates (no version bump)
- **style**: Code style changes (no version bump)
- **refactor**: Code refactoring (no version bump)
- **perf**: Performance improvements (patch version bump)
- **test**: Adding or updating tests (no version bump)
- **chore**: Maintenance tasks (no version bump)

## Commit Message Format

For best results with automatic changelog generation, follow the conventional commit format:

```
<type>(<scope>): <message>

[optional body]

[optional footer]
```

Example:
```
feat(recordings): add support for cloud recording storage

This adds support for storing recordings in the cloud storage provider.

Closes #123
```
