---
"@rxreyn3/azure-devops-mcp": minor
---

Add `build_queue` tool for programmatically launching Azure DevOps builds

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