# Azure DevOps MCP Server Development Plan

## Project Overview

Create an MCP (Model Context Protocol) server that wraps Azure DevOps APIs for agent and queue management within a project context. The server will help users discover queue composition, agent status, and troubleshoot agent availability issues.

## Quick Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language** | TypeScript | Type safety for complex ADO API responses |
| **Scope** | Project-only | Most users work within project context |
| **Agent Access** | Optimistic with fallback | Try org-level, gracefully degrade |
| **Package Name** | `@modelcontextprotocol/server-azure-devops` | Following MCP naming convention |
| **Primary SDK** | `azure-devops-node-api` | Official Microsoft SDK |
| **Transport** | stdio (initially) | Simplest for Claude Desktop |
| **Error Strategy** | Detailed messages with permission guidance | User education priority |

## Prerequisites

### Development Environment
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher
- **TypeScript**: v5.0.0 or higher
- **Git**: For version control
- **VS Code** (recommended): With TypeScript extensions

### Azure DevOps Requirements
- Active Azure DevOps organization
- At least one project with configured agent queues
- Personal Access Token (PAT) - see scope guide below

### PAT Scope Quick Reference

| Functionality | Required Scope | Access Level |
|--------------|----------------|--------------|
| **List project queues** | `vso.build` (read) | Project |
| **View queue details** | `vso.build` (read) | Project |
| **List agents in pools** | `vso.agentpools` (read) | Organization |
| **Find agent by name** | `vso.agentpools` (read) | Organization |
| **View agent capabilities** | `vso.agentpools` (read) | Organization |
| **Full functionality** | `vso.build` + `vso.agentpools` (read) | Both |

**Creating a PAT:**
1. Navigate to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Select scopes based on desired functionality (see table above)
4. Set expiration (recommend 90 days for development)
5. Copy token immediately (won't be shown again)

## Core Requirements

1. **Project-Scoped**: Operate exclusively within a project context
2. **Key Questions to Answer**:
   - What queues are available in my project?
   - What queue/pool does agent X belong to? (with limitations)
   - Show all agents for my queues and their status (requires org permissions)
3. **Production-Ready**: Publishable as npm package for Claude Desktop

## Architectural Constraints & Challenges

### Critical Discovery
- **Project-scoped APIs cannot directly list agents** - only queue metadata
- Agent details require organization-level permissions
- We must gracefully handle this limitation and inform users

### Design Decision
Given this constraint, our MCP server will:
1. Always attempt to fetch agent details (optimistic approach)
2. Gracefully degrade when permissions are insufficient
3. Clearly communicate permission requirements to users
4. Provide queue information even when agent details are unavailable

## Phased Development Approach

### Phase 1: Foundation & MVP (Days 1-2)

#### 1.1 Project Bootstrap
- [ ] Initialize TypeScript project with proper structure
- [ ] Set up package.json with MCP dependencies
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up ESLint and Prettier
- [ ] Create basic folder structure:
  ```
  src/
    index.ts          # Entry point
    server.ts         # MCP server setup
    ado-client.ts     # Azure DevOps API wrapper
    types/            # TypeScript types
  tests/
  docs/
  ```

#### 1.2 Environment Configuration
- [ ] Create .env.example with required variables:
  - `ADO_ORGANIZATION`
  - `ADO_PROJECT`
  - `ADO_PAT` (Personal Access Token)
- [ ] Set up configuration management
- [ ] Add validation for required environment variables

#### 1.3 Basic MCP Server
- [ ] Implement minimal MCP server that starts and responds
- [ ] Add health check tool: `ado_health_check`
- [ ] Test with stdio transport
- [ ] Verify Claude Desktop can connect

#### 1.4 Azure DevOps Client Wrapper
- [ ] Create TypeScript wrapper for azure-devops-node-api
- [ ] Implement connection initialization
- [ ] Add basic error handling
- [ ] Create types for our domain models

### Phase 2: Core Functionality (Days 3-4)

#### 2.1 Queue Operations
- [ ] Tool: `list_project_queues` - List all queues in the project
  - Returns: Queue ID, name, associated pool info
- [ ] Tool: `get_queue_details` - Get specific queue information
  - Parameters: queueId or queueName
  - Returns: Detailed queue metadata

#### 2.2 Agent Discovery (with Permission Handling)
- [ ] Tool: `find_agent` - Attempt to find which queue/pool an agent belongs to
  - Parameters: agentName
  - Returns: Queue/pool info if found, permission error if insufficient access
- [ ] Tool: `list_queue_agents` - Try to list agents in a queue
  - Parameters: queueId
  - Returns: Agent list if org permissions exist, graceful error otherwise
  - Include clear message about permission requirements

#### 2.3 Permission-Aware Response Handling
- [ ] Implement standard response format:
  ```typescript
  {
    success: boolean,
    data?: any,
    error?: {
      type: 'permission' | 'not_found' | 'api_error',
      message: string,
      requiredPermission?: string
    }
  }
  ```
- [ ] Add helper functions for permission error messaging

### Phase 3: Testing & Local Development (Days 5-6)

#### 3.1 Unit Tests
- [ ] Set up Jest testing framework
- [ ] Test Azure DevOps client methods
- [ ] Test MCP tool implementations
- [ ] Test error handling scenarios
- [ ] Test permission fallback logic

#### Mock Data Examples

**Queue List Response** (`GET /{project}/_apis/distributedtask/queues`):
```json
{
  "count": 2,
  "value": [
    {
      "id": 10,
      "projectId": "eb6e4656-77fc-42a1-9181-4c6d8e9da5d1",
      "name": "Default",
      "pool": {
        "id": 5,
        "name": "Default",
        "isHosted": false,
        "poolType": "automation"
      }
    },
    {
      "id": 12,
      "projectId": "eb6e4656-77fc-42a1-9181-4c6d8e9da5d1", 
      "name": "Linux Agents",
      "pool": {
        "id": 8,
        "name": "Linux Pool",
        "isHosted": false,
        "poolType": "automation"
      }
    }
  ]
}
```

**Agent List Response** (`GET /distributedtask/pools/{poolId}/agents`):
```json
{
  "count": 2,
  "value": [
    {
      "id": 101,
      "name": "BuildAgent-01",
      "version": "2.210.1",
      "osDescription": "Linux 5.4.0-42-generic #46-Ubuntu",
      "enabled": true,
      "status": "online",
      "provisioningState": "Provisioned",
      "systemCapabilities": {
        "Agent.ComputerName": "build-server-01",
        "Agent.OS": "Linux",
        "Agent.OSArchitecture": "X64"
      }
    },
    {
      "id": 102,
      "name": "BuildAgent-02",
      "version": "2.210.1",
      "enabled": false,
      "status": "offline",
      "provisioningState": "Provisioned"
    }
  ]
}
```

**Permission Error Response** (403 Forbidden):
```json
{
  "$id": "1",
  "innerException": null,
  "message": "TF401019: The current user does not have permissions to access the pool with id 5.",
  "typeName": "Microsoft.TeamFoundation.DistributedTask.WebApi.AccessDeniedException",
  "typeKey": "AccessDeniedException",
  "errorCode": 0,
  "eventId": 3000
}
```

**Rate Limit Response Headers**:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1641024000
Retry-After: 60
```

#### 3.2 Integration Tests
- [ ] Create mock Azure DevOps API responses
- [ ] Test full tool execution paths
- [ ] Test with different permission scenarios
- [ ] Test environment variable validation

#### 3.3 Local Testing Guide
- [ ] Create local testing documentation
- [ ] Add Claude Desktop configuration example
- [ ] Create test scenarios checklist
- [ ] Add troubleshooting guide

### Phase 4: Enhanced Functionality (Days 7-8)

#### 4.1 Resource Implementation
- [ ] Resource: `ado://queues` - List all project queues
- [ ] Resource: `ado://queue/{queueId}` - Specific queue details
- [ ] Add caching layer for frequently accessed data

#### 4.2 Batch Operations
- [ ] Tool: `get_all_queue_status` - Summary of all queues and agent counts
  - Attempts to get agent counts if permissions allow
  - Falls back to queue info only

#### 4.3 Smart Permission Detection
- [ ] Implement permission check on startup
- [ ] Cache permission level for session
- [ ] Adjust tool behavior based on detected permissions

### Phase 5: Documentation & Examples (Days 9-10)

#### 5.1 User Documentation
- [ ] README.md with:
  - Installation instructions
  - Configuration guide
  - Permission requirements explanation
  - Common use cases
- [ ] CLAUDE.md for Claude Desktop users
- [ ] API.md documenting all tools and resources

#### 5.2 Developer Documentation
- [ ] CONTRIBUTING.md
- [ ] Architecture decisions document
- [ ] Permission limitations explanation
- [ ] Local development guide

#### 5.3 Examples
- [ ] Example: Finding offline agents
- [ ] Example: Queue capacity analysis
- [ ] Example: Working with limited permissions
- [ ] Example: Troubleshooting agent issues

### Phase 6: Production Preparation (Days 11-12)

#### 6.1 Build & Package
- [ ] Set up build scripts
- [ ] Configure npm package metadata
- [ ] Add GitHub Actions CI/CD
- [ ] Create release process

#### 6.2 Security & Best Practices
- [ ] Security audit of PAT handling
- [ ] Add input validation for all tools
- [ ] Implement rate limiting awareness
- [ ] Add comprehensive logging (configurable)

#### 6.3 Performance Optimization
- [ ] Implement caching strategy
- [ ] Add connection pooling
- [ ] Optimize API calls (batch where possible)
- [ ] Add timeout handling

### Phase 7: Publishing & Community (Days 13-14)

#### 7.1 npm Publishing
- [ ] Publish to npm as `@modelcontextprotocol/server-azure-devops`
- [ ] Test installation via npx
- [ ] Verify Claude Desktop integration
- [ ] Create GitHub release

#### 7.2 Community Setup
- [ ] Set up issue templates
- [ ] Create discussion board structure
- [ ] Add code of conduct
- [ ] Create roadmap document

#### 7.3 Marketing & Adoption
- [ ] Write announcement blog post
- [ ] Create demo video
- [ ] Submit to MCP server directory
- [ ] Share in relevant communities

## Future Enhancements (Post-Launch)

### Potential Features
1. **Organization Mode** (optional flag for users with org permissions)
2. **Agent health monitoring** with historical data
3. **Queue recommendation engine**
4. **Integration with Azure DevOps build APIs**
5. **Webhook support for real-time updates**

### Technical Improvements
1. **WebSocket transport** for real-time updates
2. **Multi-project support**
3. **Advanced caching with Redis**
4. **Metrics and observability**

## Success Criteria

### MVP Success
- [ ] Can list all queues in a project
- [ ] Gracefully handles permission limitations
- [ ] Clear error messages guide users
- [ ] Works reliably in Claude Desktop

### Production Success
- [ ] Published to npm
- [ ] Comprehensive documentation
- [ ] Active community engagement
- [ ] Positive user feedback

## Critical Production Considerations

### Security Requirements
- [ ] **Token Management**:
  - Implement secure token storage (never in plain text)
  - Add token expiration handling
  - Consider Azure Key Vault integration for enterprise users
- [ ] **Audit Logging**:
  - Log all API interactions for compliance
  - Implement configurable log levels
  - Never log sensitive data (tokens, personal info)

### Operational Resilience
- [ ] **Retry Logic**:
  - Implement exponential backoff (3 retries recommended)
  - Handle 429 rate limit responses gracefully
  - Add circuit breaker pattern for API failures
- [ ] **Health Monitoring**:
  - Add health check endpoint
  - Monitor Azure DevOps API availability
  - Implement dependency health checks

### Performance Optimization
- [ ] **API Call Optimization**:
  - Batch API calls where possible (max 50 items)
  - Implement smart caching with TTL
  - Calculate and respect 30,000 calls/hour org limit
- [ ] **Response Time**:
  - Add request timeout handling (30s default)
  - Implement streaming for large datasets
  - Add progress indicators for long operations

### Observability
- [ ] **Telemetry**:
  - Track API latency metrics
  - Monitor error rates by endpoint
  - Log permission failures separately
- [ ] **Debugging Support**:
  - Add debug mode with verbose logging
  - Include correlation IDs in responses
  - Provide diagnostic commands

## Risk Mitigation

### Technical Risks
1. **Permission Limitations**
   - Mitigation: Clear documentation and graceful degradation
   - Alternative: Provide guide for requesting org permissions
   - Consider: Proxy service for org-level access (future)

2. **API Rate Limiting**
   - Mitigation: Implement caching and rate limit awareness
   - Alternative: Batch operations where possible
   - Monitor: Track rate limit headers in responses

3. **Azure DevOps API Changes**
   - Mitigation: Version lock API client
   - Alternative: Implement adapter pattern
   - Testing: Regular integration tests against live API

### Adoption Risks
1. **User Confusion about Permissions**
   - Mitigation: Excellent error messages and documentation
   - Alternative: Video tutorials
   - Support: FAQ section for common issues

2. **Limited Functionality**
   - Mitigation: Clear scope definition
   - Alternative: Roadmap for future features
   - Community: Gather feedback for prioritization

### Security Risks
1. **Token Exposure**
   - Mitigation: Environment variables only
   - Alternative: Secure credential providers
   - Validation: Token permission validation on startup

2. **Data Privacy**
   - Mitigation: No persistent storage of sensitive data
   - Alternative: Opt-in telemetry only
   - Compliance: GDPR considerations for EU users

## Timeline Summary

- **Week 1**: Foundation, Core Features, Testing (Phases 1-3)
- **Week 2**: Enhancement, Documentation, Publishing (Phases 4-7)
- **Post-Launch**: Community building and feature additions

This phased approach ensures we build a solid foundation, handle the permission constraints gracefully, and deliver value even with project-scoped limitations.

## Appendix: Common Permission Scenarios

### Scenario 1: Project-Only Access
**PAT Scopes**: `vso.build` (read)  
**Can Do**:
- List all queues in the project
- Get queue details and pool references
- See which pools are available to the project

**Cannot Do**:
- List agents in any pool
- Get agent status or capabilities
- Find which pool contains a specific agent

**User Experience**:
```json
{
  "tool": "list_queue_agents",
  "response": {
    "success": false,
    "error": {
      "type": "permission",
      "message": "Cannot list agents: Organization-level permissions required",
      "requiredPermission": "vso.agentpools (read)",
      "suggestion": "Request 'Reader' access to agent pools from your Azure DevOps administrator"
    }
  }
}
```

### Scenario 2: Full Access
**PAT Scopes**: `vso.build` + `vso.agentpools` (read)  
**Can Do**:
- Everything from Scenario 1
- List all agents in accessible pools
- Find agents by name across pools
- View agent status, capabilities, and details

**User Experience**:
```json
{
  "tool": "find_agent",
  "response": {
    "success": true,
    "data": {
      "agent": {
        "name": "BuildAgent-01",
        "status": "online",
        "enabled": true
      },
      "queue": {
        "id": 10,
        "name": "Default"
      },
      "pool": {
        "id": 5,
        "name": "Default"
      }
    }
  }
}
```

### Scenario 3: Organization Access Without Project Context
**PAT Scopes**: `vso.agentpools` (read) only  
**Limitation**: Cannot use this MCP server (requires project context)  
**Suggestion**: Add `vso.build` scope and specify a project