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

### 🚧 Next Steps

#### Phase 3: Testing & Production Readiness

**Unit & Integration Tests**
- [ ] Comprehensive test suite for Azure DevOps client
- [ ] Mock Azure DevOps API responses
- [ ] Test permission fallback scenarios
- [ ] Test error handling edge cases
- [ ] Integration tests with real Azure DevOps (optional)

**Documentation Enhancement**
- [ ] API documentation for all tools
- [ ] Troubleshooting guide
- [ ] Example use cases
- [ ] Video demo/tutorial

**Production Preparation**
- [ ] Add logging with configurable levels
- [ ] Implement retry logic for API calls
- [ ] Add connection pooling/caching
- [ ] Performance optimization
- [ ] Security audit

#### Phase 4: Enhanced Features

**Additional Tools**
- [ ] `get_all_queue_status` - Batch status check
- [ ] `get_agent_capabilities` - Detailed agent info
- [ ] `search_agents` - Find agents by capability

**Resources** (URI-based data access)
- [ ] `ado://queues` - List all queues
- [ ] `ado://queue/{id}` - Queue details
- [ ] `ado://agents/{queueId}` - Queue agents

**Advanced Features**
- [ ] Caching layer for frequently accessed data
- [ ] Rate limit handling
- [ ] Multi-project support (optional)
- [ ] Webhook support for real-time updates

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