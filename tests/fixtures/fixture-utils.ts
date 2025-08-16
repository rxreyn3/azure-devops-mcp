import { TaskAgentQueue, TaskAgent } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { QueueInfo, AgentInfo, ProjectAgentInfo, PagedAgentsResult } from '../../src/types/api-types.js';

/**
 * Utility functions for loading and customizing fixture data in tests
 */

// Deep clone utility to avoid mutation of fixture data
export function cloneFixture<T>(fixture: T): T {
  return JSON.parse(JSON.stringify(fixture));
}

// Queue fixture utilities
export function createCustomQueue(overrides: Partial<TaskAgentQueue>): TaskAgentQueue {
  const baseQueue: TaskAgentQueue = {
    id: 999,
    name: 'Custom Queue',
    pool: {
      id: 999,
      name: 'Custom Pool',
      isHosted: false,
      poolType: 1,
      size: 1
    },
    projectId: 'test-project-id'
  };
  
  return { ...baseQueue, ...overrides };
}

export function createCustomQueueInfo(overrides: Partial<QueueInfo>): QueueInfo {
  const baseQueueInfo: QueueInfo = {
    id: 999,
    name: 'Custom Queue',
    poolId: 999,
    poolName: 'Custom Pool',
    isHosted: false
  };
  
  return { ...baseQueueInfo, ...overrides };
}

// Agent fixture utilities
export function createCustomAgent(overrides: Partial<TaskAgent>): TaskAgent {
  const baseAgent: TaskAgent = {
    id: 999,
    name: 'Custom Agent',
    status: 1, // Online
    enabled: true,
    version: '3.220.2',
    oSDescription: 'Linux',
    createdOn: new Date('2023-01-01T10:00:00Z'),
    maxParallelism: 1
  };
  
  return { ...baseAgent, ...overrides };
}

export function createCustomAgentInfo(overrides: Partial<AgentInfo>): AgentInfo {
  const baseAgentInfo: AgentInfo = {
    id: 999,
    name: 'Custom Agent',
    status: 'Online',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Linux'
  };
  
  return { ...baseAgentInfo, ...overrides };
}

export function createCustomProjectAgentInfo(overrides: Partial<ProjectAgentInfo>): ProjectAgentInfo {
  const baseProjectAgentInfo: ProjectAgentInfo = {
    id: 999,
    name: 'Custom Agent',
    status: 'Online',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Linux',
    poolName: 'Custom Pool',
    queueId: 999,
    queueName: 'Custom Queue'
  };
  
  return { ...baseProjectAgentInfo, ...overrides };
}

// Build fixture utilities
export function createCustomBuild(overrides: Partial<BuildInterfaces.Build>): BuildInterfaces.Build {
  const baseBuild: BuildInterfaces.Build = {
    id: 999,
    buildNumber: '20240101.999',
    status: BuildInterfaces.BuildStatus.Completed,
    result: BuildInterfaces.BuildResult.Succeeded,
    queueTime: new Date('2024-01-01T10:00:00Z'),
    startTime: new Date('2024-01-01T10:01:00Z'),
    finishTime: new Date('2024-01-01T10:15:00Z'),
    definition: {
      id: 999,
      name: 'Custom Build'
    },
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    },
    sourceBranch: 'refs/heads/main',
    sourceVersion: 'custom123',
    requestedFor: {
      displayName: 'Test User',
      uniqueName: 'test.user@example.com'
    }
  };
  
  return { ...baseBuild, ...overrides };
}

export function createCustomBuildDefinition(
  overrides: Partial<BuildInterfaces.BuildDefinitionReference>
): BuildInterfaces.BuildDefinitionReference {
  const baseDefinition: BuildInterfaces.BuildDefinitionReference = {
    id: 999,
    name: 'Custom Definition',
    path: '\\',
    type: BuildInterfaces.DefinitionType.Build,
    queueStatus: BuildInterfaces.DefinitionQueueStatus.Enabled,
    revision: 1,
    createdDate: new Date('2023-01-01T10:00:00Z'),
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    }
  };
  
  return { ...baseDefinition, ...overrides };
}

// Pipeline fixture utilities
export function createCustomPipelineRun(overrides: Partial<PipelinesInterfaces.Run>): PipelinesInterfaces.Run {
  const basePipelineRun: PipelinesInterfaces.Run = {
    id: 999,
    name: 'Custom Pipeline Run',
    state: PipelinesInterfaces.RunState.Completed,
    result: PipelinesInterfaces.RunResult.Succeeded,
    createdDate: new Date('2024-01-01T14:00:00Z'),
    finishedDate: new Date('2024-01-01T14:15:00Z'),
    pipeline: {
      id: 999,
      name: 'Custom Pipeline'
    },
    url: 'https://dev.azure.com/test/pipelines/runs/999'
  };
  
  return { ...basePipelineRun, ...overrides };
}

// Pagination utilities
export function createPagedResponse<T>(
  items: T[],
  pageSize: number = 10,
  pageIndex: number = 0
): PagedList<T> {
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const pageItems = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;
  
  const pagedResult = Object.assign([], pageItems) as PagedList<T>;
  pagedResult.continuationToken = hasMore ? String(endIndex) : undefined;
  
  return pagedResult;
}

export function createPagedAgentsResult(
  agents: ProjectAgentInfo[],
  pageSize: number = 10,
  pageIndex: number = 0
): PagedAgentsResult {
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, agents.length);
  const pageAgents = agents.slice(startIndex, endIndex);
  const hasMore = endIndex < agents.length;
  
  return {
    agents: pageAgents,
    continuationToken: hasMore ? String(endIndex) : undefined,
    hasMore
  };
}

// Filter utilities for testing search functionality
export function filterAgentsByName(agents: TaskAgent[], nameFilter: string): TaskAgent[] {
  return agents.filter(agent => 
    agent.name?.toLowerCase().includes(nameFilter.toLowerCase())
  );
}

export function filterAgentsByStatus(agents: TaskAgent[], onlineOnly: boolean): TaskAgent[] {
  if (!onlineOnly) return agents;
  return agents.filter(agent => agent.status === 2); // 2 = Online
}

export function filterBuildsByStatus(
  builds: BuildInterfaces.Build[], 
  status: BuildInterfaces.BuildStatus
): BuildInterfaces.Build[] {
  return builds.filter(build => build.status === status);
}

export function filterBuildsByResult(
  builds: BuildInterfaces.Build[], 
  result: BuildInterfaces.BuildResult
): BuildInterfaces.Build[] {
  return builds.filter(build => build.result === result);
}

export function filterDefinitionsByName(
  definitions: BuildInterfaces.BuildDefinitionReference[], 
  nameFilter: string
): BuildInterfaces.BuildDefinitionReference[] {
  const filter = nameFilter.replace(/\*/g, '.*');
  const regex = new RegExp(filter, 'i');
  return definitions.filter(def => def.name && regex.test(def.name));
}

// Date range utilities
export function filterBuildsByDateRange(
  builds: BuildInterfaces.Build[],
  minTime?: Date,
  maxTime?: Date
): BuildInterfaces.Build[] {
  return builds.filter(build => {
    if (!build.queueTime) return false;
    
    if (minTime && build.queueTime < minTime) return false;
    if (maxTime && build.queueTime > maxTime) return false;
    
    return true;
  });
}

// Timeline utilities
export function createTimelineRecord(
  overrides: Partial<BuildInterfaces.TimelineRecord>
): BuildInterfaces.TimelineRecord {
  const baseRecord: BuildInterfaces.TimelineRecord = {
    id: 'record-999',
    type: 'Job',
    name: 'Custom Job',
    startTime: new Date('2024-01-01T10:01:00Z'),
    finishTime: new Date('2024-01-01T10:15:00Z'),
    state: BuildInterfaces.TimelineRecordState.Completed,
    result: BuildInterfaces.TaskResult.Succeeded,
    changeId: 1,
    lastModified: new Date('2024-01-01T10:15:00Z'),
    log: {
      id: 999,
      type: 'Container',
      url: 'https://dev.azure.com/test/logs/999'
    }
  };
  
  return { ...baseRecord, ...overrides };
}

// Artifact utilities
export function createBuildArtifact(
  overrides: Partial<BuildInterfaces.BuildArtifact>
): BuildInterfaces.BuildArtifact {
  const baseArtifact: BuildInterfaces.BuildArtifact = {
    id: 999,
    name: 'custom-artifact',
    resource: {
      type: 'PipelineArtifact',
      data: JSON.stringify({
        artifactId: 'custom-artifact-999',
        containerId: 'custom-container-999'
      }),
      properties: {},
      url: 'https://dev.azure.com/test/artifacts/999',
      downloadUrl: 'https://dev.azure.com/test/artifacts/999/download'
    }
  };
  
  return { ...baseArtifact, ...overrides };
}

// Validation utilities
export function validateFixtureStructure<T>(fixture: T, requiredFields: (keyof T)[]): boolean {
  return requiredFields.every(field => fixture[field] !== undefined);
}

export function validateQueueFixture(queue: TaskAgentQueue): boolean {
  return validateFixtureStructure(queue, ['id', 'name', 'pool']);
}

export function validateAgentFixture(agent: TaskAgent): boolean {
  return validateFixtureStructure(agent, ['id', 'name', 'status']);
}

export function validateBuildFixture(build: BuildInterfaces.Build): boolean {
  return validateFixtureStructure(build, ['id', 'buildNumber', 'status', 'definition']);
}