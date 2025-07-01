---
'@rxreyn3/azure-devops-mcp': minor
---

Add Pipeline artifact download tools with improved UX

Adds two new MCP tools for working with Azure DevOps build artifacts:

- `build_list_artifacts` - Lists all artifacts for a build, showing names, types, and metadata
- `build_download_artifact` - Downloads Pipeline artifacts as ZIP files using signed URLs

The download tool now automatically fetches the definition ID if not provided, eliminating the need for users to manually look up definition IDs. This creates a more natural workflow where users can download artifacts with just a build ID.

Also fixes a directory creation bug where paths like `./artifacts/` would fail to create the intended directory.

Note: Only Pipeline artifacts (created with PublishPipelineArtifact task) are supported. Container artifacts will return an error.