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

## Making Changes and Releases

### Using Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs. This ensures a consistent release process and automatically generates changelogs from your contributions.

### When to Create a Changeset

Create a changeset when you:
- ✅ Add new features or tools
- ✅ Fix bugs
- ✅ Make breaking changes
- ✅ Update dependencies that affect users
- ✅ Improve performance
- ✅ Enhance documentation (if user-facing)

Don't create a changeset for:
- ❌ Internal refactoring with no user impact
- ❌ Development tooling updates
- ❌ Test additions (unless fixing a bug)
- ❌ Typo fixes in comments

### How to Create a Changeset

1. After making your changes, run:
   ```bash
   npx changeset
   # or
   bun run changeset
   ```

2. Follow the interactive prompts:
   - **Select packages**: Choose `@rxreyn3/azure-devops-mcp`
   - **Select version type**:
     - `patch`: Bug fixes, minor improvements
     - `minor`: New features, non-breaking changes
     - `major`: Breaking changes
   - **Write a summary**: Describe what changed and why

3. This creates a file in `.changeset/` with a random name like `brave-pandas-dance.md`:
   ```markdown
   ---
   "@rxreyn3/azure-devops-mcp": patch
   ---

   Fixed connection timeout issues in Azure DevOps API calls
   ```

4. Commit the changeset file with your code:
   ```bash
   git add .
   git commit -m "fix: resolve connection timeout issues"
   ```

### Examples of Good Changeset Messages

**For a new feature (minor):**
```markdown
Added new `list_work_items` and `get_work_item_details` tools for Azure DevOps work item management. These tools support filtering by project, state, and assigned user.
```

**For a bug fix (patch):**
```markdown
Fixed agent status enum case mismatch that caused the `monitor_build_health` tool to report 0 for all build counts. Build statistics now correctly show succeeded, failed, and canceled counts.
```

**For a breaking change (major):**
```markdown
REAKING: Renamed `list_agents` tool to `list_queue_agents` for clarity. The tool now requires a `queueId` parameter instead of `poolId`. Users will need to update their tool calls to use the new name and parameter.
```

### The Automated Release Process

After you merge your PR:

1. **Changesets Action runs** on every push to `main`
2. **If changesets exist**, it creates/updates a "Version Packages" PR that:
   - Bumps the version in `package.json`
   - Updates `CHANGELOG.md` with all changesets
   - Deletes the changeset files
3. **When the Version PR is merged**:
   - Publishes to npm
   - Creates a GitHub release
   - Tags the commit

### Example Workflow

```bash
# 1. Create your feature branch
git checkout -b fix/connection-timeouts

# 2. Make your changes
# ... edit files ...

# 3. Create a changeset
npx changeset
# Select: @rxreyn3/azure-devops-mcp
# Select: patch
# Message: Fixed connection timeout issues in Azure DevOps API calls

# 4. Commit everything
git add .
git commit -m "fix: resolve connection timeout issues"

# 5. Push and create PR
git push origin fix/connection-timeouts
```

### Tips

- **Multiple changesets**: You can have multiple changesets in one PR if you're making several distinct changes
- **Editing changesets**: The `.md` files in `.changeset/` can be edited before committing
- **No manual versioning**: Never manually edit the version in `package.json`
- **Batched releases**: Multiple PRs can be released together in one version  

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