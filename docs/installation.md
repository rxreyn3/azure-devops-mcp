# Installation & Configuration

This MCP server can be used with Claude Desktop, Claude Code (VS Code), and Windsurf. All methods use `npx` to run the package directly without installation.

## Configuration Template

Replace these values in any of the configurations below:

- `your-organization`: Your Azure DevOps organization name
- `your-project-name`: Your Azure DevOps project name  
- `your-personal-access-token`: Your PAT with required permissions

## Claude Desktop

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

## Claude Code (VS Code Extension)

Use the Claude Code CLI to add the server:

```bash
claude mcp add azure-devops \
  -e ADO_ORGANIZATION="https://dev.azure.com/your-organization" \
  -e ADO_PROJECT="your-project-name" \
  -e ADO_PAT="your-personal-access-token" \
  -- npx -y @rxreyn3/azure-devops-mcp@latest
```

## Windsurf

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

## Environment Variables (Optional)

Instead of putting credentials directly in configuration files, you can set system environment variables and reference them:

1. Set the environment variables on your system (see [Authentication Guide](authentication.md) for platform-specific instructions)
2. Reference them in your config (if supported by your MCP client):
   ```json
   "env": {
     "ADO_ORGANIZATION": "$ADO_ORGANIZATION",
     "ADO_PROJECT": "$ADO_PROJECT", 
     "ADO_PAT": "$ADO_PAT"
   }
   ```

> **Note**: Not all MCP clients support environment variable substitution. Check your client's documentation.

## Testing the Connection

After configuration, restart your MCP client and test the connection:

Ask your AI assistant: "Can you check my Azure DevOps connection?" 

The assistant will use the `project_health_check` tool to verify:
- ✅ Connection to Azure DevOps
- ✅ PAT authentication
- ✅ Project access
- ✅ Available permissions

## Next Steps

- Review [Authentication & Security](authentication.md) for PAT setup and security best practices
- See [Available Tools](tools.md) for a complete list of what you can do
- Check [Examples](examples.md) for common usage patterns