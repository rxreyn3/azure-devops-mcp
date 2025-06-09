import { ToolDefinition } from '../types/tool-types.js';
import { BuildClient } from '../clients/build-client.js';
import { BuildStatus, BuildResult, BuildReason } from 'azure-devops-node-api/interfaces/BuildInterfaces.js';

export function createBuildTools(client: BuildClient): Record<string, ToolDefinition> {
  return {
    list_builds: {
      tool: {
        name: 'list_builds',
        description: 'List builds with smart filtering for common queries',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['all', 'inProgress', 'completed', 'notStarted'],
              description: 'Filter by build status',
            },
            result: {
              type: 'string',
              enum: ['all', 'succeeded', 'failed', 'canceled', 'partiallySucceeded'],
              description: 'Filter by build result (only for completed builds)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of builds to return (default: 20)',
              minimum: 1,
              maximum: 200,
            },
            definitionId: {
              type: 'number',
              description: 'Filter by specific pipeline/definition ID',
            },
            requestedFor: {
              type: 'string',
              description: 'Filter by user who requested the build (email or display name)',
            },
            sinceHours: {
              type: 'number',
              description: 'Filter builds from the last N hours (default: 24)',
              minimum: 1,
            },
            branchName: {
              type: 'string',
              description: 'Filter by source branch name',
            },
          },
          required: [],
        },
      },
      handler: async (args: {
        status?: string;
        result?: string;
        top?: number;
        definitionId?: number;
        requestedFor?: string;
        sinceHours?: number;
        branchName?: string;
      }) => {
        // Build filter based on arguments
        const filter: any = {
          top: args.top || 20,
        };

        // Handle status filter
        if (args.status && args.status !== 'all') {
          const statusMap: { [key: string]: BuildStatus } = {
            inProgress: BuildStatus.InProgress,
            completed: BuildStatus.Completed,
            notStarted: BuildStatus.NotStarted,
          };
          filter.statusFilter = statusMap[args.status];
        }

        // Handle result filter
        if (args.result && args.result !== 'all') {
          const resultMap: { [key: string]: BuildResult } = {
            succeeded: BuildResult.Succeeded,
            failed: BuildResult.Failed,
            canceled: BuildResult.Canceled,
            partiallySucceeded: BuildResult.PartiallySucceeded,
          };
          filter.resultFilter = resultMap[args.result];
        }

        // Handle time filter
        if (args.sinceHours) {
          filter.minTime = new Date(Date.now() - args.sinceHours * 60 * 60 * 1000);
        } else {
          // Default to last 24 hours
          filter.minTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }

        // Handle other filters
        if (args.definitionId) {
          filter.definitions = [args.definitionId];
        }
        if (args.requestedFor) {
          filter.requestedFor = args.requestedFor;
        }
        if (args.branchName) {
          filter.branchName = args.branchName;
        }

        const result = await client.getBuilds(filter);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.error, null, 2),
              },
            ],
          };
        }

        // Format the response with summary
        const builds = result.data;
        const summary = {
          count: builds.length,
          inProgress: builds.filter(b => b.status === 'InProgress').length,
          succeeded: builds.filter(b => b.result === 'Succeeded').length,
          failed: builds.filter(b => b.result === 'Failed').length,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  summary,
                  builds: builds.map(b => ({
                    id: b.id,
                    buildNumber: b.buildNumber,
                    status: b.status,
                    result: b.result,
                    queueTime: b.queueTime,
                    startTime: b.startTime,
                    finishTime: b.finishTime,
                    requestedFor: b.requestedFor.displayName,
                    definition: b.definition.name,
                    sourceBranch: b.sourceBranch,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_build_details: {
      tool: {
        name: 'get_build_details',
        description: 'Get comprehensive build details including timeline and changes',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The build ID to get details for',
            },
            includeTimeline: {
              type: 'boolean',
              description: 'Include build timeline showing stages and tasks (default: true)',
            },
            includeChanges: {
              type: 'boolean',
              description: 'Include source changes that triggered the build (default: true)',
            },
          },
          required: ['buildId'],
        },
      },
      handler: async (args: {
        buildId: number;
        includeTimeline?: boolean;
        includeChanges?: boolean;
      }) => {
        const includeTimeline = args.includeTimeline !== false;
        const includeChanges = args.includeChanges !== false;

        // Get build details
        const buildResult = await client.getBuild(args.buildId);
        if (!buildResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(buildResult.error, null, 2),
              },
            ],
          };
        }

        const response: any = {
          build: buildResult.data,
        };

        // Get timeline if requested
        if (includeTimeline) {
          const timelineResult = await client.getBuildTimeline(args.buildId);
          if (timelineResult.success) {
            // Group timeline records by parent for better readability
            const rootRecords = timelineResult.data.filter(r => !r.parentId);
            const childrenByParent = timelineResult.data.reduce((acc, r) => {
              if (r.parentId) {
                if (!acc[r.parentId]) acc[r.parentId] = [];
                acc[r.parentId].push(r);
              }
              return acc;
            }, {} as Record<string, typeof timelineResult.data>);

            response.timeline = {
              summary: {
                totalRecords: timelineResult.data.length,
                failedRecords: timelineResult.data.filter(r => r.result === '2').length,
                warningCount: timelineResult.data.reduce((sum, r) => sum + r.warningCount, 0),
                errorCount: timelineResult.data.reduce((sum, r) => sum + r.errorCount, 0),
              },
              stages: rootRecords.map(stage => ({
                name: stage.name,
                state: stage.state,
                result: stage.result,
                startTime: stage.startTime,
                finishTime: stage.finishTime,
                errorCount: stage.errorCount,
                warningCount: stage.warningCount,
                tasks: (childrenByParent[stage.id] || []).map(task => ({
                  name: task.name,
                  state: task.state,
                  result: task.result,
                  startTime: task.startTime,
                  finishTime: task.finishTime,
                  errorCount: task.errorCount,
                  warningCount: task.warningCount,
                  logId: task.log?.id,
                })),
              })),
            };
          }
        }

        // Get changes if requested
        if (includeChanges) {
          const changesResult = await client.getBuildChanges(args.buildId, 10, true);
          if (changesResult.success) {
            response.changes = changesResult.data.map(change => ({
              id: change.id,
              message: change.message,
              author: change.author,
              timestamp: change.timestamp,
              location: change.location,
            }));
          }
        }

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

    queue_build: {
      tool: {
        name: 'queue_build',
        description: 'Queue a new build with optional parameters',
        inputSchema: {
          type: 'object',
          properties: {
            definitionId: {
              type: 'number',
              description: 'Pipeline/definition ID to queue',
            },
            sourceBranch: {
              type: 'string',
              description: 'Branch to build (e.g., refs/heads/main)',
            },
            parameters: {
              type: 'object',
              description: 'Build parameters as key-value pairs',
              additionalProperties: {
                type: 'string',
              },
            },
            priority: {
              type: 'string',
              enum: ['low', 'belowNormal', 'normal', 'aboveNormal', 'high'],
              description: 'Build priority (default: normal)',
            },
            reason: {
              type: 'string',
              enum: ['manual', 'individualCI', 'batchedCI', 'schedule', 'validateShelveset', 'checkInShelveset', 'pullRequest', 'buildCompletion', 'resourceTrigger'],
              description: 'Reason for the build (default: manual)',
            },
          },
          required: ['definitionId'],
        },
      },
      handler: async (args: {
        definitionId: number;
        sourceBranch?: string;
        parameters?: Record<string, string>;
        priority?: 'low' | 'belowNormal' | 'normal' | 'aboveNormal' | 'high';
        reason?: string;
      }) => {
        const options: any = {
          definition: { id: args.definitionId },
          sourceBranch: args.sourceBranch,
          priority: args.priority,
        };

        // Handle parameters
        if (args.parameters) {
          options.parameters = JSON.stringify(args.parameters);
        }

        // Handle reason
        if (args.reason) {
          const reasonMap: { [key: string]: BuildReason } = {
            manual: BuildReason.Manual,
            individualCI: BuildReason.IndividualCI,
            batchedCI: BuildReason.BatchedCI,
            schedule: BuildReason.Schedule,
            validateShelveset: BuildReason.ValidateShelveset,
            checkInShelveset: BuildReason.CheckInShelveset,
            pullRequest: BuildReason.PullRequest,
            buildCompletion: BuildReason.BuildCompletion,
            resourceTrigger: BuildReason.ResourceTrigger,
          };
          options.reason = reasonMap[args.reason] || BuildReason.Manual;
        }

        const result = await client.queueBuild(options);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.error, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'Build queued successfully',
                  build: {
                    id: result.data.id,
                    buildNumber: result.data.buildNumber,
                    status: result.data.status,
                    queueTime: result.data.queueTime,
                    url: `https://dev.azure.com/${(client as any).config.organization}/${(client as any).config.project}/_build/results?buildId=${result.data.id}`,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_build_logs: {
      tool: {
        name: 'get_build_logs',
        description: 'Get build logs for troubleshooting',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The build ID to get logs for',
            },
            logId: {
              type: 'number',
              description: 'Specific log ID to retrieve (optional)',
            },
            startLine: {
              type: 'number',
              description: 'Starting line number (for specific log)',
            },
            endLine: {
              type: 'number',
              description: 'Ending line number (for specific log)',
            },
          },
          required: ['buildId'],
        },
      },
      handler: async (args: {
        buildId: number;
        logId?: number;
        startLine?: number;
        endLine?: number;
      }) => {
        // If specific log requested, get its content
        if (args.logId) {
          const linesResult = await client.getBuildLogLines(
            args.buildId,
            args.logId,
            args.startLine,
            args.endLine,
          );

          if (!linesResult.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(linesResult.error, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    buildId: args.buildId,
                    logId: args.logId,
                    lineCount: linesResult.data.length,
                    lines: linesResult.data,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Otherwise, list all logs
        const logsResult = await client.getBuildLogs(args.buildId);

        if (!logsResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(logsResult.error, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  buildId: args.buildId,
                  logCount: logsResult.data.length,
                  logs: logsResult.data.map(log => ({
                    id: log.id,
                    type: log.type,
                    created: log.createdOn,
                    lastChanged: log.lastChangedOn,
                    lineCount: log.lineCount,
                    url: log.url,
                  })),
                  hint: 'Use logId parameter to retrieve specific log content',
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    manage_build: {
      tool: {
        name: 'manage_build',
        description: 'Cancel, retain, or retry builds',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The build ID to manage',
            },
            action: {
              type: 'string',
              enum: ['cancel', 'retain', 'unretain'],
              description: 'Action to perform on the build',
            },
          },
          required: ['buildId', 'action'],
        },
      },
      handler: async (args: { buildId: number; action: string }) => {
        let updateOptions: any = {};

        switch (args.action) {
          case 'cancel':
            updateOptions.status = BuildStatus.Cancelling;
            break;
          case 'retain':
            updateOptions.keepForever = true;
            break;
          case 'unretain':
            updateOptions.keepForever = false;
            break;
          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: `Invalid action: ${args.action}`,
                      validActions: ['cancel', 'retain', 'unretain'],
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
        }

        const result = await client.updateBuild(args.buildId, updateOptions);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.error, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Build ${args.action} action completed successfully`,
                  build: {
                    id: result.data.id,
                    buildNumber: result.data.buildNumber,
                    status: result.data.status,
                    result: result.data.result,
                    keepForever: updateOptions.keepForever,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },
  };
}