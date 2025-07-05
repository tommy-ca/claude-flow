#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import glob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globAsync = promisify(glob);

// Track all fixes for reporting
const fixes = {
  jsExtensions: 0,
  chalkImports: 0,
  cliffyColors: 0,
  commanderImports: 0,
  typeImports: 0,
  circularDeps: 0,
  total: 0
};

async function fixImportsInFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    
    // Fix relative imports without .js extension
    content = content.replace(
      /from\s+(['"])(\.[^'"]+?)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.html)\1/g,
      (match, quote, importPath) => {
        // Don't add .js to directory imports ending with /
        if (importPath.endsWith('/')) return match;
        
        fixes.jsExtensions++;
        return `from ${quote}${importPath}.js${quote}`;
      }
    );
    
    // Fix npm:chalk@5 imports
    if (content.includes('npm:chalk@5')) {
      content = content.replace(/from\s+['"]npm:chalk@5['"]/g, 'from "chalk"');
      fixes.chalkImports++;
    }
    
    // Fix Cliffy colors imports
    if (content.includes('@cliffy/ansi/colors')) {
      content = content.replace(
        /import\s+{\s*colors\s*}\s+from\s+['"]@cliffy\/ansi\/colors(?:\.js)?['"]/g,
        'import { colors } from "@cliffy/ansi/colors"'
      );
      fixes.cliffyColors++;
    }
    
    // Fix commander -> @cliffy/command
    if (content.includes('from "commander"') || content.includes("from 'commander'")) {
      content = content.replace(
        /import\s+{\s*Command\s*}\s+from\s+['"]commander['"]/g,
        'import { Command } from "@cliffy/command"'
      );
      fixes.commanderImports++;
    }
    
    // Fix type-only imports for interfaces and types
    const typeOnlyPatterns = [
      // Match imports that only contain type/interface names
      /import\s+{\s*((?:[A-Z][a-zA-Z]*(?:Type|Interface|Config|Options|Props|State|Context|Schema|Model|DTO)?(?:,\s*)?)+)\s*}\s+from/g,
      // Specific known type imports
      /import\s+{\s*(TaskDefinition|AgentState|TaskResult|SwarmObjective|SwarmConfig|Logger|ClaudeAPI)\s*}\s+from/g
    ];
    
    for (const pattern of typeOnlyPatterns) {
      content = content.replace(pattern, (match) => {
        if (!match.includes('import type')) {
          fixes.typeImports++;
          return match.replace('import {', 'import type {');
        }
        return match;
      });
    }
    
    // Fix known circular dependency patterns
    if (filePath.includes('types.ts') && content.includes('from "./')) {
      // Types files should only import from other type files or external packages
      content = content.replace(
        /import\s+(?:type\s+)?{\s*([^}]+)\s*}\s+from\s+['"]\.\/((?!types)[^'"]+)['"]/g,
        (match, imports, module) => {
          fixes.circularDeps++;
          return match.replace('import {', 'import type {');
        }
      );
    }
    
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
  const files = await globAsync('src/**/*.ts', {
    cwd: '/workspaces/claude-code-flow',
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });
  
  console.log(`Found ${files.length} TypeScript files to process\n`);
  
  // Process files in batches
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
  console.log(`- Fixed circular deps: ${fixes.circularDeps}`);
  
  console.log('\n✨ Import fixes complete!');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});