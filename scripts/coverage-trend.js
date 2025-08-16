#!/usr/bin/env node

/**
 * Coverage Trend Analysis Script
 * 
 * Analyzes coverage trends over time and provides insights
 */

import { readFileSync, existsSync } from 'fs';

// Simple color utilities
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

function analyzeCoverageTrend() {
  const historyFile = 'coverage/coverage-history.json';
  
  if (!existsSync(historyFile)) {
    console.log(colors.yellow('⚠️  No coverage history found. Run tests with coverage first.'));
    return;
  }

  try {
    const history = JSON.parse(readFileSync(historyFile, 'utf8'));
    
    if (history.length < 2) {
      console.log(colors.yellow('⚠️  Not enough coverage history for trend analysis.'));
      return;
    }

    console.log(colors.blue('📈 Coverage Trend Analysis'));
    console.log(colors.blue('='.repeat(40)));

    // Get recent entries
    const recent = history.slice(-10); // Last 10 entries
    const latest = recent[recent.length - 1];
    const previous = recent[recent.length - 2];

    // Calculate trends
    const trends = {
      lines: latest.lines - previous.lines,
      functions: latest.functions - previous.functions,
      branches: latest.branches - previous.branches,
      statements: latest.statements - previous.statements
    };

    console.log(colors.blue('\n📊 Current Coverage:'));
    console.log(`  Lines: ${latest.lines}%`);
    console.log(`  Functions: ${latest.functions}%`);
    console.log(`  Branches: ${latest.branches}%`);
    console.log(`  Statements: ${latest.statements}%`);

    console.log(colors.blue('\n📈 Recent Changes:'));
    Object.keys(trends).forEach(metric => {
      const change = trends[metric];
      const symbol = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
      const color = change > 0 ? colors.green : change < 0 ? colors.red : colors.gray;
      const sign = change > 0 ? '+' : '';
      
      console.log(`  ${symbol} ${metric}: ${color(sign + change.toFixed(1) + '%')}`);
    });

    // Calculate averages over time
    if (recent.length >= 5) {
      console.log(colors.blue('\n📊 5-Entry Average:'));
      const last5 = recent.slice(-5);
      const averages = {
        lines: last5.reduce((sum, entry) => sum + entry.lines, 0) / last5.length,
        functions: last5.reduce((sum, entry) => sum + entry.functions, 0) / last5.length,
        branches: last5.reduce((sum, entry) => sum + entry.branches, 0) / last5.length,
        statements: last5.reduce((sum, entry) => sum + entry.statements, 0) / last5.length
      };

      Object.keys(averages).forEach(metric => {
        console.log(`  ${metric}: ${averages[metric].toFixed(1)}%`);
      });
    }

    // Identify concerning trends
    console.log(colors.blue('\n🔍 Trend Analysis:'));
    let hasIssues = false;

    Object.keys(trends).forEach(metric => {
      const change = trends[metric];
      if (change < -2) {
        console.log(colors.red(`  ⚠️  ${metric} dropped significantly (${change.toFixed(1)}%)`));
        hasIssues = true;
      } else if (change < -1) {
        console.log(colors.yellow(`  ⚠️  ${metric} decreased (${change.toFixed(1)}%)`));
        hasIssues = true;
      } else if (change > 2) {
        console.log(colors.green(`  ✅ ${metric} improved significantly (+${change.toFixed(1)}%)`));
      }
    });

    if (!hasIssues) {
      console.log(colors.green('  ✅ No concerning trends detected'));
    }

    // Check against thresholds
    console.log(colors.blue('\n🎯 Threshold Status:'));
    const thresholds = { lines: 80, functions: 80, branches: 80, statements: 80 };
    let belowThreshold = false;

    Object.keys(thresholds).forEach(metric => {
      const current = latest[metric];
      const threshold = thresholds[metric];
      const status = current >= threshold ? '✅' : '❌';
      const color = current >= threshold ? colors.green : colors.red;
      
      console.log(`  ${status} ${metric}: ${color(current + '%')} (threshold: ${threshold}%)`);
      
      if (current < threshold) {
        belowThreshold = true;
      }
    });

    // Recommendations
    console.log(colors.blue('\n💡 Recommendations:'));
    if (belowThreshold) {
      console.log(colors.yellow('  • Add tests to improve coverage below thresholds'));
    }
    
    if (trends.lines < -1 || trends.functions < -1) {
      console.log(colors.yellow('  • Review recent changes that may have reduced coverage'));
    }
    
    if (Object.values(trends).every(t => t >= 0)) {
      console.log(colors.green('  • Coverage is stable or improving - good work!'));
    }

    console.log(colors.gray('\n📅 Coverage tracked since: ' + new Date(history[0].timestamp).toLocaleDateString()));
    console.log(colors.gray('📊 Total entries: ' + history.length));

  } catch (error) {
    console.error(colors.red('❌ Failed to analyze coverage trend:'), error.message);
    process.exit(1);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCoverageTrend();
}