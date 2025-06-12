# Azure DevOps MCP Server

A Model Context Protocol (MCP) server for interacting with Azure DevOps agents and queues.

## Authentication & Permissions

### Required PAT Permissions

When creating your Personal Access Token (PAT) in Azure DevOps, you must grant:
- **Agent Pools (read)** - Required for agent management tools
- **Build (read)** - Required for build timeline tools

### Scope Requirements

This server provides tools with different scope requirements:

| Tool | Minimum Scope | Description |
|------|--------------|-------------|
| `project_*` tools | Project | Access project queues and basic information |
| `org_*` tools | Organization | Access agent details (agents exist at org level) |
| `build_*` tools | Project | Access build timelines and execution details |

### Creating a PAT

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Select your organization
4. Set expiration as needed
5. **For full functionality**, select:
   - Scope: **Organization** (not project-specific)
   - Permissions: 
     - **Agent Pools (read)** - For agent management tools
     - **Build (read)** - For build timeline tools

> **Note**: Project-scoped PATs will only work with `project_*` and `build_*` tools. The `org_*` tools require organization-level access because agents are managed at the organization level in Azure DevOps.

## Installation & Usage

This MCP server can be used with Windsurf, Claude Desktop, and Claude Code. All methods use `npx` to run the package directly without installation.

### Usage in Windsurf

Add the following to your Windsurf settings at `~/.windsurf/settings.json`:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["-y", "@rxreyn3/azure-devops-mcp"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/your-organization",
        "AZURE_DEVOPS_PROJECT": "your-project-name",
        "AZURE_DEVOPS_PAT": "your-personal-access-token"
      }
    }
  }
}
```

### Usage in Claude Desktop

Add the following to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["-y", "@rxreyn3/azure-devops-mcp"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/your-organization",
        "AZURE_DEVOPS_PROJECT": "your-project-name",
        "AZURE_DEVOPS_PAT": "your-personal-access-token"
      }
    }
  }
}
```

### Usage in Claude Code

Use the Claude Code CLI to add the server:

```bash
# Add the MCP server with environment variables
claude mcp add azure-devops npx -- -y @rxreyn3/azure-devops-mcp

# Then set the required environment variables
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/your-organization"
export AZURE_DEVOPS_PROJECT="your-project-name"
export AZURE_DEVOPS_PAT="your-personal-access-token"

# Or add with inline environment variables (Unix/macOS/Linux)
AZURE_DEVOPS_ORG_URL="https://dev.azure.com/your-organization" \
AZURE_DEVOPS_PROJECT="your-project-name" \
AZURE_DEVOPS_PAT="your-personal-access-token" \
claude mcp add azure-devops npx -- -y @rxreyn3/azure-devops-mcp
```

### Configuration Example

Replace the following values in any of the above configurations:

- `your-organization`: Your Azure DevOps organization name
- `your-project-name`: Your Azure DevOps project name  
- `your-personal-access-token`: Your PAT with Agent Pools (read) permission

Optional: Add `"AZURE_DEVOPS_API_VERSION": "7.1"` to the env section if you need a specific API version.

## Available Tools

### Project-Scoped Tools

These tools work with project-scoped PATs:

- **`project_health_check`** - Test connection and verify permissions
- **`project_list_queues`** - List all agent queues in the project
- **`project_get_queue`** - Get detailed information about a specific queue

### Organization-Scoped Tools

These tools require organization-level PAT permissions:

- **`org_find_agent`** - Search for an agent across all organization pools
- **`org_list_agents`** - List agents from project pools with filtering options

### Build Tools

These tools work with project-scoped PATs and require Build (read) permission:

- **`build_list`** - List builds with filtering and pagination support
  - Filter by pipeline name (partial match), status, result, or branch
  - Returns build details including ID, number, status, and timing
  - Supports pagination for large result sets
  
- **`build_list_definitions`** - List pipeline definitions to find IDs and names
  - Filter by name (partial match)
  - Useful for discovering pipeline IDs needed for other operations
  
- **`build_get_timeline`** - Get the timeline for a build showing all jobs, tasks, and which agents executed them
  - Requires a build ID (use `build_list` to find build IDs)

## Configuration

Set the following environment variables:

```bash
# Required
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-organization
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Optional
AZURE_DEVOPS_API_VERSION=7.1  # Default: 7.1
```

## Usage Examples

### Finding Recent Builds

To get the latest build for a pipeline:
```
build_list(definitionNameFilter: "preflight", limit: 1)
```

To list all failed builds:
```
build_list(result: "Failed", limit: 20)
```

### Working with Pagination

When listing builds returns a `continuationToken`, use it to get the next page:
```
// First call
build_list(limit: 50)
// Returns: { builds: [...], continuationToken: "abc123", hasMore: true }

// Next page
build_list(limit: 50, continuationToken: "abc123")
```

### Build Timeline Workflow

1. Find a build:
   ```
   build_list(definitionNameFilter: "api", limit: 5)
   ```

2. Get its timeline using the build ID:
   ```
   build_get_timeline(buildId: 12345)
   ```

## Azure DevOps Concepts

### Pools vs Queues

- **Agent Pools**: Organization-level containers that hold the actual build agents
- **Queues** (Project Agent Pools): Project-level references to agent pools
- Each project queue maps to one organization pool
- Agents belong to pools, not queues

### Azure DevOps Server Note

This server is tested with Azure DevOps Services (cloud). Self-hosted Azure DevOps Server may have different permission models.

## Error Handling

If you encounter permission errors:

1. Verify your PAT has the required permissions:
   - **Agent Pools (read)** - For agent management tools
   - **Build (read)** - For build timeline tools
2. For `org_*` tools, ensure your PAT is organization-scoped, not project-scoped
3. Check that your PAT hasn't expired
4. Verify you have access to the specified project

Common error messages:
- "Access denied" - Your PAT lacks necessary permissions
- "Resource not found" - The queue/agent/build doesn't exist or you lack access
- "Invalid authentication" - Your PAT may be expired or incorrectly formatted
- "Timeline not found" - The build ID doesn't exist or doesn't have timeline data