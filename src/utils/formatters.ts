import { BuildInfo, PipelineInfo, BuildTimelineRecord } from '../types/index.js';
import { ApiError } from '../types/index.js';

export function formatDuration(startTime?: Date, endTime?: Date): string {
  if (!startTime) return 'Not started';
  if (!endTime) return 'In progress';
  
  const duration = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  return `${minutes}m ${seconds}s`;
}

export function formatBuildStatus(status: string, result?: string): string {
  if (status === 'completed' && result) {
    const emoji = {
      Succeeded: '✅',
      Failed: '❌',
      Canceled: '⚠️',
      PartiallySucceeded: '⚠️'
    }[result] || '❓';
    
    return `${emoji} ${result}`;
  }
  
  const statusEmoji = {
    inProgress: '🔄',
    notStarted: '⏸️',
    cancelling: '🛑',
    postponed: '⏰'
  }[status] || '❓';
  
  return `${statusEmoji} ${status}`;
}

export function formatBuildSummary(build: BuildInfo): string {
  const status = formatBuildStatus(build.status, build.result);
  const duration = formatDuration(build.startTime, build.finishTime);
  
  return `Build #${build.buildNumber}
Status: ${status}
Definition: ${build.definition.name}
Branch: ${build.sourceBranch}
Requested by: ${build.requestedFor.displayName}
Duration: ${duration}
Queue time: ${new Date(build.queueTime).toLocaleString()}`;
}

export function formatPipelineSummary(pipeline: PipelineInfo): string {
  let summary = `Pipeline: ${pipeline.name}
ID: ${pipeline.id}
Path: ${pipeline.path}
Type: ${pipeline.type}`;

  if (pipeline.queueStatus) {
    summary += `\nQueue Status: ${pipeline.queueStatus}`;
  }

  if (pipeline.latestBuild) {
    const buildStatus = formatBuildStatus(
      pipeline.latestBuild.status,
      pipeline.latestBuild.result
    );
    summary += `\n\nLatest Build: #${pipeline.latestBuild.buildNumber}
Status: ${buildStatus}`;
  }

  return summary;
}

export function formatTimelineRecord(record: BuildTimelineRecord, indent: number = 0): string {
  const prefix = '  '.repeat(indent);
  const status = record.result || record.state;
  const statusEmoji = {
    Succeeded: '✅',
    Failed: '❌',
    Skipped: '⏭️',
    Canceled: '⚠️',
    InProgress: '🔄'
  }[status] || '❓';
  
  const duration = formatDuration(record.startTime, record.finishTime);
  const errors = record.errorCount > 0 ? ` (${record.errorCount} errors)` : '';
  const warnings = record.warningCount > 0 ? ` (${record.warningCount} warnings)` : '';
  
  return `${prefix}${statusEmoji} ${record.name} - ${duration}${errors}${warnings}`;
}

/**
 * Format error responses consistently for MCP tools
 */
export function formatErrorResponse(error: ApiError | unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  let errorMessage: string;
  
  if (error && typeof error === 'object' && 'type' in error) {
    const apiError = error as ApiError;
    switch (apiError.type) {
      case 'permission':
        errorMessage = `❌ Permission Error\n\n${apiError.message}`;
        if ('suggestion' in apiError) {
          errorMessage += `\n\n💡 Suggestion: ${apiError.suggestion}`;
        }
        break;
      case 'not_found':
        errorMessage = `❌ Not Found\n\n${apiError.message}`;
        break;
      case 'api_error':
        errorMessage = `❌ API Error\n\n${apiError.message}`;
        break;
      default:
        errorMessage = `❌ Error\n\n${JSON.stringify(apiError, null, 2)}`;
    }
  } else if (error instanceof Error) {
    errorMessage = `❌ Error\n\n${error.message}`;
    if (error.stack) {
      errorMessage += `\n\nStack trace:\n${error.stack}`;
    }
  } else {
    errorMessage = `❌ Unknown Error\n\n${JSON.stringify(error, null, 2)}`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };
}