# @rxreyn3/azure-devops-mcp

## 1.7.0

### Minor Changes

- 157f08e: feat: implement Pipeline API for native parameter type support

  Replaced the Build API implementation with the newer Pipeline API for the `build_queue` tool. This change allows users to pass parameters with native JSON types (numbers, booleans, strings) instead of requiring all values to be strings.

  Key improvements:

  - Added new `PipelineClient` using the `/pipelines/{id}/runs` endpoint
  - Updated `build_queue` to accept native parameter types (string, number, boolean)
  - Parameters are now passed as `templateParameters` supporting proper type preservation
  - Removed Build API specific options (reason, demands, queueId) as they're not applicable to Pipeline API

  This resolves the issue where numeric parameters like `MaxScenesToRender: 10` were being ignored. Users can now pass parameters naturally without quoting numbers.
  EOF < /dev/null

## 1.6.0

### Minor Changes

- 8f9180d: Add Pipeline artifact download tools with improved UX

  Adds two new MCP tools for working with Azure DevOps build artifacts:

  - `build_list_artifacts` - Lists all artifacts for a build, showing names, types, and metadata
  - `build_download_artifact` - Downloads Pipeline artifacts as ZIP files using signed URLs

  The download tool now automatically fetches the definition ID if not provided, eliminating the need for users to manually look up definition IDs. This creates a more natural workflow where users can download artifacts with just a build ID.

  Also fixes a directory creation bug where paths like `./artifacts/` would fail to create the intended directory.

  Note: Only Pipeline artifacts (created with PublishPipelineArtifact task) are supported. Container artifacts will return an error.

## 1.5.0

### Minor Changes

- 8f3ae04: Add build_download_job_logs tool for downloading job-specific logs

  This tool enables users to download logs for specific jobs within a build by job name. For example:
  "please download the logs for GPU and System Diagnostics"

  Features:

  - Downloads logs for completed jobs by name
  - Streams log content to file for efficient memory usage
  - Smart filename generation with build ID, job name, and timestamp
  - Supports both directory and direct file path outputs
  - Validates job completion status before downloading
  - Returns detailed job information including duration and log ID

  Also enhanced the build_get_timeline tool to include log information (id, type, url) for both jobs and tasks.

- 8f3ae04: Add `build_queue` tool for programmatically launching Azure DevOps builds

  You can now queue builds directly from your MCP client without navigating to the Azure DevOps UI. The new `build_queue` tool supports all common build configuration options:

  - **Build parameters**: Pass custom parameters as key-value pairs (e.g., `{"maxScenes": "1"}`)
  - **Source branch**: Override the default branch (e.g., `"refs/heads/feature/my-branch"`)
  - **Build reason**: Specify why the build was triggered (Manual, IndividualCI, Schedule, etc.)
  - **Agent demands**: Target specific agent capabilities (e.g., `["Agent.OS -equals Windows_NT"]`)
  - **Queue selection**: Target a specific agent queue by ID

  **Important**: This tool requires your PAT to have both "Build (read & execute)" AND "Agent Pools (read)" permissions. The Agent Pools permission is necessary because Azure DevOps validates pool access when queuing builds.

  Example usage:

  ```
  Ask your AI: "Queue a build for pipeline 2848 with maxScenes set to 1"
  ```

### Patch Changes

- 8f3ae04: Add BuildReason enum mapping to convert numeric reason values to human-readable strings in build_list output
- 8f3ae04: Convert numeric state and result values to human-readable strings in build_list and build_get_timeline outputs

## 1.4.0

### Minor Changes

- 2928f7f: Add `build_queue` tool for programmatically launching Azure DevOps builds

  You can now queue builds directly from your MCP client without navigating to the Azure DevOps UI. The new `build_queue` tool supports all common build configuration options:

  - **Build parameters**: Pass custom parameters as key-value pairs (e.g., `{"maxScenes": "1"}`)
  - **Source branch**: Override the default branch (e.g., `"refs/heads/feature/my-branch"`)
  - **Build reason**: Specify why the build was triggered (Manual, IndividualCI, Schedule, etc.)
  - **Agent demands**: Target specific agent capabilities (e.g., `["Agent.OS -equals Windows_NT"]`)
  - **Queue selection**: Target a specific agent queue by ID

  **Important**: This tool requires your PAT to have both "Build (read & execute)" AND "Agent Pools (read)" permissions. The Agent Pools permission is necessary because Azure DevOps validates pool access when queuing builds.

  Example usage:

  ```
  Ask your AI: "Queue a build for pipeline 2848 with maxScenes set to 1"
  ```

### Patch Changes

- 2928f7f: Add BuildReason enum mapping to convert numeric reason values to human-readable strings in build_list output
- 2928f7f: Convert numeric state and result values to human-readable strings in build_list and build_get_timeline outputs

## 1.3.3

### Patch Changes

- ed9626c: Add BuildReason enum mapping to convert numeric reason values to human-readable strings in build_list output
- ed9626c: Convert numeric state and result values to human-readable strings in build_list and build_get_timeline outputs

## 1.3.2

### Patch Changes

- cad71e7: Removed list resources and list prompt handlers.

## 1.3.1

### Patch Changes

- 0306d9b: Updated readme with sensitive key best practices.

## 1.3.0

### Minor Changes

- 6db197f: Added date filtering for listing builds.

## 1.2.2

### Patch Changes

- 4dd1687: Updated docs to show using latest for mcp server.

## 1.2.1

### Patch Changes

- b91dcd0: Added and updated docs.

## 1.2.0

### Minor Changes

- 3f80b36: Simplified some of the tooling as it was too much for clients to sort out. Reduced it down to agents and builds for now.
