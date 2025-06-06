# Azure DevOps Pool/Queue Architecture Summary

## Key Architectural Insights

### 1. Two-Tier Architecture
- **Pools** (Organization Level): Where agents physically exist
- **Queues** (Project Level): Permission boundaries that reference pools

### 2. API Endpoint Patterns

| Resource | Endpoint | Project Required | Scope |
|----------|----------|------------------|--------|
| List Pools | `GET /distributedtask/pools` | No | Organization |
| Get Pool Agents | `GET /distributedtask/pools/{id}/agents` | No | Organization |
| List Project Queues | `GET /{project}/_apis/distributedtask/queues` | Yes | Project |
| Find Queues by Pool | `GET /distributedtask/queues?poolIds={ids}` | No* | Organization |

*Special case: Can query across all projects at org level

### 3. Permission Model

**Organization Permissions Required For:**
- Viewing all pools
- Listing agents in any pool
- Creating/managing pools
- Cross-project queue discovery

**Project Permissions Sufficient For:**
- Viewing project's queues
- Creating queues (references to pools)
- Managing queue settings
- Cannot see actual agents

### 4. Project Parameter Behavior

**When Project is NOT provided:**
- API operates at organization scope
- Full access to pools and agents
- Can search across entire organization
- Requires organization-level PAT/permissions

**When Project IS provided:**
- API operates at project scope
- Limited to project's queues
- Cannot directly access agent information
- Can work with project-level PAT/permissions

### 5. Key Limitations

1. **No agent access through queues**: The API does not provide a way to list agents through queue endpoints
2. **Permission boundary is strict**: Project users cannot see agent details even for pools they have queues for
3. **Queue creation required**: Projects must explicitly create queues to access organization pools

### 6. Practical Implications for MCP Server

When implementing the MCP server with optional project parameter:

```typescript
// Without project: Direct pool/agent access
if (!project) {
  // Use pool APIs directly
  const pools = await api.getAgentPools();
  const agents = await api.getAgents(poolId);
}

// With project: Limited to queue information
if (project) {
  // Must go through queues
  const queues = await api.getAgentQueues(project);
  // Can get pool reference but not agents
  const poolId = queue.pool.id;
  
  // Attempting to get agents may fail with 403
  try {
    const agents = await api.getAgents(poolId);
  } catch (error) {
    // Need org permissions
  }
}
```

### 7. Error Handling Scenarios

| Scenario | Error | Meaning |
|----------|-------|---------|
| Access pool without org permissions | 403 Forbidden | Need organization-level access |
| Access queue without project permissions | 403 Forbidden | Need project-level access |
| Missing project parameter for queue API | 400 Bad Request | Project is required for queue endpoints |
| Pool exists but no queue in project | No error, empty results | Project needs to create queue first |

### 8. Search Strategy Recommendations

1. **Always try org-level first** if permissions might exist
2. **Gracefully degrade** to project-level if org access fails
3. **Cache results** to avoid repeated permission failures
4. **Inform users** about permission limitations in responses

This architecture ensures security through separation of concerns while allowing flexible access patterns based on user permissions.