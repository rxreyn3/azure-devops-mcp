import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { IBuildApi } from 'azure-devops-node-api/BuildApi.js';
import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';
import { IPipelinesApi } from 'azure-devops-node-api/PipelinesApi.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';
import { AzureDevOpsBaseClient } from './ado-base-client.js';
import { ApiResult, JobLogDownloadResult, ArtifactDownloadResult } from '../types/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import https from 'node:https';

export class BuildClient extends AzureDevOpsBaseClient {
  private buildApi: IBuildApi | null = null;
  private pipelinesApi: IPipelinesApi | null = null;

  protected async ensureInitialized(): Promise<void> {
    if (!this.buildApi) {
      this.buildApi = await this.connection.getBuildApi();
    }
    if (!this.pipelinesApi) {
      this.pipelinesApi = await this.connection.getPipelinesApi();
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

  /**
   * Queue a new build using the Azure DevOps Build API
   * 
   * @param options Build queue options
   * @param options.parameters Build parameters as key-value pairs. 
   *                          IMPORTANT: All values must be strings. Even numeric values 
   *                          must be passed as strings (e.g., "10" not 10) because 
   *                          Azure DevOps treats all pipeline parameters as strings.
   *                          These are serialized to JSON and sent in the API request.
   * 
   * @remarks
   * This uses the traditional Build API (/build/builds endpoint) which requires
   * parameters to be passed as a JSON string. For native type support, consider
   * the newer Pipeline API (/pipelines/{id}/runs endpoint) which accepts
   * templateParameters as a direct object (not yet implemented in this client).
   */
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
          // Parameters must be serialized as a JSON string for the Build API
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
        
        // Determine the directory to create
        let outputDir: string;
        const isDirectoryPath = outputPath.endsWith('/') || outputPath.endsWith('\\');
        
        if (isDirectoryPath) {
          // Path explicitly indicates a directory
          outputDir = outputPath;
        } else {
          // Path might be a file or existing directory
          const stats = await fs.promises.stat(outputPath).catch(() => null);
          if (stats?.isDirectory()) {
            outputDir = outputPath;
          } else {
            // It's a file path, get the parent directory
            outputDir = path.dirname(outputPath);
          }
        }
        
        // Create the directory
        await fs.promises.mkdir(outputDir, { recursive: true });
        
        // Generate filename if outputPath is a directory
        let finalPath = outputPath;
        if (isDirectoryPath || (await fs.promises.stat(outputPath).catch(() => null))?.isDirectory()) {
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

  async getBuild(
    buildId: number
  ): Promise<ApiResult<BuildInterfaces.Build>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'getBuild',
      async () => {
        const build = await this.buildApi!.getBuild(
          this.config.project,
          buildId
        );
        
        if (!build) {
          throw new Error(`Build not found with ID ${buildId}`);
        }
        
        return build;
      }
    );
  }

  async listArtifacts(
    buildId: number
  ): Promise<ApiResult<BuildInterfaces.BuildArtifact[]>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'listArtifacts',
      async () => {
        const artifacts = await this.buildApi!.getArtifacts(
          this.config.project,
          buildId
        );
        
        if (!artifacts || artifacts.length === 0) {
          return [];
        }
        
        return artifacts;
      }
    );
  }

  async downloadArtifact(
    buildId: number,
    definitionId: number | undefined,
    artifactName: string,
    outputPath: string
  ): Promise<ApiResult<ArtifactDownloadResult>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'downloadArtifact',
      async () => {
        // Auto-fetch definition ID if not provided
        let finalDefinitionId = definitionId;
        if (!finalDefinitionId) {
          const build = await this.buildApi!.getBuild(
            this.config.project,
            buildId
          );
          
          finalDefinitionId = build.definition?.id;
          if (!finalDefinitionId) {
            throw new Error(
              `Could not determine definition ID for build ${buildId}. ` +
              `The build may not have an associated definition.`
            );
          }
        }
        
        // First, verify the artifact exists and check its type
        const artifacts = await this.buildApi!.getArtifacts(
          this.config.project,
          buildId
        );
        
        const artifact = artifacts.find(a => a.name === artifactName);
        if (!artifact) {
          throw new Error(`No artifact found with name "${artifactName}" in build ${buildId}`);
        }
        
        // Check if this is a Pipeline artifact (type === "PipelineArtifact")
        if (artifact.resource?.type !== 'PipelineArtifact') {
          throw new Error(
            `Only Pipeline artifacts are supported. Artifact "${artifactName}" is of type "${artifact.resource?.type}". ` +
            `Pipeline artifacts are created using the PublishPipelineArtifact task.`
          );
        }
        
        // Use PipelinesApi to get the artifact with signed URL
        const pipelineArtifact = await this.pipelinesApi!.getArtifact(
          this.config.project,
          finalDefinitionId,  // pipelineId
          buildId,            // runId
          artifactName,
          PipelinesInterfaces.GetArtifactExpandOptions.SignedContent
        );
        
        if (!pipelineArtifact.signedContent?.url) {
          throw new Error(`Failed to get download URL for artifact "${artifactName}"`);
        }
        
        // Determine the directory to create
        let outputDir: string;
        const isDirectoryPath = outputPath.endsWith('/') || outputPath.endsWith('\\');
        
        if (isDirectoryPath) {
          // Path explicitly indicates a directory
          outputDir = outputPath;
        } else {
          // Path might be a file or existing directory
          const stats = await fs.promises.stat(outputPath).catch(() => null);
          if (stats?.isDirectory()) {
            outputDir = outputPath;
          } else {
            // It's a file path, get the parent directory
            outputDir = path.dirname(outputPath);
          }
        }
        
        // Create the directory
        await fs.promises.mkdir(outputDir, { recursive: true });
        
        // Generate filename if outputPath is a directory
        let finalPath = outputPath;
        if (isDirectoryPath || (await fs.promises.stat(outputPath).catch(() => null))?.isDirectory()) {
          const sanitizedArtifactName = artifactName.replace(/[^a-zA-Z0-9-_]/g, '-');
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `build-${buildId}-${sanitizedArtifactName}-${timestamp}.zip`;
          finalPath = path.join(outputPath, filename);
        }
        
        // Ensure .zip extension
        if (!finalPath.toLowerCase().endsWith('.zip')) {
          finalPath += '.zip';
        }
        
        // Download from signed URL
        const downloadUrl = pipelineArtifact.signedContent.url;
        const writeStream = fs.createWriteStream(finalPath);
        
        await new Promise<void>((resolve, reject) => {
          https.get(downloadUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download artifact: HTTP ${response.statusCode}`));
              return;
            }
            
            response.pipe(writeStream);
            
            writeStream.on('finish', () => {
              writeStream.close();
              resolve();
            });
            
            writeStream.on('error', reject);
            response.on('error', reject);
          }).on('error', reject);
        });
        
        // Get file stats
        const stats = await fs.promises.stat(finalPath);
        
        return {
          savedPath: finalPath,
          fileSize: stats.size,
          artifactName: artifactName,
          artifactId: artifact.id!
        };
      }
    );
  }

  async downloadLogsByName(
    buildId: number,
    name: string,
    outputPath: string,
    exactMatch: boolean = true
  ): Promise<ApiResult<{
    type: 'Stage' | 'Phase' | 'Job' | 'Task';
    matchedRecords: Array<{
      name: string;
      type: string;
      id: string;
      parentName?: string;
    }>;
    downloadedLogs: Array<{
      name: string;
      savedPath: string;
      fileSize: number;
    }>;
  }>> {
    await this.ensureInitialized();
    
    return this.handleApiCall(
      'downloadLogsByName',
      async () => {
        // Get the timeline to search for matching records
        const timeline = await this.buildApi!.getBuildTimeline(
          this.config.project,
          buildId
        );
        
        if (!timeline || !timeline.records) {
          throw new Error(`No timeline found for build ${buildId}`);
        }
        
        // Find all matching records by name
        const matchingRecords = timeline.records.filter(record => {
          if (exactMatch) {
            return record.name === name;
          } else {
            return record.name?.toLowerCase().includes(name.toLowerCase());
          }
        });
        
        if (matchingRecords.length === 0) {
          throw new Error(`No timeline record found with name "${name}" in build ${buildId}`);
        }
        
        // If multiple matches, return them for user clarification
        if (matchingRecords.length > 1) {
          const matches = matchingRecords.map(r => {
            const parent = timeline.records!.find(p => p.id === r.parentId);
            return {
              name: r.name!,
              type: r.type!,
              id: r.id!,
              parentName: parent?.name
            };
          });
          
          throw new Error(
            `Multiple records found matching "${name}":\n` +
            matches.map(m => 
              `- ${m.name} (${m.type})${m.parentName ? ` under ${m.parentName}` : ''}`
            ).join('\n') +
            '\n\nPlease use exact match or be more specific.'
          );
        }
        
        const record = matchingRecords[0];
        const recordType = record.type as 'Stage' | 'Phase' | 'Job' | 'Task';
        const downloadedLogs: Array<{
          name: string;
          savedPath: string;
          fileSize: number;
        }> = [];
        
        // Handle based on record type
        if (recordType === 'Job') {
          // For jobs, use existing logic
          if (record.state !== BuildInterfaces.TimelineRecordState.Completed) {
            throw new Error(
              `Job "${name}" is not completed. Logs are only available after completion.`
            );
          }
          
          if (!record.log?.id) {
            throw new Error(`Job "${name}" has no log available`);
          }
          
          const result = await this.downloadSingleLog(
            buildId,
            record.log.id,
            name,
            outputPath
          );
          
          downloadedLogs.push(result);
          
        } else if (recordType === 'Task') {
          // For tasks, download individual task log
          if (record.state !== BuildInterfaces.TimelineRecordState.Completed) {
            throw new Error(
              `Task "${name}" is not completed. Logs are only available after completion.`
            );
          }
          
          if (!record.log?.id) {
            throw new Error(`Task "${name}" has no log available`);
          }
          
          // Find parent job name for context
          const parentJob = timeline.records!.find(r => r.id === record.parentId);
          const contextName = parentJob ? `${parentJob.name}-${name}` : name;
          
          const result = await this.downloadSingleLog(
            buildId,
            record.log.id,
            contextName,
            outputPath
          );
          
          downloadedLogs.push(result);
          
        } else if (recordType === 'Stage' || recordType === 'Phase') {
          // For stages/phases, download all child job logs
          const childJobs = this.findChildJobs(timeline.records!, record.id!);
          
          if (childJobs.length === 0) {
            throw new Error(`${recordType} "${name}" has no child jobs with logs`);
          }
          
          // Create directory for stage/phase logs
          const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
          const stageDir = path.join(outputPath, `${sanitizedName}-logs`);
          await fs.promises.mkdir(stageDir, { recursive: true });
          
          // Download each job's logs
          for (const job of childJobs) {
            if (job.state === BuildInterfaces.TimelineRecordState.Completed && job.log?.id) {
              const result = await this.downloadSingleLog(
                buildId,
                job.log.id,
                job.name!,
                stageDir
              );
              downloadedLogs.push(result);
            }
          }
          
          if (downloadedLogs.length === 0) {
            throw new Error(
              `${recordType} "${name}" has child jobs but none have completed logs available`
            );
          }
        }
        
        return {
          type: recordType,
          matchedRecords: [{
            name: record.name!,
            type: record.type!,
            id: record.id!
          }],
          downloadedLogs
        };
      }
    );
  }
  
  private findChildJobs(
    records: BuildInterfaces.TimelineRecord[],
    parentId: string
  ): BuildInterfaces.TimelineRecord[] {
    const jobs: BuildInterfaces.TimelineRecord[] = [];
    
    // Find direct child jobs
    const directChildJobs = records.filter(
      r => r.parentId === parentId && r.type === 'Job'
    );
    jobs.push(...directChildJobs);
    
    // Find child phases/stages and recursively get their jobs
    const childContainers = records.filter(
      r => r.parentId === parentId && (r.type === 'Phase' || r.type === 'Stage')
    );
    
    for (const container of childContainers) {
      const nestedJobs = this.findChildJobs(records, container.id!);
      jobs.push(...nestedJobs);
    }
    
    return jobs;
  }
  
  private async downloadSingleLog(
    buildId: number,
    logId: number,
    contextName: string,
    outputPath: string
  ): Promise<{
    name: string;
    savedPath: string;
    fileSize: number;
  }> {
    // Get the log stream
    const logStream = await this.buildApi!.getBuildLog(
      this.config.project,
      buildId,
      logId
    );
    
    // Determine output path
    let finalPath = outputPath;
    const stats = await fs.promises.stat(outputPath).catch(() => null);
    
    if (!stats || stats.isDirectory()) {
      // Generate filename
      const sanitizedName = contextName.replace(/[^a-zA-Z0-9-_]/g, '-');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `build-${buildId}-${sanitizedName}-${timestamp}.log`;
      finalPath = path.join(outputPath, filename);
    }
    
    // Create parent directory if needed
    const dir = path.dirname(finalPath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Stream to file
    const writeStream = fs.createWriteStream(finalPath);
    await pipeline(logStream, writeStream);
    
    // Get file stats
    const fileStats = await fs.promises.stat(finalPath);
    
    return {
      name: contextName,
      savedPath: finalPath,
      fileSize: fileStats.size
    };
  }
}