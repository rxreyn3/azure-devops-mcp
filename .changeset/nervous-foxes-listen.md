---
"@rxreyn3/azure-devops-mcp": minor
---

Add build_queue tool for launching builds programmatically

- Added new `build_queue` tool that allows MCP clients to queue/launch builds
- Supports configuring build parameters, source branch, build reason, agent demands, and specific queue targeting
- Added `queueBuild` method to BuildClient with proper demand parsing
- Updated documentation to clarify PAT requirements (needs both "Build (read & execute)" and "Agent Pools (read)" permissions)
- Added sessions folder to .gitignore