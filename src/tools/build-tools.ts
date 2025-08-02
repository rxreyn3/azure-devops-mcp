import { ToolDefinition } from '../types/tool-types.js';
import { BuildClient } from '../clients/build-client.js';
import { PipelineClient } from '../clients/pipeline-client.js';
import { formatErrorResponse } from '../utils/formatters.js';
import { mapBuildStatus, mapBuildResult, mapTimelineRecordState, mapTaskResult, mapBuildReason } from '../utils/enum-mappers.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { TempManager } from '../utils/temp-manager.js';

export function createBuildTools(buildClient: BuildClient, pipelineClient: PipelineClient): Record<string, ToolDefinition> {
  return {
    build_get_timeline: {
      tool: {
        name: 'build_get_timeline',
        description: 'Get the timeline for a build showing all jobs, tasks, and which agents executed them. Requires build ID and optionally timeline ID.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build to get timeline for',
            },
            timelineId: {
              type: 'string',
              description: 'Optional: Specific timeline ID. If omitted, returns the latest timeline.',
            },
          },
          required: ['buildId'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as { buildId: number; timelineId?: string };
        const result = await buildClient.getBuildTimeline(
          typedArgs.buildId,
          typedArgs.timelineId
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Format the timeline data for better readability
        const formattedTimeline = {
          timeline: {
            id: result.data.id,
            changeId: result.data.changeId,
            lastChangedBy: result.data.lastChangedBy,
            lastChangedOn: result.data.lastChangedOn,
            recordCount: result.data.records?.length || 0,
          },
          jobs: result.data.records
            ?.filter(r => r.type === 'Job')
            .map(job => ({
              name: job.name,
              workerName: job.workerName,
              startTime: job.startTime,
              finishTime: job.finishTime,
              state: mapTimelineRecordState(job.state),
              result: mapTaskResult(job.result),
              percentComplete: job.percentComplete,
              id: job.id,
              log: job.log ? {
                id: job.log.id,
                type: job.log.type,
                url: job.log.url,
              } : undefined,
            })),
          tasks: result.data.records
            ?.filter(r => r.type === 'Task')
            .map(task => ({
              name: task.name,
              startTime: task.startTime,
              finishTime: task.finishTime,
              state: mapTimelineRecordState(task.state),
              result: mapTaskResult(task.result),
              percentComplete: task.percentComplete,
              parentId: task.parentId,
              id: task.id,
              log: task.log ? {
                id: task.log.id,
                type: task.log.type,
                url: task.log.url,
              } : undefined,
            })),
          summary: {
            totalRecords: result.data.records?.length || 0,
            jobs: result.data.records?.filter(r => r.type === 'Job').length || 0,
            tasks: result.data.records?.filter(r => r.type === 'Task').length || 0,
            phases: result.data.records?.filter(r => r.type === 'Phase').length || 0,
            stages: result.data.records?.filter(r => r.type === 'Stage').length || 0,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedTimeline, null, 2),
            },
          ],
        };
      },
    },

    build_list: {
      tool: {
        name: 'build_list',
        description: 'List builds with optional filtering by pipeline name, status, result, branch, or date range. Supports pagination for large result sets.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of builds to return per page (default: 50, max: 200)',
              default: 50,
              maximum: 200,
            },
            continuationToken: {
              type: 'string',
              description: 'Token from previous response to get next page of results',
            },
            definitionNameFilter: {
              type: 'string',
              description: 'Filter by pipeline/definition name (partial match supported, e.g., "preflight" matches any definition containing "preflight"). Wildcards (*) are added automatically unless already present.',
            },
            definitionId: {
              type: 'number',
              description: 'Filter by exact pipeline/definition ID',
            },
            status: {
              type: 'string',
              enum: ['None', 'InProgress', 'Completed', 'Cancelling', 'Postponed', 'NotStarted', 'All'],
              description: 'Filter by build status',
            },
            result: {
              type: 'string',
              enum: ['None', 'Succeeded', 'PartiallySucceeded', 'Failed', 'Canceled'],
              description: 'Filter by build result',
            },
            branchName: {
              type: 'string',
              description: 'Filter by source branch (e.g., "refs/heads/main")',
            },
            minTime: {
              type: 'string',
              description: 'Filter builds started after this date/time. Accepts ISO 8601 format (e.g., "2024-01-01T00:00:00Z") or standard date strings (e.g., "2024-01-01")',
            },
            maxTime: {
              type: 'string',
              description: 'Filter builds started before this date/time. Accepts ISO 8601 format (e.g., "2024-01-31T23:59:59Z") or standard date strings (e.g., "2024-01-31")',
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          limit?: number;
          continuationToken?: string;
          definitionNameFilter?: string;
          definitionId?: number;
          status?: string;
          result?: string;
          branchName?: string;
          minTime?: string;
          maxTime?: string;
        };

        // Map string status/result to enums
        let statusFilter: BuildInterfaces.BuildStatus | undefined;
        if (typedArgs.status) {
          statusFilter = BuildInterfaces.BuildStatus[typedArgs.status as keyof typeof BuildInterfaces.BuildStatus];
        }

        let resultFilter: BuildInterfaces.BuildResult | undefined;
        if (typedArgs.result) {
          resultFilter = BuildInterfaces.BuildResult[typedArgs.result as keyof typeof BuildInterfaces.BuildResult];
        }

        // Parse and validate date parameters
        let minTime: Date | undefined;
        let maxTime: Date | undefined;

        if (typedArgs.minTime) {
          minTime = new Date(typedArgs.minTime);
          if (isNaN(minTime.getTime())) {
            return formatErrorResponse({
              type: 'validation_error',
              message: `Invalid minTime format: "${typedArgs.minTime}". Please use ISO 8601 format (e.g., "2024-01-01T00:00:00Z") or standard date strings (e.g., "2024-01-01").`,
              details: 'The date string could not be parsed.'
            });
          }
        }

        if (typedArgs.maxTime) {
          maxTime = new Date(typedArgs.maxTime);
          if (isNaN(maxTime.getTime())) {
            return formatErrorResponse({
              type: 'validation_error',
              message: `Invalid maxTime format: "${typedArgs.maxTime}". Please use ISO 8601 format (e.g., "2024-01-31T23:59:59Z") or standard date strings (e.g., "2024-01-31").`,
              details: 'The date string could not be parsed.'
            });
          }
        }

        // Validate that minTime is not after maxTime
        if (minTime && maxTime && minTime > maxTime) {
          return formatErrorResponse({
            type: 'validation_error',
            message: 'Invalid date range: minTime must be before or equal to maxTime.',
            details: `minTime (${minTime.toISOString()}) is after maxTime (${maxTime.toISOString()}). Please swap the values.`
          });
        }

        const result = await buildClient.getBuilds({
          definitionIds: typedArgs.definitionId ? [typedArgs.definitionId] : undefined,
          definitionNameFilter: typedArgs.definitionNameFilter,
          statusFilter,
          resultFilter,
          branchName: typedArgs.branchName,
          minTime,
          maxTime,
          top: typedArgs.limit || 50,
          continuationToken: typedArgs.continuationToken,
        });

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Format the response with pagination info
        const builds = result.data.map(build => ({
          id: build.id,
          buildNumber: build.buildNumber,
          definition: {
            id: build.definition?.id,
            name: build.definition?.name,
          },
          status: mapBuildStatus(build.status),
          result: mapBuildResult(build.result),
          reason: mapBuildReason(build.reason),
          startTime: build.startTime,
          finishTime: build.finishTime,
          sourceBranch: build.sourceBranch,
          sourceVersion: build.sourceVersion,
          requestedBy: build.requestedBy?.displayName,
          requestedFor: build.requestedFor?.displayName,
          uri: build.uri,
        }));

        const response = {
          builds,
          continuationToken: result.data.continuationToken,
          hasMore: !!result.data.continuationToken,
          pageInfo: {
            returned: builds.length,
            requested: typedArgs.limit || 50,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_list_definitions: {
      tool: {
        name: 'build_list_definitions',
        description: 'List build pipeline definitions with optional name filtering. Useful for finding pipeline IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of definitions to return per page (default: 50, max: 200)',
              default: 50,
              maximum: 200,
            },
            continuationToken: {
              type: 'string',
              description: 'Token from previous response to get next page of results',
            },
            nameFilter: {
              type: 'string',
              description: 'Filter by definition name (partial match supported, e.g., "preflight" matches any definition containing "preflight"). Wildcards (*) are added automatically unless already present.',
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          limit?: number;
          continuationToken?: string;
          nameFilter?: string;
        };

        const result = await buildClient.getDefinitions({
          nameFilter: typedArgs.nameFilter,
          top: typedArgs.limit || 50,
          continuationToken: typedArgs.continuationToken,
        });

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Format the response with pagination info
        const definitions = result.data.map(def => ({
          id: def.id,
          name: def.name,
          path: def.path,
          type: def.type,
          queueStatus: def.queueStatus,
          revision: def.revision,
          createdDate: def.createdDate,
          project: def.project?.name,
        }));

        const response = {
          definitions,
          continuationToken: result.data.continuationToken,
          hasMore: !!result.data.continuationToken,
          pageInfo: {
            returned: definitions.length,
            requested: typedArgs.limit || 50,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_queue: {
      tool: {
        name: 'build_queue',
        description: 'Queue (launch) a new build for a pipeline definition. Returns the queued build details. Requires PAT with "Build (read & execute)" and "Agent Pools (read)" scopes.',
        inputSchema: {
          type: 'object',
          properties: {
            definitionId: {
              type: 'number',
              description: 'The ID of the build definition/pipeline to queue. Use build_list_definitions to find the ID.',
            },
            sourceBranch: {
              type: 'string',
              description: 'The branch to build from (e.g., "refs/heads/main"). If not specified, uses the default branch.',
            },
            parameters: {
              type: 'object',
              description: 'Pipeline parameters as key-value pairs. These override default pipeline variables.',
              additionalProperties: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' }
                ]
              },
            },
          },
          required: ['definitionId'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          definitionId: number;
          sourceBranch?: string;
          parameters?: { [key: string]: any };
        };

        // Use Pipeline API to run the pipeline
        const result = await pipelineClient.runPipeline({
          pipelineId: typedArgs.definitionId,
          sourceBranch: typedArgs.sourceBranch,
          templateParameters: typedArgs.parameters,
        });

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Format the pipeline run response to match build response format
        const run = result.data;
        const response = {
          id: run.id,
          buildNumber: run.name,
          status: run.state,
          reason: 'Manual',
          queueTime: run.createdDate,
          sourceBranch: typedArgs.sourceBranch,
          sourceVersion: undefined,
          definition: {
            id: run.pipelineId,
            name: run.pipelineName,
          },
          project: undefined,
          queue: undefined,
          requestedBy: undefined,
          requestedFor: undefined,
          parameters: run.templateParameters,
          orchestrationPlan: undefined,
          logs: undefined,
          uri: undefined,
          url: run.url,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_download_job_logs: {
      tool: {
        name: 'build_download_job_logs',
        description: 'Download logs for a specific job from a build by job name. Saves the log content to a file on the local filesystem.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build',
            },
            jobName: {
              type: 'string',
              description: 'The name of the job to download logs for (e.g., "GPU and System Diagnostics")',
            },
            outputPath: {
              type: 'string',
              description: 'Optional file or directory path where the log should be saved. If not provided, saves to a managed temporary directory and returns the full path.',
            },
          },
          required: ['buildId', 'jobName'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          buildId: number;
          jobName: string;
          outputPath: string;
        };

        const result = await buildClient.downloadJobLogByName(
          typedArgs.buildId,
          typedArgs.jobName,
          typedArgs.outputPath
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        const response = {
          message: `Successfully downloaded logs for job "${typedArgs.jobName}"`,
          savedTo: result.data.savedPath,
          isTemporary: result.data.isTemporary,
          fileSize: result.data.fileSize,
          downloadedAt: result.data.downloadedAt,
          jobDetails: {
            jobName: result.data.jobName,
            jobId: result.data.jobId,
            logId: result.data.logId,
            duration: result.data.duration,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_list_artifacts: {
      tool: {
        name: 'build_list_artifacts',
        description: 'List all artifacts available for a specific build. Shows artifact names, types, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build',
            },
          },
          required: ['buildId'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          buildId: number;
        };

        const result = await buildClient.listArtifacts(typedArgs.buildId);

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Format the artifacts for display
        const artifacts = result.data.map(artifact => ({
          id: artifact.id,
          name: artifact.name,
          source: artifact.source,
          downloadUrl: artifact.resource?.downloadUrl,
          type: artifact.resource?.type,
          data: artifact.resource?.data,
          properties: artifact.resource?.properties,
        }));

        const response = {
          buildId: typedArgs.buildId,
          artifactCount: artifacts.length,
          artifacts: artifacts,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_download_artifact: {
      tool: {
        name: 'build_download_artifact',
        description: 'Download a Pipeline artifact from a build using signed URLs. Only supports Pipeline artifacts (created with PublishPipelineArtifact task). Saves as a ZIP file.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build (also known as run ID)',
            },
            definitionId: {
              type: 'number',
              description: 'The build definition ID (from build.definition.id). If not provided, will be fetched automatically.',
            },
            artifactName: {
              type: 'string',
              description: 'The name of the Pipeline artifact to download (e.g., "RenderLogs")',
            },
            outputPath: {
              type: 'string',
              description: 'Optional file or directory path where the artifact should be saved. If not provided, saves to a managed temporary directory and returns the full path.',
            },
          },
          required: ['buildId', 'artifactName'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          buildId: number;
          definitionId?: number;
          artifactName: string;
          outputPath?: string;
        };

        const result = await buildClient.downloadArtifact(
          typedArgs.buildId,
          typedArgs.definitionId,
          typedArgs.artifactName,
          typedArgs.outputPath
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        const response = {
          message: `Successfully downloaded artifact "${typedArgs.artifactName}"`,
          savedTo: result.data.savedPath,
          isTemporary: result.data.isTemporary,
          fileSize: result.data.fileSize,
          downloadedAt: result.data.downloadedAt,
          artifactDetails: {
            artifactName: result.data.artifactName,
            artifactId: result.data.artifactId,
            format: 'ZIP archive',
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    build_download_logs_by_name: {
      tool: {
        name: 'build_download_logs_by_name',
        description: 'Download logs for a stage, job, or task by searching for its name in the build timeline. Handles stages by downloading all child job logs into an organized directory structure.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build',
            },
            name: {
              type: 'string',
              description: 'The name of the stage, job, or task to download logs for (e.g., "Deploy", "Trigger Async Shift Upload", "Publish Pipeline Artifact")',
            },
            outputPath: {
              type: 'string',
              description: 'Optional file or directory path where logs should be saved. If not provided, saves to a managed temporary directory. For stages, a subdirectory will be created.',
            },
            exactMatch: {
              type: 'boolean',
              description: 'Whether to use exact name matching (default: true). Set to false for partial/case-insensitive matching.',
              default: true,
            },
          },
          required: ['buildId', 'name'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          buildId: number;
          name: string;
          outputPath?: string;
          exactMatch?: boolean;
        };

        const result = await buildClient.downloadLogsByName(
          typedArgs.buildId,
          typedArgs.name,
          typedArgs.outputPath,
          typedArgs.exactMatch ?? true
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        const response = {
          message: `Successfully downloaded logs for ${result.data.type} "${typedArgs.name}"`,
          recordType: result.data.type,
          matchedRecord: result.data.matchedRecords[0],
          downloadedLogs: result.data.downloadedLogs,
          summary: {
            totalLogsDownloaded: result.data.downloadedLogs.length,
            totalSize: result.data.downloadedLogs.reduce((sum, log) => sum + log.fileSize, 0),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    list_downloads: {
      tool: {
        name: 'list_downloads',
        description: 'List all files downloaded to the temporary directory by this MCP server, including logs and artifacts.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const tempManager = TempManager.getInstance();
        const downloads = await tempManager.listDownloads();
        
        const categorized = {
          logs: downloads.filter(d => d.category === 'logs'),
          artifacts: downloads.filter(d => d.category === 'artifacts'),
        };
        
        const response = {
          message: `Found ${downloads.length} downloaded file(s)`,
          tempDirectory: await tempManager.getTempDir(),
          summary: {
            totalFiles: downloads.length,
            totalSize: downloads.reduce((sum, d) => sum + d.size, 0),
            logs: categorized.logs.length,
            artifacts: categorized.artifacts.length,
          },
          downloads: downloads.map(d => ({
            path: d.path,
            category: d.category,
            buildId: d.buildId,
            filename: d.filename,
            size: d.size,
            downloadedAt: d.downloadedAt.toISOString(),
            ageHours: Math.round(d.ageHours * 10) / 10,
          })),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    cleanup_downloads: {
      tool: {
        name: 'cleanup_downloads',
        description: 'Remove old downloaded files from the temporary directory.',
        inputSchema: {
          type: 'object',
          properties: {
            olderThanHours: {
              type: 'number',
              description: 'Remove files older than this many hours (default: 24)',
              default: 24,
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          olderThanHours?: number;
        };
        
        const tempManager = TempManager.getInstance();
        const result = await tempManager.cleanup(typedArgs.olderThanHours ?? 24);
        
        const response = {
          message: `Cleanup completed`,
          filesRemoved: result.filesRemoved,
          spaceSaved: result.spaceSaved,
          errors: result.errors,
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },

    get_download_location: {
      tool: {
        name: 'get_download_location',
        description: 'Get information about the temporary directory where files are downloaded.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const tempManager = TempManager.getInstance();
        const info = await tempManager.getTempDirInfo();
        
        const response = {
          message: 'Temporary download directory information',
          path: info.path,
          totalSize: info.totalSize,
          fileCount: info.fileCount,
          oldestFile: info.oldestFile ? {
            path: info.oldestFile.path,
            ageHours: Math.round(info.oldestFile.age * 10) / 10,
          } : null,
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      },
    },
  };
}