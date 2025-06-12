import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import { TaskAgentQueue, TaskAgent, TaskAgentStatus, TaskAgentQueueActionFilter } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult, QueueInfo, AgentInfo, ProjectAgentInfo, ListAgentsOptions, PagedAgentsResult } from '../types/index.js';
import { createNotFoundError, createPermissionError } from '../utils/error-handlers.js';
import { safeStringCompare } from '../utils/validators.js';

export class TaskAgentClient extends AzureDevOpsBaseClient {
  private taskAgentApi: ITaskAgentApi | null = null;

  protected async ensureInitialized(): Promise<void> {
    if (!this.taskAgentApi) {
      this.taskAgentApi = await this.connection.getTaskAgentApi();
    }
  }

  async getQueues(): Promise<ApiResult<QueueInfo[]>> {
    await this.ensureInitialized();
    
    return this.handleApiCall('getQueues', async () => {
      const queues = await this.taskAgentApi!.getAgentQueues(this.config.project);
      
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

  async getQueue(
    options: {
      queueIdOrName: string | number;
    }
  ): Promise<ApiResult<QueueInfo>> {
    await this.ensureInitialized();
    
    return this.handleApiCall('getQueue', async () => {
      const queues = await this.taskAgentApi!.getAgentQueues(this.config.project);
      
      const queue = queues.find((q) => {
        if (typeof options.queueIdOrName === 'number') {
          return q.id === options.queueIdOrName;
        }
        return safeStringCompare(q.name, options.queueIdOrName, false);
      });
      
      if (!queue || !queue.id || !queue.name || !queue.pool) {
        throw createNotFoundError('Queue', options.queueIdOrName.toString());
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
    await this.ensureInitialized();
    
    return this.handleApiCall('findAgent', async () => {
      const foundAgents: { agent: AgentInfo; poolName: string; queueId?: number }[] = [];
      
      try {
        const pools = await this.taskAgentApi!.getAgentPools();
        
        for (const pool of pools) {
          if (!pool.id) continue;
          
          try {
            const agents = await this.taskAgentApi!.getAgents(pool.id, agentName);
            
            for (const agent of agents) {
              if (!agent.id || !agent.name) continue;
              
              foundAgents.push({
                agent: {
                  id: agent.id!,
                  name: agent.name!,
                  status: agent.status !== undefined ? 
                    (agent.status === TaskAgentStatus.Online ? 'Online' : 'Offline') : 'Unknown',
                  enabled: agent.enabled ?? true,
                  version: agent.version,
                  osDescription: agent.oSDescription
                },
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
        const queuesResult = await this.getQueues();
        if (queuesResult.success) {
          throw createNotFoundError(
            'Agent',
            `${agentName}. Note: Searching within project queues requires organization-level permissions`
          );
        }
      }
      
      return foundAgents;
    }, true);
  }

  async getAgentsByQueue(
    options: {
      queueId: number;
    }
  ): Promise<ApiResult<AgentInfo[]>> {
    await this.ensureInitialized();
    
    return this.handleApiCall('getAgentsByQueue', async () => {
      const queueResult = await this.getQueue({ queueIdOrName: options.queueId });
      if (!queueResult.success) {
        throw createNotFoundError('Queue', options.queueId.toString());
      }
      
      const poolId = queueResult.data.poolId;
      
      try {
        const agents = await this.taskAgentApi!.getAgents(poolId);
        return agents
          .filter((a): a is Required<TaskAgent> => a.id !== undefined && a.name !== undefined)
          .map(a => ({
            id: a.id!,
            name: a.name!,
            status: a.status !== undefined ? 
              (a.status === TaskAgentStatus.Online ? 'Online' : 'Offline') : 'Unknown',
            enabled: a.enabled ?? true,
            version: a.version,
            osDescription: a.oSDescription
          }));
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
    }, true);
  }

  async getAgents(
    options: ListAgentsOptions = {}
  ): Promise<ApiResult<PagedAgentsResult>> {
    await this.ensureInitialized();
    
    return this.handleApiCall('getAgents', async () => {
      // Step 1: Get all project queues (API requires exact match, so we filter later)
      const allQueues = await this.taskAgentApi!.getAgentQueues(
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
        return {
          agents: [],
          continuationToken: undefined,
          hasMore: false
        };
      }

      // Step 2: Collect agents from each queue's pool
      const agentMap = new Map<number, ProjectAgentInfo>();
      const inaccessiblePools: string[] = [];
      
      for (const queue of queues) {
        if (!queue.id || !queue.name || !queue.pool?.id) continue;
        
        try {
          const agents = await this.taskAgentApi!.getAgents(queue.pool.id);
          
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
                id: agent.id,
                name: agent.name,
                status: agent.status !== undefined ? 
                  (agent.status === TaskAgentStatus.Online ? 'Online' : 'Offline') : 'Unknown',
                enabled: agent.enabled ?? true,
                version: agent.version,
                osDescription: agent.oSDescription,
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
      
      // Apply pagination
      const limit = options.limit || 250; // Default to returning all
      const offset = options.continuationToken ? parseInt(options.continuationToken, 10) : 0;
      
      const paginatedAgents = agents.slice(offset, offset + limit);
      const hasMore = offset + limit < agents.length;
      const nextToken = hasMore ? String(offset + limit) : undefined;
      
      return {
        agents: paginatedAgents,
        continuationToken: nextToken,
        hasMore
      };
    }, true);
  }
}