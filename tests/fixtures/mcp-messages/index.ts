// MCP protocol message fixtures for testing server functionality

import { 
  ListToolsRequest, 
  ListToolsResult, 
  CallToolRequest, 
  CallToolResult,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// Sample MCP request messages
export const listToolsRequest: ListToolsRequest = {
  method: 'tools/list',
  params: {}
};

export const callToolRequest: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'project_health_check',
    arguments: {}
  }
};

export const callToolWithArgsRequest: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'project_list_queues',
    arguments: {
      nameFilter: 'Default'
    }
  }
};

export const invalidCallToolRequest: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'nonexistent_tool',
    arguments: {}
  }
};

// Sample MCP response messages
export const listToolsResponse: ListToolsResult = {
  tools: [
    {
      name: 'project_health_check',
      description: 'Check the health of the Azure DevOps project connection',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'project_list_queues',
      description: 'List all agent queues in the project',
      inputSchema: {
        type: 'object',
        properties: {
          nameFilter: {
            type: 'string',
            description: 'Optional filter to match queue names'
          }
        },
        required: []
      }
    },
    {
      name: 'build_list',
      description: 'List builds with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          definitionIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Filter by specific build definition IDs'
          },
          statusFilter: {
            type: 'string',
            enum: ['inProgress', 'completed', 'cancelling', 'postponed', 'notStarted', 'all'],
            description: 'Filter builds by status'
          },
          top: {
            type: 'number',
            description: 'Maximum number of builds to return',
            minimum: 1,
            maximum: 5000
          }
        },
        required: []
      }
    }
  ]
};

export const successfulCallToolResponse: CallToolResult = {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        data: {
          message: 'Connection successful',
          project: 'test-project',
          timestamp: '2024-01-01T10:00:00Z'
        }
      }, null, 2)
    }
  ]
};

export const errorCallToolResponse: CallToolResult = {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        success: false,
        error: {
          type: 'permission',
          message: 'Access denied: Insufficient permissions',
          requiredPermission: 'Project (Read)',
          suggestion: 'Ensure your Azure DevOps token has the required permissions'
        }
      }, null, 2)
    }
  ]
};

// Tool definitions for testing
export const sampleToolDefinitions: Tool[] = [
  {
    name: 'project_health_check',
    description: 'Check the health of the Azure DevOps project connection',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'project_list_queues',
    description: 'List all agent queues in the project',
    inputSchema: {
      type: 'object',
      properties: {
        nameFilter: {
          type: 'string',
          description: 'Optional filter to match queue names'
        }
      },
      required: []
    }
  },
  {
    name: 'build_queue',
    description: 'Queue a new build',
    inputSchema: {
      type: 'object',
      properties: {
        definitionId: {
          type: 'number',
          description: 'Build definition ID to queue'
        },
        sourceBranch: {
          type: 'string',
          description: 'Source branch for the build'
        },
        parameters: {
          type: 'object',
          description: 'Build parameters as key-value pairs'
        }
      },
      required: ['definitionId']
    }
  }
];

// Complex tool call scenarios
export const buildQueueToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_queue',
    arguments: {
      definitionId: 1,
      sourceBranch: 'refs/heads/main',
      parameters: {
        buildConfiguration: 'Release',
        runTests: 'true'
      }
    }
  }
};

export const buildListToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_list',
    arguments: {
      definitionIds: [1, 2],
      statusFilter: 'completed',
      top: 10
    }
  }
};

export const agentSearchToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'org_find_agent',
    arguments: {
      agentName: 'Build-Agent'
    }
  }
};

// Invalid tool call scenarios
export const invalidParametersToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_queue',
    arguments: {
      // Missing required definitionId
      sourceBranch: 'refs/heads/main'
    }
  }
};

export const malformedArgumentsToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_list',
    arguments: {
      definitionIds: 'not-an-array', // Should be array
      top: 'not-a-number' // Should be number
    }
  }
};

// Response templates for different scenarios
export const createSuccessResponse = (data: any): CallToolResult => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        data
      }, null, 2)
    }
  ]
});

export const createErrorResponse = (error: any): CallToolResult => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({
        success: false,
        error
      }, null, 2)
    }
  ]
});

// Batch tool calls for testing multiple operations
export const batchToolCalls: CallToolRequest[] = [
  {
    method: 'tools/call',
    params: {
      name: 'project_health_check',
      arguments: {}
    }
  },
  {
    method: 'tools/call',
    params: {
      name: 'project_list_queues',
      arguments: {}
    }
  },
  {
    method: 'tools/call',
    params: {
      name: 'build_list',
      arguments: {
        top: 5
      }
    }
  }
];

// Tool call with file operations
export const downloadLogsToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_download_job_logs',
    arguments: {
      buildId: 101,
      jobName: 'Build Job',
      outputPath: '/tmp/test-logs'
    }
  }
};

export const downloadArtifactToolCall: CallToolRequest = {
  method: 'tools/call',
  params: {
    name: 'build_download_artifact',
    arguments: {
      buildId: 101,
      artifactName: 'drop',
      outputPath: '/tmp/test-artifacts'
    }
  }
};

// Utility functions for creating test messages
export function createToolCallRequest(toolName: string, args: any = {}): CallToolRequest {
  return {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };
}

export function createToolDefinition(
  name: string, 
  description: string, 
  properties: any = {}, 
  required: string[] = []
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required
    }
  };
}