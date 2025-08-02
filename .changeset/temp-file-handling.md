---
"@rxreyn3/azure-devops-mcp": minor
---

feat: add temporary file management for downloads

Implements intelligent temporary file handling for log and artifact downloads. When no output path is specified, files are now saved to a managed temporary directory with automatic cleanup.

- Download tools (`build_download_job_logs`, `build_download_logs_by_name`, `build_download_artifact`) now have optional `outputPath` parameters
- Files default to structured temp directory: `/tmp/ado-mcp-server-{pid}/downloads/{category}/{buildId}/`
- New file management tools: `list_downloads`, `cleanup_downloads`, `get_download_location`
- Automatic cleanup of old temp directories on server startup
- Process exit handlers ensure temp directory cleanup
- Enhanced download results include `isTemporary` and `downloadedAt` fields

This prevents workspace pollution and improves the AI model experience by providing predictable file locations.