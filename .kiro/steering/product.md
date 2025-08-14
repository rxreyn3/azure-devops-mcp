# Product Overview

Azure DevOps MCP Server is a Model Context Protocol (MCP) server that provides AI assistants with tools to interact with Azure DevOps services. The server focuses on agent and queue management, build operations, and pipeline interactions.

## Core Functionality

- **Agent Management**: Find and list Azure DevOps build agents across organization pools
- **Queue Operations**: List and inspect agent queues within projects
- **Build Management**: List, queue, and inspect builds with detailed timeline information
- **Pipeline Operations**: List pipeline definitions and manage build executions
- **Log Management**: Download and manage build logs and artifacts with automatic cleanup
- **File Management**: Temporary file handling for downloaded artifacts and logs

## Target Users

- DevOps engineers managing Azure DevOps infrastructure
- AI assistants helping with build troubleshooting and monitoring
- Teams needing programmatic access to Azure DevOps build data

## Key Features

- Project and organization-scoped operations based on PAT permissions
- Comprehensive error handling and validation
- Automatic temporary file management
- Support for multiple MCP clients (Claude Desktop, Windsurf, Claude Code)
- Secure credential handling with environment variable support