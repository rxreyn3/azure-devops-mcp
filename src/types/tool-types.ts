import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  tool: Tool;
  handler: (args: any) => Promise<{
    content: Array<{
      type: 'text';
      text: string;
    }>;
  }>;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ToolRegistry {
  [toolName: string]: ToolDefinition;
}

// Tool-specific argument types
export interface ListBuildsArgs {
  status?: 'all' | 'inProgress' | 'completed';
  result?: 'all' | 'succeeded' | 'failed' | 'canceled';
  top?: number;
  definitionId?: number;
  requestedFor?: string;
  sinceHours?: number;
}

export interface GetBuildDetailsArgs {
  buildId: number;
  includeTimeline?: boolean;
  includeChanges?: boolean;
}

export interface QueueBuildArgs {
  definitionId: number;
  sourceBranch?: string;
  parameters?: Record<string, string>;
}

export interface GetBuildLogsArgs {
  buildId: number;
  logId?: number;
  download?: boolean;
}

export interface ListPipelinesArgs {
  name?: string;
  path?: string;
  includeLatestBuild?: boolean;
}

export interface ManageBuildArgs {
  buildId: number;
  action: 'cancel' | 'retain' | 'retry';
}

export interface GetPipelineConfigArgs {
  definitionId: number;
  includeVariables?: boolean;
  includeTriggers?: boolean;
}