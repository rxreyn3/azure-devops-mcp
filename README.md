# Azure DevOps MCP Server

An MCP (Model Context Protocol) server that provides comprehensive Azure DevOps build and pipeline management capabilities within a project context. This server enables AI assistants to monitor builds, execute pipelines, troubleshoot failures, and manage build infrastructure.

**Developer**: Ryan Reynolds ([@rxreyn3](https://github.com/rxreyn3))

## Features

- **Project-scoped access**: Works within your project context
- **Build operations**: Monitor, execute, and troubleshoot builds
- **Pipeline management**: Discover and inspect build definitions
- **Queue management**: List and inspect agent queues
- **Agent discovery**: Find agents and their status (requires org permissions)
- **Permission-aware**: Gracefully handles permission limitations with clear guidance

## Tool Selection Philosophy

This MCP server provides a focused subset of Azure DevOps functionality optimized for daily build operations. We've prioritized tools based on:

1. **Usage Frequency**: Analysis shows 80% of API calls focus on build monitoring and execution
2. **Project Scope**: All tools work within project boundaries (except agent discovery)
3. **Practical Value**: Each tool addresses specific pain points in build administration

### Why These Tools?

- **Build Monitoring**: `list_builds`, `get_build_details` - Cover 60% of daily operations
- **Build Execution**: `queue_build` - Essential for CI/CD automation
- **Troubleshooting**: `get_build_logs`, `get_build_timeline` - Critical for failure analysis
- **Pipeline Discovery**: `list_pipelines`, `get_pipeline_config` - Helps users find and understand build definitions
- **Build Management**: `manage_build` - Cancel stuck builds or retain important ones
- **Health Monitoring**: `monitor_build_health` - Overview of build success rates and trends

See [API Priorities Documentation](docs/ado-mcp-api-priorities.md) for detailed analysis.

## Installation

```bash
npm install -g @rxreyn3/azure-devops-mcp
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
ADO_ORGANIZATION=https://dev.azure.com/yourorganization
ADO_PROJECT=YourProjectName
ADO_PAT=your_personal_access_token
```

### Required PAT Scopes

- `vso.build` (read) - Required for queue access
- `vso.agentpools` (read) - Optional but recommended for agent details

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["@rxreyn3/azure-devops-mcp"],
      "env": {
        "ADO_ORGANIZATION": "https://dev.azure.com/yourorg",
        "ADO_PROJECT": "YourProject",
        "ADO_PAT": "your_pat_token"
      }
    }
  }
}
```

## Available Tools

### Agent & Queue Management

#### `ado_health_check`
Check connection to Azure DevOps and verify configuration.

#### `list_project_queues`
List all agent queues available in your project.

#### `get_queue_details`
Get detailed information about a specific queue by ID or name.

#### `find_agent`
Find which queue/pool an agent belongs to (requires org permissions).

#### `list_queue_agents`
List all agents in a specific queue (requires org permissions).

### Build Operations

#### `list_builds`
List builds with smart filtering options:
- Filter by status (inProgress, completed)
- Filter by result (succeeded, failed, canceled)
- Time-based filtering (last N hours)
- Filter by definition, branch, or user

#### `get_build_details`
Get comprehensive information about a specific build including timeline and changes.

#### `queue_build`
Start a new build with custom parameters:
- Specify branch to build
- Set build parameters
- Control queue priority

#### `get_build_logs`
View build logs for troubleshooting failures.

#### `manage_build`
Manage running or completed builds:
- Cancel in-progress builds
- Retain important builds
- Remove retention

### Pipeline Management

#### `list_pipelines`
Discover available build pipelines with filtering by name or path.

#### `get_pipeline_config`
View detailed pipeline configuration including triggers, variables, and repository settings.

#### `monitor_build_health`
Get build health metrics and success rates over a time period.

## Development

This project uses [Bun](https://bun.sh) for development tooling while maintaining Node.js compatibility for runtime.

### Prerequisites

- Node.js >= 18.0.0 (for running the MCP server)
- Bun >= 1.0.0 (for development)

### Setup

```bash
# Clone the repository
git clone https://github.com/rxreyn3/ado-mcp-server.git
cd ado-mcp-server

# Install dependencies with Bun (faster than npm)
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your Azure DevOps credentials
```

### Development Workflow

```bash
# Run in development mode with hot reload
bun run dev

# Run tests
bun test

# Type checking
bun run typecheck

# Linting
bun run lint

# Build for production (Node.js)
bun run build

# Verify Node.js compatibility
bun run verify:node
```

### Building for Distribution

The MCP server is built to run on Node.js:

```bash
# Build TypeScript to JavaScript
bun run build

# The built server can be run with Node.js
node dist/index.js

# Or via npm scripts
bun run start
```

## License

MIT