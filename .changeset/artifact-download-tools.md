---
'@rxreyn3/azure-devops-mcp': minor
---

Add build artifact download tools for retrieving published build artifacts

This adds two new MCP tools for working with Azure DevOps build artifacts:

- **`build_list_artifacts`**: List all artifacts available for a specific build
  - Shows artifact names, types, and download URLs
  - Useful for discovering what artifacts are available

- **`build_download_artifact`**: Download a specific artifact by name
  - Downloads artifacts as ZIP files to local filesystem
  - Supports both file and directory output paths
  - Uses streaming for efficient memory usage with large artifacts

Example usage:
- "What artifacts are available for build 5782897?"
- "Download the RenderLogs artifact from build 5782897"

Requires "Build (read)" permission on the PAT.