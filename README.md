# Azure DevOps MCP Server

An MCP (Model Context Protocol) server that wraps Azure DevOps APIs for agent and queue management within a project context.

## Features

- **Project-scoped access**: Works within your project context
- **Queue management**: List and inspect agent queues
- **Agent discovery**: Find agents and their status (requires org permissions)
- **Permission-aware**: Gracefully handles permission limitations with clear guidance

## Installation

```bash
npm install -g @modelcontextprotocol/server-azure-devops
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
      "args": ["@modelcontextprotocol/server-azure-devops"],
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

### `ado_health_check`
Check connection to Azure DevOps and verify configuration.

### `list_project_queues`
List all agent queues available in your project.

### `get_queue_details`
Get detailed information about a specific queue by ID or name.

### `find_agent`
Find which queue/pool an agent belongs to (requires org permissions).

### `list_queue_agents`
List all agents in a specific queue (requires org permissions).

## Development

This project uses [Bun](https://bun.sh) for development tooling while maintaining Node.js compatibility for runtime.

### Prerequisites

- Node.js >= 18.0.0 (for running the MCP server)
- Bun >= 1.0.0 (for development)

### Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/server-azure-devops.git
cd server-azure-devops

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