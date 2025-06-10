import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import { TaskAgentQueue, TaskAgent, TaskAgentStatus, TaskAgentQueueActionFilter } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult, QueueInfo, AgentInfo, ProjectAgentInfo, ListAgentsOptions } from '../types/index.js';
import { createNotFoundError, createPermissionError } from '../utils/error-handlers.js';
import { safeStringCompare } from '../utils/validators.js';

export class TaskAgentClient extends AzureDevOpsBaseClient {
  private taskAgentApi: ITaskAgentApi | null = null;

  async initialize(): Promise<void> {
    this.taskAgentApi = await this.connection.getTaskAgentApi();
  }

  private async ensureTaskAgentApi(): Promise<ITaskAgentApi> {
    if (!this.taskAgentApi) {
      await this.initialize();
    }
    return this.taskAgentApi!;
  }

  async listProjectQueues(): Promise<ApiResult<QueueInfo[]>> {
    const api = await this.ensureTaskAgentApi();
    
    return this.handleApiCall('list project queues', async () => {
      const queues = await api.getAgentQueues(this.config.project);
      
      return queues
        .filter((q): q is Required<TaskAgentQueue> => 
          q.id !== undefined && q.name !== undefined && q.pool !== undefined
        )
        .map(q => ({
          id: q.id,
          name: q.name,
          poolId: q.pool.id || 0,
          poolName: q.pool.name || 'Unknown',
          isHosted: q.pool.isHosted || false
        }));
    });
  }

  async getQueueDetails(queueIdOrName: string | number): Promise<ApiResult<QueueInfo>> {
    const api = await this.ensureTaskAgentApi();
    
    return this.handleApiCall('get queue details', async () => {
      const queues = await api.getAgentQueues(this.config.project);
      
      const queue = queues.find((q) => {
        if (typeof queueIdOrName === 'number') {
          return q.id === queueIdOrName;
        }
        return safeStringCompare(q.name, queueIdOrName, false);
      });
      
      if (!queue || !queue.id || !queue.name || !queue.pool) {
        throw createNotFoundError('Queue', queueIdOrName.toString());
      }
      
      return {
        id: queue.id,
        name: queue.name,
        poolId: queue.pool.id || 0,
        poolName: queue.pool.name || 'Unknown',
        isHosted: queue.pool.isHosted || false
      };
    });
  }

  async findAgent(agentName: string): Promise<ApiResult<{ agent: AgentInfo; poolName: string; queueId?: number }[]>> {
    const api = await this.ensureTaskAgentApi();
    
    return this.handleApiCall('find agent', async () => {
      const foundAgents: { agent: AgentInfo; poolName: string; queueId?: number }[] = [];
      
      try {
        const pools = await api.getAgentPools();
        
        for (const pool of pools) {
          if (!pool.id) continue;
          
          try {
            const agents = await api.getAgents(pool.id, agentName);
            
            for (const agent of agents) {
              if (!agent.id || !agent.name) continue;
              
              foundAgents.push({
                agent: this.mapAgentInfo(agent),
                poolName: pool.name || 'Unknown',
                queueId: undefined
              });
            }
          } catch {
            // Skip pools we can't access
          }
        }
      } catch (error) {
        const errorObj = error as { statusCode?: number };
        if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
          throw createPermissionError('search for agents', 'Agent Pools (Read)');
        }
        throw error;
      }
      
      if (foundAgents.length === 0) {
        const queuesResult = await this.listProjectQueues();
        if (queuesResult.success) {
          throw createNotFoundError(
            'Agent',
            `${agentName}. Note: Searching within project queues requires organization-level permissions`
          );
        }
      }
      
      return foundAgents;
    });
  }

  async listQueueAgents(queueId: number): Promise<ApiResult<AgentInfo[]>> {
    const api = await this.ensureTaskAgentApi();
    
    return this.handleApiCall('list queue agents', async () => {
      const queueResult = await this.getQueueDetails(queueId);
      if (!queueResult.success) {
        throw createNotFoundError('Queue', queueId.toString());
      }
      
      const poolId = queueResult.data.poolId;
      
      try {
        const agents = await api.getAgents(poolId);
        return agents
          .filter((a): a is Required<TaskAgent> => a.id !== undefined && a.name !== undefined)
          .map(a => this.mapAgentInfo(a));
      } catch (error) {
        const errorObj = error as { statusCode?: number };
        if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
          throw createPermissionError(
            `list agents in queue '${queueResult.data.name}'`,
            'Agent Pools (Read)'
          );
        }
        throw error;
      }
    });
  }

  private mapAgentInfo(agent: TaskAgent): AgentInfo {
    return {
      id: agent.id!,
      name: agent.name!,
      status: this.getAgentStatusString(agent.status),
      enabled: agent.enabled ?? true,
      version: agent.version,
      osDescription: agent.oSDescription
    };
  }

  private getAgentStatusString(status: TaskAgentStatus | undefined): string {
    const statusMap: { [key: string]: string } = {
      [TaskAgentStatus.Offline]: 'Offline',
      [TaskAgentStatus.Online]: 'Online'
    };
    
    return status !== undefined ? statusMap[status] || 'Unknown' : 'Unknown';
  }

  async listProjectAgents(options: ListAgentsOptions = {}): Promise<ApiResult<ProjectAgentInfo[]>> {
    const api = await this.ensureTaskAgentApi();
    
    return this.handleApiCall('list project agents', async () => {
      // Step 1: Get all project queues (API requires exact match, so we filter later)
      const allQueues = await api.getAgentQueues(
        this.config.project,
        undefined, // Get all queues, we'll filter ourselves
        TaskAgentQueueActionFilter.Use
      );
      
      // Filter queues by pool name if specified (partial match)
      let queues = allQueues;
      if (options.poolNameFilter) {
        queues = allQueues.filter(q => 
          q.pool?.name?.toLowerCase().includes(options.poolNameFilter!.toLowerCase())
        );
      }
      
      if (!queues || queues.length === 0) {
        return [];
      }

      // Step 2: Collect agents from each queue's pool
      const agentMap = new Map<number, ProjectAgentInfo>();
      const inaccessiblePools: string[] = [];
      
      for (const queue of queues) {
        if (!queue.id || !queue.name || !queue.pool?.id) continue;
        
        try {
          const agents = await api.getAgents(queue.pool.id);
          
          for (const agent of agents) {
            if (!agent.id || !agent.name) continue;
            
            // Apply name filter if specified
            if (options.nameFilter) {
              const nameMatch = agent.name.toLowerCase().includes(options.nameFilter.toLowerCase());
              if (!nameMatch) continue;
            }
            
            // Apply online filter if specified
            if (options.onlyOnline && agent.status !== TaskAgentStatus.Online) {
              continue;
            }
            
            // Use agent ID as key to avoid duplicates
            if (!agentMap.has(agent.id)) {
              agentMap.set(agent.id, {
                ...this.mapAgentInfo(agent),
                poolName: queue.pool.name || 'Unknown',
                queueId: queue.id,
                queueName: queue.name
              });
            }
          }
        } catch (error) {
          // Track pools we couldn't access but continue
          inaccessiblePools.push(queue.name);
          console.warn(`Cannot access agents for queue '${queue.name}': ${error}`);
        }
      }
      
      const agents = Array.from(agentMap.values());
      
      // Sort by agent name for consistent output
      agents.sort((a, b) => a.name.localeCompare(b.name));
      
      // Log warning if some pools were inaccessible
      if (inaccessiblePools.length > 0) {
        console.warn(`Limited results: Could not access agents in ${inaccessiblePools.length} pool(s): ${inaccessiblePools.join(', ')}`);
      }
      
      return agents;
    });
  }
}