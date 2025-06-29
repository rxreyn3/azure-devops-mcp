# Azure DevOps MCP Server

A Model Context Protocol (MCP) server for interacting with Azure DevOps agents and queues.

## Authentication & Permissions

### Required PAT Permissions

When creating your Personal Access Token (PAT) in Azure DevOps, you must grant:
- **Agent Pools (read)** - Required for agent management tools and queueing builds
- **Build (read)** - Required for listing builds and viewing timelines
- **Build (read & execute)** - Required for queueing new builds

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
     - **Build (read & execute)** - For build operations (list, view, queue)

> **Note**: Project-scoped PATs will only work with `project_*` and `build_*` tools. The `org_*` tools require organization-level access because agents are managed at the organization level in Azure DevOps.

## Security Best Practices

### ⚠️ Important: Handling Sensitive Credentials

The `env` field in MCP client configurations (Claude Desktop, Claude Code, Windsurf) passes environment variables directly to the MCP server process. While convenient, **never share your configuration files** containing actual PAT values.

### Recommended Approaches:

1. **Direct Configuration (Simplest)**
   - Add your credentials directly to the configuration file
   - Keep the file secure and never commit it to version control
   - This is suitable for personal use on trusted machines

2. **Environment Variable Reference (Most Secure)**
   - Some MCP clients support referencing system environment variables
   - Set your credentials as system environment variables first:
     ```bash
     # macOS/Linux
     export ADO_PAT="your-actual-pat-value"
     
     # Windows PowerShell
     $env:ADO_PAT = "your-actual-pat-value"
     ```
   - Then reference them in your config (if supported by your client)

3. **Configuration Management**
   - Store a template configuration in version control with placeholder values
   - Keep your actual configuration with real values locally
   - Use `.gitignore` to prevent accidental commits

### PAT Security Guidelines

- **Create dedicated PATs** for MCP usage with minimal required permissions
- **Set short expiration dates** and rotate regularly
- **Use different PATs** for different projects or environments
- **Never share PATs** in documentation, issues, or support requests
- **Revoke immediately** if you suspect compromise

### Platform-Specific Environment Variable Setup

If you choose to use system environment variables:

#### macOS/Linux
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export ADO_ORGANIZATION="https://dev.azure.com/your-organization"
export ADO_PROJECT="your-project-name"
export ADO_PAT="your-personal-access-token"

# Apply changes
source ~/.zshrc  # or source ~/.bashrc
```

#### Windows (PowerShell)
```powershell
# Set user environment variables (permanent)
[System.Environment]::SetEnvironmentVariable("ADO_ORGANIZATION", "https://dev.azure.com/your-organization", "User")
[System.Environment]::SetEnvironmentVariable("ADO_PROJECT", "your-project-name", "User")
[System.Environment]::SetEnvironmentVariable("ADO_PAT", "your-personal-access-token", "User")

# Restart your terminal for changes to take effect
```

#### Windows (Command Prompt)
```cmd
# Set user environment variables (permanent)
setx ADO_ORGANIZATION "https://dev.azure.com/your-organization"
setx ADO_PROJECT "your-project-name"
setx ADO_PAT "your-personal-access-token"

# Restart your terminal for changes to take effect
```

**Note**: Setting system environment variables is optional. The MCP client's `env` field will pass these values directly to the server process regardless of your system environment.

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

These tools work with project-scoped PATs:

- **`build_list`** - List builds with filtering and pagination support (requires Build read)
  - Filter by pipeline name (partial match), status, result, branch, or date range
  - Date filtering with minTime/maxTime parameters (e.g., "2024-01-01", "2024-01-31T23:59:59Z")
  - Returns build details including ID, number, status, and timing
  - Supports pagination for large result sets
  
- **`build_list_definitions`** - List pipeline definitions to find IDs and names (requires Build read)
  - Filter by name (partial match)
  - Useful for discovering pipeline IDs needed for other operations
  
- **`build_get_timeline`** - Get the timeline for a build showing all jobs, tasks, and which agents executed them (requires Build read)
  - Requires a build ID (use `build_list` to find build IDs)

- **`build_queue`** - Queue (launch) a new build for a pipeline definition (requires Build read & execute AND Agent Pools read)
  - Required: definitionId (use `build_list_definitions` to find)
  - Optional: sourceBranch, parameters (key-value pairs), reason, demands, queueId
  - Returns the queued build details including ID and status

- **`build_download_job_logs`** - Download logs for a specific job from a build by job name (requires Build read)
  - Required: buildId, jobName (e.g., "GPU and System Diagnostics"), outputPath
  - Streams log content to file for efficient memory usage
  - Smart filename generation when outputPath is a directory
  - Validates job completion status before downloading
  - Returns saved file path, size, job details, and duration

## Example Interactions

Ask your AI assistant questions like:
- "List all builds that failed today"
- "Find which agent ran build 12345"
- "Show me all available build queues in the project"
- "Check if agent BM40-BUILD-01 is online"
- "Get the last 5 builds for the preflight pipeline"
- "Which builds are currently running?"
- "Show me builds from January 2024" (uses date filtering with minTime/maxTime)
- "List failed builds between 2024-01-15 and 2024-01-20"
- "Queue a build for pipeline X with parameter Y=Z"
- "Launch the nightly build with custom branch refs/heads/feature/test"
- "Download the logs for GPU and System Diagnostics from build 5782897"
- "Save the job logs for 'Test 3: With Render Optimizations' to ./logs/"

## Error Handling

If you encounter permission errors:

1. Verify your PAT has the required permissions:
   - **Agent Pools (read)** - For agent management tools and `build_queue`
   - **Build (read)** - For listing builds and viewing timelines
   - **Build (read & execute)** - For queueing new builds with `build_queue`
2. For `org_*` tools, ensure your PAT is organization-scoped, not project-scoped
3. For `build_queue`, you need BOTH "Build (read & execute)" AND "Agent Pools (read)"
4. Check that your PAT hasn't expired
5. Verify you have access to the specified project

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