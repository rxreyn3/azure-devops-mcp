# CLAUDE.md

# ~/.claude/CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Azure DevOps Pools vs Queues

## Agent Pools:

- Organization-wide collections of agents
- Contain the actual build/release agents
- Shared across multiple projects
- Managed at organization/server level
- API endpoint: /distributedtask/pools
- **No project parameter required** - always org-scoped

## Agent Queues (Project Agent Pools):

- Project-specific references to agent pools
- Connect projects to organization agent pools
- Provide project-level access control
- One queue per pool per project
- API endpoint: /{project}/\_apis/distributedtask/queues
- **Project parameter always required** - except for poolIds lookup

## Key Relationships:

- One pool → many queues (across projects)
- One queue → one pool
- Each project needs its own queue to access a pool
- Queues enable project-level permissions on shared pools
- **Agents exist only in pools**, queues are just pointers
- **Queue IDs are different from Pool IDs** - when using list_queue_agents, use the queue's ID (not the pool's ID)

## API Behavior with Optional Project Parameter:

### Without Project (Organization Scope):
- Can list all pools and agents directly
- Full visibility across organization
- Requires organization-level permissions
- Use pool APIs exclusively

### With Project (Project Scope):
- Can only see pools that have queues in the project
- Limited to project-level permissions
- Must go through queue APIs first
- Cannot directly list agents without org permissions

## Permission Implications:
- **Pool access** = organization admin rights
- **Queue access** = project admin rights
- **Agent visibility** = requires pool access (org-level)
- Project users can see which pools are available but not agent details
