# Contributing to Azure DevOps MCP Server

Thank you for your interest in contributing to the Azure DevOps MCP Server! This guide will help you get started with development and contribution.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- Bun runtime (optional, for development)
- Azure DevOps account with appropriate permissions for testing

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/yourusername/ado-mcp-server.git
   cd ado-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your Azure DevOps credentials
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run in development mode:
   ```bash
   npm run dev
   # or with Bun for auto-reload
   bun run --watch src/index.ts
   ```

## Project Structure

```
ado-mcp-server/
├── src/
│   ├── clients/          # Azure DevOps API clients
│   ├── tools/            # MCP tool implementations
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── config.ts         # Configuration management
│   ├── server.ts         # MCP server implementation
│   └── index.ts          # Entry point
├── tests/                # Test files
└── dist/                 # Compiled output
```

## Adding New Tools

To add a new tool to the MCP server:

1. **Define the tool interface** in `src/types/tool-types.ts`:
   ```typescript
   export interface YourToolInput {
     // Define input parameters
   }
   ```

2. **Implement the tool** in the appropriate file under `src/tools/`:
   ```typescript
   export const yourTool: ToolDefinition<YourToolInput> = {
     name: 'your_tool_name',
     description: 'Clear description of what the tool does',
     input: {
       type: 'object',
       properties: {
         // Define JSON schema for parameters
       },
       required: ['param1'],
     },
     handler: async (input, context) => {
       // Implement tool logic
     },
   };
   ```

3. **Register the tool** in `src/tools/index.ts`:
   ```typescript
   export { yourTool } from './your-tools';
   ```

4. **Add tests** for your tool in `tests/tools/your-tool.test.ts`

5. **Update documentation**:
   - Add the tool to the "Available Tools" section in README.md
   - Include usage examples if applicable

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place test files next to the code they test with `.test.ts` extension
- Use descriptive test names that explain the expected behavior
- Mock Azure DevOps API calls to avoid external dependencies
- Test both success and error scenarios

Example test structure:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { yourTool } from './your-tools';

describe('yourTool', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should handle valid input correctly', async () => {
    // Test implementation
  });

  it('should handle errors gracefully', async () => {
    // Test error handling
  });
});
```

## Code Style

- We use TypeScript for type safety
- Code is formatted with Prettier (configuration in `.prettierrc`)
- Linting is handled by ESLint (configuration in `.eslintrc`)
- Run `npm run lint` before committing

### Style Guidelines

- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Handle errors gracefully with helpful messages
- Use async/await over promises
- Prefer functional programming patterns where appropriate

## Submitting Pull Requests

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Run tests and linting**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

4. **Commit your changes** with descriptive messages:
   ```bash
   git commit -m "feat: add support for work item queries"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation changes
   - `test:` Test additions or modifications
   - `refactor:` Code refactoring
   - `chore:` Maintenance tasks

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots or examples if applicable

### PR Requirements

- All tests must pass
- No linting errors
- Maintain or improve code coverage
- Update documentation as needed
- Add changeset if the change affects users:
  ```bash
  npx changeset
  ```

## Debugging

### MCP Inspector

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test your tools:

```bash
# Install globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector
```

### Logging

Enable debug logging by setting:
```bash
DEBUG=azure-devops-mcp:* npm run dev
```

## Getting Help

- Create an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs before creating new ones

## CI/CD Workflows

### Continuous Integration

The CI workflow runs automatically on:
- Push to main branch
- Pull requests to main branch

It performs:
- Type checking (`npm run typecheck`)
- Building (`npm run build`)
- Testing (when tests are added)

### Release Process

Releases are managed using Changesets:

1. When making changes, run `npx changeset` to create a changeset
2. Changesets are automatically versioned and released via CI/CD
3. Maintain semantic versioning principles

The release workflow:
- Automatically runs when changesets are merged to main
- Creates a "Version Packages" PR
- When merged, automatically publishes to npm

## Required Repository Secrets

For maintainers setting up the repository:
- `NPM_TOKEN` - Token for publishing to npm registry

Thank you for contributing!