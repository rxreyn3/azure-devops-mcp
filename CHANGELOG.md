# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New `get_work_item` tool to retrieve Azure DevOps work items by ID
- New `list_work_items` tool to query work items with filters
- Support for work item attachments and comments
- Enhanced error messages with more context and troubleshooting tips

### Changed
- Improved health check tool to validate more connection aspects
- Updated queue listing to include more detailed agent status information
- Streamlined GitHub workflows (removed redundant publish.yml and release-tag.yml)

### Fixed
- Fixed connection timeout issues in health check when Azure DevOps is slow
- Corrected agent count display in queue details
- Fixed TypeScript type definitions for queue responses

### Security
- Added input validation for work item IDs to prevent injection attacks

## [1.0.0] - 2025-01-06

### Added
- Initial release of Azure DevOps MCP Server
- Five core tools for Azure DevOps interaction:
  - `ado_health_check` - Connection verification
  - `list_project_queues` - List all project queues
  - `get_queue_details` - Get queue information
  - `find_agent` - Find agent location (requires org permissions)
  - `list_queue_agents` - List agents in queue (requires org permissions)
- Permission-aware error handling with graceful fallbacks
- Comprehensive test suite using Bun test runner
- Full TypeScript support with type definitions
- GitHub Actions CI/CD pipeline
- Documentation for setup and usage

### Security
- Secure PAT token handling
- Permission validation for organization-level operations

[1.0.0]: https://github.com/rxreyn3/azure-devops-mcp/releases/tag/v1.0.0