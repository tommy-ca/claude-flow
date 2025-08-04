/**
 * Test Coverage Analysis and Reporting
 * 
 * Provides comprehensive test coverage analysis for the HiveMind testing framework
 * 
 * @version 1.0.0
 * @author Claude Flow TestingEnforcer Agent
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { TestResult, TestSpecification } from '../../src/maestro-hive/test-specifications.js';

// ===== COVERAGE ANALYSIS TYPES =====

export interface CoverageReport {
  summary: CoverageSummary;
  byCategory: Record<string, CoverageSummary>;
  byPriority: Record<string, CoverageSummary>;
  uncoveredAreas: string[];
  recommendations: string[];
  timestamp: string;
}

export interface CoverageSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorTests: number;
  skippedTests: number;
  successRate: number;
  avgDuration: number;
  codePathsCovered: number;
  totalCodePaths: number;
  coveragePercentage: number;
}

// ===== COVERAGE ANALYZER CLASS =====

export class TestCoverageAnalyzer {
  private results: TestResult[] = [];
  private specifications: TestSpecification[] = [];
  private sourceFiles: string[] = [];

  constructor(results: TestResult[], specifications: TestSpecification[]) {
    this.results = results;
    this.specifications = specifications;
    this.discoverSourceFiles();
  }

  /**
   * Generate comprehensive coverage report
   */
  generateReport(): CoverageReport {
    const summary = this.calculateSummary(this.results);
    const byCategory = this.calculateCoverageByCategory();
    const byPriority = this.calculateCoverageByPriority();
    const uncoveredAreas = this.identifyUncoveredAreas();
    const recommendations = this.generateRecommendations();

    return {
      summary,
      byCategory,
      byPriority,
      uncoveredAreas,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall coverage summary
   */
  private calculateSummary(results: TestResult[]): CoverageSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const errorTests = results.filter(r => r.status === 'error').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;
    
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const avgDuration = totalTests > 0 ? 
      results.reduce((sum, r) => sum + r.duration, 0) / totalTests : 0;

    // Estimate code coverage based on test results and specifications
    const codePathsCovered = this.estimateCodePathsCovered(results);
    const totalCodePaths = this.estimateTotalCodePaths();
    const coveragePercentage = totalCodePaths > 0 ? 
      (codePathsCovered / totalCodePaths) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      errorTests,
      skippedTests,
      successRate,
      avgDuration,
      codePathsCovered,
      totalCodePaths,
      coveragePercentage
    };
  }

  /**
   * Calculate coverage by test category
   */
  private calculateCoverageByCategory(): Record<string, CoverageSummary> {
    const categories: Record<string, TestResult[]> = {};
    
    for (const result of this.results) {
      const spec = this.specifications.find(s => s.id === result.testId);
      if (spec) {
        const category = spec.category;
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(result);
      }
    }

    const coverageByCategory: Record<string, CoverageSummary> = {};
    for (const [category, results] of Object.entries(categories)) {
      coverageByCategory[category] = this.calculateSummary(results);
    }

    return coverageByCategory;
  }

  /**
   * Calculate coverage by test priority
   */
  private calculateCoverageByPriority(): Record<string, CoverageSummary> {
    const priorities: Record<string, TestResult[]> = {};
    
    for (const result of this.results) {
      const spec = this.specifications.find(s => s.id === result.testId);
      if (spec) {
        const priority = spec.priority;
        if (!priorities[priority]) {
          priorities[priority] = [];
        }
        priorities[priority].push(result);
      }
    }

    const coverageByPriority: Record<string, CoverageSummary> = {};
    for (const [priority, results] of Object.entries(priorities)) {
      coverageByPriority[priority] = this.calculateSummary(results);
    }

    return coverageByPriority;
  }

  /**
   * Identify areas not covered by tests
   */
  private identifyUncoveredAreas(): string[] {
    const uncovered: string[] = [];
    
    // Check for missing test categories
    const testedCategories = new Set(
      this.specifications
        .filter(spec => this.results.some(r => r.testId === spec.id))
        .map(spec => spec.category)
    );
    
    const allCategories = ['unit', 'integration', 'e2e', 'performance', 'security', 'recovery', 'mock_fallback'];
    for (const category of allCategories) {
      if (!testedCategories.has(category)) {
        uncovered.push(`Missing ${category} tests`);
      }
    }

    // Check for missing critical functionality tests
    const criticalAreas = [
      'Error handling and recovery',
      'Performance under load',
      'Security validation',
      'Data consistency',
      'Service availability',
      'Resource cleanup'
    ];

    for (const area of criticalAreas) {
      const hasTest = this.specifications.some(spec => 
        spec.description.toLowerCase().includes(area.toLowerCase()) ||
        spec.name.toLowerCase().includes(area.toLowerCase())
      );
      
      if (!hasTest) {
        uncovered.push(`Missing tests for: ${area}`);
      }
    }

    return uncovered;
  }

  /**
   * Generate coverage improvement recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.calculateSummary(this.results);

    // Success rate recommendations
    if (summary.successRate < 90) {
      recommendations.push(`Improve test success rate from ${summary.successRate.toFixed(1)}% to >90%`);
    }

    // Coverage recommendations
    if (summary.coveragePercentage < 80) {
      recommendations.push(`Increase code coverage from ${summary.coveragePercentage.toFixed(1)}% to >80%`);
    }

    // Performance recommendations
    if (summary.avgDuration > 30000) {
      recommendations.push(`Optimize test performance - average duration is ${(summary.avgDuration/1000).toFixed(1)}s`);
    }

    // Category balance recommendations
    const byCategory = this.calculateCoverageByCategory();
    const categoryDistribution = Object.keys(byCategory).length;
    if (categoryDistribution < 4) {
      recommendations.push('Add more test categories for comprehensive coverage');
    }

    // Priority balance recommendations
    const byPriority = this.calculateCoverageByPriority();
    const hasCritical = 'critical' in byPriority;
    const hasHigh = 'high' in byPriority;
    
    if (!hasCritical) {
      recommendations.push('Add critical priority tests for essential functionality');
    }
    if (!hasHigh) {
      recommendations.push('Add high priority tests for important features');
    }

    // Error handling recommendations
    const errorRate = (summary.errorTests / summary.totalTests) * 100;
    if (errorRate > 5) {
      recommendations.push(`Reduce test error rate from ${errorRate.toFixed(1)}% to <5%`);
    }

    return recommendations;
  }

  /**
   * Estimate code paths covered by tests
   */
  private estimateCodePathsCovered(results: TestResult[]): number {
    // Simple heuristic: count unique test scenarios
    const uniqueScenarios = new Set();
    
    for (const result of results) {
      const spec = this.specifications.find(s => s.id === result.testId);
      if (spec && result.status === 'passed') {
        // Count assertions as code paths
        uniqueScenarios.add(spec.id);
        for (const assertion of spec.assertions) {
          uniqueScenarios.add(`${spec.id}-${assertion.id}`);
        }
      }
    }
    
    return uniqueScenarios.size;
  }

  /**
   * Estimate total code paths that should be tested
   */
  private estimateTotalCodePaths(): number {
    // Simple heuristic: count all possible test scenarios
    let totalPaths = 0;
    
    for (const spec of this.specifications) {
      totalPaths += 1; // Base test path
      totalPaths += spec.assertions.length; // Assertion paths
      
      // Add complexity factors
      if (spec.successCriteria) {
        totalPaths += Object.keys(spec.successCriteria).length;
      }
      if (spec.mockConfig) {
        totalPaths += 2; // Mock enabled/disabled paths
      }
    }
    
    return totalPaths;
  }

  /**
   * Discover source files for coverage analysis
   */
  private discoverSourceFiles(): void {
    const basePaths = [
      'src/maestro-hive',
      'src/hive-mind',
      'src/cli',
      'src/swarm'
    ];

    this.sourceFiles = [];
    
    for (const basePath of basePaths) {
      try {
        // This is a simplified discovery - in practice you'd use fs.readdirSync recursively
        this.sourceFiles.push(`${basePath}/**/*.ts`, `${basePath}/**/*.js`);
      } catch (error) {
        // Path doesn't exist or not accessible
      }
    }
  }

  /**
   * Export coverage report to file
   */
  exportToFile(filePath: string, format: 'json' | 'html' | 'markdown' = 'json'): void {
    const report = this.generateReport();
    
    switch (format) {
      case 'json':
        writeFileSync(filePath, JSON.stringify(report, null, 2));
        break;
      case 'html':
        this.exportToHTML(filePath, report);
        break;
      case 'markdown':
        this.exportToMarkdown(filePath, report);
        break;
    }
  }

  /**
   * Export to HTML format
   */
  private exportToHTML(filePath: string, report: CoverageReport): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
        .uncovered { background: #ffebee; padding: 15px; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Test Coverage Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Overall Summary</h2>
        <div class="metric">Total Tests: ${report.summary.totalTests}</div>
        <div class="metric">Success Rate: ${report.summary.successRate.toFixed(1)}%</div>
        <div class="metric">Coverage: ${report.summary.coveragePercentage.toFixed(1)}%</div>
        <div class="metric">Avg Duration: ${(report.summary.avgDuration/1000).toFixed(1)}s</div>
    </div>

    <h2>Coverage by Category</h2>
    <table>
        <tr><th>Category</th><th>Tests</th><th>Success Rate</th><th>Coverage</th></tr>
        ${Object.entries(report.byCategory).map(([cat, summary]) => 
          `<tr><td>${cat}</td><td>${summary.totalTests}</td><td>${summary.successRate.toFixed(1)}%</td><td>${summary.coveragePercentage.toFixed(1)}%</td></tr>`
        ).join('')}
    </table>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="uncovered">
        <h2>Uncovered Areas</h2>
        <ul>
            ${report.uncoveredAreas.map(area => `<li>${area}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
    
    writeFileSync(filePath, html);
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(filePath: string, report: CoverageReport): void {
    const markdown = `# Test Coverage Report

Generated: ${report.timestamp}

## Overall Summary

- **Total Tests**: ${report.summary.totalTests}
- **Success Rate**: ${report.summary.successRate.toFixed(1)}%
- **Code Coverage**: ${report.summary.coveragePercentage.toFixed(1)}%
- **Average Duration**: ${(report.summary.avgDuration/1000).toFixed(1)}s

## Coverage by Category

| Category | Tests | Success Rate | Coverage |
|----------|-------|--------------|----------|
${Object.entries(report.byCategory).map(([cat, summary]) => 
  `| ${cat} | ${summary.totalTests} | ${summary.successRate.toFixed(1)}% | ${summary.coveragePercentage.toFixed(1)}% |`
).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Uncovered Areas

${report.uncoveredAreas.map(area => `- ${area}`).join('\n')}
`;
    
    writeFileSync(filePath, markdown);
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Generate coverage report from test results
 */
export function generateCoverageReport(
  results: TestResult[], 
  specifications: TestSpecification[]
): CoverageReport {
  const analyzer = new TestCoverageAnalyzer(results, specifications);
  return analyzer.generateReport();
}

/**
 * Export coverage report to multiple formats
 */
export function exportCoverageReport(
  report: CoverageReport,
  basePath: string = './test-coverage'
): void {
  const analyzer = new TestCoverageAnalyzer([], []);
  
  // Export in multiple formats
  writeFileSync(`${basePath}.json`, JSON.stringify(report, null, 2));
  
  try {
    analyzer['exportToHTML'](`${basePath}.html`, report);
    analyzer['exportToMarkdown'](`${basePath}.md`, report);
  } catch (error) {
    console.warn('Failed to export additional formats:', error);
  }
}