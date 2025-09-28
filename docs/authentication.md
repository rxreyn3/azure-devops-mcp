# Authentication & Security

## Required PAT Permissions

When creating your Personal Access Token (PAT) in Azure DevOps, you must grant:
- **Agent Pools (read)** - Required for agent management tools and queueing builds
- **Build (read)** - Required for listing builds and viewing timelines
- **Build (read & execute)** - Required for queueing new builds

## Scope Requirements

This server provides tools with different scope requirements:

| Tool | Minimum Scope | Description |
|------|--------------|-------------|
| `project_*` tools | Project | Access project queues and basic information |
| `org_*` tools | Organization | Access agent details (agents exist at org level) |
| `build_*` tools | Project | Access build timelines and execution details |

## Creating a PAT

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

## Platform-Specific Environment Variable Setup

If you choose to use system environment variables:

### macOS/Linux
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export ADO_ORGANIZATION="https://dev.azure.com/your-organization"
export ADO_PROJECT="your-project-name"
export ADO_PAT="your-personal-access-token"

# Apply changes
source ~/.zshrc  # or source ~/.bashrc
```

### Windows (PowerShell)
```powershell
# Set user environment variables (permanent)
[System.Environment]::SetEnvironmentVariable("ADO_ORGANIZATION", "https://dev.azure.com/your-organization", "User")
[System.Environment]::SetEnvironmentVariable("ADO_PROJECT", "your-project-name", "User")
[System.Environment]::SetEnvironmentVariable("ADO_PAT", "your-personal-access-token", "User")

# Restart your terminal for changes to take effect
```

### Windows (Command Prompt)
```cmd
# Set user environment variables (permanent)
setx ADO_ORGANIZATION "https://dev.azure.com/your-organization"
setx ADO_PROJECT "your-project-name"
setx ADO_PAT "your-personal-access-token"

# Restart your terminal for changes to take effect
```

**Note**: Setting system environment variables is optional. The MCP client's `env` field will pass these values directly to the server process regardless of your system environment.

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