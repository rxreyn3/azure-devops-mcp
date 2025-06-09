# GitHub Workflows

This directory contains the streamlined CI/CD workflows for the Azure DevOps MCP Server.

## Workflows

### `ci.yml` - Continuous Integration
- **Triggers**: Push to main, Pull Requests to main
- **Purpose**: Automated testing, linting, type checking, and building
- **Actions**: 
  - Install dependencies with Bun
  - Run linting (`bun run lint`)
  - Run type checking (`bun run typecheck`) 
  - Run tests (`bun test`)
  - Build project (`bun run build`)
  - Verify Node.js compatibility

### `release.yml` - Release Management
- **Triggers**: Manual dispatch only
- **Purpose**: Complete release workflow with version management
- **Actions**:
  - Bump version (patch/minor/major)
  - Run full test suite
  - Update version in source files
  - Create git tag and push
  - Build and publish to npm
  - Create GitHub release with changelog

## Usage

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push and create Pull Request
4. CI runs automatically on PR
5. Merge when ready

### Release Workflow
1. Update `CHANGELOG.md` with changes in `[Unreleased]` section
2. Go to GitHub Actions → "Release" workflow
3. Click "Run workflow"
4. Select version type (patch/minor/major)
5. Workflow handles everything else automatically

## Secrets Required

Make sure these GitHub secrets are configured:
- `NPM_TOKEN` - Token for publishing to npm registry
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Previous Workflows

The following workflows were removed to eliminate redundancy:
- `publish.yml` - Functionality merged into `release.yml`
- `release-tag.yml` - Functionality merged into `release.yml`
