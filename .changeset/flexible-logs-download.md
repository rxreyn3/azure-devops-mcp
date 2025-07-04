---
"@rxreyn3/azure-devops-mcp": minor
---

Add flexible log download by name tool

Adds `build_download_logs_by_name` tool that searches for and downloads logs by name regardless of timeline record type. This eliminates the need to know whether "Deploy" or "Trigger Async Shift Upload" is a stage, job, or task.

The tool automatically handles stages by downloading all child job logs into organized subdirectories, supports partial name matching, and provides clear feedback when multiple matches are found.