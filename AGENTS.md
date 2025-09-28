# AGENTS.md

This file provides guidance for AI agents working with the Azure DevOps MCP server codebase.

## Quick Reference for AI Agents

### Essential Commands
- `npm install` - Install dependencies (bun preferred but npm works)
- `npm run build` - Build TypeScript to dist/
- `npm run typecheck` - Type check without emitting files
- `npm test` - Run tests (if available)
- `npm run dev` - Development mode with watch

### Repository Overview
This is a **Model Context Protocol (MCP) server** that enables AI assistants to interact with Azure DevOps APIs. The server provides tools for managing agents, queues, builds, and downloading artifacts.

## For AI Agents: Understanding the Codebase

### Core Architecture
```
src/
├── index.ts              # Entry point - config validation & server startup
├── server.ts             # Main MCP server implementation
├── config.ts            # Environment configuration
├── tools/               # MCP tool definitions
│   ├── agent-tools.ts   # Agent & queue management tools
│   ├── build-tools.ts   # Build & artifact management tools  
│   └── index.ts         # Tool registration
├── clients/             # Azure DevOps API clients
├── types/               # TypeScript type definitions
└── utils/               # Shared utilities
```

### Key Concepts for AI Agents

#### 1. MCP (Model Context Protocol) Integration
- This server implements the MCP standard for AI tool integration
- Tools are registered with schemas and handled via the MCP SDK
- Each tool has input validation, execution logic, and error handling

#### 2. Tool Categories by Azure DevOps Scope
- **Project-scoped** (`project_*`) - Basic operations with project PATs
- **Organization-scoped** (`org_*`) - Agent management (requires org-level permissions)
- **Build operations** (`build_*`) - Build management, logs, and artifacts

#### 3. Authentication & Permissions
- Uses Azure DevOps Personal Access Tokens (PATs)
- Different tools require different permission levels
- PAT scope (project vs organization) affects available functionality

## For AI Agents: Common Tasks

### Adding New Tools
1. **Define the tool** in appropriate file (`src/tools/agent-tools.ts` or `src/tools/build-tools.ts`)
2. **Add schema validation** using Zod
3. **Implement execution logic** with proper error handling
4. **Export the tool** in `src/tools/index.ts`
5. **Update documentation** in README.md and CLAUDE.md

### Example Tool Structure
```typescript
export const myNewTool: McpTool = {
  name: "category_action_name",
  description: "Clear description of what the tool does",
  inputSchema: zodToJsonSchema(z.object({
    requiredParam: z.string().describe("Description"),
    optionalParam: z.string().optional().describe("Optional description")
  })),
  async handler(args) {
    // Input validation
    const input = myToolSchema.parse(args);
    
    // Business logic
    const client = new RelevantClient(config);
    const result = await client.performAction(input);
    
    // Return formatted response
    return formatToolResponse(result);
  }
};
```

### Working with Azure DevOps APIs
- **Extend AdoBaseClient** for new API integrations
- **Handle authentication** via WebApi from azure-devops-node-api
- **Use consistent error handling** patterns from existing clients
- **Follow naming conventions** matching Azure DevOps terminology

### Type Safety Guidelines
- **Define TypeScript types** for all API responses in `src/types/`
- **Use Zod schemas** for input validation on all tools
- **Maintain strict TypeScript** configuration
- **Export types** for external consumption when needed

## For AI Agents: Testing & Validation

### Before Submitting Changes
1. **Type checking**: `npm run typecheck`
2. **Build verification**: `npm run build`
3. **Test the tools** manually with a real Azure DevOps instance
4. **Check tool schemas** render correctly in MCP clients

### Common Validation Points
- Tool input schemas match implementation
- Error messages are user-friendly
- Azure DevOps API responses are properly typed
- Tool descriptions are clear and actionable

## For AI Agents: Understanding User Workflows

### Typical User Interactions
Users typically ask for:
- **Build status queries**: "Show me failed builds today"
- **Agent management**: "Is agent XYZ online?"
- **Build operations**: "Queue a build for pipeline ABC"
- **Log downloads**: "Get logs for build 12345"
- **Artifact downloads**: "Download artifacts from latest build"

### Response Format Guidelines
- **Be concise** but complete in tool responses
- **Include relevant IDs** (build IDs, agent IDs) for follow-up actions
- **Format data** in readable tables when appropriate
- **Handle pagination** for large result sets
- **Provide actionable error messages** with next steps

## For AI Agents: Azure DevOps API Quirks

### Parameter Handling
- Build API requires parameters as **JSON strings**, not objects
- All parameter values must be strings, even numbers: `"10"` not `10`
- Pipeline API (not yet implemented) would handle parameters differently

### Scope Requirements
- **Agents are organization-level** resources, not project-level
- Some tools need org-scoped PATs even if they seem project-related
- Build operations work with project-scoped PATs

### Common API Patterns
- List operations often support filtering and pagination
- Detail operations require specific IDs (build ID, agent ID, etc.)
- Some operations are async (builds) with status polling
- Error responses vary between different Azure DevOps APIs

## For AI Agents: Best Practices

### Code Organization
- Keep tools focused on single responsibilities
- Extract common logic into utility functions
- Maintain clear separation between API clients and tool handlers
- Use consistent error handling patterns

### User Experience
- Provide helpful tool descriptions
- Include examples in tool documentation
- Handle edge cases gracefully (missing builds, offline agents)
- Return structured data that's easy to parse and display

### Security Considerations
- Never log or return PAT tokens
- Validate all inputs thoroughly
- Handle authentication errors gracefully
- Follow principle of least privilege for PAT permissions

### Documentation
- Keep README.md updated with new tools
- Update CLAUDE.md with implementation details
- Include examples for complex tools
- Document any Azure DevOps API limitations or quirks

This guidance should help AI agents effectively work with and extend the Azure DevOps MCP server while maintaining code quality and user experience standards.