# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev

# Run tests
bun test
bun test:unit        # Unit tests only
bun test:coverage    # With coverage report

# Build for production (Node.js)
bun run build

# Type checking and linting
bun run typecheck
bun run lint

# Verify Node.js compatibility
bun run verify:node
```

### Release Management
```bash
# Create a changeset for your changes
bun run changeset

# Version packages based on changesets
bun run version-packages

# Publish to npm (usually done by CI)
bun run release
```

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides Azure DevOps functionality. The codebase follows a modular architecture:

### Core Structure
- **Entry Point**: `src/index.ts` - CLI entry point that initializes the server
- **Server**: `src/server.ts` - MCP server implementation using stdio transport
- **Configuration**: `src/config.ts` - Environment validation and config management

### Client Layer (`src/clients/`)
- **Base Client**: `ado-base-client.ts` - Abstract base class for Azure DevOps API clients
- **Task Agent Client**: `task-agent-client.ts` - Handles agent and queue operations
- **Build Client**: `build-client.ts` - Manages build and pipeline operations

### Tools Layer (`src/tools/`)
- **Tool Registry**: `index.ts` - Combines all tools into a unified registry
- **Agent Tools**: `agent-tools.ts` - Queue and agent management tools
- **Build Tools**: `build-tools.ts` - Build operations (list, queue, manage)
- **Pipeline Tools**: `pipeline-tools.ts` - Pipeline discovery and monitoring

### Utilities (`src/utils/`)
- **Error Handlers**: `error-handlers.ts` - Centralized error handling with permission awareness
- **Formatters**: `formatters.ts` - Consistent formatting for API responses

### Type Definitions (`src/types/`)
- Centralized TypeScript interfaces for API responses and tool schemas

## Key Design Patterns

1. **Permission-Aware Error Handling**: The server gracefully handles permission errors and provides clear guidance to users about required permissions.

2. **Modular Tool System**: Each tool category (agents, builds, pipelines) is defined in its own module and combined through the tool registry.

3. **Dual Runtime Support**: Developed with Bun for speed but built to run on Node.js for compatibility.

4. **Project-Scoped Operations**: All tools work within project context, with optional organization-level features that degrade gracefully.

## Testing Strategy

- Tests are located in `tests/` directory
- Mock Azure DevOps API responses in `tests/mocks/`
- Test runner configuration in `tests/setup.ts`
- Use `bun test` for fast test execution during development

## Environment Configuration

Required environment variables:
- `ADO_ORGANIZATION`: Azure DevOps organization URL
- `ADO_PROJECT`: Project name
- `ADO_PAT`: Personal Access Token with appropriate scopes

The server validates these on startup and provides clear error messages if misconfigured.