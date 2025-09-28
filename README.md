# Azure DevOps MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that enables AI assistants to interact with Azure DevOps. Manage builds, agents, queues, download logs and artifacts - all through natural language.

## ⚡ Quick Start

1. **Create a PAT** in Azure DevOps with `Agent Pools (read)` and `Build (read & execute)` permissions
2. **Choose your platform** and add the configuration:

### Claude Desktop
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

### Claude Code (VS Code)
```bash
claude mcp add azure-devops \
  -e ADO_ORGANIZATION="https://dev.azure.com/your-organization" \
  -e ADO_PROJECT="your-project-name" \
  -e ADO_PAT="your-personal-access-token" \
  -- npx -y @rxreyn3/azure-devops-mcp@latest
```

### Windsurf
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

3. **Test the connection**: Ask your AI assistant "Can you check my Azure DevOps connection?"

## What You Can Do

- 🔍 **Find and monitor builds**: "Show me all failed builds today"
- ⚡ **Queue new builds**: "Start a build for MyApp-CI with branch main"  
- 📊 **Check agent status**: "Is agent WIN-BUILD-01 online?"
- 📥 **Download logs and artifacts**: "Get the logs from build 12345"
- 📋 **View build queues**: "Show me all available build queues"

## Documentation

- **[Installation Guide](docs/installation.md)** - Detailed setup instructions for all platforms
- **[Authentication](docs/authentication.md)** - PAT setup, permissions, and security best practices  
- **[Available Tools](docs/tools.md)** - Complete list of tools and their capabilities
- **[Usage Examples](docs/examples.md)** - Common workflows and example queries

## Quick Examples

Ask your AI assistant natural language questions like:

```
"List all builds that failed today"
"Check if agent BM40-BUILD-01 is online"
"Queue a build for pipeline MyApp-CI with parameter Environment=staging"
"Download the logs for GPU and System Diagnostics from build 5782897"
"What artifacts are available for build 12345?"
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for development setup, adding new tools, and testing guidelines.

## License

MIT