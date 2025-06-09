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

// Agent status codes from Azure DevOps API
export enum AgentStatus {
  Offline = '1',
  Online = '2',
  Unavailable = '3'
}

export interface PermissionError {
  type: 'permission';
  message: string;
  requiredPermission: string;
  suggestion: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: PermissionError | { type: 'not_found' | 'api_error'; message: string } };

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