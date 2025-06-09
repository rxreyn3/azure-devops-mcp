# Azure DevOps MCP Server Development Plan

**Developer**: Ryan Reynolds ([@rxreyn3](https://github.com/rxreyn3))  
**Repository**: [github.com/rxreyn3/ado-mcp-server](https://github.com/rxreyn3/ado-mcp-server)

## Project Overview

Create an MCP (Model Context Protocol) server that wraps Azure DevOps APIs for agent and queue management within a project context. The server will help users discover queue composition, agent status, and troubleshoot agent availability issues.

## Quick Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language** | TypeScript | Type safety for complex ADO API responses |
| **Development Tool** | Bun | 10x faster package management and native TS support |
| **Runtime** | Node.js | MCP standard compatibility |
| **Scope** | Project-only | Most users work within project context |
| **Agent Access** | Optimistic with fallback | Try org-level, gracefully degrade |
| **Package Name** | `@modelcontextprotocol/server-azure-devops` | Following MCP naming convention |
| **Primary SDK** | `azure-devops-node-api` | Official Microsoft SDK |
| **Transport** | stdio (initially) | Simplest for Claude Desktop |
| **Error Strategy** | Detailed messages with permission guidance | User education priority |

## Current Status

### ✅ Completed (Phase 1-2)

#### Foundation & Core Features
- [x] TypeScript project with Bun development tooling
- [x] MCP server implementation with stdio transport
- [x] Azure DevOps client with permission-aware error handling
- [x] Environment configuration and validation
- [x] Core tools implemented:
  - `ado_health_check` - Connection verification
  - `list_project_queues` - List all queues in project
  - `get_queue_details` - Get specific queue information  
  - `find_agent` - Find agent location (org permissions)
  - `list_queue_agents` - List queue agents (org permissions)
- [x] Bun test runner with sample tests
- [x] Node.js compatibility verified
- [x] Documentation (README, CONTRIBUTING)
- [x] Security (.gitignore for sensitive files)

### ✅ Completed (Phase 3)

#### Build Tools Implementation
- [x] Modular project structure with separate client and tool modules
- [x] Build operations tools:
  - [x] `list_builds` - Smart filtering for build queries
  - [x] `get_build_details` - Comprehensive build information
  - [x] `queue_build` - Start builds with parameters
  - [x] `get_build_logs` - View build logs
  - [x] `manage_build` - Cancel/retain builds
- [x] Pipeline management tools:
  - [x] `list_pipelines` - Discover available pipelines
  - [x] `get_pipeline_config` - View pipeline configuration
  - [x] `monitor_build_health` - Build health metrics
- [x] Updated documentation with tool selection philosophy
- [x] Comprehensive error handling and formatting utilities

### 🚧 Next Steps

#### Phase 4: Testing & Production Readiness

**Unit & Integration Tests**
- [x] Comprehensive test suite for Azure DevOps client
- [x] Mock Azure DevOps API responses
- [x] Test permission fallback scenarios
- [x] Test error handling edge cases
- [ ] Add tests for new build tools
- [ ] Integration tests with real Azure DevOps (optional)

**Documentation Enhancement**
- [x] API priorities documentation
- [x] Tool selection philosophy in README
- [ ] Troubleshooting guide
- [ ] Example use cases for build scenarios
- [ ] Video demo/tutorial

**Production Preparation**
- [ ] Add logging with configurable levels
- [ ] Implement retry logic for API calls
- [ ] Add connection pooling/caching
- [ ] Performance optimization
- [ ] Security audit

#### Phase 5: Advanced Features

**Additional Build Tools** (if tool count permits)
- [ ] `list_artifacts` - Download build outputs
- [ ] `get_build_metrics` - Historical build performance
- [ ] `manage_build_tags` - Organize builds with tags

**Resources** (URI-based data access)
- [ ] `ado://builds/recent` - Recent builds
- [ ] `ado://pipeline/{id}` - Pipeline details
- [ ] `ado://build/{id}/logs` - Build logs

**Advanced Features**
- [ ] Caching layer for frequently accessed data
- [ ] Rate limit handling with exponential backoff
- [ ] Build status webhooks
- [ ] Batch operations for multiple builds

#### Phase 5: Distribution & Community

**Publishing**
- [ ] Publish to npm as `@modelcontextprotocol/server-azure-devops`
- [ ] Create GitHub release with binaries
- [ ] Submit to MCP server directory
- [ ] Create Docker image (optional)

**Community Building**
- [ ] Create issue templates
- [ ] Set up GitHub Actions CI/CD
- [ ] Add code coverage badges
- [ ] Write blog post announcement
- [ ] Create demo video

## Known Issues & Limitations

1. **Permission Constraints**: Project-scoped APIs cannot list agents without org permissions
2. **Rate Limiting**: Azure DevOps has API rate limits (need to handle gracefully)
3. **Authentication**: Currently only supports PAT tokens (could add OAuth/MSI)

## Future Enhancements

1. **Organization Mode**: Optional flag for users with org permissions
2. **Build Integration**: Add tools for build queue management
3. **Pipeline Support**: Integration with Azure Pipelines
4. **Metrics & Monitoring**: Agent utilization tracking
5. **Multi-language**: Support for Python MCP SDK

## Testing Instructions

### Local Development
```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Verify Node.js compatibility
bun run verify:node
```

### Testing with Claude Desktop
1. Build the project: `bun run build`
2. Add to Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "azure-devops": {
         "command": "node",
         "args": ["/absolute/path/to/ado-mcp-server/dist/index.js"],
         "env": {
           "ADO_ORGANIZATION": "https://dev.azure.com/yourorg",
           "ADO_PROJECT": "YourProject",
           "ADO_PAT": "your-pat-token"
         }
       }
     }
   }
   ```
3. Restart Claude Desktop
4. Test commands in Claude

## Contribution Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development setup and contribution process.

---

Last Updated: January 2025