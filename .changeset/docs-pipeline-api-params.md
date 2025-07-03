---
"@rxreyn3/azure-devops-mcp": minor
---

feat: implement Pipeline API for native parameter type support

Replaced the Build API implementation with the newer Pipeline API for the `build_queue` tool. This change allows users to pass parameters with native JSON types (numbers, booleans, strings) instead of requiring all values to be strings.

Key improvements:
- Added new `PipelineClient` using the `/pipelines/{id}/runs` endpoint
- Updated `build_queue` to accept native parameter types (string, number, boolean)
- Parameters are now passed as `templateParameters` supporting proper type preservation
- Removed Build API specific options (reason, demands, queueId) as they're not applicable to Pipeline API

This resolves the issue where numeric parameters like `MaxScenesToRender: 10` were being ignored. Users can now pass parameters naturally without quoting numbers.
EOF < /dev/null