import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { IBuildApi } from 'azure-devops-node-api/BuildApi.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult, JobLogDownloadResult } from '../types/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';

export class BuildClient extends AzureDevOpsBaseClient {
  private buildApi: IBuildApi | null = null;

  protected async ensureInitialized(): Promise<void> {
    if (!this.buildApi) {
      this.buildApi = await this.connection.getBuildApi();
    }
  }

  async getBuildTimeline(
    buildId: number,
    timelineId?: string
  ): Promise<ApiResult<BuildInterfaces.Timeline>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getBuildTimeline',
      async () => {
        const timeline = await this.buildApi!.getBuildTimeline(
          this.config.project,
          buildId,
          timelineId
        );
        
        if (!timeline) {
          throw new Error(`Timeline not found for build ${buildId}`);
        }
        
        return timeline;
      }
    );
  }

  async getBuilds(
    options: {
      definitionIds?: number[];
      definitionNameFilter?: string;
      statusFilter?: BuildInterfaces.BuildStatus;
      resultFilter?: BuildInterfaces.BuildResult;
      branchName?: string;
      minTime?: Date;
      maxTime?: Date;
      top?: number;
      continuationToken?: string;
    } = {}
  ): Promise<ApiResult<PagedList<BuildInterfaces.Build>>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getBuilds',
      async () => {
        // If definitionNameFilter is provided, we need to first get matching definitions
        let definitionIds = options.definitionIds;
        
        if (options.definitionNameFilter && !definitionIds) {
          // Note: getDefinitions now automatically adds wildcards
          const definitionsResult = await this.getDefinitions({
            nameFilter: options.definitionNameFilter
          });
          
          if (definitionsResult.success && definitionsResult.data.length > 0) {
            definitionIds = definitionsResult.data.map(d => d.id!);
          } else {
            // No matching definitions found
            const emptyResult: any = [];
            emptyResult.continuationToken = undefined;
            return emptyResult;
          }
        }
        
        const result = await this.buildApi!.getBuilds(
          this.config.project,
          definitionIds,
          undefined, // queues
          undefined, // buildNumber
          options.minTime,
          options.maxTime,
          undefined, // requestedFor
          undefined, // reasonFilter
          options.statusFilter,
          options.resultFilter,
          undefined, // tagFilters
          undefined, // properties
          options.top,
          options.continuationToken,
          undefined, // maxBuildsPerDefinition
          undefined, // deletedFilter
          BuildInterfaces.BuildQueryOrder.FinishTimeDescending,
          options.branchName
        );
        
        return result;
      }
    );
  }

  async getDefinitions(
    options: {
      nameFilter?: string;
      top?: number;
      continuationToken?: string;
    } = {}
  ): Promise<ApiResult<PagedList<BuildInterfaces.BuildDefinitionReference>>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getDefinitions',
      async () => {
        // Wrap nameFilter with wildcards for intuitive partial matching
        const nameFilter = options.nameFilter 
          ? (options.nameFilter.includes('*') ? options.nameFilter : `*${options.nameFilter}*`)
          : undefined;
        
        // If we have a continuation token, it's our client-side pagination offset
        const offset = options.continuationToken ? parseInt(options.continuationToken, 10) : 0;
        const limit = options.top || 50;
        
        // Fetch more than requested to determine if there are more results
        // This is a workaround for the SDK not returning continuation tokens
        const fetchLimit = offset + limit + 1;
        
        const result = await this.buildApi!.getDefinitions(
          this.config.project,
          nameFilter,
          undefined, // repositoryId
          undefined, // repositoryType
          BuildInterfaces.DefinitionQueryOrder.LastModifiedDescending,
          fetchLimit,
          undefined  // Don't pass continuation token to API as it doesn't work properly
        );
        
        // Implement client-side pagination
        const allDefinitions = result as BuildInterfaces.BuildDefinitionReference[];
        const paginatedDefinitions = allDefinitions.slice(offset, offset + limit);
        const hasMore = allDefinitions.length > offset + limit;
        
        // Create a PagedList-like result
        const pagedResult = Object.assign([], paginatedDefinitions) as PagedList<BuildInterfaces.BuildDefinitionReference>;
        pagedResult.continuationToken = hasMore ? String(offset + limit) : undefined;
        
        return pagedResult;
      }
    );
  }

  async queueBuild(
    options: {
      definitionId: number;
      sourceBranch?: string;
      parameters?: { [key: string]: string };
      reason?: BuildInterfaces.BuildReason;
      demands?: string[];
      queueId?: number;
    }
  ): Promise<ApiResult<BuildInterfaces.Build>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'queueBuild',
      async () => {
        // Convert string demands to Demand objects
        const demands: BuildInterfaces.Demand[] | undefined = options.demands?.map(demandString => {
          // Parse demands in format "name -equals value" or just "name"
          const parts = demandString.split(/\s+/);
          if (parts.length >= 3 && parts[1] === '-equals') {
            return {
              name: parts[0],
              value: parts.slice(2).join(' ')
            };
          }
          return {
            name: demandString,
            value: undefined
          };
        });

        // Create a minimal build object with required properties
        const build: BuildInterfaces.Build = {
          definition: {
            id: options.definitionId
          },
          sourceBranch: options.sourceBranch,
          reason: options.reason || BuildInterfaces.BuildReason.Manual,
          parameters: options.parameters ? JSON.stringify(options.parameters) : undefined,
          demands
        };

        // Add queue if specified
        if (options.queueId !== undefined) {
          build.queue = {
            id: options.queueId
          };
        }
        
        const result = await this.buildApi!.queueBuild(
          build,
          this.config.project,
          true // ignoreWarnings
        );
        
        if (!result) {
          throw new Error('Failed to queue build - no response from API');
        }
        
        return result;
      }
    );
  }

  async downloadJobLogByName(
    buildId: number,
    jobName: string,
    outputPath: string
  ): Promise<ApiResult<JobLogDownloadResult>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'downloadJobLogByName',
      async () => {
        // First, get the timeline to find the job
        const timeline = await this.buildApi!.getBuildTimeline(
          this.config.project,
          buildId
        );
        
        if (!timeline || !timeline.records) {
          throw new Error(`No timeline found for build ${buildId}`);
        }
        
        // Find the job by name
        const jobRecord = timeline.records.find(
          record => record.type === 'Job' && record.name === jobName
        );
        
        if (!jobRecord) {
          throw new Error(`No job found with name "${jobName}" in build ${buildId}`);
        }
        
        // Check if job is completed
        if (jobRecord.state !== BuildInterfaces.TimelineRecordState.Completed) {
          const stateMap = {
            [BuildInterfaces.TimelineRecordState.Pending]: 'pending',
            [BuildInterfaces.TimelineRecordState.InProgress]: 'in progress',
          };
          const state = stateMap[jobRecord.state!] || 'unknown';
          throw new Error(
            `Job "${jobName}" is still ${state}. Logs are only available after job completion.`
          );
        }
        
        // Check if log is available
        if (!jobRecord.log?.id) {
          throw new Error(`Job "${jobName}" has no log available`);
        }
        
        const logId = jobRecord.log.id;
        
        // Get the log stream
        const logStream = await this.buildApi!.getBuildLog(
          this.config.project,
          buildId,
          logId
        );
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.promises.mkdir(outputDir, { recursive: true });
        
        // Generate filename if outputPath is a directory
        let finalPath = outputPath;
        const isDirectory = outputPath.endsWith('/') || outputPath.endsWith('\\');
        if (isDirectory || (await fs.promises.stat(outputPath).catch(() => null))?.isDirectory()) {
          const sanitizedJobName = jobName.replace(/[^a-zA-Z0-9-_]/g, '-');
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `build-${buildId}-${sanitizedJobName}-${timestamp}.log`;
          finalPath = path.join(outputPath, filename);
        }
        
        // Create write stream
        const writeStream = fs.createWriteStream(finalPath);
        
        // Stream the log to file
        await pipeline(logStream, writeStream);
        
        // Get file stats
        const stats = await fs.promises.stat(finalPath);
        
        // Calculate duration if available
        let duration: string | undefined;
        if (jobRecord.startTime && jobRecord.finishTime) {
          const start = new Date(jobRecord.startTime);
          const finish = new Date(jobRecord.finishTime);
          const durationMs = finish.getTime() - start.getTime();
          const seconds = Math.floor(durationMs / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          duration = minutes > 0 
            ? `${minutes}m ${remainingSeconds}s`
            : `${seconds}s`;
        }
        
        return {
          savedPath: finalPath,
          fileSize: stats.size,
          jobName: jobName,
          jobId: jobRecord.id!,
          logId: logId,
          duration
        };
      }
    );
  }
}