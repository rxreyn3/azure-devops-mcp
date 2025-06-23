# @rxreyn3/azure-devops-mcp

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
