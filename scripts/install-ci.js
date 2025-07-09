#!/usr/bin/env node

/**
 * CI-specific installation script
 * Can be called directly for CI setup or validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏭 Claude-Flow CI Installation\n');

// Comprehensive CI detection
const isCI = !!(
  process.env.CI ||
  process.env.CONTINUOUS_INTEGRATION ||
  process.env.GITHUB_ACTIONS ||
  process.env.JENKINS ||
  process.env.TRAVIS ||
  process.env.CIRCLECI ||
  process.env.GITLAB_CI ||
  process.env.BUILDKITE ||
  process.env.DRONE ||
  process.env.AZURE_PIPELINES_BUILD_ID ||
  process.env.TF_BUILD ||
  process.env.CODEBUILD_BUILD_ID ||
  process.env.BUILD_ID ||
  process.env.TEAMCITY_VERSION ||
  process.env.APPVEYOR
);

// Environment info
console.log('Environment:');
console.log(`  Node: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Arch: ${process.arch}`);
console.log(`  CI: ${isCI ? 'Yes' : 'No'}`);
if (isCI && process.env.GITHUB_ACTIONS) {
  console.log(`  Runner: GitHub Actions`);
} else if (isCI) {
  const ciEnv = Object.keys(process.env).find(key => 
    ['TRAVIS', 'CIRCLECI', 'GITLAB_CI', 'JENKINS', 'BUILDKITE'].includes(key)
  );
  if (ciEnv) console.log(`  Runner: ${ciEnv}`);
}
console.log();

// Validate Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
const minorVersion = parseInt(nodeVersion.split('.')[1]);

if (majorVersion < 18 || (majorVersion === 22 && minorVersion === 0)) {
  console.error('❌ Unsupported Node.js version');
  console.error(`   Current: ${nodeVersion}`);
  console.error(`   Required: >=18.0.0 <22.0.0 || >=22.1.0`);
  process.exit(1);
}

// Check for package-lock.json
const lockPath = path.join(__dirname, '..', 'package-lock.json');
if (!fs.existsSync(lockPath)) {
  console.warn('⚠️  package-lock.json not found');
  console.log('   Running npm install instead of npm ci...');
  
  try {
    execSync('npm install --no-optional --no-audit --no-fund', {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' }
    });
  } catch (error) {
    console.error('❌ npm install failed');
    process.exit(1);
  }
} else {
  // Use npm ci for faster, more reliable installs
  console.log('📦 Installing dependencies with npm ci...\n');
  
  try {
    execSync('npm ci --no-optional --no-audit --no-fund', {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' }
    });
  } catch (error) {
    console.error('❌ npm ci failed, trying npm install...');
    
    try {
      execSync('npm install --no-optional --no-audit --no-fund', {
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' }
      });
    } catch (installError) {
      console.error('❌ Installation failed');
      process.exit(1);
    }
  }
}

// Verify critical dependencies
console.log('\n🔍 Verifying installation...\n');

const criticalDeps = [
  '@modelcontextprotocol/sdk',
  'commander',
  'chalk',
  'ora',
  'inquirer',
  'express',
  'ws',
  'fs-extra',
  'nanoid'
];

const optionalDeps = [
  'better-sqlite3',
  'blessed'
];

let hasErrors = false;

console.log('Critical dependencies:');
for (const dep of criticalDeps) {
  try {
    require.resolve(dep);
    console.log(`  ✅ ${dep}`);
  } catch (error) {
    console.error(`  ❌ ${dep} - MISSING`);
    hasErrors = true;
  }
}

console.log('\nOptional dependencies:');
for (const dep of optionalDeps) {
  try {
    require.resolve(dep);
    console.log(`  ✅ ${dep} (installed)`);
  } catch (error) {
    console.log(`  ℹ️  ${dep} (not installed - will use fallback)`);
  }
}

// Check for build artifacts
console.log('\nBuild artifacts:');
const distPath = path.join(__dirname, '..', 'dist');
const binPath = path.join(__dirname, '..', 'bin');

if (fs.existsSync(distPath)) {
  console.log(`  ✅ dist/ directory exists`);
} else {
  console.log(`  ℹ️  dist/ directory not found (build required)`);
}

if (fs.existsSync(binPath)) {
  console.log(`  ✅ bin/ directory exists`);
} else {
  console.log(`  ℹ️  bin/ directory not found (build required)`);
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ CI installation FAILED - missing critical dependencies');
  process.exit(1);
} else {
  console.log('✅ CI installation PASSED');
  console.log('   All critical dependencies installed');
  console.log('   Optional dependencies will use fallbacks if needed');
  console.log('   Ready for testing!');
}

module.exports = { isCI };