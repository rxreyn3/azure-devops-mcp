import { ToolDefinition } from '../types/tool-types.js';
import { BuildClient } from '../clients/build-client.js';
import { formatPipelineSummary, formatErrorResponse } from '../utils/formatters.js';
import { BuildStatus } from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { PipelineInfo } from '../types/api-types.js';
import { ensureString } from '../utils/validators.js';

export function createPipelineTools(client: BuildClient): Record<string, ToolDefinition> {
  return {
    list_pipelines: {
      tool: {
        name: 'list_pipelines',
        description: 'List available build pipelines/definitions',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by pipeline name (partial match)',
            },
            path: {
              type: 'string',
              description: 'Filter by folder path (use backslashes, e.g., "\\\\Apps\\\\Web")',
            },
            includeLatestBuild: {
              type: 'boolean',
              description: 'Include information about the latest build',
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          name?: string;
          path?: string;
          includeLatestBuild?: boolean;
        };
        const result = await client.getDefinitions(
          typedArgs.name,
          typedArgs.path,
          typedArgs.includeLatestBuild,
          50
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        const summary = {
          pipelines: result.data.map(p => ({
            id: p.id,
            name: p.name,
            path: p.path,
            type: p.type,
            queueStatus: p.queueStatus,
            latestBuild: p.latestBuild,
          })),
          count: result.data.length,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      },
    },

    get_pipeline_config: {
      tool: {
        name: 'get_pipeline_config',
        description: 'Get detailed pipeline/definition configuration',
        inputSchema: {
          type: 'object',
          properties: {
            definitionId: {
              type: 'number',
              description: 'Pipeline definition ID',
            },
            includeVariables: {
              type: 'boolean',
              description: 'Include variable definitions',
              default: true,
            },
            includeTriggers: {
              type: 'boolean',
              description: 'Include trigger configuration',
              default: true,
            },
          },
          required: ['definitionId'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          definitionId: number;
          includeVariables?: boolean;
          includeTriggers?: boolean;
        };
        const result = await client.getDefinition(typedArgs.definitionId);

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        const pipeline = result.data;
        interface PipelineConfig {
          id: number;
          name: string;
          path: string;
          type: string;
          queueStatus?: number;
          repository?: {
            name: string;
            type: string;
            url: string;
            defaultBranch?: string;
          };
          variables?: Record<string, { value?: string; isSecret?: boolean }>;
          triggers?: {
            branchFilters?: string[];
            pathFilters?: string[];
            continuousIntegration?: boolean;
            pullRequestValidation?: boolean;
          };
          process?: unknown;
        }
        
        const config: PipelineConfig = {
          id: pipeline.id!,
          name: pipeline.name!,
          path: pipeline.path || '',
          type: pipeline.type === 2 ? 'yaml' : ensureString(pipeline.type, 'build'),
          queueStatus: pipeline.queueStatus,
        };

        // Include variables if requested
        if (typedArgs.includeVariables !== false && pipeline.variables) {
          config.variables = pipeline.variables;
        }

        // Include triggers if requested
        if (typedArgs.includeTriggers !== false && pipeline.triggers) {
          config.triggers = pipeline.triggers as {
            branchFilters?: string[];
            pathFilters?: string[];
            continuousIntegration?: boolean;
            pullRequestValidation?: boolean;
          };
        }

        // Include repository info
        if (pipeline.repository) {
          config.repository = {
            name: pipeline.repository.name || '',
            type: pipeline.repository.type || '',
            url: pipeline.repository.url || '',
            defaultBranch: pipeline.repository.defaultBranch,
          };
        }

        // Include process info
        if (pipeline.process) {
          config.process = {
            type: (pipeline.process as { type?: string }).type,
          };
        }

        // Format the output - map BuildDefinition to PipelineInfo
        const pipelineInfo: PipelineInfo = {
          id: pipeline.id!,
          name: pipeline.name!,
          path: pipeline.path || '',
          type: pipeline.type === 2 ? 'yaml' : 'build',
          queueStatus: pipeline.queueStatus === 0 ? 'enabled' : 
                       pipeline.queueStatus === 1 ? 'paused' : 'disabled',
        };
        
        const output = formatPipelineSummary(pipelineInfo) + '\n\n' +
          'Configuration:\n' + JSON.stringify(config, null, 2);

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      },
    },

    monitor_build_health: {
      tool: {
        name: 'monitor_build_health',
        description: 'Get build health metrics and overview',
        inputSchema: {
          type: 'object',
          properties: {
            definitionId: {
              type: 'number',
              description: 'Filter by specific pipeline definition ID',
            },
            hours: {
              type: 'number',
              description: 'Number of hours to look back',
              default: 24,
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          definitionId?: number;
          hours?: number;
        };
        const hours = typedArgs.hours || 24;
        const minTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Get all builds in the time range
        const buildsResult = await client.getBuilds({
          minTime,
          definitions: typedArgs.definitionId ? [typedArgs.definitionId] : undefined,
          statusFilter: BuildStatus.Completed,
          top: 100,
        });

        if (!buildsResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(buildsResult.error, null, 2),
              },
            ],
          };
        }

        const builds = buildsResult.data;

        // Calculate metrics
        const totalBuilds = builds.length;
        const succeeded = builds.filter(b => b.result === 'Succeeded').length;
        const failed = builds.filter(b => b.result === 'Failed').length;
        const canceled = builds.filter(b => b.result === 'Canceled').length;

        // Calculate average duration for successful builds
        const successfulBuilds = builds.filter(b => 
          b.result === 'Succeeded' && b.startTime && b.finishTime
        );
        
        let avgDuration = 0;
        if (successfulBuilds.length > 0) {
          const totalDuration = successfulBuilds.reduce((sum, b) => {
            const duration = new Date(b.finishTime!).getTime() - new Date(b.startTime!).getTime();
            return sum + duration;
          }, 0);
          avgDuration = Math.round(totalDuration / successfulBuilds.length / 1000 / 60); // minutes
        }

        // Group by definition
        interface DefinitionStats {
          total: number;
          succeeded: number;
          failed: number;
          canceled: number;
          failureReasons: string[];
        }
        const byDefinition: Record<string, DefinitionStats> = {};
        builds.forEach(b => {
          const defName = b.definition.name;
          if (!byDefinition[defName]) {
            byDefinition[defName] = {
              total: 0,
              succeeded: 0,
              failed: 0,
              canceled: 0,
              failureReasons: [],
            };
          }
          byDefinition[defName].total++;
          if (b.result === 'Succeeded') byDefinition[defName].succeeded++;
          if (b.result === 'Failed') {
            byDefinition[defName].failed++;
            // For now, track basic failure info
            // Future enhancement: fetch detailed build timeline to get specific failure reasons
            if (byDefinition[defName].failureReasons.length === 0) {
              byDefinition[defName].failureReasons.push(
                'Build failures detected - use get_build_details for specific error information'
              );
            }
          }
          if (b.result === 'Canceled') byDefinition[defName].canceled++;
        });

        // Get currently running builds
        const runningResult = await client.getBuilds({
          statusFilter: BuildStatus.InProgress,
          definitions: typedArgs.definitionId ? [typedArgs.definitionId] : undefined,
          top: 20,
        });

        const health = {
          timeRange: `Last ${hours} hours`,
          summary: {
            totalBuilds,
            succeeded,
            failed,
            canceled,
            successRate: totalBuilds > 0 ? `${Math.round(succeeded / totalBuilds * 100)}%` : 'N/A',
            avgDuration: avgDuration > 0 ? `${avgDuration} minutes` : 'N/A',
          },
          byDefinition,
          currentlyRunning: runningResult.success ? {
            count: runningResult.data.length,
            builds: runningResult.data.map(b => ({
              id: b.id,
              number: b.buildNumber,
              definition: b.definition.name,
              requestedBy: b.requestedFor.displayName,
              startTime: b.startTime,
            })),
          } : 'Unable to fetch running builds',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      },
    },
  };
}