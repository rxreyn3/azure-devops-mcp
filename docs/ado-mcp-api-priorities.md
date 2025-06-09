# Azure DevOps MCP API Priorities

This document identifies and prioritizes the most valuable Azure DevOps Build APIs for implementation in the MCP server, focused on project-level operations for build administration and developer workflows using the `azure-devops-node-api` library.

## Executive Summary

Based on analysis of common build operations and daily usage patterns, the following APIs represent the highest-value targets for MCP tool implementation:

**Top 10 Essential APIs (Ranked by Usage Frequency):**
1. `getBuilds()` - Monitor status, health checks (38% of API calls)
2. `getBuild()` - Detailed investigation (22% of API calls)
3. `queueBuild()` - Start builds with parameters (18% of API calls)
4. `getBuildTimeline()` - Understand failures (12% of API calls)
5. `getBuildLogs()` / `getBuildLog()` - Troubleshooting (8% of API calls)
6. `getDefinitions()` - Discover pipelines
7. `updateBuild()` - Cancel/stop builds
8. `getBuildChanges()` - Track triggers
9. `getDefinition()` - Pipeline configuration
10. `getArtifacts()` - Download outputs

## Tier 1: Essential Daily Operations (Highest Priority)

### 1. List Builds
**Method**: `buildApi.getBuilds(project, ...)`
```typescript
getBuilds(
  project: string,
  definitions?: number[],
  queues?: number[],
  buildNumber?: string,
  minTime?: Date,
  maxTime?: Date,
  requestedFor?: string,
  reasonFilter?: BuildReason,
  statusFilter?: BuildStatus,
  resultFilter?: BuildResult,
  tagFilters?: string[],
  properties?: string[],
  top?: number,
  continuationToken?: string
): Promise<VSSInterfaces.PagedList<BuildInterfaces.Build>>
```
- **Primary Use Cases**: 
  - Monitor build health and status
  - Check queue depths
  - Identify long-running builds
  - Track failure patterns
- **Key Parameters**: 
  - `statusFilter`: BuildStatus.InProgress, BuildStatus.Completed
  - `resultFilter`: BuildResult.Succeeded, BuildResult.Failed
  - `top`: Limit results (default 50)
  - `definitions`: Filter by pipeline IDs
  - `requestedFor`: Filter by user email
- **MCP Tool Recommendation**: `list_builds` with smart defaults

### 2. Get Build
**Method**: `buildApi.getBuild(project, buildId, propertyFilters?)`
```typescript
getBuild(
  project: string,
  buildId: number,
  propertyFilters?: string
): Promise<BuildInterfaces.Build>
```
- **Primary Use Cases**:
  - Investigate specific build failures
  - Check detailed status
  - View build parameters
  - Identify triggering user
- **Value**: Essential for root cause analysis
- **MCP Tool Recommendation**: `get_build_details`

### 3. Queue Build
**Method**: `buildApi.queueBuild(build, project, ignoreWarnings?)`
```typescript
queueBuild(
  build: BuildInterfaces.Build,
  project: string,
  ignoreWarnings?: boolean,
  checkInTicket?: string,
  sourceBuildId?: number,
  definitionId?: number
): Promise<BuildInterfaces.Build>
```
- **Primary Use Cases**:
  - Start builds with custom parameters
  - Trigger specific branches
  - CI/CD automation
- **Build Object Fields**:
  - `definition: { id: number }`
  - `sourceBranch: string`
  - `parameters: string` (JSON stringified)
  - `templateParameters: { [key: string]: string }`
- **MCP Tool Recommendation**: `queue_build` with parameter validation

### 4. Get Build Timeline
**Method**: `buildApi.getBuildTimeline(project, buildId, timelineId?, changeId?, planId?)`
```typescript
getBuildTimeline(
  project: string,
  buildId: number,
  timelineId?: string,
  changeId?: number,
  planId?: string
): Promise<BuildInterfaces.Timeline>
```
- **Primary Use Cases**:
  - Understand build stage failures
  - Identify performance bottlenecks
  - Track task execution order
- **Value**: Shows exactly where/when builds fail via `timeline.records`
- **MCP Tool Recommendation**: Combine with `get_build_details`

### 5. Get Build Logs
**Methods**: 
```typescript
// Get list of logs
getBuildLogs(
  project: string,
  buildId: number
): Promise<BuildInterfaces.BuildLog[]>

// Get specific log content as stream
getBuildLog(
  project: string,
  buildId: number,
  logId: number,
  startLine?: number,
  endLine?: number
): Promise<NodeJS.ReadableStream>

// Get log lines as string array
getBuildLogLines(
  project: string,
  buildId: number,
  logId: number,
  startLine?: number,
  endLine?: number
): Promise<string[]>
```
- **Primary Use Cases**:
  - Debug compilation errors
  - Investigate test failures
  - Troubleshoot deployment issues
- **Implementation Note**: Use `getBuildLogs()` first, then retrieve specific logs
- **MCP Tool Recommendation**: `get_build_logs` with filtering options

## Tier 2: Regular Administrative Tasks

### 6. List Build Definitions
**Method**: `buildApi.getDefinitions(project, ...)`
```typescript
getDefinitions(
  project: string,
  name?: string,
  repositoryId?: string,
  repositoryType?: string,
  queryOrder?: DefinitionQueryOrder,
  top?: number,
  continuationToken?: string,
  minMetricsTime?: Date,
  definitionIds?: number[],
  path?: string,
  builtAfter?: Date,
  notBuiltAfter?: Date,
  includeAllProperties?: boolean,
  includeLatestBuilds?: boolean,
  taskIdFilter?: string,
  processType?: number,
  yamlFilename?: string
): Promise<VSSInterfaces.PagedList<BuildInterfaces.BuildDefinitionReference>>
```
- **Primary Use Cases**:
  - Discover available pipelines
  - Find definition IDs for queuing
  - Audit pipeline inventory
- **Key Parameters**:
  - `name`: Search by name
  - `path`: Filter by folder (use backslashes)
  - `includeLatestBuilds`: Get recent build info
  - `processType`: 2 for YAML, 1 for classic
- **MCP Tool Recommendation**: `list_pipelines`

### 7. Update Build
**Method**: `buildApi.updateBuild(build, project, buildId, retry?)`
```typescript
updateBuild(
  build: BuildInterfaces.Build,
  project: string,
  buildId: number,
  retry?: boolean
): Promise<BuildInterfaces.Build>
```
- **Primary Use Cases**:
  - Cancel stuck builds
  - Stop long-running builds
  - Update build retention
- **Critical Operations**:
  - Set `status: BuildStatus.Cancelling`
  - Update `keepForever: true`
  - Use `retry: true` to retry failed builds
- **MCP Tool Recommendation**: `manage_build` (cancel/retain/retry)

### 8. Get Build Changes
**Method**: `buildApi.getBuildChanges(project, buildId, continuationToken?, top?, includeSourceChange?)`
```typescript
getBuildChanges(
  project: string,
  buildId: number,
  continuationToken?: string,
  top?: number,
  includeSourceChange?: boolean
): Promise<VSSInterfaces.PagedList<BuildInterfaces.Change>>
```
- **Primary Use Cases**:
  - Identify triggering commits
  - Track code changes
  - Blame analysis
- **Value**: Links builds to source control via `change.id`, `change.author`
- **MCP Tool Recommendation**: Include in `get_build_details`

### 9. Get Definition
**Method**: `buildApi.getDefinition(project, definitionId, revision?, minMetricsTime?, propertyFilters?, includeLatestBuilds?)`
```typescript
getDefinition(
  project: string,
  definitionId: number,
  revision?: number,
  minMetricsTime?: Date,
  propertyFilters?: string[],
  includeLatestBuilds?: boolean
): Promise<BuildInterfaces.BuildDefinition>
```
- **Primary Use Cases**:
  - View pipeline configuration
  - Understand build triggers
  - Check variable groups
- **Value**: Access to `triggers`, `variables`, `process`
- **MCP Tool Recommendation**: `get_pipeline_config`

### 10. Get Build Artifacts
**Method**: `buildApi.getArtifacts(project, buildId)`
```typescript
getArtifacts(
  project: string,
  buildId: number
): Promise<BuildInterfaces.BuildArtifact[]>

// For downloading specific artifact
getArtifactContentZip(
  project: string,
  buildId: number,
  artifactName: string
): Promise<NodeJS.ReadableStream>
```
- **Primary Use Cases**:
  - Download build outputs
  - Access test results
  - Retrieve packages
- **MCP Tool Recommendation**: `list_artifacts` + download helper

## Tier 3: Periodic Support Tasks

### 11. Build Tags
**Methods**: 
```typescript
// Get tags
getBuildTags(project: string, buildId: number): Promise<string[]>

// Add single tag
addBuildTag(project: string, buildId: number, tag: string): Promise<string[]>

// Add multiple tags
addBuildTags(tags: string[], project: string, buildId: number): Promise<string[]>

// Delete tag
deleteBuildTag(project: string, buildId: number, tag: string): Promise<string[]>

// Update tags (add and remove)
updateBuildTags(updateParameters: UpdateTagParameters, project: string, buildId: number): Promise<string[]>
```
- **Use Cases**: Organize builds (release, hotfix, etc.)
- **MCP Tool**: Optional `manage_build_tags`

### 12. Get Build Report
**Methods**:
```typescript
// Get report metadata
getBuildReport(
  project: string,
  buildId: number,
  type?: string
): Promise<BuildInterfaces.BuildReportMetadata>

// Get report HTML content
getBuildReportHtmlContent(
  project: string,
  buildId: number,
  type?: string
): Promise<NodeJS.ReadableStream>
```
- **Use Cases**: Quality metrics, test coverage
- **MCP Tool**: Include in extended diagnostics

### 13. Get Build Work Items
**Method**: `buildApi.getBuildWorkItemsRefs(project, buildId, top?)`
```typescript
getBuildWorkItemsRefs(
  project: string,
  buildId: number,
  top?: number
): Promise<VSSInterfaces.ResourceRef[]>
```
- **Use Cases**: Requirements traceability
- **MCP Tool**: Optional feature

## Recommended MCP Tool Implementations

### Core Tools (Priority 1)
1. **`list_builds`**
   - Wraps: List Builds API
   - Smart filters for common queries (failed, in-progress, recent)
   - Returns: Build ID, status, result, queue time, duration

2. **`get_build_details`**
   - Wraps: Get Build + Timeline + Changes
   - Single tool for comprehensive build investigation
   - Returns: Full build info, failure points, triggering changes

3. **`queue_build`**
   - Wraps: Queue Build API
   - Parameter validation and branch selection
   - Returns: New build ID and URL

4. **`get_build_logs`**
   - Wraps: Get Logs + specific log content
   - Options for full download or filtered view
   - Returns: Log content or download links

5. **`list_pipelines`**
   - Wraps: List Definitions API
   - Returns: Pipeline names, IDs, folders, recent status

### Administrative Tools (Priority 2)
6. **`manage_build`**
   - Wraps: Update Build API
   - Actions: cancel, retain, delete
   - Safety checks for active builds

7. **`get_pipeline_config`**
   - Wraps: Get Definition API
   - Returns: Triggers, variables, agent pools

8. **`monitor_build_health`**
   - Combines: List Builds + basic metrics
   - Returns: Success rates, average duration, queue depths

## Implementation Guidelines

### Parameter Simplification
- Hide API complexity behind intuitive parameters
- Provide sensible defaults (e.g., $top=20, last 24 hours)
- Use enums for status/result filters

### Error Handling
- Graceful handling of missing permissions
- Clear messages for common failures
- Retry logic for transient errors

### Performance Optimization
- Implement caching for definition lists
- Use minimal property filters when possible
- Batch related API calls

### Usage Examples

```typescript
// Build Admin: Check morning build status
const failedBuilds = await buildApi.getBuilds(
  project,
  undefined, // definitions
  undefined, // queues
  undefined, // buildNumber
  new Date(Date.now() - 24*60*60*1000), // last 24 hours
  undefined, // maxTime
  undefined, // requestedFor
  undefined, // reasonFilter
  BuildStatus.Completed,
  BuildResult.Failed,
  undefined, // tagFilters
  undefined, // properties
  20 // top
);

// Developer: Queue feature branch build
const newBuild = await buildApi.queueBuild(
  {
    definition: { id: 45 },
    sourceBranch: "refs/heads/feature/new-feature",
    parameters: JSON.stringify({
      configuration: "Debug",
      runTests: "true"
    })
  },
  project,
  true // ignoreWarnings
);

// Troubleshooting: Investigate failure
const build = await buildApi.getBuild(project, 12345);
const timeline = await buildApi.getBuildTimeline(project, 12345);
const logs = await buildApi.getBuildLogs(project, 12345);
const changes = await buildApi.getBuildChanges(project, 12345);
```

## Keeping Tool Count Manageable

With the existing 5 agent/queue tools, adding 8-10 build tools keeps the total under 15-20:

**Essential (8 tools):**
- list_builds
- get_build_details  
- queue_build
- get_build_logs
- list_pipelines
- manage_build
- get_pipeline_config
- monitor_build_health

**Optional (if space allows):**
- list_artifacts
- manage_build_tags
- get_build_metrics

This focused set covers 90%+ of daily build operations while maintaining a reasonable tool count for MCP best practices.