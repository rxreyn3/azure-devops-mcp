# Changelog

## 1.1.0

### Minor Changes

- 0e066c1: Successfully implemented a new list_agents tool with partial name matching and fixed empty failureReasons arrays in build
- 4d1fbc3: Implemented pipeline definition caching so that it's easier to discover pipelines based on partial names.

### Patch Changes

- ddaebc6: Added better error handling and type checking.

## 1.0.2

### Patch Changes

- e45449b: Testing changeset workflow.
- 6a899fb: Updating repo to use changesets.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 8 new build-related MCP tools for comprehensive build management:
  - `list_builds` - List builds with smart filtering (by status, result, branch, user, time range)
  - `get_build_details` - Get comprehensive build information including timeline and changes
  - `queue_build` - Queue new builds with parameters and priority settings
  - `get_build_logs` - Retrieve build logs for troubleshooting
  - `manage_build` - Cancel, retain, or unretain builds
  - `list_pipelines` - List available build pipelines/definitions
  - `get_pipeline_config` - View pipeline configuration including triggers and variables
  - `monitor_build_health` - Get build health metrics and overview
- Modular architecture with domain-specific clients:
  - `BuildClient` for build operations
  - `TaskAgentClient` for agent/queue operations
  - Centralized type definitions in `src/types/`
  - Shared utilities in `src/utils/`
- Comprehensive API priorities documentation
- Tool registry pattern for clean separation of concerns

### Changed

- Refactored monolithic `server.ts` into modular architecture
- Split `ado-client.ts` into specialized `BuildClient` and `TaskAgentClient`
- Improved error handling with specific error types
- Enhanced type safety throughout the codebase
- Updated documentation with tool selection philosophy

### Fixed

- Build status enum case mismatch causing `monitor_build_health` to report 0 for all build counts
- TypeScript compilation errors related to API response types
- ESLint warnings for explicit `any` types (replaced with proper types)
- Improved type definitions for Azure DevOps API responses

### Security

## [1.0.1] - 2025-06-09

### Added

- CODEOWNERS file for mandatory code review requirements
- Comprehensive workflow documentation in `.github/workflows/README.md`
- Timeout protections for GitHub Actions jobs and steps
- NPM caching for faster builds
- Enhanced error handling with fail-fast behavior (`set -e`)

### Changed

- Streamlined GitHub workflows from 4 to 2 (removed redundant `publish.yml` and `release-tag.yml`)
- Upgraded GitHub Actions to SHA-pinned versions for enhanced security
- Improved release workflow with robust CHANGELOG.md automation
- Enhanced release process with better error handling and validation
- Reduced GitHub Actions permissions to minimum required (`contents: write` only)
- Updated release workflow to use maintained `softprops/action-gh-release@v1`

### Fixed

- Deprecated GitHub Actions (`actions/create-release@v1` removed)
- File existence checks before attempting version updates
- Race conditions in git commit operations during releases
- Fragile bash commands with proper error handling and validation

### Security

- Pinned GitHub Actions to specific SHA hashes to prevent supply chain attacks
- Reduced workflow permissions to minimum required scope
- Added mandatory code review requirements via CODEOWNERS
- Enhanced input validation and error handling in release scripts

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
