# Usage Examples

## Getting Started

Test your connection first:
```
"Can you check my Azure DevOps connection?"
```

## Build Management

### Finding Builds
```
"List all builds that failed today"
"Show me the last 5 builds for the preflight pipeline"
"Which builds are currently running?"
"Show me builds from January 2024"
"List failed builds between 2024-01-15 and 2024-01-20"
```

### Build Information
```
"Get details about build 12345"
"Find which agent ran build 12345"
"Show me the timeline for build 12345"
```

### Queueing Builds
```
"Queue a build for pipeline X with parameter Y=Z"
"Launch the nightly build with custom branch refs/heads/feature/test"
"Start a build for pipeline 'MyApp-CI' with branch 'main'"
```

## Agent Management

### Finding Agents
```
"Check if agent BM40-BUILD-01 is online"
"Find all agents in the Windows pool"
"Show me offline agents"
"List agents with GPU capabilities"
```

### Queue Information  
```
"Show me all available build queues in the project"
"Get details about the Windows queue"
"How many agents are in the Linux pool?"
```

## Log Management

### Downloading Logs
```
"Download the logs for GPU and System Diagnostics from build 5782897"
"Save the job logs for 'Test 3: With Render Optimizations' to ./logs/"
"Get logs for the Deploy stage from build 12345"
"Download task logs for 'Trigger Async Shift Upload' from build 98765"
```

### Managing Downloaded Files
```
"List all downloaded files"
"Clean up old log files"
"Where are the temporary files stored?"
```

## Artifact Management

### Finding Artifacts
```
"What artifacts are available for build 5782897?"
"List all artifacts from the latest successful build"
```

### Downloading Artifacts
```
"Download the RenderLogs artifact from build 5782897"
"Save the TestResults artifact to my downloads folder"
```

## Advanced Queries

### Date-Based Filtering
```
"Show me all failed builds from last week"
"List builds that completed between 9 AM and 5 PM today"
"Find builds from the main branch in the last 30 days"
```

### Pipeline-Specific Queries
```
"Get the build history for the nightly pipeline"
"Show me all successful builds for MyApp-Release pipeline"
"Find the most recent build for each active pipeline"
```

### Status Monitoring
```
"Are there any builds stuck in queue?"
"Show me which agents are busy right now"
"List all builds that have been running for more than 2 hours"
```

## Common Workflows

### Build Investigation
1. Find recent failed builds: `"Show me failed builds from today"`
2. Get build details: `"Show me the timeline for build 12345"`
3. Download relevant logs: `"Download logs for the failed job from build 12345"`
4. Check agent status: `"Is the agent that ran build 12345 still online?"`

### Release Preparation
1. Check pipeline status: `"Show me the latest builds for the release pipeline"`
2. Verify artifacts: `"What artifacts are available from the latest successful build?"`
3. Download for testing: `"Download the release artifacts from build 98765"`

### Agent Troubleshooting  
1. Find agent issues: `"List all offline agents"`
2. Check agent history: `"Show me builds that ran on agent AGENT-01 today"`
3. Queue availability: `"How many agents are available in the Windows pool?"`

## Tips

- Use natural language - the AI assistant understands context
- Build IDs are needed for many operations - use `build_list` to find them
- Pipeline names support partial matching - "MyApp" will find "MyApp-CI" and "MyApp-Release"
- Date filters are flexible - try "today", "last week", "January 2024", or specific dates like "2024-01-15"
- When downloading files, you can specify a path or let them go to the temp directory