---
'@rxreyn3/azure-devops-mcp': minor
---

Add build_download_job_logs tool for downloading job-specific logs

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
