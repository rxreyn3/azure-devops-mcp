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

```bash
# Clone the repository
git clone https://github.com/anthropics/server-azure-devops.git
cd server-azure-devops

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## License

MIT