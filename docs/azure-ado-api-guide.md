# Azure DevOps API Guide for Agents, Pools, and Queues

## Overview

This guide provides comprehensive information for working with Azure DevOps (ADO) APIs, specifically focusing on agents, pools, and queues. It includes authentication methods, API endpoints, progressive query strategies, and best practices.

## Table of Contents

1. [Authentication](#authentication)
2. [Understanding Pools vs Queues Architecture](#understanding-pools-vs-queues-architecture)
3. [API Endpoints Overview](#api-endpoints-overview)
4. [Working with Agent Pools](#working-with-agent-pools)
5. [Working with Agents](#working-with-agents)
6. [Working with Queues](#working-with-queues)
7. [Progressive Query Strategy](#progressive-query-strategy)
8. [Rate Limiting and Best Practices](#rate-limiting-and-best-practices)
9. [Code Examples](#code-examples)
10. [Response Formats](#response-formats)

## Authentication

### Personal Access Tokens (PAT)

The most common authentication method for scripts and automation.

**Creating a PAT:**
1. Navigate to Azure DevOps User Settings
2. Select "Personal access tokens"
3. Click "New Token"
4. Required scope: `vso.agentpools` (read) or `vso.agentpools_manage` (write)

**Using PAT in requests:**
```bash
# Base64 encode the PAT with a colon prefix
PAT="your-personal-access-token"
AUTH=$(echo -n ":$PAT" | base64)

# Use in curl
curl -H "Authorization: Basic $AUTH" \
  "https://dev.azure.com/{organization}/_apis/..."
```

### OAuth 2.0

Recommended for applications requiring user delegation.

**Setup:**
1. Register app in Azure AD
2. Configure redirect URIs
3. Request scopes: `vso.agentpools`, `vso.agentpools_manage`

**Usage:**
```bash
curl -H "Authorization: Bearer $OAUTH_TOKEN" \
  "https://dev.azure.com/{organization}/_apis/..."
```

## Understanding Pools vs Queues Architecture

### Core Concepts

Azure DevOps uses a two-tier architecture for managing agents:

1. **Agent Pools** (Organization Level)
   - Exist at the organization level
   - Contain the actual agents
   - Shared across all projects in the organization
   - Require organization-level permissions to manage
   - API Path: `/distributedtask/pools` (no project context needed)

2. **Agent Queues** (Project Level)
   - Exist at the project level
   - Are references/pointers to agent pools
   - Provide project-specific access control
   - Each project must create a queue to access a pool
   - API Path: `/{project}/_apis/distributedtask/queues` (project context required)

### Key Architectural Principles

- **Agents live in pools, not queues**: Queues are merely permission boundaries
- **One pool can have many queues**: Each project creates its own queue to access a shared pool
- **Project parameter defines scope**: 
  - Without project → Organization-level operations (pools)
  - With project → Project-level operations (queues)

### When Project Parameter is Optional vs Required

| Operation | Project Required? | API Endpoint | Permission Level |
|-----------|------------------|--------------|------------------|
| List all pools | No | `/distributedtask/pools` | Organization |
| Get pool agents | No | `/distributedtask/pools/{poolId}/agents` | Organization |
| Create pool | No | `/distributedtask/pools` | Organization admin |
| List project queues | Yes | `/{project}/_apis/distributedtask/queues` | Project |
| Create queue | Yes | `/{project}/_apis/distributedtask/queues` | Project admin |
| Get queues by pool | Sometimes* | `/distributedtask/queues?poolIds={id}` | Organization |

*Special case: This endpoint can work at org-level to find all queues across projects for given pools

### Permission Model Differences

**Organization-Level (Pools)**:
- Requires PAT/OAuth token with organization scope
- Can see all agents across all pools
- Can manage pool settings and agents
- Typical users: Org admins, build engineers

**Project-Level (Queues)**:
- Requires PAT/OAuth token with project scope
- Can only see agents in pools that have queues in the project
- Can manage queue settings but not agents directly
- Typical users: Project admins, developers

### Practical Scenarios

1. **"List all agents in the organization"**
   - Use pool APIs (no project needed)
   - `GET /distributedtask/pools` then iterate through each pool's agents

2. **"List agents available to my project"**
   - Use queue APIs (project required)
   - `GET /{project}/_apis/distributedtask/queues` then check associated pools

3. **"Check if an agent is available for my build"**
   - If you have org permissions: Use pool API directly
   - If you only have project permissions: Must go through queue API

4. **"Create access to a pool for a new project"**
   - Create a queue in the project pointing to the desired pool
   - `POST /{project}/_apis/distributedtask/queues`

### API Behavior Differences

When accessing agents through **pools** (org-level):
```typescript
// Direct access to all agent information
const agents = await taskAgentApi.getAgents(poolId);
// Returns: Complete agent details including capabilities
```

When accessing agents through **queues** (project-level):
```typescript
// First get the queue, then the associated pool
const queue = await taskAgentApi.getAgentQueue(queueId, project);
const poolId = queue.pool.id;
// Note: May have limited visibility based on project permissions
```

### Error Scenarios

1. **Accessing pool without org permissions**: HTTP 403 Forbidden
2. **Accessing queue without project permissions**: HTTP 403 Forbidden  
3. **Using pool in project without queue**: No agents visible to project
4. **Project parameter missing for queue operations**: HTTP 400 Bad Request

## API Endpoints Overview

### Base URL Formats

**Organization-Level Operations (No Project Required):**
```
https://dev.azure.com/{organization}/_apis/{area}/{resource}?api-version=7.1
```

**Project-Level Operations (Project Required):**
```
https://dev.azure.com/{organization}/{project}/_apis/{area}/{resource}?api-version=7.1
```

### Key API Areas

| API Area | Scope | Project Required | Description |
|----------|-------|------------------|-------------|
| `distributedtask/pools` | Organization | No | Agent pool management |
| `distributedtask/pools/{poolId}/agents` | Organization | No | Agent management within pools |
| `distributedtask/queues` | Mixed* | Sometimes | Queue management |
| `{project}/_apis/distributedtask/queues` | Project | Yes | Project-specific queue management |

*Note: `/distributedtask/queues?poolIds={id}` works at org-level without project

## Working with Agent Pools

### List All Pools
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools?api-version=7.1
```

**Query Parameters:**
- `poolName` - Filter by pool name
- `properties` - Comma-separated list of properties to include
- `poolType` - Filter by type (automation/deployment)
- `actionFilter` - Filter based on user permissions

**Example:**
```bash
curl -H "Authorization: Basic $AUTH" \
  "https://dev.azure.com/myorg/_apis/distributedtask/pools?poolName=Default&api-version=7.1"
```

### Get Specific Pool
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}?api-version=7.1
```

### Create Pool
```bash
POST https://dev.azure.com/{organization}/_apis/distributedtask/pools?api-version=7.1

{
  "name": "MyNewPool",
  "poolType": "automation",
  "autoProvision": false,
  "autoSize": false
}
```

### Update Pool
```bash
PATCH https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}?api-version=7.1

{
  "name": "UpdatedPoolName",
  "autoProvision": true
}
```

### Delete Pool
```bash
DELETE https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}?api-version=7.1
```

## Working with Agents

### List Agents in a Pool
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents?api-version=7.1
```

**Query Parameters:**
- `agentName` - Filter by agent name
- `includeCapabilities` - Include agent capabilities (true/false)
- `includeAssignedRequest` - Include current job assignment
- `includeLastCompletedRequest` - Include last job details
- `demands` - Filter by agent capabilities (array)

**Example with all parameters:**
```bash
curl -H "Authorization: Basic $AUTH" \
  "https://dev.azure.com/myorg/_apis/distributedtask/pools/5/agents?agentName=BuildAgent01&includeCapabilities=true&includeAssignedRequest=true&api-version=7.1"
```

### Get Specific Agent
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1
```

### Update Agent
```bash
PATCH https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1

{
  "enabled": false,
  "maxParallelism": 2
}
```

### Delete Agent
```bash
DELETE https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1
```

### Get Agent Capabilities
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents/{agentId}?includeCapabilities=true&api-version=7.1
```

## Working with Queues

Queues provide project-level access to agent pools. They act as permission boundaries and references to pools, not containers for agents.

### List Project Queues
```bash
GET https://dev.azure.com/{organization}/{project}/_apis/distributedtask/queues?api-version=7.1
```

**Query Parameters:**
- `queueName` - Filter by queue name
- `actionFilter` - Filter based on permissions (None/Manage/Use)

**Important:** This returns queues, not agents. To see agents, you must:
1. Get the queue's associated pool ID from the response
2. Use the pool API to list agents (requires org permissions)

### Get Queue by ID
```bash
GET https://dev.azure.com/{organization}/{project}/_apis/distributedtask/queues/{queueId}?api-version=7.1
```

**Response includes:**
- Queue configuration
- Associated pool information
- Project permissions
- Does NOT include agent details directly

### Get Queues by Pool IDs (Organization-Level)
```bash
GET https://dev.azure.com/{organization}/_apis/distributedtask/queues?poolIds={poolId1},{poolId2}&api-version=7.1
```

**Special endpoint:** Works at organization level to find all queues across all projects for specified pools. Useful for understanding pool usage across the organization.

### Create Queue
```bash
POST https://dev.azure.com/{organization}/{project}/_apis/distributedtask/queues?api-version=7.1

{
  "name": "MyQueue",
  "pool": {
    "id": 5
  }
}
```

**Purpose:** Creates a project's access point to an existing agent pool. Without a queue, a project cannot use agents from that pool.

### Accessing Agents Through Queues

**Important limitation:** The Azure DevOps API does not provide direct agent access through queue endpoints. To work with agents when you only have project-level access:

```typescript
// Step 1: Get queue information
const queue = await taskAgentApi.getAgentQueue(queueId, project);

// Step 2: Extract pool ID
const poolId = queue.pool.id;

// Step 3: Attempt to get agents (requires org permissions)
try {
  const agents = await taskAgentApi.getAgents(poolId);
} catch (error) {
  // Will fail with 403 if you only have project permissions
  console.log("Need organization permissions to list agents");
}
```

**Workaround for project-only permissions:** Use the build/release APIs to check agent availability indirectly through job queue times and pool statistics.

## Progressive Query Strategy

### Finding Which Pool an Agent Belongs To

The strategy differs based on whether you have a project context and the level of permissions available.

#### Scenario 1: Organization-Level Access (No Project Context)

Given: Organization and Agent Name  
Goal: Find the pool containing the agent

**Direct approach (recommended):**

```bash
#!/bin/bash

# Configuration
PAT="your-pat-here"
ORG="your-organization"
AGENT_NAME="your-agent-name"
API_VERSION="7.1"

# Base64 encode PAT
AUTH=$(echo -n ":$PAT" | base64)

# Function to make API calls with error handling
api_call() {
  local url=$1
  local response
  local http_code
  
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Basic $AUTH" "$url")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo "$body"
  else
    echo "Error: HTTP $http_code" >&2
    return 1
  fi
}

# Step 1: Get all pools
echo "Fetching all pools..."
pools_url="https://dev.azure.com/$ORG/_apis/distributedtask/pools?api-version=$API_VERSION"
pools=$(api_call "$pools_url")

# Step 2: Extract pool IDs
pool_ids=$(echo "$pools" | jq -r '.value[].id')

# Step 3: Search each pool for the agent
for pool_id in $pool_ids; do
  echo "Checking pool ID: $pool_id"
  
  # Get agents in this pool
  agents_url="https://dev.azure.com/$ORG/_apis/distributedtask/pools/$pool_id/agents?api-version=$API_VERSION"
  agents=$(api_call "$agents_url")
  
  # Check if our agent is in this pool
  agent_found=$(echo "$agents" | jq -r --arg name "$AGENT_NAME" '.value[] | select(.name == $name)')
  
  if [ ! -z "$agent_found" ]; then
    # Get pool details
    pool_info=$(echo "$pools" | jq -r --arg id "$pool_id" '.value[] | select(.id == ($id | tonumber))')
    
    echo "✓ Found agent '$AGENT_NAME' in pool:"
    echo "$pool_info" | jq '{id: .id, name: .name, type: .poolType}'
    echo ""
    echo "Agent details:"
    echo "$agent_found" | jq '{id: .id, name: .name, status: .status, version: .version}'
    
    exit 0
  fi
done

echo "Agent '$AGENT_NAME' not found in any pool"
exit 1
```

#### Scenario 2: Project-Level Access (With Project Context)

Given: Organization, Project, and Agent Name  
Goal: Find if the agent is available to the project

**Limitations:** Cannot directly list agents with project-only permissions

**Approach:**
```typescript
async function findAgentInProjectContext(org: string, project: string, agentName: string) {
  // Step 1: Get all queues in the project
  const queues = await taskAgentApi.getAgentQueues(project);
  
  // Step 2: Try to check each pool (will fail without org permissions)
  for (const queue of queues) {
    const poolId = queue.pool.id;
    
    try {
      // This requires organization-level permissions
      const agents = await taskAgentApi.getAgents(poolId);
      const agent = agents.find(a => a.name === agentName);
      
      if (agent) {
        return {
          found: true,
          queue: queue,
          pool: queue.pool,
          agent: agent,
          accessibleToProject: true
        };
      }
    } catch (error) {
      if (error.statusCode === 403) {
        console.log(`Cannot access pool ${poolId} - need org permissions`);
        // Could only confirm queue exists, not agent presence
        return {
          found: false,
          queue: queue,
          pool: queue.pool,
          error: "Insufficient permissions to list agents"
        };
      }
      throw error;
    }
  }
  
  return {
    found: false,
    message: "Agent not found in any pool accessible to this project"
  };
}
```

#### Scenario 3: Mixed Permissions Strategy

When you might have either org or project permissions:

```typescript
async function findAgentSmart(org: string, agentName: string, project?: string) {
  // First, try org-level search (most efficient)
  try {
    const pools = await taskAgentApi.getAgentPools();
    
    for (const pool of pools) {
      const agents = await taskAgentApi.getAgents(pool.id);
      const agent = agents.find(a => a.name === agentName);
      
      if (agent) {
        // If project provided, check if accessible
        if (project) {
          const queues = await taskAgentApi.getAgentQueues(project);
          const hasAccess = queues.some(q => q.pool.id === pool.id);
          
          return {
            found: true,
            pool: pool,
            agent: agent,
            accessibleToProject: hasAccess,
            projectQueue: queues.find(q => q.pool.id === pool.id)
          };
        }
        
        return { found: true, pool: pool, agent: agent };
      }
    }
  } catch (error) {
    if (error.statusCode === 403 && project) {
      // Fall back to project-level search
      console.log("No org permissions, trying project-level search...");
      return findAgentInProjectContext(org, project, agentName);
    }
    throw error;
  }
  
  return { found: false };
}
```

### Alternative: Parallel Search Strategy

For better performance with many pools:

```bash
#!/bin/bash

# Parallel search function
search_pool() {
  local pool_id=$1
  local agents=$(api_call "https://dev.azure.com/$ORG/_apis/distributedtask/pools/$pool_id/agents?agentName=$AGENT_NAME&api-version=$API_VERSION")
  
  if echo "$agents" | jq -e '.value | length > 0' > /dev/null; then
    echo "$pool_id"
  fi
}

# Export function and variables for parallel execution
export -f search_pool api_call
export ORG AGENT_NAME API_VERSION AUTH

# Run searches in parallel
found_pool=$(echo "$pools" | jq -r '.value[].id' | xargs -P 10 -I {} bash -c 'search_pool {}' | head -n1)

if [ ! -z "$found_pool" ]; then
  echo "Agent found in pool ID: $found_pool"
fi
```

## Rate Limiting and Best Practices

### Understanding Rate Limits

Azure DevOps implements rate limiting to ensure service reliability:

- **Global limit**: 200 TSTUs (Throughput Units) per 5-minute window
- **Per-user limit**: Varies by license type
- **Anonymous requests**: More restrictive limits

### Rate Limit Headers

Monitor these response headers:
- `X-RateLimit-Limit` - Total allowed requests
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds to wait when rate limited (429 response)

### Handling Rate Limits

Implement exponential backoff and honor the `Retry-After` header when receiving 429 responses. The TypeScript/JavaScript SDKs typically include built-in retry logic.

### Best Practices

1. **Implement Caching**
```bash
# Simple file-based cache
cache_api_call() {
  local url=$1
  local cache_file="/tmp/ado_cache_$(echo "$url" | md5sum | cut -d' ' -f1)"
  local cache_ttl=300  # 5 minutes
  
  # Check if cache exists and is fresh
  if [ -f "$cache_file" ]; then
    local file_age=$(($(date +%s) - $(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file")))
    if [ $file_age -lt $cache_ttl ]; then
      cat "$cache_file"
      return 0
    fi
  fi
  
  # Make API call and cache result
  local result=$(api_call_with_retry "$url")
  if [ $? -eq 0 ]; then
    echo "$result" > "$cache_file"
    echo "$result"
  fi
}
```

2. **Use Conditional Requests**
```bash
# Use ETags for conditional requests
api_call_with_etag() {
  local url=$1
  local etag_file="/tmp/etag_$(echo "$url" | md5sum | cut -d' ' -f1)"
  local etag=""
  
  if [ -f "$etag_file" ]; then
    etag=$(cat "$etag_file")
  fi
  
  response=$(curl -s -D - \
    -H "Authorization: Basic $AUTH" \
    -H "If-None-Match: $etag" \
    "$url")
  
  # Extract status code
  status=$(echo "$response" | head -n1 | cut -d' ' -f2)
  
  if [ "$status" = "304" ]; then
    echo "Resource not modified" >&2
    # Return cached data
  else
    # Extract and save new ETag
    new_etag=$(echo "$response" | grep -i "^etag:" | cut -d' ' -f2 | tr -d '\r')
    if [ ! -z "$new_etag" ]; then
      echo "$new_etag" > "$etag_file"
    fi
    
    # Return body
    echo "$response" | sed '1,/^\r$/d'
  fi
}
```

3. **Batch Operations**
```bash
# Get multiple agents efficiently
get_agents_batch() {
  local pool_ids=("$@")
  
  # Use GNU parallel if available
  if command -v parallel &> /dev/null; then
    printf '%s\n' "${pool_ids[@]}" | \
      parallel -j 10 "curl -s -H 'Authorization: Basic $AUTH' \
        'https://dev.azure.com/$ORG/_apis/distributedtask/pools/{}/agents?api-version=$API_VERSION'"
  else
    # Fall back to xargs
    printf '%s\n' "${pool_ids[@]}" | \
      xargs -P 10 -I {} curl -s -H "Authorization: Basic $AUTH" \
        "https://dev.azure.com/$ORG/_apis/distributedtask/pools/{}/agents?api-version=$API_VERSION"
  fi
}
```

## Code Examples

### Node.js Example

```javascript
const https = require('https');

class AzureDevOpsClient {
  constructor(organization, pat) {
    this.organization = organization;
    this.auth = Buffer.from(`:${pat}`).toString('base64');
    this.baseUrl = `dev.azure.com`;
  }

  async request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: `/${this.organization}/_apis${path}`,
        method,
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else if (res.statusCode === 429) {
            const retryAfter = res.headers['retry-after'] || 60;
            reject(new Error(`Rate limited. Retry after ${retryAfter} seconds`));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async findAgentPool(agentName, projectName = null) {
    // Strategy depends on whether we have project context
    if (projectName) {
      // With project context: Check both pool access and project access
      try {
        // First try org-level search (most efficient)
        const pools = await this.request('/distributedtask/pools?api-version=7.1');
        
        for (const pool of pools.value) {
          const agents = await this.request(
            `/distributedtask/pools/${pool.id}/agents?agentName=${agentName}&api-version=7.1`
          );
          
          if (agents.value.length > 0) {
            // Check if project has access via queue
            const projectQueues = await this.request(
              `/${projectName}/_apis/distributedtask/queues?api-version=7.1`
            );
            
            const hasAccess = projectQueues.value.some(q => q.pool.id === pool.id);
            
            return {
              pool,
              agent: agents.value[0],
              projectHasAccess: hasAccess,
              queue: projectQueues.value.find(q => q.pool.id === pool.id)
            };
          }
        }
      } catch (error) {
        if (error.message.includes('403')) {
          // Fallback: Only check project queues
          console.log('No org permissions, checking project queues only...');
          const queues = await this.request(
            `/${projectName}/_apis/distributedtask/queues?api-version=7.1`
          );
          
          return {
            error: 'Cannot list agents without organization permissions',
            projectQueues: queues.value,
            hint: 'Agent might exist in one of these pools but cannot verify'
          };
        }
        throw error;
      }
    } else {
      // Without project context: Simple org-level search
      const pools = await this.request('/distributedtask/pools?api-version=7.1');
      
      for (const pool of pools.value) {
        const agents = await this.request(
          `/distributedtask/pools/${pool.id}/agents?agentName=${agentName}&api-version=7.1`
        );
        
        if (agents.value.length > 0) {
          return {
            pool,
            agent: agents.value[0]
          };
        }
      }
    }
    
    return null;
  }
}

// Usage Examples

const client = new AzureDevOpsClient('myorg', 'my-pat');

// Example 1: Organization-level search (no project context)
client.findAgentPool('BuildAgent01')
  .then(result => {
    if (result) {
      console.log(`Agent found in pool: ${result.pool.name}`);
      console.log(`Agent status: ${result.agent.status}`);
    } else {
      console.log('Agent not found');
    }
  })
  .catch(console.error);

// Example 2: Project-specific search
client.findAgentPool('BuildAgent01', 'MyProject')
  .then(result => {
    if (result?.error) {
      console.log('Limited access:', result.error);
      console.log('Available queues:', result.projectQueues.map(q => q.name));
    } else if (result) {
      console.log(`Agent found in pool: ${result.pool.name}`);
      console.log(`Agent status: ${result.agent.status}`);
      console.log(`Project has access: ${result.projectHasAccess}`);
      
      if (!result.projectHasAccess) {
        console.log('Note: Agent exists but project needs a queue to access this pool');
      }
    } else {
      console.log('Agent not found');
    }
  })
  .catch(console.error);
```

## Response Formats

### Agent Response Structure

```json
{
  "id": 123,
  "name": "BuildAgent-01",
  "version": "2.210.1",
  "osDescription": "Linux 5.4.0-42-generic",
  "enabled": true,
  "status": "online",
  "provisioningState": "Provisioned",
  "accessPoint": "CodexAccessMapping",
  "pool": {
    "id": 5,
    "name": "Default",
    "poolType": "automation"
  },
  "systemCapabilities": {
    "Agent.ComputerName": "build-server-01",
    "Agent.HomeDirectory": "/home/azureuser/agent",
    "Agent.Machine": "build-server-01",
    "Agent.Name": "BuildAgent-01",
    "Agent.OS": "Linux",
    "Agent.OSArchitecture": "X64",
    "Agent.Version": "2.210.1"
  },
  "userCapabilities": {
    "docker": "true",
    "node": "16.14.0",
    "python": "3.9"
  }
}
```

### Pool Response Structure

```json
{
  "id": 5,
  "name": "Default",
  "poolType": "automation",
  "size": 3,
  "isHosted": false,
  "createdOn": "2023-01-15T10:30:00Z",
  "autoProvision": false,
  "autoSize": false,
  "targetSize": 3,
  "agentCloudId": null,
  "properties": {
    "System.AutoProvision": "False",
    "System.AutoSize": "False"
  }
}
```

### Queue Response Structure

```json
{
  "id": 10,
  "name": "Default",
  "pool": {
    "id": 5,
    "name": "Default",
    "isHosted": false,
    "poolType": "automation"
  },
  "projectId": "12345678-1234-1234-1234-123456789012",
  "groupScopeId": "12345678-1234-1234-1234-123456789012"
}
```

### Error Response Structure

```json
{
  "$id": "1",
  "innerException": null,
  "message": "The agent pool with id 999 could not be found.",
  "typeName": "Microsoft.TeamFoundation.DistributedTask.WebApi.AgentPoolNotFoundException",
  "typeKey": "AgentPoolNotFoundException",
  "errorCode": 0,
  "eventId": 3000
}
```

## Summary

This guide covers the essential aspects of working with Azure DevOps APIs for agent, pool, and queue management. Key takeaways:

1. **Authentication**: Use PATs for scripts, OAuth for applications
2. **Progressive Queries**: Start broad (pools) and narrow down (agents)
3. **Rate Limiting**: Implement retry logic and respect limits
4. **Caching**: Cache responses to reduce API calls
5. **Error Handling**: Always handle 429 (rate limit) and other errors gracefully
6. **Parallel Processing**: Use parallel requests when searching multiple pools

Remember to always check the latest API documentation as Azure DevOps APIs continue to evolve.