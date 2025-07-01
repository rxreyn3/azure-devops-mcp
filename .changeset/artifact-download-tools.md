---
'@rxreyn3/azure-devops-mcp': minor
---

Add Pipeline artifact download tools with enhanced UX and bug fixes

This release adds artifact download functionality using the modern Pipeline API with several improvements:

**New Features:**
- **`build_list_artifacts`**: List all artifacts available for a specific build
  - Shows artifact names, types, and metadata
  - Displays both Pipeline and Container artifact types
  
- **`build_download_artifact`**: Download Pipeline artifacts using signed URLs
  - Only supports Pipeline artifacts (created with PublishPipelineArtifact task)
  - Uses temporary signed URLs for secure downloads
  - Downloads artifacts as ZIP files to local filesystem

**Improvements:**
- **Auto-fetch definition ID**: The `definitionId` parameter is now optional - it will be automatically fetched if not provided
- **Natural workflow**: Users can download artifacts with just a build ID
- **Fixed directory creation**: Paths like `./artifacts/` now properly create the directory instead of using current directory

**Bug Fixes:**
- Fixed directory creation logic in both `downloadArtifact` and `downloadJobLogByName` methods
- Fixed artifact type detection (Pipeline artifacts report as "PipelineArtifact" not "Container")

**Example usage:**
- "What artifacts are available for build 5783734?"
- "Download the RenderLogs artifact from build 5783734" (no definition ID needed!)

Requires "Build (read)" permission on the PAT.