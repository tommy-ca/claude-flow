#!/usr/bin/env node

/**
 * Post-install script that handles both CI and regular environments
 * Detects CI environment and adjusts behavior accordingly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log('📦 Claude-Flow post-install setup...');

if (isCI) {
  console.log('🏭 CI environment detected');
  console.log('✅ Core installation completed');
  console.log('ℹ️  Optional dependencies may be skipped in CI');
  
  // In CI, we don't verify dependencies in postinstall
  // They should be verified by test scripts instead
  console.log('\n✅ CI postinstall completed');
  console.log('   Run test:ci script to verify dependencies');
  process.exit(0);
}

// For non-CI environments, check if we should run optional installers
console.log('🖥️  Local environment detected');

// Check if this is a fresh install or update
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const hasNodeModules = fs.existsSync(nodeModulesPath);

if (!hasNodeModules) {
  console.log('📥 Fresh installation detected');
  console.log('✅ Dependencies will be installed by npm');
  console.log('   Optional components can be added later');
  process.exit(0);
}

// For existing installations, try to set up optional components
console.log('📥 Setting up optional components...');

try {
  await import('./install.js');
  console.log('✅ Optional components installed successfully!');
} catch (error) {
  console.warn('⚠️  Optional components installation failed:', error.message);
  console.log('✅ Core installation still completed successfully');
  console.log('ℹ️  You can use Claude-Flow without optional components');
  // Don't fail the installation
  process.exit(0);
}