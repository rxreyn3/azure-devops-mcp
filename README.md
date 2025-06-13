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
      "args": ["-y", "@rxreyn3/azure-devops-mcp@latest"],
      "env": {
        "ADO_ORGANIZATION": "https://dev.azure.com/your-organization",
        "ADO_PROJECT": "your-project-name",
        "ADO_PAT": "your-personal-access-token"
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
      "args": ["-y", "@rxreyn3/azure-devops-mcp@latest"],
      "env": {
        "ADO_ORGANIZATION": "https://dev.azure.com/your-organization",
        "ADO_PROJECT": "your-project-name",
        "ADO_PAT": "your-personal-access-token"
      }
    }
  }
}
```

### Usage in Claude Code

Use the Claude Code CLI to add the server with environment variables:

```bash
claude mcp add azure-devops \
  -e ADO_ORGANIZATION="https://dev.azure.com/your-organization" \
  -e ADO_PROJECT="your-project-name" \
  -e ADO_PAT="your-personal-access-token" \
  -- npx -y @rxreyn3/azure-devops-mcp@latest
```

### Configuration Example

Replace the following values in any of the above configurations:

- `your-organization`: Your Azure DevOps organization name
- `your-project-name`: Your Azure DevOps project name  
- `your-personal-access-token`: Your PAT with Agent Pools (read) permission

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

## What Can This Server Do?

This MCP server enables AI assistants to help you:

- **Monitor build infrastructure**: "Show me all online agents in the build pool"
- **Investigate build failures**: "Find failed builds from the last 24 hours"
- **Analyze build performance**: "Get the timeline for build #12345 to see which tasks took longest"
- **Find specific agents**: "Which pool contains agent BM40-BUILD-01?"
- **Check queue status**: "How many agents are available in the Windows queue?"
- **Track pipeline runs**: "Show me the latest builds for the API pipeline"

### Example Interactions

Ask your AI assistant questions like:
- "List all builds that failed today"
- "Find which agent ran build 12345"
- "Show me all available build queues in the project"
- "Check if agent BM40-BUILD-01 is online"
- "Get the last 5 builds for the preflight pipeline"
- "Which builds are currently running?"

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

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Development setup
- Adding new tools
- Testing guidelines
- Submitting pull requests

## License

MIT