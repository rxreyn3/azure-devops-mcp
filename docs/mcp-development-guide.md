# MCP (Model Context Protocol) Development Guide

## Overview

The Model Context Protocol (MCP) is an open standard developed by Anthropic for enabling seamless integration between AI systems and external data sources. This guide provides comprehensive information for creating, testing, and deploying MCP servers.

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Development Setup](#development-setup)
5. [Building Your First MCP Server](#building-your-first-mcp-server)
6. [Testing Strategies](#testing-strategies)
7. [Deployment Options](#deployment-options)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)

## Introduction

MCP establishes three core capabilities:
- **Resources** - Structured data access with URI-based templates
- **Prompts** - Contextual workflows and templates
- **Tools** - Executable functions that AI can invoke

The protocol uses JSON-RPC 2.0 for communication and supports both stdio and HTTP+SSE transports.

## Core Concepts

### 1. Resources
Resources provide structured data access using URI templates:
```typescript
server.resource("greeting://{name}", async (uri) => ({
  contents: [{ text: `Hello, ${uri.params.name}!` }]
}));
```

### 2. Tools
Tools are executable functions that AI can invoke:
```typescript
server.tool("add", { a: "number", b: "number" }, ({ a, b }) => ({ 
  content: [{ type: "text", text: `${a + b}` }] 
}));
```

### 3. Prompts
Prompts define contextual workflows:
```typescript
server.prompt("summarize", async ({ text }) => ({
  messages: [{ role: "user", content: `Summarize: ${text}` }]
}));
```

## Architecture

MCP follows a client-server architecture with four primary components:

1. **Host** - The AI application (e.g., Claude Desktop)
2. **Client** - Mediator within the host managing MCP sessions
3. **Server** - Provider of context and tools
4. **Transport** - Communication layer (stdio or HTTP SSE)

### Communication Flow
```
Host (Claude) <-> Client <-> Transport <-> Server (Your MCP)
```

Key architectural layers:
- **Context Management** - URI-based resource resolution and dynamic data fetching
- **Execution Framework** - Tool orchestration with parallel invocation support
- **State Management** - Session-specific caching and monitoring

## Development Setup

### TypeScript/JavaScript

1. **Installation**
```bash
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
```

2. **Basic Server Structure**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioTransport } from "@modelcontextprotocol/sdk/transport/stdio";

const server = new McpServer({ 
  name: "my-mcp-server", 
  version: "1.0.0" 
});

// Define your tools, resources, and prompts here

const transport = new StdioTransport();
server.connect(transport);
```


## Building Your First MCP Server

### Example: File System MCP Server

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioTransport } from "@modelcontextprotocol/sdk/transport/stdio";
import * as fs from 'fs/promises';
import * as path from 'path';

const server = new McpServer({ 
  name: "filesystem-mcp", 
  version: "1.0.0",
  description: "File system operations MCP server"
});

// Tool: Read file
server.tool("read_file", {
  path: { type: "string", description: "File path to read" }
}, async ({ path: filePath }) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      content: [{
        type: "text",
        text: content
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error reading file: ${error.message}`
      }]
    };
  }
});

// Tool: Write file
server.tool("write_file", {
  path: { type: "string", description: "File path to write" },
  content: { type: "string", description: "Content to write" }
}, async ({ path: filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      content: [{
        type: "text",
        text: `File written successfully: ${filePath}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error writing file: ${error.message}`
      }]
    };
  }
});

// Resource: Directory listing
server.resource("dir://{path}", async (uri) => {
  const dirPath = uri.params.path || '.';
  try {
    const files = await fs.readdir(dirPath);
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: "text/plain",
        text: files.join('\n')
      }]
    };
  } catch (error) {
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: "text/plain",
        text: `Error reading directory: ${error.message}`
      }]
    };
  }
});

// Start server
const transport = new StdioTransport();
server.connect(transport);
```

## Testing Strategies

### 1. Unit Testing

Use the MockTransport for in-memory testing:

```typescript
import { MockTransport } from "@modelcontextprotocol/sdk/transport/mock";
import { test, expect } from '@jest/globals';

test('add tool returns correct sum', async () => {
  const transport = new MockTransport();
  server.connect(transport);
  
  const response = await transport.call('tools/call', {
    name: 'add',
    arguments: { a: 5, b: 3 }
  });
  
  expect(response.content[0].text).toBe('8');
});
```

### 2. Integration Testing

Test with actual transport using the test client utilities provided by the MCP SDK.

### 3. Load Testing

Use standard load testing tools like Locust or k6 to test HTTP+SSE transports for performance.

## Deployment Options

### 1. Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. Serverless (AWS Lambda)

```javascript
// handler.js
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp");
const { HttpSSETransport } = require("@modelcontextprotocol/sdk/transport/sse");

exports.handler = async (event) => {
  const server = new McpServer({ name: "lambda-mcp", version: "1.0.0" });
  // Configure server...
  
  const transport = new HttpSSETransport();
  return transport.handleRequest(event);
};
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: myregistry/mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: MCP_TRANSPORT
          value: "sse"
```

## Best Practices

### 1. Security
- Always validate input parameters
- Implement proper authentication for HTTP transports
- Use environment variables for sensitive configuration
- Never expose internal system details in error messages

### 2. Error Handling
```typescript
server.tool("safe_operation", params, async (args) => {
  try {
    // Validate inputs
    if (!args.input || typeof args.input !== 'string') {
      throw new Error('Invalid input parameter');
    }
    
    // Perform operation
    const result = await performOperation(args.input);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result)
      }]
    };
  } catch (error) {
    // Log internally but return safe error to client
    console.error('Operation failed:', error);
    
    return {
      content: [{
        type: "text",
        text: `Operation failed: ${error.message}`
      }],
      isError: true
    };
  }
});
```

### 3. Resource Management
- Implement proper cleanup in server shutdown
- Use connection pooling for database resources
- Set appropriate timeouts for long-running operations

### 4. Monitoring and Logging
```typescript
server.on('tool:call', (event) => {
  console.log(`Tool called: ${event.name}`, {
    timestamp: new Date().toISOString(),
    arguments: event.arguments,
    duration: event.duration
  });
});
```

## Common Patterns

### 1. Adapter Pattern
Wrap legacy APIs in MCP-compliant interfaces:

```typescript
class LegacyApiAdapter {
  constructor(private legacyApi: any) {}
  
  async handleToolCall(name: string, args: any) {
    // Transform MCP args to legacy API format
    const legacyResult = await this.legacyApi[name](args);
    
    // Transform result back to MCP format
    return {
      content: [{
        type: "text",
        text: JSON.stringify(legacyResult)
      }]
    };
  }
}
```

### 2. Caching Pattern
Implement caching for expensive operations:

```typescript
const cache = new Map<string, CacheEntry>();

server.resource("cached://{key}", async (uri) => {
  const key = uri.params.key;
  const cached = cache.get(key);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  
  const value = await fetchExpensiveData(key);
  cache.set(key, {
    value,
    expiry: Date.now() + 300000 // 5 minutes
  });
  
  return value;
});
```

### 3. Streaming Pattern
For real-time data:

```typescript
server.resource("stream://{channel}", async (uri) => {
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: "text/event-stream",
      stream: async function* () {
        const channel = uri.params.channel;
        const subscription = subscribe(channel);
        
        try {
          for await (const event of subscription) {
            yield `data: ${JSON.stringify(event)}\n\n`;
          }
        } finally {
          subscription.close();
        }
      }
    }]
  };
});
```

## Next Steps

1. Review the [official MCP specification](https://spec.modelcontextprotocol.io)
2. Explore example servers in the [MCP GitHub repository](https://github.com/modelcontextprotocol)
3. Join the MCP community for support and updates
4. Consider contributing to the MCP ecosystem

Remember: MCP is designed to solve the "M×N problem" of AI integrations by providing a unified protocol. Focus on building servers that expose your unique capabilities in a standardized way.