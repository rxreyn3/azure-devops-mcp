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