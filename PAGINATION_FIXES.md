# Pagination Fixes for Azure DevOps MCP Server

## Summary

This document describes the fixes implemented for two pagination issues in the Azure DevOps MCP Server:

1. **org_list_agents** - Limit parameter was being ignored
2. **build_list_definitions** - Pagination/continuation tokens were not working

## Issues Identified

### 1. org_list_agents Limit Parameter Ignored

**Problem**: The `org_list_agents` tool accepted a `limit` parameter but always returned all 250+ agents regardless of the requested limit.

**Root Cause**: The underlying `getAgents` method in `TaskAgentClient` didn't implement any pagination logic.

### 2. build_list_definitions Pagination Not Working

**Problem**: The `build_list_definitions` tool wasn't returning continuation tokens, making it impossible to paginate through large result sets.

**Root Cause**: The Azure DevOps Node.js SDK doesn't properly expose continuation tokens from the API response, even though the underlying REST API supports them.

## Solutions Implemented

### Fix 1: Client-Side Pagination for org_list_agents

**Changes Made**:
1. Updated `ListAgentsOptions` interface to include `limit` and `continuationToken` parameters
2. Created new `PagedAgentsResult` interface to return paginated results
3. Modified `getAgents` method to implement client-side pagination using array slicing
4. Updated the MCP tool to handle the new response format

**Implementation Details**:
- The continuation token is used as an offset (converted to integer)
- Results are sliced based on the offset and limit
- `hasMore` flag indicates if additional pages are available

### Fix 2: Client-Side Pagination for build_list_definitions

**Changes Made**:
1. Modified `getDefinitions` method to implement client-side pagination
2. Fetch one extra item beyond the requested limit to determine if more results exist
3. Use continuation token as an offset for array slicing
4. Create a PagedList-compatible response with proper continuation token

**Implementation Details**:
- Works around SDK limitation by fetching more results than requested
- Continuation token represents the offset for the next page
- Maintains compatibility with existing PagedList interface

## Limitations & Future Improvements

1. **Performance**: Client-side pagination requires fetching more data than needed from the API
2. **SDK Limitation**: The Azure DevOps Node.js SDK should ideally expose continuation tokens properly
3. **Future Enhancement**: Consider implementing server-side pagination when/if the SDK is updated

## Usage Examples

### org_list_agents with Pagination
```typescript
// Get first 10 agents
const page1 = await agentClient.getAgents({ limit: 10 });

// Get next 10 agents
if (page1.data.hasMore) {
    const page2 = await agentClient.getAgents({ 
        limit: 10, 
        continuationToken: page1.data.continuationToken 
    });
}
```

### build_list_definitions with Pagination
```typescript
// Get first 5 definitions
const page1 = await buildClient.getDefinitions({ top: 5 });

// Get next 5 definitions
if (page1.data.continuationToken) {
    const page2 = await buildClient.getDefinitions({ 
        top: 5, 
        continuationToken: page1.data.continuationToken 
    });
}
```