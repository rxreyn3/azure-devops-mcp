# Contributing to Azure DevOps MCP Server

Thank you for your interest in contributing to the Azure DevOps MCP Server! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

1. **Node.js** (>= 18.0.0) - Required for running the MCP server
2. **Bun** (>= 1.0.0) - Used for development tooling
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

### Why Bun for Development?

We use Bun as our development toolchain because it provides:
- ⚡ 10x faster package installation
- 🚀 Native TypeScript execution (no compilation needed during development)
- 🧪 Built-in test runner with great DX
- 📦 Fast bundling when needed

**Important**: The final MCP server artifact runs on Node.js, not Bun. This ensures maximum compatibility with the MCP ecosystem.

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ado-mcp-server.git
   cd ado-mcp-server
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Azure DevOps credentials for testing
   ```

4. Run the development server:
   ```bash
   bun run dev
   ```

## Development Workflow

### Available Scripts

- `bun run dev` - Run TypeScript directly with hot reload
- `bun run build` - Compile TypeScript to JavaScript for Node.js
- `bun test` - Run tests with Bun's built-in test runner
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run typecheck` - Type checking without emitting files
- `bun run verify:node` - Verify the built artifact works with Node.js

### Code Style

- We use ESLint and Prettier for code formatting
- Run `bun run format` before committing
- TypeScript strict mode is enabled

### Testing

Tests are written using Bun's built-in test runner:

```typescript
import { describe, it, expect } from "bun:test";

describe("MyFeature", () => {
  it("should work correctly", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run tests with:
```bash
bun test                 # Run all tests
bun test --watch        # Watch mode
bun test --coverage     # With coverage
```

### Building for Production

The MCP server must run on Node.js in production:

```bash
# Build TypeScript to JavaScript
bun run build

# Test with Node.js
node dist/index.js
```

## Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test thoroughly

3. Ensure all checks pass:
   ```bash
   bun run prerelease  # Runs lint, typecheck, test, and build
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Changelog Management

### Overview

We use [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format with automated processing during releases. **All changes must be documented in `CHANGELOG.md`** as part of your feature branch.

### CHANGELOG.md Structure

The changelog uses the following structure:

```markdown
## [Unreleased]

### Added
- New features go here

### Changed  
- Modified functionality goes here

### Fixed
- Bug fixes go here

### Security
- Security improvements go here

## [1.0.0] - 2025-01-06
# Previous versions...
```

### Required Process

**⚠️ Important**: You **must** update `CHANGELOG.md` in your feature branch, not after merging!

#### Step 1: Update CHANGELOG.md in Your Branch
When making changes, add entries under the appropriate `[Unreleased]` section:

```markdown
## [Unreleased]

### Added
- New `get_work_items` tool for querying Azure DevOps work items
- Enhanced error messages with troubleshooting context

### Changed
- Improved connection timeout handling in health checks

### Fixed
- Fixed race condition in agent status updates

### Security
- Added input validation for work item IDs
```

#### Step 2: Follow These Guidelines

**For Added Section:**
- New tools, features, or capabilities
- New configuration options
- New documentation sections

**For Changed Section:**
- Modified existing functionality
- Updated dependencies
- Changed default behaviors
- API improvements

**For Fixed Section:**
- Bug fixes
- Error handling improvements
- Performance fixes

**For Security Section:**
- Security patches
- Vulnerability fixes
- Enhanced validation
- Permission improvements

#### Step 3: Commit Everything Together
```bash
git add CHANGELOG.md src/your-changes.ts
git commit -m "feat: add work item management tools

- Add get_work_items and list_work_items tools
- Improve error handling for API timeouts
- Update changelog with new features"
```

### What Happens During Release

The automated release workflow will:

1. **Extract** all content from `[Unreleased]` sections
2. **Create** a new version section (e.g., `[1.1.0] - 2025-01-09`)
3. **Move** all unreleased changes to the new version
4. **Reset** `[Unreleased]` sections to empty templates
5. **Generate** release notes from the changelog content

### Example: Before and After Release

**Before Release (in your PR):**
```markdown
## [Unreleased]

### Added
- New work item management tools
- Enhanced error handling

### Fixed
- Connection timeout issues

## [1.0.0] - 2025-01-06
# Previous release content...
```

**After Release (automatic):**
```markdown
## [Unreleased]

### Added

### Changed

### Fixed

### Security

## [1.1.0] - 2025-01-09

### Added
- New work item management tools
- Enhanced error handling

### Fixed
- Connection timeout issues

## [1.0.0] - 2025-01-06
# Previous release content...
```

### Common Mistakes to Avoid

❌ **Don't** update changelog after merging to main  
❌ **Don't** leave `[Unreleased]` sections empty when making changes  
❌ **Don't** add version numbers or dates (automation handles this)  
❌ **Don't** edit previous version sections  

✅ **Do** update changelog in your feature branch  
✅ **Do** be descriptive about what changed  
✅ **Do** categorize changes appropriately  
✅ **Do** include user-facing impact descriptions  

## Commit Message Guidelines

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions or modifications

## Submitting Pull Requests

1. Push your branch to your fork
2. Open a PR against the main repository
3. Fill out the PR template
4. Ensure all CI checks pass

## Security

### Sensitive Files

Never commit sensitive information. The following are ignored by git:
- `.env` files (except `.env.example`)
- `*.pem`, `*.key`, `*.cert` files
- Azure DevOps credentials
- Personal access tokens

### Reporting Security Issues

Please report security vulnerabilities privately through GitHub Security Advisories.

## Questions?

Feel free to open an issue for any questions about contributing!