#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));

// Track all fixes for reporting
const fixes = {
  jsExtensions: 0,
  chalkImports: 0,
  cliffyColors: 0,
  commanderImports: 0,
  typeImports: 0,
  total: 0
};

async function fixImportsInFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    
    // Fix relative imports without .js extension
    // Match: from './foo' or from "../bar" but not from './foo.js' or external packages
    content = content.replace(
      /from\s+(['"])(\.[^'"]+?)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.html)\1/g,
      (match, quote, importPath) => {
        // Don't add .js to directory imports ending with /
        if (importPath.endsWith('/')) return match;
        
        fixes.jsExtensions++;
        return `from ${quote}${importPath}.js${quote}`;
      }
    );
    
    // Fix npm:chalk@5 imports -> chalk
    if (content.includes('npm:chalk@5')) {
      content = content.replace(/from\s+['"]npm:chalk@5['"]/g, 'from "chalk"');
      fixes.chalkImports++;
    }
    
    // Fix Cliffy colors imports
    if (content.includes('@cliffy/ansi/colors.js')) {
      content = content.replace(
        /import\s+{\s*colors\s*}\s+from\s+['"]@cliffy\/ansi\/colors\.js['"]/g,
        'import { colors } from "@cliffy/ansi/colors"'
      );
      fixes.cliffyColors++;
    }
    
    // Fix commander -> @cliffy/command
    if (content.includes('from "commander"')) {
      content = content.replace(
        /import\s+{\s*Command\s*}\s+from\s+['"]commander['"]/g,
        'import { Command } from "@cliffy/command"'
      );
      fixes.commanderImports++;
    }
    
    // Fix type-only imports (add 'type' keyword where needed)
    // This is a simple heuristic - look for imports that only import types
    content = content.replace(
      /import\s+{\s*([A-Z][a-zA-Z]*(?:,\s*[A-Z][a-zA-Z]*)*)\s*}\s+from/g,
      (match, imports) => {
        // Check if all imports start with capital letter (likely types)
        const importList = imports.split(',').map(i => i.trim());
        const allTypes = importList.every(imp => /^[A-Z]/.test(imp));
        
        if (allTypes && !match.includes('import type')) {
          fixes.typeImports++;
          return match.replace('import {', 'import type {');
        }
        return match;
      }
    );
    
    // Only write if changed
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      fixes.total++;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing TypeScript imports...\n');
  
  // Find all TypeScript files
  const files = await glob('src/**/*.ts', {
    cwd: '/workspaces/claude-code-flow',
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });
  
  console.log(`Found ${files.length} TypeScript files to process\n`);
  
  // Process files in batches for better performance
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const promises = batch.map(file => {
      const fullPath = path.join('/workspaces/claude-code-flow', file);
      return fixImportsInFile(fullPath).then(changed => {
        if (changed) {
          console.log(`✅ Fixed: ${file}`);
        }
      });
    });
    await Promise.all(promises);
  }
  
  // Report summary
  console.log('\n📊 Summary:');
  console.log(`Total files modified: ${fixes.total}`);
  console.log(`- Added .js extensions: ${fixes.jsExtensions}`);
  console.log(`- Fixed chalk imports: ${fixes.chalkImports}`);
  console.log(`- Fixed Cliffy colors: ${fixes.cliffyColors}`);
  console.log(`- Fixed commander imports: ${fixes.commanderImports}`);
  console.log(`- Added type imports: ${fixes.typeImports}`);
  
  console.log('\n✨ Import fixes complete!');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});