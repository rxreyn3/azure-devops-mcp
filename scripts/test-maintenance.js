#!/usr/bin/env node

/**
 * Test Maintenance Script
 * 
 * This script provides automated maintenance tasks for the test suite:
 * - Coverage trend analysis
 * - Performance monitoring
 * - Mock validation
 * - Cleanup verification
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// Simple color utilities
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

class TestMaintenanceRunner {
  constructor() {
    this.results = {
      coverage: null,
      performance: null,
      mocks: null,
      cleanup: null
    };
  }

  /**
   * Run all maintenance checks
   */
  async runAll() {
    console.log(colors.blue('🔧 Running test maintenance checks...\n'));

    try {
      await this.checkCoverage();
      await this.checkPerformance();
      await this.checkMocks();
      await this.checkCleanup();
      
      this.generateReport();
    } catch (error) {
      console.error(colors.red('❌ Maintenance check failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Check coverage trends and thresholds
   */
  async checkCoverage() {
    console.log(colors.blue('📊 Checking coverage...'));

    try {
      // Run coverage if not already available
      if (!existsSync('coverage/coverage-final.json')) {
        console.log(colors.gray('  Running coverage analysis...'));
        execSync('npm run test:coverage', { stdio: 'pipe' });
      }

      const coverageData = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'));
      
      // Calculate totals from individual file coverage
      let totalStatements = 0, coveredStatements = 0;
      let totalBranches = 0, coveredBranches = 0;
      let totalFunctions = 0, coveredFunctions = 0;
      let totalLines = 0, coveredLines = 0;

      Object.values(coverageData).forEach(file => {
        if (file.s) {
          const statements = Object.values(file.s);
          totalStatements += statements.length;
          coveredStatements += statements.filter(count => count > 0).length;
        }
        if (file.b) {
          const branches = Object.values(file.b).flat();
          totalBranches += branches.length;
          coveredBranches += branches.filter(count => count > 0).length;
        }
        if (file.f) {
          const functions = Object.values(file.f);
          totalFunctions += functions.length;
          coveredFunctions += functions.filter(count => count > 0).length;
        }
        // Lines are same as statements in this format
        totalLines = totalStatements;
        coveredLines = coveredStatements;
      });

      const summary = {
        statements: { pct: totalStatements > 0 ? (coveredStatements / totalStatements * 100) : 0 },
        branches: { pct: totalBranches > 0 ? (coveredBranches / totalBranches * 100) : 0 },
        functions: { pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100) : 0 },
        lines: { pct: totalLines > 0 ? (coveredLines / totalLines * 100) : 0 }
      };

      this.results.coverage = {
        branches: summary.branches.pct,
        functions: summary.functions.pct,
        lines: summary.lines.pct,
        statements: summary.statements.pct,
        status: 'pass'
      };

      // Check thresholds
      const thresholds = { branches: 80, functions: 80, lines: 80, statements: 80 };
      const failures = [];

      Object.keys(thresholds).forEach(metric => {
        if (summary[metric].pct < thresholds[metric]) {
          failures.push(`${metric}: ${summary[metric].pct}% < ${thresholds[metric]}%`);
        }
      });

      if (failures.length > 0) {
        this.results.coverage.status = 'fail';
        this.results.coverage.failures = failures;
        console.log(colors.red('  ❌ Coverage below thresholds:'));
        failures.forEach(failure => console.log(colors.red(`    ${failure}`)));
      } else {
        console.log(colors.green('  ✅ Coverage meets all thresholds'));
      }

      // Update coverage history
      this.updateCoverageHistory(this.results.coverage);

    } catch (error) {
      this.results.coverage = { status: 'error', error: error.message };
      console.log(colors.red('  ❌ Coverage check failed:'), error.message);
    }
  }

  /**
   * Check test performance
   */
  async checkPerformance() {
    console.log(colors.blue('⚡ Checking performance...'));

    try {
      // Run performance test
      console.log(colors.gray('  Running performance analysis...'));
      execSync('npm run test:performance', { stdio: 'pipe' });

      if (existsSync('test-results.json')) {
        const testResults = JSON.parse(readFileSync('test-results.json', 'utf8'));
        
        this.results.performance = {
          totalTime: testResults.duration || 0,
          testCount: testResults.numTotalTests || 0,
          avgTimePerTest: testResults.numTotalTests ? 
            Math.round(testResults.duration / testResults.numTotalTests) : 0,
          status: 'pass'
        };

        // Check performance thresholds
        const maxTotalTime = 120000; // 2 minutes
        const maxAvgTime = 1000; // 1 second per test

        if (this.results.performance.totalTime > maxTotalTime) {
          this.results.performance.status = 'warn';
          this.results.performance.warning = `Total time ${this.results.performance.totalTime}ms exceeds ${maxTotalTime}ms`;
          console.log(colors.yellow(`  ⚠️  ${this.results.performance.warning}`));
        } else if (this.results.performance.avgTimePerTest > maxAvgTime) {
          this.results.performance.status = 'warn';
          this.results.performance.warning = `Average time ${this.results.performance.avgTimePerTest}ms exceeds ${maxAvgTime}ms`;
          console.log(colors.yellow(`  ⚠️  ${this.results.performance.warning}`));
        } else {
          console.log(colors.green('  ✅ Performance within acceptable limits'));
        }

        // Update performance history
        this.updatePerformanceHistory(this.results.performance);

      } else {
        throw new Error('No test results file found');
      }

    } catch (error) {
      this.results.performance = { status: 'error', error: error.message };
      console.log(colors.red('  ❌ Performance check failed:'), error.message);
    }
  }

  /**
   * Check mock data validity
   */
  async checkMocks() {
    console.log(colors.blue('🎭 Checking mock data...'));

    try {
      // Basic mock structure validation
      const mockFactoryPath = 'tests/helpers/mock-factory.ts';
      const fixturesPath = 'tests/fixtures';

      if (!existsSync(mockFactoryPath)) {
        throw new Error('Mock factory not found');
      }

      if (!existsSync(fixturesPath)) {
        throw new Error('Fixtures directory not found');
      }

      // Run mock validation tests if they exist
      try {
        execSync('npm run test -- tests/fixtures/fixtures.test.ts', { stdio: 'pipe' });
        this.results.mocks = { status: 'pass' };
        console.log(colors.green('  ✅ Mock data validation passed'));
      } catch (error) {
        this.results.mocks = { status: 'warn', warning: 'Mock validation tests not found or failed' };
        console.log(colors.yellow('  ⚠️  Mock validation tests not found or failed'));
      }

    } catch (error) {
      this.results.mocks = { status: 'error', error: error.message };
      console.log(colors.red('  ❌ Mock check failed:'), error.message);
    }
  }

  /**
   * Check test cleanup
   */
  async checkCleanup() {
    console.log(colors.blue('🧹 Checking test cleanup...'));

    try {
      // Run cleanup tests if they exist
      const cleanupTestPath = 'tests/utils/test-cleanup-system.test.ts';
      
      if (existsSync(cleanupTestPath)) {
        execSync(`npm run test -- ${cleanupTestPath}`, { stdio: 'pipe' });
        this.results.cleanup = { status: 'pass' };
        console.log(colors.green('  ✅ Cleanup system working correctly'));
      } else {
        this.results.cleanup = { status: 'warn', warning: 'Cleanup tests not found' };
        console.log(colors.yellow('  ⚠️  Cleanup tests not found'));
      }

      // Check for leftover temp files
      const tempDirs = ['tmp', 'artifacts/test-auto-fetch', 'test-temp'];
      let tempFilesFound = false;

      tempDirs.forEach(dir => {
        if (existsSync(dir)) {
          try {
            const files = execSync(`find ${dir} -type f 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim();
            if (files) {
              tempFilesFound = true;
              console.log(colors.yellow(`  ⚠️  Temp files found in ${dir}`));
            }
          } catch (error) {
            // Ignore errors from find command
          }
        }
      });

      if (tempFilesFound && this.results.cleanup.status === 'pass') {
        this.results.cleanup.status = 'warn';
        this.results.cleanup.warning = 'Temporary files found after tests';
      }

    } catch (error) {
      this.results.cleanup = { status: 'error', error: error.message };
      console.log(colors.red('  ❌ Cleanup check failed:'), error.message);
    }
  }

  /**
   * Update coverage history
   */
  updateCoverageHistory(coverageData) {
    try {
      let history = [];
      const historyFile = 'coverage/coverage-history.json';

      if (existsSync(historyFile)) {
        history = JSON.parse(readFileSync(historyFile, 'utf8'));
      }

      history.push({
        timestamp: new Date().toISOString(),
        ...coverageData
      });

      // Keep only last 30 entries
      if (history.length > 30) {
        history = history.slice(-30);
      }

      writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.log(colors.yellow('  ⚠️  Could not update coverage history:'), error.message);
    }
  }

  /**
   * Update performance history
   */
  updatePerformanceHistory(performanceData) {
    try {
      let history = [];
      const historyFile = 'test-performance-history.json';

      if (existsSync(historyFile)) {
        history = JSON.parse(readFileSync(historyFile, 'utf8'));
      }

      history.push({
        timestamp: new Date().toISOString(),
        ...performanceData
      });

      // Keep only last 30 entries
      if (history.length > 30) {
        history = history.slice(-30);
      }

      writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.log(colors.yellow('  ⚠️  Could not update performance history:'), error.message);
    }
  }

  /**
   * Generate maintenance report
   */
  generateReport() {
    console.log('\n' + colors.blue('📋 Maintenance Report'));
    console.log(colors.blue('='.repeat(50)));

    // Coverage Report
    if (this.results.coverage) {
      console.log(colors.blue('\n📊 Coverage:'));
      if (this.results.coverage.status === 'pass') {
        console.log(colors.green('  ✅ Status: PASS'));
        console.log(`  Lines: ${this.results.coverage.lines}%`);
        console.log(`  Functions: ${this.results.coverage.functions}%`);
        console.log(`  Branches: ${this.results.coverage.branches}%`);
        console.log(`  Statements: ${this.results.coverage.statements}%`);
      } else if (this.results.coverage.status === 'fail') {
        console.log(colors.red('  ❌ Status: FAIL'));
        this.results.coverage.failures?.forEach(failure => {
          console.log(colors.red(`    ${failure}`));
        });
      } else {
        console.log(colors.red('  ❌ Status: ERROR'));
        console.log(colors.red(`    ${this.results.coverage.error}`));
      }
    }

    // Performance Report
    if (this.results.performance) {
      console.log(colors.blue('\n⚡ Performance:'));
      if (this.results.performance.status === 'pass') {
        console.log(colors.green('  ✅ Status: PASS'));
      } else if (this.results.performance.status === 'warn') {
        console.log(colors.yellow('  ⚠️  Status: WARNING'));
        console.log(colors.yellow(`    ${this.results.performance.warning}`));
      } else {
        console.log(colors.red('  ❌ Status: ERROR'));
        console.log(colors.red(`    ${this.results.performance.error}`));
      }

      if (this.results.performance.totalTime !== undefined) {
        console.log(`  Total Time: ${this.results.performance.totalTime}ms`);
        console.log(`  Test Count: ${this.results.performance.testCount}`);
        console.log(`  Avg per Test: ${this.results.performance.avgTimePerTest}ms`);
      }
    }

    // Mock Report
    if (this.results.mocks) {
      console.log(colors.blue('\n🎭 Mocks:'));
      if (this.results.mocks.status === 'pass') {
        console.log(colors.green('  ✅ Status: PASS'));
      } else if (this.results.mocks.status === 'warn') {
        console.log(colors.yellow('  ⚠️  Status: WARNING'));
        console.log(colors.yellow(`    ${this.results.mocks.warning}`));
      } else {
        console.log(colors.red('  ❌ Status: ERROR'));
        console.log(colors.red(`    ${this.results.mocks.error}`));
      }
    }

    // Cleanup Report
    if (this.results.cleanup) {
      console.log(colors.blue('\n🧹 Cleanup:'));
      if (this.results.cleanup.status === 'pass') {
        console.log(colors.green('  ✅ Status: PASS'));
      } else if (this.results.cleanup.status === 'warn') {
        console.log(colors.yellow('  ⚠️  Status: WARNING'));
        console.log(colors.yellow(`    ${this.results.cleanup.warning}`));
      } else {
        console.log(colors.red('  ❌ Status: ERROR'));
        console.log(colors.red(`    ${this.results.cleanup.error}`));
      }
    }

    // Overall Status
    const hasErrors = Object.values(this.results).some(result => result?.status === 'error');
    const hasWarnings = Object.values(this.results).some(result => result?.status === 'warn');

    console.log(colors.blue('\n🎯 Overall Status:'));
    if (hasErrors) {
      console.log(colors.red('  ❌ ERRORS FOUND - Immediate attention required'));
    } else if (hasWarnings) {
      console.log(colors.yellow('  ⚠️  WARNINGS FOUND - Review recommended'));
    } else {
      console.log(colors.green('  ✅ ALL CHECKS PASSED'));
    }

    console.log('\n' + colors.gray('Run individual checks with:'));
    console.log(colors.gray('  npm run test:coverage'));
    console.log(colors.gray('  npm run test:performance'));
    console.log(colors.gray('  npm run test:cleanup'));
    console.log('');
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    coverage: args.includes('--coverage'),
    performance: args.includes('--performance'),
    mocks: args.includes('--mocks'),
    cleanup: args.includes('--cleanup'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(colors.blue('Test Maintenance Script'));
  console.log('');
  console.log('Usage: npm run test:maintenance [options]');
  console.log('');
  console.log('Options:');
  console.log('  --coverage     Check coverage only');
  console.log('  --performance  Check performance only');
  console.log('  --mocks        Check mocks only');
  console.log('  --cleanup      Check cleanup only');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Without options, runs all maintenance checks.');
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const runner = new TestMaintenanceRunner();
  
  // Run specific checks if requested
  if (options.coverage || options.performance || options.mocks || options.cleanup) {
    if (options.coverage) await runner.checkCoverage();
    if (options.performance) await runner.checkPerformance();
    if (options.mocks) await runner.checkMocks();
    if (options.cleanup) await runner.checkCleanup();
    runner.generateReport();
  } else {
    // Run all checks
    await runner.runAll();
  }
}

// Handle module loading
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(colors.red('❌ Maintenance script failed:'), error);
    process.exit(1);
  });
}

export { TestMaintenanceRunner };