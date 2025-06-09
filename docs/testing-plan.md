# Azure DevOps MCP Tools Testing Plan

## Overview

This comprehensive testing plan covers all Azure DevOps MCP tools, organized into phases with clear dependencies and expected outcomes. The plan progresses from basic connectivity verification through complex workflows, testing both happy paths and error scenarios.

## Test Environment Setup

### Prerequisites
1. **Environment Variables**
   - `ADO_ORGANIZATION`: Valid Azure DevOps organization URL
   - `ADO_PROJECT`: Valid project name within the organization
   - `ADO_PAT`: Personal Access Token with appropriate scopes

### Required Permissions
- **Project-level**: Read access to project, builds, and pipelines
- **Organization-level** (optional): Reader access to agent pools (for agent management tools)

## Testing Phases

### 1. Phase 1: Connection and Health Verification

#### 1.1. Health Check
**Tool**: `ado_health_check`
**Purpose**: Verify basic connectivity and authentication
**Expected Outcomes**:
- Success: Returns organization name, project name, and available permissions
- Failure: Clear error message about missing credentials or invalid PAT

**Test Scenarios**:
```yaml
Happy Path:
  - Valid credentials configured
  - Expected: Success with org/project details

Error Scenarios:
  - Missing ADO_PAT
  - Invalid PAT (expired or wrong)
  - Non-existent project
  - Network connectivity issues
```

### 2. Phase 2: Agent and Queue Discovery

#### 2.1. List Project Queues
**Tool**: `list_project_queues`
**Purpose**: Discover available agent queues in the project
**Dependencies**: Successful health check
**Expected Outcomes**:
- List of queues with IDs, names, and pool information
- At minimum, should include "Default" queue

**Sample Data**:
```json
{
  "queues": [
    {
      "id": 1,
      "name": "Default",
      "poolName": "Azure Pipelines",
      "poolType": "hosted",
      "agentCount": 10
    },
    {
      "id": 2,
      "name": "Self-Hosted",
      "poolName": "Self-Hosted Pool",
      "poolType": "private",
      "agentCount": 5
    }
  ]
}
```

#### 2.2. Get Queue Details
**Tool**: `get_queue_details`
**Purpose**: Get detailed information about a specific queue
**Dependencies**: Queue ID from 2.1
**Test Variations**:
- By queue ID (numeric)
- By queue name (string)
- Special characters in queue name

**Error Scenarios**:
- Non-existent queue ID
- Invalid queue name

#### 2.3. Find Agent (Org-Level Permission Required)
**Tool**: `find_agent`
**Purpose**: Locate an agent across all pools
**Dependencies**: Organization-level permissions
**Test Scenarios**:
- Exact agent name match
- Partial name match
- Non-existent agent
- Permission denied (no org access)

#### 2.4. List Queue Agents (Org-Level Permission Required)
**Tool**: `list_queue_agents`
**Purpose**: List all agents in a specific queue
**Dependencies**: Queue ID from 2.1, org-level permissions
**Expected Data**:
```json
{
  "agents": [
    {
      "id": 101,
      "name": "agent-001",
      "status": "online",
      "enabled": true,
      "version": "3.225.0",
      "capabilities": {
        "os": "Linux",
        "architecture": "X64"
      }
    }
  ]
}
```

### 3. Phase 3: Pipeline Discovery and Configuration

#### 3.1. List Pipelines
**Tool**: `list_pipelines`
**Purpose**: Discover available build pipelines
**Test Variations**:
- No filters (list all)
- Filter by name (partial match)
- Filter by path
- Include latest build information

**Expected Outcomes**:
- List of pipeline definitions with IDs and names
- Optional: Latest build status for each pipeline

#### 3.2. Get Pipeline Configuration
**Tool**: `get_pipeline_config`
**Purpose**: Get detailed pipeline configuration
**Dependencies**: Pipeline ID from 3.1
**Test Options**:
- Include triggers
- Include variables
- Both triggers and variables

**Sample Configuration**:
```json
{
  "id": 10,
  "name": "CI Pipeline",
  "path": "\\Apps\\Web",
  "triggers": {
    "ci": {
      "branches": ["main", "develop"],
      "pathFilters": ["src/**", "tests/**"]
    }
  },
  "variables": {
    "BuildConfiguration": "Release",
    "NodeVersion": "18.x"
  }
}
```

### 4. Phase 4: Build Operations

#### 4.1. List Builds
**Tool**: `list_builds`
**Purpose**: Query recent builds with various filters
**Test Scenarios**:
1. **Time-based queries**:
   - Last 24 hours (default)
   - Last 7 days
   - Custom time range

2. **Status filters**:
   - All builds
   - In-progress only
   - Completed only
   - Failed builds

3. **Complex filters**:
   - By branch name
   - By requesting user
   - By pipeline/definition ID
   - Combination of filters

#### 4.2. Get Build Details
**Tool**: `get_build_details`
**Purpose**: Get comprehensive build information
**Dependencies**: Build ID from 4.1
**Test Options**:
- Basic details only
- Include timeline
- Include changes
- Both timeline and changes

**Expected Details**:
```json
{
  "id": 12345,
  "buildNumber": "20240109.1",
  "status": "completed",
  "result": "succeeded",
  "queueTime": "2024-01-09T10:00:00Z",
  "startTime": "2024-01-09T10:05:00Z",
  "finishTime": "2024-01-09T10:15:00Z",
  "sourceBranch": "refs/heads/main",
  "timeline": [...],
  "changes": [...]
}
```

#### 4.3. Queue Build
**Tool**: `queue_build`
**Purpose**: Trigger new builds programmatically
**Dependencies**: Pipeline ID from 3.1
**Test Scenarios**:
1. **Basic queue**:
   - Default branch
   - Default parameters

2. **Advanced queue**:
   - Specific branch
   - Custom parameters
   - Different priorities

**Error Scenarios**:
- Invalid pipeline ID
- Invalid branch name
- Missing required parameters

#### 4.4. Get Build Logs
**Tool**: `get_build_logs`
**Purpose**: Retrieve build logs for troubleshooting
**Dependencies**: Build ID from 4.1 or 4.3
**Test Variations**:
- All logs
- Specific log by ID
- Log range (start/end lines)

#### 4.5. Manage Build
**Tool**: `manage_build`
**Purpose**: Cancel, retain, or manage build lifecycle
**Dependencies**: Build ID from active builds
**Test Actions**:
- Cancel in-progress build
- Retain completed build
- Unretain previously retained build

**Error Scenarios**:
- Cancel already completed build
- Retain already retained build
- Invalid build ID

### 5. Phase 5: Monitoring and Health

#### 5.1. Monitor Build Health
**Tool**: `monitor_build_health`
**Purpose**: Get build health metrics and trends
**Test Scenarios**:
- All pipelines (last 24 hours)
- Specific pipeline health
- Custom time windows (7 days, 30 days)

**Expected Metrics**:
```json
{
  "totalBuilds": 150,
  "successRate": 85.3,
  "averageDuration": "10m 30s",
  "failureReasons": {
    "tests": 12,
    "compilation": 5,
    "timeout": 3
  },
  "topFailingPipelines": [...]
}
```

## 6. End-to-End Scenarios

### 6.1. Scenario: Investigate Build Failure
1. List recent failed builds
2. Get detailed information about a failed build
3. Retrieve logs for the failed stage
4. Check agent that ran the build
5. Verify queue health

### 6.2. Scenario: Queue and Monitor Build
1. List available pipelines
2. Get pipeline configuration
3. Queue a new build with parameters
4. Monitor build progress
5. Retrieve results and logs

### 6.3. Scenario: Agent Pool Management
1. List all project queues
2. Find specific agents
3. Check agent status and capabilities
4. Identify offline agents
5. Verify pool capacity

## 7. Error Handling Matrix

| Error Type | Expected Behavior | User Guidance |
|------------|------------------|---------------|
| 401 Unauthorized | Clear auth error | Check PAT validity |
| 403 Forbidden | Permission error | Verify required scopes |
| 404 Not Found | Resource not found | Validate IDs/names |
| 500 Server Error | Graceful failure | Retry with backoff |
| Network Timeout | Timeout message | Check connectivity |

## 8. Performance Considerations

### Response Time Expectations
- Health check: < 2 seconds
- List operations: < 5 seconds
- Detailed queries: < 10 seconds
- Build logs: Varies by size (streaming supported)

### Rate Limiting
- Monitor for 429 responses
- Implement exponential backoff
- Respect Azure DevOps API limits

## 9. Data Validation Checklist

### For Each Tool Response
- [ ] Correct data structure
- [ ] No missing required fields
- [ ] Proper date/time formatting
- [ ] Consistent ID types (numeric/string)
- [ ] Appropriate null handling
- [ ] Special character support

## 10. Progressive Testing Approach

### Day 1: Basic Connectivity
- Health check
- List queues
- List pipelines

### Day 2: Read Operations
- Get queue details
- List builds
- Get build details

### Day 3: Advanced Queries
- Complex build filters
- Pipeline configurations
- Build logs

### Day 4: Write Operations
- Queue builds
- Manage builds
- Parameter variations

### Day 5: Error Scenarios
- Permission errors
- Invalid inputs
- Network issues

### Day 6: End-to-End Workflows
- Complete scenarios
- Performance testing
- Edge cases

## Success Criteria

1. **Functional Coverage**: All tools tested with valid inputs
2. **Error Handling**: All error scenarios produce helpful messages
3. **Performance**: All operations complete within expected timeframes
4. **Reliability**: Consistent results across multiple test runs
5. **Usability**: Clear and actionable error messages
6. **Documentation**: All edge cases and limitations documented