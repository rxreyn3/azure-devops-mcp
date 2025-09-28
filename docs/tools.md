# Available Tools

## Project-Scoped Tools

These tools work with project-scoped PATs:

### `project_health_check`
Test connection and verify permissions.
- Validates Azure DevOps connection
- Checks PAT authentication
- Reports available permissions

### `project_list_queues` 
List all agent queues in the project.
- Shows queue names and IDs
- Displays queue capacity and agent counts

### `project_get_queue`
Get detailed information about a specific queue.
- Requires queue name or ID
- Shows agent details and current status

## Organization-Scoped Tools

These tools require organization-level PAT permissions:

### `org_find_agent`
Search for an agent across all organization pools.
- Search by agent name (partial match supported)
- Shows agent status and capabilities
- Displays which pool the agent belongs to

### `org_list_agents`
List agents from project pools with filtering options.
- Filter by status (online/offline)
- Filter by capabilities
- Pagination support for large results

## Build Tools

These tools work with project-scoped PATs:

### `build_list`
List builds with filtering and pagination support.
- **Permissions**: Build (read)
- **Filters**: Pipeline name, status, result, branch, date range
- **Date filtering**: Use minTime/maxTime (e.g., "2024-01-01", "2024-01-31T23:59:59Z")
- **Returns**: Build ID, number, status, timing, and branch information
- **Pagination**: Supports large result sets

### `build_list_definitions` 
List pipeline definitions to find IDs and names.
- **Permissions**: Build (read)
- **Filter**: By name (partial match)
- **Use case**: Discover pipeline IDs needed for other operations

### `build_get_timeline`
Get the timeline for a build showing all jobs, tasks, and executing agents.
- **Permissions**: Build (read)
- **Required**: Build ID (use `build_list` to find build IDs)
- **Shows**: Job execution details, task breakdowns, agent assignments

### `build_queue`
Queue (launch) a new build for a pipeline definition.
- **Permissions**: Build (read & execute) AND Agent Pools (read)
- **Required**: definitionId (use `build_list_definitions` to find)
- **Optional**: sourceBranch, parameters, reason, demands, queueId
- **Returns**: Queued build details including ID and status

### `build_download_job_logs`
Download logs for a specific job from a build by job name.
- **Permissions**: Build (read)
- **Required**: buildId, jobName (e.g., "GPU and System Diagnostics")
- **Optional**: outputPath (saves to temp directory if not provided)
- **Features**: Efficient streaming, smart filename generation
- **Returns**: File path, size, job details, and duration

### `build_download_logs_by_name`
Download logs for a stage, job, or task by searching for its name.
- **Permissions**: Build (read)
- **Required**: buildId, name (e.g., "Deploy", "Trigger Async Shift Upload")  
- **Optional**: outputPath, exactMatch (default: true)
- **Smart detection**: Automatically identifies if name is stage, job, or task
- **Organized output**: Creates directory structure for complex downloads
- **Returns**: Downloaded paths, sizes, matched records

### `build_list_artifacts`
List all artifacts available for a specific build.
- **Permissions**: Build (read)
- **Required**: buildId
- **Returns**: Artifact names, IDs, types, and download URLs

### `build_download_artifact`
Download a Pipeline artifact from a build using signed URLs.
- **Permissions**: Build (read)
- **Required**: buildId, artifactName (e.g., "RenderLogs")
- **Optional**: outputPath, definitionId (auto-fetched if not provided)
- **Supports**: Pipeline artifacts only (PublishPipelineArtifact task)
- **Format**: Downloads as ZIP files
- **Returns**: File path, size, artifact details

## File Management Tools

### `list_downloads`
List all files downloaded to the temporary directory.
- Shows logs and artifacts downloaded by this server
- Groups files by category and build ID
- Displays file sizes, download times, and age

### `cleanup_downloads`
Remove old downloaded files from the temporary directory.
- **Optional**: olderThanHours (default: 24)
- **Returns**: Number of files removed and space saved
- **Safety**: Reports any errors during cleanup

### `get_download_location`
Get information about the temporary directory.
- Shows temp directory path
- Reports total size and file count
- Information about oldest file

## Temporary File Management

When download tools are called without an `outputPath`, files are saved to a managed temporary directory:

- **Structure**: `/tmp/ado-mcp-server-{pid}/downloads/{category}/{buildId}/{filename}`
- **Automatic Cleanup**: Old temp directories cleaned on startup
- **Process Isolation**: Each server instance has its own temp directory
- **Persistence**: Files persist until manually cleaned or server restart