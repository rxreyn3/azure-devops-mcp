# Build Tools Implementation

This document describes the build tools that have been implemented for the Azure DevOps MCP server.

## Implemented Tools

### 1. list_builds
Lists builds with smart filtering for common queries.

**Parameters:**
- `status`: Filter by build status (all, inProgress, completed, notStarted)
- `result`: Filter by build result (all, succeeded, failed, canceled, partiallySucceeded)
- `top`: Maximum number of builds to return (default: 20)
- `definitionId`: Filter by specific pipeline/definition ID
- `requestedFor`: Filter by user who requested the build
- `sinceHours`: Filter builds from the last N hours (default: 24)
- `branchName`: Filter by source branch name

**Features:**
- Returns build summary with counts by status
- Defaults to last 24 hours of builds
- Smart result formatting with essential build information

### 2. get_build_details
Get comprehensive build details including timeline and changes.

**Parameters:**
- `buildId`: The build ID to get details for (required)
- `includeTimeline`: Include build timeline showing stages and tasks (default: true)
- `includeChanges`: Include source changes that triggered the build (default: true)

**Features:**
- Returns complete build information
- Timeline shows hierarchical view of stages and tasks
- Includes failure analysis with error/warning counts
- Shows triggering commits and changes

### 3. queue_build
Queue a new build with optional parameters.

**Parameters:**
- `definitionId`: Pipeline/definition ID to queue (required)
- `sourceBranch`: Branch to build (e.g., refs/heads/main)
- `parameters`: Build parameters as key-value pairs
- `priority`: Build priority (low, belowNormal, normal, aboveNormal, high)
- `reason`: Reason for the build (manual, individualCI, etc.)

**Features:**
- Supports custom build parameters
- Returns build ID and direct URL to view the build
- Handles priority and reason mapping

### 4. get_build_logs
Get build logs for troubleshooting.

**Parameters:**
- `buildId`: The build ID to get logs for (required)
- `logId`: Specific log ID to retrieve (optional)
- `startLine`: Starting line number (for specific log)
- `endLine`: Ending line number (for specific log)

**Features:**
- Lists all available logs when no logId specified
- Retrieves specific log content with line numbers
- Supports partial log retrieval with line ranges

### 5. manage_build
Cancel, retain, or retry builds.

**Parameters:**
- `buildId`: The build ID to manage (required)
- `action`: Action to perform (cancel, retain, unretain)

**Features:**
- Cancel running builds
- Mark builds for retention (keep forever)
- Remove retention from builds
- Returns updated build status

## Architecture

The implementation follows a modular architecture:

1. **BuildClient** (`src/clients/build-client.ts`): Handles all Azure DevOps Build API interactions
2. **Build Tools** (`src/tools/build-tools.ts`): Defines MCP tool interfaces and handlers
3. **Server Integration** (`src/server.ts`): Registers tools with the MCP server

## Usage Examples

```bash
# List recent failed builds
{
  "tool": "list_builds",
  "arguments": {
    "status": "completed",
    "result": "failed",
    "sinceHours": 48
  }
}

# Get detailed information about a specific build
{
  "tool": "get_build_details",
  "arguments": {
    "buildId": 12345,
    "includeTimeline": true,
    "includeChanges": true
  }
}

# Queue a new build
{
  "tool": "queue_build",
  "arguments": {
    "definitionId": 45,
    "sourceBranch": "refs/heads/feature/new-feature",
    "parameters": {
      "configuration": "Debug",
      "runTests": "true"
    }
  }
}

# Get logs for a failed build
{
  "tool": "get_build_logs",
  "arguments": {
    "buildId": 12345
  }
}

# Cancel a running build
{
  "tool": "manage_build",
  "arguments": {
    "buildId": 12345,
    "action": "cancel"
  }
}
```

## Future Enhancements

Additional tools that could be implemented based on the priorities document:
- `list_pipelines`: Discover available pipelines
- `get_pipeline_config`: View pipeline configuration
- `monitor_build_health`: Get build metrics and health status
- `list_artifacts`: List and download build artifacts