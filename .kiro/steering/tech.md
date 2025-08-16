# Technology Stack

## Runtime & Language
- **Node.js**: >=18.0.0 (ES2022 target)
- **TypeScript**: ^5.8.3 with strict mode enabled
- **Module System**: ES modules (NodeNext resolution)
- **Development Runtime**: Bun for development (`bun run --watch`)

## Core Dependencies
- **@modelcontextprotocol/sdk**: ^1.12.1 - MCP protocol implementation
- **azure-devops-node-api**: ^15.1.0 - Azure DevOps REST API client
- **dotenv**: ^16.5.0 - Environment variable management

## Testing Framework
- **Vitest**: ^3.2.4 - Test runner with coverage
- **@vitest/coverage-v8**: ^3.2.4 - Code coverage reporting
- **Coverage Thresholds**: 80% for branches, functions, lines, statements

## Build System
- **TypeScript Compiler**: Direct `tsc` compilation
- **Output**: `dist/` directory with declaration files and source maps
- **Package Distribution**: NPM package with CLI binary

## Common Commands

### Development
```bash
# Start development server with hot reload
npm run dev

# Type checking without compilation
npm run typecheck

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Production
```bash
# Start compiled server
npm start

# Publish release (uses changesets)
npm run release
```

## Configuration
- **Environment Variables**: ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT, LOG_LEVEL
- **TypeScript Config**: Strict mode, NodeNext modules, ES2022 target
- **Test Setup**: Global setup file at `tests/setup.ts`
- **Coverage**: HTML reports in `coverage/` directory