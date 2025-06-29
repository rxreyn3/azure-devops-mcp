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
  limit?: number;
  continuationToken?: string;
}

export interface PagedAgentsResult {
  agents: ProjectAgentInfo[];
  continuationToken?: string;
  hasMore: boolean;
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

export interface JobLogDownloadResult {
  savedPath: string;
  fileSize: number;
  jobName: string;
  jobId: string;
  logId: number;
  duration?: string;
}