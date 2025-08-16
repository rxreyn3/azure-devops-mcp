#!/usr/bin/env node

/**
 * Test Performance Monitor
 * 
 * This script analyzes test execution performance and generates reports
 * for CI/CD pipeline monitoring and optimization.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PERFORMANCE_THRESHOLDS = {
  totalSuite: 5 * 60 * 1000, // 5 minutes
  unitTests: 2 * 60 * 1000,  // 2 minutes
  integrationTests: 3 * 60 * 1000, // 3 minutes
  individualTest: 10 * 1000, // 10 seconds
};

const SLOW_TEST_THRESHOLD = 1000; // 1 second

class TestPerformanceMonitor {
  constructor() {
    this.results = null;
    this.performanceData = {
      timestamp: new Date().toISOString(),
      summary: {},
      slowTests: [],
      recommendations: [],
      trends: {}
    };
  }

  /**
   * Load test results from JSON file
   */
  loadTestResults(filePath = './test-results.json') {
    if (!existsSync(filePath)) {
      console.error(`Test results file not found: ${filePath}`);
      process.exit(1);
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      this.results = JSON.parse(content);
      console.log(`✅ Loaded test results from ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to parse test results: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Analyze test execution performance
   */
  analyzePerformance() {
    if (!this.results) {
      console.error('❌ No test results loaded');
      return;
    }

    console.log('📊 Analyzing test performance...');

    // Calculate summary metrics
    this.calculateSummaryMetrics();
    
    // Identify slow tests
    this.identifySlowTests();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Check against thresholds
    this.checkThresholds();

    console.log('✅ Performance analysis complete');
  }

  /**
   * Calculate summary performance metrics
   */
  calculateSummaryMetrics() {
    const { testResults } = this.results;
    
    let totalDuration = 0;
    let unitTestDuration = 0;
    let integrationTestDuration = 0;
    let testCount = 0;

    testResults.forEach(suite => {
      // Calculate suite duration from individual test durations
      let suiteDuration = 0;
      if (suite.assertionResults) {
        suite.assertionResults.forEach(test => {
          const testDuration = test.duration || 0;
          suiteDuration += testDuration;
          testCount++;
        });
      }
      
      totalDuration += suiteDuration;

      // Categorize by test type based on file path
      if (suite.name && suite.name.includes('/unit/')) {
        unitTestDuration += suiteDuration;
      } else if (suite.name && suite.name.includes('/integration/')) {
        integrationTestDuration += suiteDuration;
      }
    });

    this.performanceData.summary = {
      totalDuration,
      unitTestDuration,
      integrationTestDuration,
      testCount,
      averageTestDuration: testCount > 0 ? totalDuration / testCount : 0,
      testsPerSecond: totalDuration > 0 ? testCount / (totalDuration / 1000) : 0
    };
  }

  /**
   * Identify slow-running tests
   */
  identifySlowTests() {
    const slowTests = [];

    this.results.testResults.forEach(suite => {
      if (suite.assertionResults) {
        suite.assertionResults.forEach(test => {
          const duration = test.duration || 0;
          if (duration > SLOW_TEST_THRESHOLD) {
            slowTests.push({
              name: test.title,
              suite: suite.name.replace(/^.*\//, ''), // Extract just the filename
              duration,
              status: test.status,
              fullName: test.fullName
            });
          }
        });
      }
    });

    // Sort by duration (slowest first)
    this.performanceData.slowTests = slowTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest tests
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const { summary, slowTests } = this.performanceData;
    const recommendations = [];

    // Check total duration
    if (summary.totalDuration > PERFORMANCE_THRESHOLDS.totalSuite) {
      recommendations.push({
        type: 'warning',
        category: 'total_duration',
        message: `Total test suite duration (${this.formatDuration(summary.totalDuration)}) exceeds recommended threshold (${this.formatDuration(PERFORMANCE_THRESHOLDS.totalSuite)})`,
        suggestion: 'Consider parallelizing tests or optimizing slow test cases'
      });
    }

    // Check unit test duration
    if (summary.unitTestDuration > PERFORMANCE_THRESHOLDS.unitTests) {
      recommendations.push({
        type: 'warning',
        category: 'unit_duration',
        message: `Unit test duration (${this.formatDuration(summary.unitTestDuration)}) exceeds recommended threshold`,
        suggestion: 'Review unit test efficiency and mock usage'
      });
    }

    // Check integration test duration
    if (summary.integrationTestDuration > PERFORMANCE_THRESHOLDS.integrationTests) {
      recommendations.push({
        type: 'warning',
        category: 'integration_duration',
        message: `Integration test duration (${this.formatDuration(summary.integrationTestDuration)}) exceeds recommended threshold`,
        suggestion: 'Consider optimizing API calls and test setup/teardown'
      });
    }

    // Check for slow tests
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'slow_tests',
        message: `Found ${slowTests.length} slow-running tests`,
        suggestion: 'Review and optimize the slowest test cases for better performance'
      });
    }

    // Performance ratio analysis
    const unitRatio = summary.unitTestDuration / summary.totalDuration;
    const integrationRatio = summary.integrationTestDuration / summary.totalDuration;

    if (integrationRatio > 0.7) {
      recommendations.push({
        type: 'info',
        category: 'test_balance',
        message: 'Integration tests account for >70% of total test time',
        suggestion: 'Consider adding more unit tests to improve test pyramid balance'
      });
    }

    this.performanceData.recommendations = recommendations;
  }

  /**
   * Check performance against thresholds
   */
  checkThresholds() {
    const { summary } = this.performanceData;
    const thresholdChecks = {
      totalSuite: summary.totalDuration <= PERFORMANCE_THRESHOLDS.totalSuite,
      unitTests: summary.unitTestDuration <= PERFORMANCE_THRESHOLDS.unitTests,
      integrationTests: summary.integrationTestDuration <= PERFORMANCE_THRESHOLDS.integrationTests,
    };

    this.performanceData.thresholdChecks = thresholdChecks;

    // Log threshold results
    console.log('\n🎯 Performance Threshold Checks:');
    Object.entries(thresholdChecks).forEach(([key, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${passed ? 'PASS' : 'FAIL'}`);
    });
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n📈 Test Performance Report');
    console.log('=' .repeat(50));

    const { summary, slowTests, recommendations } = this.performanceData;

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total Duration: ${this.formatDuration(summary.totalDuration)}`);
    console.log(`  Unit Tests: ${this.formatDuration(summary.unitTestDuration)}`);
    console.log(`  Integration Tests: ${this.formatDuration(summary.integrationTestDuration)}`);
    console.log(`  Total Tests: ${summary.testCount}`);
    console.log(`  Average Test Duration: ${this.formatDuration(summary.averageTestDuration)}`);
    console.log(`  Tests per Second: ${summary.testsPerSecond.toFixed(2)}`);

    // Slow tests
    if (slowTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      slowTests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name} (${this.formatDuration(test.duration)})`);
        console.log(`     Suite: ${test.suite}`);
      });
    }

    // Recommendations
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${rec.message}`);
        console.log(`     Suggestion: ${rec.suggestion}`);
      });
    }
  }

  /**
   * Save performance data to file
   */
  saveReport(filePath = './test-performance.json') {
    try {
      writeFileSync(filePath, JSON.stringify(this.performanceData, null, 2));
      console.log(`\n💾 Performance report saved to ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to save performance report: ${error.message}`);
    }
  }

  /**
   * Format duration in milliseconds to human-readable format
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Load historical performance data for trend analysis
   */
  loadHistoricalData(filePath = './test-performance-history.json') {
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ Failed to load historical data: ${error.message}`);
      return [];
    }
  }

  /**
   * Save performance data to history
   */
  saveToHistory(filePath = './test-performance-history.json') {
    const history = this.loadHistoricalData(filePath);
    
    // Add current data to history
    history.push({
      timestamp: this.performanceData.timestamp,
      summary: this.performanceData.summary,
      thresholdChecks: this.performanceData.thresholdChecks
    });

    // Keep only last 30 entries
    const recentHistory = history.slice(-30);

    try {
      writeFileSync(filePath, JSON.stringify(recentHistory, null, 2));
      console.log(`📈 Performance data added to history (${recentHistory.length} entries)`);
    } catch (error) {
      console.error(`❌ Failed to save performance history: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const monitor = new TestPerformanceMonitor();
  
  // Load test results
  const resultsFile = process.argv[2] || './test-results.json';
  monitor.loadTestResults(resultsFile);
  
  // Analyze performance
  monitor.analyzePerformance();
  
  // Generate and display report
  monitor.generateReport();
  
  // Save reports
  monitor.saveReport();
  monitor.saveToHistory();
  
  // Exit with appropriate code
  const hasWarnings = monitor.performanceData.recommendations.some(r => r.type === 'warning');
  const thresholdsPassed = Object.values(monitor.performanceData.thresholdChecks).every(Boolean);
  
  if (!thresholdsPassed) {
    console.log('\n❌ Performance thresholds not met');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️ Performance warnings detected');
    process.exit(0);
  } else {
    console.log('\n✅ All performance checks passed');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  });
}

export { TestPerformanceMonitor };