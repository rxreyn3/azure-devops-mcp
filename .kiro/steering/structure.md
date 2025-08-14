# Project Structure

## Root Directory Organization

```
├── src/                    # Source code
├── tests/                  # Test files
├── dist/                   # Compiled output (generated)
├── coverage/               # Test coverage reports (generated)
├── .kiro/                  # Kiro configuration and steering
├── .changeset/             # Changeset configuration for releases
└── artifacts/              # Build artifacts and temporary files
```

## Source Code Structure (`src/`)

```
src/
├── index.ts               # CLI entry point with shebang
├── server.ts              # Main MCP server class
├── config.ts              # Configuration validation and loading
├── clients/               # Azure DevOps API clients
│   ├── index.ts           # Client exports
│   ├── ado-base-client.ts # Base client with common functionality
│   ├── build-client.ts    # Build operations client
│   ├── pipeline-client.ts # Pipeline operations client
│   └── task-agent-client.ts # Agent and queue operations client
├── tools/                 # MCP tool definitions and handlers
│   ├── index.ts           # Tool registry creation
│   ├── agent-tools.ts     # Agent management tools
│   └── build-tools.ts     # Build and pipeline tools
├── types/                 # TypeScript type definitions
│   ├── index.ts           # Type exports
│   ├── api-types.ts       # Azure DevOps API types
│   └── tool-types.ts      # MCP tool-specific types
└── utils/                 # Utility functions
    ├── enum-mappers.ts    # Azure DevOps enum conversions
    ├── error-handlers.ts  # Error handling utilities
    ├── formatters.ts      # Data formatting utilities
    ├── temp-manager.ts    # Temporary file management
    └── validators.ts      # Input validation utilities
```

## Test Structure (`tests/`)

```
tests/
├── setup.ts               # Global test configuration
├── fixtures/              # Test data and mock responses
│   ├── azure-responses/   # Mock Azure DevOps API responses
│   ├── mcp-messages/      # Mock MCP protocol messages
│   ├── fixture-utils.ts   # Fixture loading utilities
│   └── sample-data.ts     # Sample test data
├── helpers/               # Test utilities and helpers
│   ├── mcp-test-utils.ts  # MCP protocol testing utilities
│   ├── mock-factory.ts    # Mock object factory
│   └── test-utils.ts      # General test utilities
├── unit/                  # Unit tests (mirrors src/ structure)
│   ├── clients/           # Client tests
│   ├── tools/             # Tool tests
│   ├── utils/             # Utility tests
│   └── helpers/           # Helper tests
├── integration/           # Integration tests
└── e2e/                   # End-to-end tests
```

## Architecture Patterns

### Client Layer
- **Base Client**: `ado-base-client.ts` provides common Azure DevOps API functionality
- **Specialized Clients**: Extend base client for specific API domains (builds, agents, pipelines)
- **Error Handling**: Consistent error handling across all clients

### Tool Layer
- **Tool Registry**: Central registration of all MCP tools with handlers
- **Tool Definitions**: Each tool file exports both tool definitions and handlers
- **Handler Pattern**: Async functions that take arguments and return MCP-compatible responses

### Type System
- **API Types**: Mirror Azure DevOps API response structures
- **Tool Types**: Define MCP tool input/output schemas
- **Config Types**: Environment and configuration validation

### Utilities
- **Single Responsibility**: Each utility module handles one concern
- **Reusable**: Utilities are used across clients and tools
- **Testable**: All utilities have corresponding unit tests

## File Naming Conventions

- **kebab-case**: All file and directory names use kebab-case
- **Descriptive**: Names clearly indicate purpose (e.g., `task-agent-client.ts`)
- **Test Suffix**: Test files end with `.test.ts`
- **Index Files**: Use `index.ts` for module exports and re-exports

## Import/Export Patterns

- **ES Modules**: Use `.js` extensions in imports (TypeScript requirement)
- **Barrel Exports**: Use `index.ts` files to create clean import paths
- **Named Exports**: Prefer named exports over default exports
- **Type-Only Imports**: Use `import type` for type-only imports