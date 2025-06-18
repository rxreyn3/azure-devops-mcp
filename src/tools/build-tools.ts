import { ToolDefinition } from '../types/tool-types.js';
import { BuildClient } from '../clients/build-client.js';
import { formatErrorResponse } from '../utils/formatters.js';
import { mapBuildStatus, mapBuildResult, mapTimelineRecordState, mapTaskResult, mapBuildReason } from '../utils/enum-mappers.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';

export function createBuildTools(client: BuildClient): Record<string, ToolDefinition> {
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
        const result = await client.getBuildTimeline(
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

        const result = await client.getBuilds({
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

        const result = await client.getDefinitions({
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
  };
}