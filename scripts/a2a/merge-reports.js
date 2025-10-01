#!/usr/bin/env node

/**
 * A2A Compliance Report Merger
 *
 * Merges multiple A2A compliance reports into a single comprehensive report
 * with HTML visualization.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  input: 'reports/a2a',
  output: 'reports/compliance-full.json',
  html: 'reports/compliance-full.html'
};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  options[key] = args[i + 1];
}

// Ensure output directory exists
const outputDir = path.dirname(options.output);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Find all report files
function findReports(dir) {
  const reports = [];

  if (!fs.existsSync(dir)) {
    console.error(`Input directory not found: ${dir}`);
    return reports;
  }

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scan(filePath);
      } else if (file.endsWith('.json') && file.includes('compliance')) {
        reports.push(filePath);
      }
    });
  }

  scan(dir);
  return reports;
}

// Merge reports
function mergeReports(reportFiles) {
  const merged = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    summary: {
      total_tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    level1: null,
    level2: null,
    level3: null,
    level4: null,
    interop: []
  };

  reportFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const report = JSON.parse(content);

      // Merge level reports
      if (report.level) {
        const levelKey = `level${report.level}`;
        merged[levelKey] = {
          level: report.level,
          passed: report.summary?.passed || 0,
          failed: report.summary?.failed || 0,
          skipped: report.summary?.skipped || 0,
          percentage: 0,
          tests: report.results?.tests || []
        };

        const total = merged[levelKey].passed + merged[levelKey].failed;
        merged[levelKey].percentage = total > 0 ? (merged[levelKey].passed / total) * 100 : 0;

        merged.summary.total_tests += total;
        merged.summary.passed += merged[levelKey].passed;
        merged.summary.failed += merged[levelKey].failed;
        merged.summary.skipped += merged[levelKey].skipped;
      }

      // Merge interop reports
      if (report.platform) {
        merged.interop.push({
          platform: report.platform,
          passed: report.summary?.passed || 0,
          failed: report.summary?.failed || 0,
          total: (report.summary?.passed || 0) + (report.summary?.failed || 0)
        });
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });

  return merged;
}

// Generate HTML report
function generateHTML(report) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A2A Compliance Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .timestamp {
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 2rem;
      background: #f8f9fa;
    }

    .summary-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .summary-card h3 {
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .summary-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
    }

    .section {
      padding: 2rem;
      border-bottom: 1px solid #e9ecef;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section h2 {
      color: #667eea;
      margin-bottom: 1.5rem;
      font-size: 1.8rem;
    }

    .level-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .level-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .level-title {
      font-size: 1.3rem;
      font-weight: bold;
      color: #333;
    }

    .level-status {
      font-size: 2rem;
    }

    .progress-bar {
      background: #e9ecef;
      border-radius: 8px;
      height: 20px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .progress-fill.low {
      background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
    }

    .progress-fill.medium {
      background: linear-gradient(90deg, #ffa751 0%, #ffe259 100%);
    }

    .progress-fill.high {
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
    }

    .stats {
      display: flex;
      justify-content: space-around;
      font-size: 0.9rem;
      color: #666;
    }

    .interop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .interop-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .interop-name {
      font-weight: bold;
      font-size: 1.1rem;
      text-transform: capitalize;
    }

    .interop-status {
      font-size: 1.5rem;
    }

    .interop-stats {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.5rem;
    }

    footer {
      background: #f8f9fa;
      padding: 1rem;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      .summary {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 A2A Compliance Report</h1>
      <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </header>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total_tests}</div>
      </div>
      <div class="summary-card">
        <h3>Passed</h3>
        <div class="value" style="color: #28a745;">${report.summary.passed}</div>
      </div>
      <div class="summary-card">
        <h3>Failed</h3>
        <div class="value" style="color: #dc3545;">${report.summary.failed}</div>
      </div>
      <div class="summary-card">
        <h3>Overall Score</h3>
        <div class="value">${report.summary.total_tests > 0 ? ((report.summary.passed / report.summary.total_tests) * 100).toFixed(1) : 0}%</div>
      </div>
    </div>

    <div class="section">
      <h2>Compliance Levels</h2>
      ${generateLevelHTML(report.level1, 1, 'Basic Messaging')}
      ${generateLevelHTML(report.level2, 2, 'Memory Synchronization')}
      ${generateLevelHTML(report.level3, 3, 'Service Discovery')}
      ${generateLevelHTML(report.level4, 4, 'Full Compliance')}
    </div>

    ${report.interop.length > 0 ? `
    <div class="section">
      <h2>Interoperability</h2>
      <div class="interop-grid">
        ${report.interop.map(p => `
          <div class="interop-card">
            <div>
              <div class="interop-name">${p.platform}</div>
              <div class="interop-stats">${p.passed}/${p.total} tests passed</div>
            </div>
            <div class="interop-status">${p.passed === p.total ? '✅' : '⚠️'}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <footer>
      <p>Claude Flow A2A Compliance Report v${report.version}</p>
    </footer>
  </div>
</body>
</html>`;

  return html;
}

function generateLevelHTML(level, levelNum, name) {
  if (!level) {
    return `
      <div class="level-card">
        <div class="level-header">
          <div class="level-title">Level ${levelNum}: ${name}</div>
          <div class="level-status">⚪</div>
        </div>
        <p style="color: #666;">Not yet implemented</p>
      </div>
    `;
  }

  const percentage = level.percentage;
  const status = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
  const progressClass = percentage >= 80 ? 'high' : percentage >= 50 ? 'medium' : 'low';

  return `
    <div class="level-card">
      <div class="level-header">
        <div class="level-title">Level ${levelNum}: ${name}</div>
        <div class="level-status">${status}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${progressClass}" style="width: ${percentage}%">
          ${percentage.toFixed(1)}%
        </div>
      </div>
      <div class="stats">
        <span>✅ Passed: ${level.passed}</span>
        <span>❌ Failed: ${level.failed}</span>
        <span>⏭️ Skipped: ${level.skipped}</span>
      </div>
    </div>
  `;
}

// Main execution
console.log('🔍 Finding compliance reports...');
const reportFiles = findReports(options.input);

if (reportFiles.length === 0) {
  console.error('❌ No compliance reports found');
  process.exit(1);
}

console.log(`📊 Found ${reportFiles.length} report(s)`);
console.log('🔄 Merging reports...');

const mergedReport = mergeReports(reportFiles);

// Write JSON report
fs.writeFileSync(options.output, JSON.stringify(mergedReport, null, 2));
console.log(`✅ JSON report saved to: ${options.output}`);

// Write HTML report
const html = generateHTML(mergedReport);
fs.writeFileSync(options.html, html);
console.log(`✅ HTML report saved to: ${options.html}`);

// Print summary
console.log('\n📈 Summary:');
console.log(`  Total Tests: ${mergedReport.summary.total_tests}`);
console.log(`  Passed: ${mergedReport.summary.passed}`);
console.log(`  Failed: ${mergedReport.summary.failed}`);
console.log(`  Overall Score: ${mergedReport.summary.total_tests > 0 ? ((mergedReport.summary.passed / mergedReport.summary.total_tests) * 100).toFixed(1) : 0}%`);

process.exit(0);
