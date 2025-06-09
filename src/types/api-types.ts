// API-related type definitions
export interface QueueInfo {
  id: number;
  name: string;
  poolId: number;
  poolName: string;
  isHosted: boolean;
}

export interface AgentInfo {
  id: number;
  name: string;
  status: string;
  enabled: boolean;
  version?: string;
  osDescription?: string;
}

export interface ProjectAgentInfo extends AgentInfo {
  poolName: string;
  queueId: number;
  queueName: string;
}

export interface ListAgentsOptions {
  nameFilter?: string;
  poolNameFilter?: string;
  onlyOnline?: boolean;
}


export interface PermissionError {
  type: 'permission';
  message: string;
  requiredPermission: string;
  suggestion: string;
}

export type ApiError = PermissionError | { type: 'not_found' | 'api_error'; message: string };

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// Build-related types
export interface BuildInfo {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  queueTime: Date;
  startTime?: Date;
  finishTime?: Date;
  sourceBranch: string;
  sourceVersion: string;
  requestedFor: {
    displayName: string;
    uniqueName: string;
  };
  definition: {
    id: number;
    name: string;
  };
}

export interface PipelineInfo {
  id: number;
  name: string;
  path: string;
  type: 'build' | 'yaml';
  queueStatus?: 'enabled' | 'paused' | 'disabled';
  latestBuild?: {
    id: number;
    buildNumber: string;
    status: string;
    result?: string;
  };
}

export interface BuildTimelineRecord {
  id: string;
  parentId?: string;
  type: string;
  name: string;
  startTime?: Date;
  finishTime?: Date;
  state: string;
  result?: string;
  errorCount: number;
  warningCount: number;
  log?: {
    id?: number;
    type?: string;
  };
}