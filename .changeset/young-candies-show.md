---
'@rxreyn3/azure-devops-mcp': patch
---

Fix temp manager test failures and improve test reliability

- Fixed 15 failing temp manager tests by switching from mocked to integration testing approach
- Corrected import paths in test setup files (removed incorrect .js extensions)
- Improved test isolation with proper cleanup in afterEach hooks
- Tests now use real file system operations for more reliable and maintainable testing
- All 540 tests now pass with 100% success rate
