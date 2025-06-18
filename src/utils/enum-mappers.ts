import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';

/**
 * Maps BuildStatus enum values to human-readable strings
 */
export function mapBuildStatus(status: BuildInterfaces.BuildStatus | undefined): string {
  if (status === undefined || status === null) return 'Unknown';
  
  switch (status) {
    case BuildInterfaces.BuildStatus.None:
      return 'None';
    case BuildInterfaces.BuildStatus.InProgress:
      return 'InProgress';
    case BuildInterfaces.BuildStatus.Completed:
      return 'Completed';
    case BuildInterfaces.BuildStatus.Cancelling:
      return 'Cancelling';
    case BuildInterfaces.BuildStatus.Postponed:
      return 'Postponed';
    case BuildInterfaces.BuildStatus.NotStarted:
      return 'NotStarted';
    case BuildInterfaces.BuildStatus.All:
      return 'All';
    default:
      return `Unknown(${status})`;
  }
}

/**
 * Maps BuildResult enum values to human-readable strings
 */
export function mapBuildResult(result: BuildInterfaces.BuildResult | undefined): string {
  if (result === undefined || result === null) return 'Unknown';
  
  switch (result) {
    case BuildInterfaces.BuildResult.None:
      return 'None';
    case BuildInterfaces.BuildResult.Succeeded:
      return 'Succeeded';
    case BuildInterfaces.BuildResult.PartiallySucceeded:
      return 'PartiallySucceeded';
    case BuildInterfaces.BuildResult.Failed:
      return 'Failed';
    case BuildInterfaces.BuildResult.Canceled:
      return 'Canceled';
    default:
      return `Unknown(${result})`;
  }
}

/**
 * Maps TimelineRecordState enum values to human-readable strings
 */
export function mapTimelineRecordState(state: BuildInterfaces.TimelineRecordState | undefined): string {
  if (state === undefined || state === null) return 'Unknown';
  
  switch (state) {
    case BuildInterfaces.TimelineRecordState.Pending:
      return 'Pending';
    case BuildInterfaces.TimelineRecordState.InProgress:
      return 'InProgress';
    case BuildInterfaces.TimelineRecordState.Completed:
      return 'Completed';
    default:
      return `Unknown(${state})`;
  }
}

/**
 * Maps TaskResult enum values to human-readable strings
 */
export function mapTaskResult(result: BuildInterfaces.TaskResult | undefined): string {
  if (result === undefined || result === null) return 'Unknown';
  
  switch (result) {
    case BuildInterfaces.TaskResult.Succeeded:
      return 'Succeeded';
    case BuildInterfaces.TaskResult.SucceededWithIssues:
      return 'SucceededWithIssues';
    case BuildInterfaces.TaskResult.Failed:
      return 'Failed';
    case BuildInterfaces.TaskResult.Canceled:
      return 'Canceled';
    case BuildInterfaces.TaskResult.Skipped:
      return 'Skipped';
    case BuildInterfaces.TaskResult.Abandoned:
      return 'Abandoned';
    default:
      return `Unknown(${result})`;
  }
}

/**
 * Maps BuildReason enum values to human-readable strings
 */
export function mapBuildReason(reason: BuildInterfaces.BuildReason | undefined): string {
  if (reason === undefined || reason === null) return 'Unknown';
  
  switch (reason) {
    case BuildInterfaces.BuildReason.None:
      return 'None';
    case BuildInterfaces.BuildReason.Manual:
      return 'Manual';
    case BuildInterfaces.BuildReason.IndividualCI:
      return 'IndividualCI';
    case BuildInterfaces.BuildReason.BatchedCI:
      return 'BatchedCI';
    case BuildInterfaces.BuildReason.Schedule:
      return 'Schedule';
    case BuildInterfaces.BuildReason.ScheduleForced:
      return 'ScheduleForced';
    case BuildInterfaces.BuildReason.UserCreated:
      return 'UserCreated';
    case BuildInterfaces.BuildReason.ValidateShelveset:
      return 'ValidateShelveset';
    case BuildInterfaces.BuildReason.CheckInShelveset:
      return 'CheckInShelveset';
    case BuildInterfaces.BuildReason.PullRequest:
      return 'PullRequest';
    case BuildInterfaces.BuildReason.BuildCompletion:
      return 'BuildCompletion';
    case BuildInterfaces.BuildReason.ResourceTrigger:
      return 'ResourceTrigger';
    default:
      return `Unknown(${reason})`;
  }
}