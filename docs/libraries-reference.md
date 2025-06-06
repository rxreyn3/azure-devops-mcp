# Libraries Reference for MCP and Azure DevOps Development

## Overview

This document provides a comprehensive reference for libraries that support Model Context Protocol (MCP) development and Azure DevOps API integration. Each library includes installation instructions, key features, and usage examples.

## Table of Contents

1. [MCP Development Libraries](#mcp-development-libraries)
   - [TypeScript/JavaScript SDK](#typescriptjavascript-sdk)
   - [Python SDK](#python-sdk)
   - [Other Language SDKs](#other-language-sdks)
2. [Azure DevOps API Libraries](#azure-devops-api-libraries)
   - [Azure DevOps Node API](#azure-devops-node-api)
   - [Azure DevOps Python API](#azure-devops-python-api)
3. [Integration Examples](#integration-examples)

## MCP Development Libraries

### TypeScript/JavaScript SDK

**Package**: `@modelcontextprotocol/sdk`  
**Repository**: [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)

#### Installation

```bash
npm install @modelcontextprotocol/sdk
# or
yarn add @modelcontextprotocol/sdk
# or
pnpm add @modelcontextprotocol/sdk
```

#### Key Features

- Complete MCP server and client implementation
- Multiple transport options (stdio, SSE, HTTP)
- Built-in session management
- OAuth authentication support
- TypeScript support with full type definitions
- Streaming support for resources

#### Basic Usage

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioTransport } from "@modelcontextprotocol/sdk/transport/stdio.js";

// Create server
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  description: "My MCP Server"
});

// Define a tool
server.tool("calculate", {
  description: "Perform calculations",
  parameters: {
    type: "object",
    properties: {
      operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
      a: { type: "number" },
      b: { type: "number" }
    },
    required: ["operation", "a", "b"]
  }
}, async ({ operation, a, b }) => {
  let result;
  switch (operation) {
    case "add": result = a + b; break;
    case "subtract": result = a - b; break;
    case "multiply": result = a * b; break;
    case "divide": result = a / b; break;
  }
  
  return {
    content: [{
      type: "text",
      text: `Result: ${result}`
    }]
  };
});

// Define a resource
server.resource("data://{type}/{id}", async (uri) => {
  const { type, id } = uri.params;
  // Fetch data based on type and id
  const data = await fetchData(type, id);
  
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: "application/json",
      text: JSON.stringify(data)
    }]
  };
});

// Start server with stdio transport
const transport = new StdioTransport();
await server.connect(transport);
```

#### Advanced Features

**SSE Transport for Web Integration:**
```typescript
import { HttpSSETransport } from "@modelcontextprotocol/sdk/transport/sse.js";
import express from "express";

const app = express();
const transport = new HttpSSETransport();

app.use("/mcp", transport.handler());

await server.connect(transport);
app.listen(3000);
```

**Client Usage:**
```typescript
import { McpClient } from "@modelcontextprotocol/sdk/client/mcp.js";

const client = new McpClient();
await client.connect(transport);

// Call a tool
const result = await client.callTool("calculate", {
  operation: "add",
  a: 5,
  b: 3
});

// Get a resource
const resource = await client.getResource("data://users/123");
```



## Azure DevOps API Libraries

### Azure DevOps Node API

**Package**: `azure-devops-node-api`  
**Repository**: [microsoft/azure-devops-node-api](https://github.com/microsoft/azure-devops-node-api)

#### Installation

```bash
npm install azure-devops-node-api --save
# or
yarn add azure-devops-node-api
```

#### Key Features

- Complete TypeScript/JavaScript API client
- All Azure DevOps services covered
- Personal Access Token (PAT) authentication
- OAuth support
- Typed interfaces for all responses
- Promise-based async operations
- Automatic retry logic

#### Basic Usage

```typescript
import * as azdev from "azure-devops-node-api";
import * as TaskAgentApi from "azure-devops-node-api/TaskAgentApi";

// Initialize connection
const orgUrl = "https://dev.azure.com/yourorgname";
const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN!;

const authHandler = azdev.getPersonalAccessTokenHandler(token);
const connection = new azdev.WebApi(orgUrl, authHandler);

// Get task agent API
const taskAgentApi: TaskAgentApi.ITaskAgentApi = await connection.getTaskAgentApi();

// List all agent pools
const pools = await taskAgentApi.getAgentPools();
console.log(`Found ${pools.length} agent pools`);

// Get agents in a specific pool
const poolId = 5;
const agents = await taskAgentApi.getAgents(poolId);

for (const agent of agents) {
    console.log(`Agent: ${agent.name}, Status: ${agent.status}`);
}

// Find a specific agent across all pools
async function findAgent(agentName: string) {
    const pools = await taskAgentApi.getAgentPools();
    
    for (const pool of pools) {
        const agents = await taskAgentApi.getAgents(pool.id!);
        const agent = agents.find(a => a.name === agentName);
        
        if (agent) {
            return { pool, agent };
        }
    }
    
    return null;
}
```

#### Advanced Usage

**Working with Queues:**
```typescript
import * as BuildApi from "azure-devops-node-api/BuildApi";

const buildApi: BuildApi.IBuildApi = await connection.getBuildApi();

// Get agent queues for a project
const project = "MyProject";
const queues = await taskAgentApi.getAgentQueues(project);

// Create a new queue
const newQueue = {
    name: "MyNewQueue",
    pool: { id: poolId }
};
await taskAgentApi.addAgentQueue(newQueue, project);
```

**Error Handling and Retries:**
```typescript
import { RestClient } from "azure-devops-node-api/RestClient";

class AzureDevOpsClient {
    private connection: azdev.WebApi;
    private maxRetries = 3;
    
    constructor(orgUrl: string, token: string) {
        const authHandler = azdev.getPersonalAccessTokenHandler(token);
        this.connection = new azdev.WebApi(orgUrl, authHandler, {
            allowRetries: true,
            maxRetries: this.maxRetries
        });
    }
    
    async getAgentWithRetry(poolId: number, agentId: number) {
        const taskAgentApi = await this.connection.getTaskAgentApi();
        
        try {
            return await taskAgentApi.getAgent(poolId, agentId, true, true);
        } catch (error) {
            if (error.statusCode === 429) {
                // Rate limited - wait and retry
                const retryAfter = error.headers?.['retry-after'] || 60;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.getAgentWithRetry(poolId, agentId);
            }
            throw error;
        }
    }
}
```


## Integration Examples

### MCP Server with Azure DevOps Integration

Here's an example of creating an MCP server that provides Azure DevOps agent information:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioTransport } from "@modelcontextprotocol/sdk/transport/stdio.js";
import * as azdev from "azure-devops-node-api";

// Initialize Azure DevOps connection
const orgUrl = process.env.ADO_ORG_URL!;
const token = process.env.ADO_PAT!;
const authHandler = azdev.getPersonalAccessTokenHandler(token);
const connection = new azdev.WebApi(orgUrl, authHandler);

// Create MCP server
const server = new McpServer({
  name: "ado-agent-mcp",
  version: "1.0.0",
  description: "Azure DevOps Agent Information MCP Server"
});

// Tool: Find which pool an agent belongs to
server.tool("find_agent_pool", {
  description: "Find which pool an agent belongs to, optionally checking project access",
  parameters: {
    type: "object",
    properties: {
      agentName: { type: "string", description: "Name of the agent" },
      project: { type: "string", description: "Optional: Project name to check access" }
    },
    required: ["agentName"]
  }
}, async ({ agentName, project }) => {
  try {
    const taskAgentApi = await connection.getTaskAgentApi();
    
    // Try organization-level search first (most efficient)
    try {
      const pools = await taskAgentApi.getAgentPools();
      
      for (const pool of pools) {
        const agents = await taskAgentApi.getAgents(pool.id!);
        const agent = agents.find(a => a.name === agentName);
        
        if (agent) {
          let projectAccess = null;
          
          // If project provided, check if it has access
          if (project) {
            try {
              const queues = await taskAgentApi.getAgentQueues(project);
              const hasAccess = queues.some(q => q.pool?.id === pool.id);
              const queue = queues.find(q => q.pool?.id === pool.id);
              
              projectAccess = {
                hasAccess,
                queueId: queue?.id,
                queueName: queue?.name
              };
            } catch (err) {
              projectAccess = {
                error: "Could not check project access",
                message: err.message
              };
            }
          }
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                found: true,
                pool: {
                  id: pool.id,
                  name: pool.name,
                  type: pool.poolType
                },
                agent: {
                  id: agent.id,
                  name: agent.name,
                  status: agent.status,
                  enabled: agent.enabled,
                  version: agent.version
                },
                ...(projectAccess && { projectAccess })
              }, null, 2)
            }]
          };
        }
      }
    } catch (error) {
      // If org-level fails and project provided, try project-level
      if (error.statusCode === 403 && project) {
        const queues = await taskAgentApi.getAgentQueues(project);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              found: false,
              message: "Cannot search agents without organization permissions",
              projectQueues: queues.map(q => ({
                id: q.id,
                name: q.name,
                poolId: q.pool?.id,
                poolName: q.pool?.name
              })),
              hint: "Agent might exist in one of these pools but cannot verify"
            }, null, 2)
          }]
        };
      }
      throw error;
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ 
          found: false, 
          message: "Agent not found in any pool",
          ...(project && { project: `Searched all pools accessible from org level` })
        })
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Resource: Agent information
server.resource("ado://agents/{poolId}/{agentId}", async (uri) => {
  const { poolId, agentId } = uri.params;
  
  try {
    const taskAgentApi = await connection.getTaskAgentApi();
    const agent = await taskAgentApi.getAgent(
      parseInt(poolId),
      parseInt(agentId),
      true, // includeCapabilities
      true, // includeAssignedRequest
      true  // includeLastCompletedRequest
    );
    
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(agent, null, 2)
      }]
    };
  } catch (error) {
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: "text/plain",
        text: `Error: ${error.message}`
      }]
    };
  }
});

// Start the server
const transport = new StdioTransport();
await server.connect(transport);
```


## Summary

This reference guide provides comprehensive information about the main libraries for MCP and Azure DevOps development:

1. **MCP SDKs** are available in multiple languages with TypeScript and Python being the most feature-complete
2. **Azure DevOps APIs** have official SDKs in Node.js and Python with full coverage of all services
3. Both ecosystems provide excellent documentation and examples
4. Integration between MCP and Azure DevOps is straightforward using these libraries

Choose the language and SDK that best fits your existing infrastructure and team expertise. All SDKs provide similar functionality with language-specific idioms and patterns.