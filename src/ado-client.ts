import * as azdev from 'azure-devops-node-api';
import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import { Config } from './config.js';

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

export interface PermissionError {
  type: 'permission';
  message: string;
  requiredPermission: string;
  suggestion: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: PermissionError | { type: 'not_found' | 'api_error'; message: string } };

export class AzureDevOpsClient {
  private connection: azdev.WebApi;
  private taskAgentApi: ITaskAgentApi | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    const authHandler = azdev.getPersonalAccessTokenHandler(config.pat);
    this.connection = new azdev.WebApi(config.organization, authHandler);
  }

  async initialize(): Promise<void> {
    try {
      this.taskAgentApi = await this.connection.getTaskAgentApi();
    } catch (error) {
      throw new Error(
        `Failed to initialize Azure DevOps connection: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async listProjectQueues(): Promise<ApiResult<QueueInfo[]>> {
    if (!this.taskAgentApi) {
      throw new Error('Client not initialized');
    }

    try {
      const queues = await this.taskAgentApi.getAgentQueues(this.config.project);
      
      const queueInfos: QueueInfo[] = queues.map((queue) => ({
        id: queue.id!,
        name: queue.name!,
        poolId: queue.pool?.id || 0,
        poolName: queue.pool?.name || 'Unknown',
        isHosted: queue.pool?.isHosted || false,
      }));

      return { success: true, data: queueInfos };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getQueueDetails(queueIdOrName: string | number): Promise<ApiResult<QueueInfo>> {
    if (!this.taskAgentApi) {
      throw new Error('Client not initialized');
    }

    try {
      const queues = await this.taskAgentApi.getAgentQueues(this.config.project);
      
      const queue = queues.find((q) => {
        if (typeof queueIdOrName === 'number') {
          return q.id === queueIdOrName;
        }
        return q.name?.toLowerCase() === queueIdOrName.toLowerCase();
      });

      if (!queue) {
        return {
          success: false,
          error: {
            type: 'not_found',
            message: `Queue '${queueIdOrName}' not found in project ${this.config.project}`,
          },
        };
      }

      const queueInfo: QueueInfo = {
        id: queue.id!,
        name: queue.name!,
        poolId: queue.pool?.id || 0,
        poolName: queue.pool?.name || 'Unknown',
        isHosted: queue.pool?.isHosted || false,
      };

      return { success: true, data: queueInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listQueueAgents(queueId: number): Promise<ApiResult<AgentInfo[]>> {
    if (!this.taskAgentApi) {
      throw new Error('Client not initialized');
    }

    try {
      // First get the queue to find the pool ID
      const queueResult = await this.getQueueDetails(queueId);
      if (!queueResult.success) {
        return queueResult;
      }

      const poolId = queueResult.data.poolId;

      // Try to get agents from the pool (requires org-level permissions)
      const agents = await this.taskAgentApi.getAgents(poolId);
      
      const agentInfos: AgentInfo[] = agents.map((agent) => ({
        id: agent.id!,
        name: agent.name!,
        status: String(agent.status || 'unknown'),
        enabled: agent.enabled || false,
        version: agent.version,
        osDescription: agent.oSDescription,
      }));

      return { success: true, data: agentInfos };
    } catch (error) {
      // Check if it's a permission error
      if (this.isPermissionError(error)) {
        return {
          success: false,
          error: {
            type: 'permission',
            message: 'Cannot list agents: Organization-level permissions required',
            requiredPermission: 'vso.agentpools (read)',
            suggestion:
              "Request 'Reader' access to agent pools from your Azure DevOps administrator",
          },
        };
      }
      return this.handleError(error);
    }
  }

  async findAgent(agentName: string): Promise<ApiResult<{ agent: AgentInfo; queue: QueueInfo }>> {
    if (!this.taskAgentApi) {
      throw new Error('Client not initialized');
    }

    try {
      // First, get all queues in the project
      const queuesResult = await this.listProjectQueues();
      if (!queuesResult.success) {
        return queuesResult;
      }

      // Try to search through each pool
      for (const queue of queuesResult.data) {
        try {
          const agents = await this.taskAgentApi.getAgents(queue.poolId);
          const agent = agents.find(
            (a) => a.name?.toLowerCase() === agentName.toLowerCase(),
          );

          if (agent) {
            const agentInfo: AgentInfo = {
              id: agent.id!,
              name: agent.name!,
              status: String(agent.status || 'unknown'),
              enabled: agent.enabled || false,
              version: agent.version,
              osDescription: agent.oSDescription,
            };

            return {
              success: true,
              data: {
                agent: agentInfo,
                queue,
              },
            };
          }
        } catch (poolError) {
          // Skip pools we can't access
          continue;
        }
      }

      return {
        success: false,
        error: {
          type: 'not_found',
          message: `Agent '${agentName}' not found in any accessible queue`,
        },
      };
    } catch (error) {
      if (this.isPermissionError(error)) {
        return {
          success: false,
          error: {
            type: 'permission',
            message: 'Cannot search for agents: Organization-level permissions required',
            requiredPermission: 'vso.agentpools (read)',
            suggestion:
              "Request 'Reader' access to agent pools from your Azure DevOps administrator",
          },
        };
      }
      return this.handleError(error);
    }
  }

  private isPermissionError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('tf401019') ||
        message.includes('access denied') ||
        message.includes('permission') ||
        message.includes('unauthorized')
      );
    }
    return false;
  }

  private handleError(error: unknown): ApiResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        type: 'api_error',
        message,
      },
    };
  }
}