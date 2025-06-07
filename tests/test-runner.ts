#!/usr/bin/env bun
// Test runner script that provides a summary of test results

import { $, Glob } from 'bun';

console.log('🧪 Running Azure DevOps MCP Server Tests\n');

// Run basic functionality tests
console.log('📋 Running basic functionality tests...');
const basicResult = await $`bun test tests/unit/basic-functionality.test.ts`.quiet();
console.log(basicResult.exitCode === 0 ? '✅ Basic tests passed' : '❌ Basic tests failed');

// Run config tests
console.log('\n📋 Running configuration tests...');
const configResult = await $`bun test tests/unit/config.test.ts`.quiet();
console.log(configResult.exitCode === 0 ? '✅ Config tests passed' : '❌ Config tests failed');

// Count total test files
const glob = new Glob("tests/**/*.test.ts");
const testFiles = Array.from(glob.scanSync("."));
console.log(`\n📊 Total test files: ${testFiles.length}`);

// Run all tests with coverage
console.log('\n📈 Running all tests with coverage...\n');
await $`bun test --coverage`;

console.log('\n✨ Test run complete!');