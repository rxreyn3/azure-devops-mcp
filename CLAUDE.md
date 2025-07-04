# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `bun install` - Install dependencies
- `bun run build` - Build TypeScript to dist/
- `bun run dev` - Run in watch mode for development
- `bun run typecheck` - Type check without emitting files
- `bun run clean` - Remove dist directory
- `bun run release` - Publish packages using changesets

## Architecture Overview

### Core Structure
This is a Model Context Protocol (MCP) server for Azure DevOps, providing tools to interact with agents, queues, and builds.

**Key Components:**
- `src/server.ts` - Main MCP server class that handles tool registration and request routing
- `src/index.ts` - Entry point that validates config and starts the server
- `src/tools/` - Tool definitions split by domain (agent-tools.ts, build-tools.ts)
- `src/clients/` - Azure DevOps API clients (TaskAgentClient, BuildClient) extending BaseClient
- `src/types/` - TypeScript type definitions for tools, API responses, and domain models
- `src/utils/` - Shared utilities for validation, error handling, formatting, and enum mapping

### Tool Organization
Tools are organized by Azure DevOps scope requirements:
- **Project-scoped tools** (`project_*`) - Work with project-level PATs
- **Organization-scoped tools** (`org_*`) - Require org-level permissions (agents exist at org level)
- **Build tools** (`build_*`) - Access build timelines and execution details

### Client Pattern
All API clients extend `AdoBaseClient` which handles:
- WebApi connection initialization
- Common error handling patterns
- Shared configuration

### MCP Integration
The server uses the Model Context Protocol SDK to:
- Register available tools via `ListToolsRequestSchema`
- Handle tool invocations via `CallToolRequestSchema`
- Provide typed tool schemas with Zod validation

## Parameter Handling

### Build API vs Pipeline API
Azure DevOps provides two different APIs for queuing builds/pipelines, each with different parameter handling:

**Build API** (`/build/builds` endpoint):
- Uses `parameters` field as a **JSON string**
- All parameter values must be strings in the tool input
- Example: `{"parameters": "{\"MaxScenesToRender\": \"10\"}"}`
- Parameters are displayed as quoted strings in Azure DevOps UI

**Pipeline API** (`/pipelines/{id}/runs` endpoint):
- Uses `templateParameters` as a direct object
- Currently not implemented in this MCP server
- Would allow native JSON types in parameters

### Important Notes
- Even though the Build API accepts a JSON string that could contain numbers, Azure DevOps treats all parameter values as strings
- Numeric parameters must be quoted (e.g., `"10"` not `10`) to ensure they're processed correctly
- This is validated by the tool schema which enforces string values for all parameters

## TypeScript Configuration
- Target: ES2022 with NodeNext modules
- Strict mode enabled
- Source maps included for debugging
- Declaration files generated for type exports