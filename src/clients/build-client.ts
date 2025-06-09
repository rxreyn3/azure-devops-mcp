import { IBuildApi } from 'azure-devops-node-api/BuildApi.js';
import { 
  Build, 
  BuildDefinition, 
  BuildDefinitionReference,
  BuildLog,
  BuildArtifact,
  Change,
  BuildStatus,
  BuildResult,
  BuildReason,
  BuildQueryOrder,
  QueryDeletedOption
} from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult, BuildInfo, PipelineInfo, BuildTimelineRecord } from '../types/index.js';
import { createNotFoundError } from '../utils/error-handlers.js';

export interface BuildFilter {
  definitions?: number[];
  queues?: number[];
  buildNumber?: string;
  minTime?: Date;
  maxTime?: Date;
  requestedFor?: string;
  reasonFilter?: BuildReason;
  statusFilter?: BuildStatus;
  resultFilter?: BuildResult;
  tagFilters?: string[];
  branchName?: string;
  buildIds?: number[];
  repositoryId?: string;
  repositoryType?: string;
  top?: number;
  continuationToken?: string;
}

export interface QueueBuildOptions {
  definition: { id: number };
  sourceBranch?: string;
  sourceVersion?: string;
  parameters?: string;
  demands?: Array<{ name: string; value: string }>;
  reason?: BuildReason;
  priority?: 'low' | 'belowNormal' | 'normal' | 'aboveNormal' | 'high';
}

export interface BuildUpdateOptions {
  keepForever?: boolean;
  retainedByRelease?: boolean;
  status?: BuildStatus;
  result?: BuildResult;
}

export class BuildClient extends AzureDevOpsBaseClient {
  private buildApi: IBuildApi | null = null;

  async initialize(): Promise<void> {
    this.buildApi = await this.connection.getBuildApi();
  }

  private async ensureBuildApi(): Promise<IBuildApi> {
    if (!this.buildApi) {
      await this.initialize();
    }
    return this.buildApi!;
  }

  /**
   * Get a list of builds with optional filtering
   */
  async getBuilds(filter?: BuildFilter): Promise<ApiResult<BuildInfo[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get builds', async () => {
      const builds = await api.getBuilds(
        this.config.project,
        filter?.definitions,
        filter?.queues,
        filter?.buildNumber,
        filter?.minTime,
        filter?.maxTime,
        filter?.requestedFor,
        filter?.reasonFilter,
        filter?.statusFilter,
        filter?.resultFilter,
        filter?.tagFilters,
        undefined, // properties
        filter?.top,
        filter?.continuationToken,
        undefined, // maxBuildsPerDefinition
        QueryDeletedOption.ExcludeDeleted,
        BuildQueryOrder.FinishTimeDescending,
        filter?.branchName,
        filter?.buildIds,
        filter?.repositoryId,
        filter?.repositoryType
      );
      
      return (builds as any).values || (builds as any).value || []
        .filter((b: Build): b is Required<Build> => 
          b.id !== undefined && 
          b.buildNumber !== undefined &&
          b.status !== undefined &&
          b.queueTime !== undefined &&
          b.sourceBranch !== undefined &&
          b.sourceVersion !== undefined &&
          b.requestedFor !== undefined &&
          b.definition !== undefined
        )
        .map((b: Required<Build>) => this.mapBuildInfo(b));
    });
  }

  /**
   * Get details for a specific build
   */
  async getBuild(buildId: number, propertyFilters?: string): Promise<ApiResult<BuildInfo>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get build', async () => {
      const build = await api.getBuild(this.config.project, buildId, propertyFilters);
      
      if (!build || !build.id) {
        throw createNotFoundError('Build', buildId.toString());
      }
      
      return this.mapBuildInfo(build as Required<Build>);
    });
  }

  /**
   * Queue a new build
   */
  async queueBuild(options: QueueBuildOptions): Promise<ApiResult<BuildInfo>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('queue build', async () => {
      const buildToQueue: Build = {
        definition: options.definition,
        sourceBranch: options.sourceBranch,
        sourceVersion: options.sourceVersion,
        parameters: options.parameters,
        demands: options.demands,
        reason: options.reason,
        priority: options.priority ? this.mapPriority(options.priority) : undefined
      };
      
      const build = await api.queueBuild(
        buildToQueue,
        this.config.project,
        false, // ignoreWarnings
        undefined, // checkInTicket
        undefined, // sourceBuildId
        options.definition.id
      );
      
      if (!build || !build.id) {
        throw new Error('Failed to queue build');
      }
      
      return this.mapBuildInfo(build as Required<Build>);
    });
  }

  /**
   * Get the timeline for a build (useful for failure analysis)
   */
  async getBuildTimeline(buildId: number, timelineId?: string): Promise<ApiResult<BuildTimelineRecord[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get build timeline', async () => {
      const timeline = await api.getBuildTimeline(
        this.config.project,
        buildId,
        timelineId
      );
      
      if (!timeline || !timeline.records) {
        throw createNotFoundError('Build timeline', buildId.toString());
      }
      
      return timeline.records
        .filter((r): r is Required<typeof r> => 
          r.id !== undefined && 
          r.type !== undefined && 
          r.name !== undefined &&
          r.state !== undefined
        )
        .map(r => ({
          id: r.id,
          parentId: r.parentId,
          type: r.type,
          name: r.name,
          startTime: r.startTime,
          finishTime: r.finishTime,
          state: r.state?.toString() || 'Unknown',
          result: r.result?.toString(),
          errorCount: r.errorCount || 0,
          warningCount: r.warningCount || 0,
          log: r.log
        }));
    });
  }

  /**
   * Get logs for a build
   */
  async getBuildLogs(buildId: number): Promise<ApiResult<BuildLog[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get build logs', async () => {
      const logs = await api.getBuildLogs(this.config.project, buildId);
      
      if (!logs) {
        throw createNotFoundError('Build logs', buildId.toString());
      }
      
      return logs;
    });
  }

  /**
   * Get specific log lines
   */
  async getBuildLogLines(
    buildId: number, 
    logId: number, 
    startLine?: number, 
    endLine?: number
  ): Promise<ApiResult<string[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get build log lines', async () => {
      const lines = await api.getBuildLogLines(
        this.config.project,
        buildId,
        logId,
        startLine,
        endLine
      );
      
      if (!lines) {
        throw createNotFoundError('Build log', `${buildId}/${logId}`);
      }
      
      return lines;
    });
  }

  /**
   * Get changes included in a build
   */
  async getBuildChanges(
    buildId: number, 
    top?: number,
    includeSourceChange?: boolean
  ): Promise<ApiResult<Change[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get build changes', async () => {
      const changes = await api.getBuildChanges(
        this.config.project,
        buildId,
        undefined, // continuationToken
        top,
        includeSourceChange
      );
      
      return (changes as any).values || (changes as any).value || [];
    });
  }

  /**
   * Get build definitions (pipelines)
   */
  async getDefinitions(
    name?: string,
    path?: string,
    includeLatestBuilds?: boolean,
    top?: number
  ): Promise<ApiResult<PipelineInfo[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get definitions', async () => {
      const definitions = await api.getDefinitions(
        this.config.project,
        name,
        undefined, // repositoryId
        undefined, // repositoryType
        1, // NameAscending
        top,
        undefined, // continuationToken
        undefined, // minMetricsTime
        undefined, // definitionIds
        path,
        undefined, // builtAfter
        undefined, // notBuiltAfter
        undefined, // includeAllProperties
        includeLatestBuilds
      );
      
      return (definitions as any).values || (definitions as any).value || []
        .filter((d: BuildDefinitionReference): d is Required<BuildDefinitionReference> => 
          d.id !== undefined && 
          d.name !== undefined &&
          d.path !== undefined
        )
        .map((d: Required<BuildDefinitionReference>) => this.mapPipelineInfo(d));
    });
  }

  /**
   * Get a specific build definition
   */
  async getDefinition(
    definitionId: number,
    includeLatestBuilds?: boolean
  ): Promise<ApiResult<BuildDefinition>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get definition', async () => {
      const definition = await api.getDefinition(
        this.config.project,
        definitionId,
        undefined, // revision
        undefined, // minMetricsTime
        undefined, // propertyFilters
        includeLatestBuilds
      );
      
      if (!definition || !definition.id) {
        throw createNotFoundError('Build definition', definitionId.toString());
      }
      
      return definition;
    });
  }

  /**
   * Update a build (e.g., cancel or retain)
   */
  async updateBuild(buildId: number, options: BuildUpdateOptions): Promise<ApiResult<BuildInfo>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('update build', async () => {
      const buildUpdate: Build = {
        keepForever: options.keepForever,
        retainedByRelease: options.retainedByRelease,
        status: options.status,
        result: options.result
      };
      
      const updatedBuild = await api.updateBuild(
        buildUpdate,
        this.config.project,
        buildId
      );
      
      if (!updatedBuild || !updatedBuild.id) {
        throw new Error('Failed to update build');
      }
      
      return this.mapBuildInfo(updatedBuild as Required<Build>);
    });
  }

  /**
   * Get build artifacts
   */
  async getArtifacts(buildId: number): Promise<ApiResult<BuildArtifact[]>> {
    const api = await this.ensureBuildApi();
    
    return this.handleApiCall('get artifacts', async () => {
      const artifacts = await api.getArtifacts(this.config.project, buildId);
      
      if (!artifacts) {
        throw createNotFoundError('Build artifacts', buildId.toString());
      }
      
      return artifacts;
    });
  }

  private mapBuildInfo(build: Build): BuildInfo {
    return {
      id: build.id!,
      buildNumber: build.buildNumber!,
      status: this.getBuildStatusString(build.status),
      result: build.result ? this.getBuildResultString(build.result) : undefined,
      queueTime: build.queueTime!,
      startTime: build.startTime,
      finishTime: build.finishTime,
      sourceBranch: build.sourceBranch!,
      sourceVersion: build.sourceVersion!,
      requestedFor: {
        displayName: build.requestedFor?.displayName || 'Unknown',
        uniqueName: build.requestedFor?.uniqueName || 'unknown'
      },
      definition: {
        id: build.definition?.id || 0,
        name: build.definition?.name || 'Unknown'
      }
    };
  }

  private mapPipelineInfo(definition: BuildDefinitionReference): PipelineInfo {
    return {
      id: definition.id!,
      name: definition.name!,
      path: definition.path!,
      type: definition.type === 2 ? 'yaml' : 'build',
      queueStatus: definition.queueStatus ? this.getQueueStatusString(definition.queueStatus) : undefined,
      latestBuild: definition.latestBuild ? {
        id: definition.latestBuild.id!,
        buildNumber: definition.latestBuild.buildNumber!,
        status: this.getBuildStatusString(definition.latestBuild.status),
        result: definition.latestBuild.result ? this.getBuildResultString(definition.latestBuild.result) : undefined
      } : undefined
    };
  }

  private getBuildStatusString(status: any): string {
    const statusMap: { [key: number]: string } = {
      [BuildStatus.None]: 'None',
      [BuildStatus.InProgress]: 'InProgress',
      [BuildStatus.Completed]: 'Completed',
      [BuildStatus.Cancelling]: 'Cancelling',
      [BuildStatus.Postponed]: 'Postponed',
      [BuildStatus.NotStarted]: 'NotStarted',
      [BuildStatus.All]: 'All'
    };
    
    return statusMap[status] || 'Unknown';
  }

  private getBuildResultString(result: any): string {
    const resultMap: { [key: number]: string } = {
      [BuildResult.None]: 'None',
      [BuildResult.Succeeded]: 'Succeeded',
      [BuildResult.PartiallySucceeded]: 'PartiallySucceeded',
      [BuildResult.Failed]: 'Failed',
      [BuildResult.Canceled]: 'Canceled'
    };
    
    return resultMap[result] || 'Unknown';
  }

  private getQueueStatusString(status: any): 'enabled' | 'paused' | 'disabled' {
    const statusMap: { [key: number]: 'enabled' | 'paused' | 'disabled' } = {
      0: 'enabled',
      1: 'paused',
      2: 'disabled'
    };
    
    return statusMap[status] || 'enabled';
  }

  private mapPriority(priority: string): number {
    const priorityMap: { [key: string]: number } = {
      'low': 5,
      'belowNormal': 4,
      'normal': 3,
      'aboveNormal': 2,
      'high': 1
    };
    
    return priorityMap[priority] || 3;
  }
}