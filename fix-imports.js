#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

async function fixImports() {
  const tsFiles = glob.sync('src/**/*.ts', { cwd: '/workspaces/claude-code-flow' });
  
  let totalFixed = 0;
  
  for (const file of tsFiles) {
    const filePath = path.join('/workspaces/claude-code-flow', file);
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Fix relative imports without .js extension
    content = content.replace(/from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)(?<!\.css)(?<!\.html)['"];?/g, (match, importPath) => {
      modified = true;
      totalFixed++;
      return match.replace(importPath, importPath + '.js');
    });
    
    // Fix npm:chalk@5 imports
    content = content.replace(/from\s+['"]npm:chalk@5['"]/g, 'from "chalk"');
    
    // Fix specific known issues
    content = content.replace(/import\s+{\s*colors\s*}\s+from\s+['"]@cliffy\/ansi\/colors\.js['"]/g, 'import { colors } from "@cliffy/ansi/colors"');
    content = content.replace(/import\s+{\s*Command\s*}\s+from\s+['"]commander['"]/g, 'import { Command } from "@cliffy/command"');
    
    if (modified) {
      await fs.writeFile(filePath, content);
      console.log(`Fixed imports in: ${file}`);
    }
  }
  
  console.log(`\nTotal imports fixed: ${totalFixed}`);
}

fixImports().catch(console.error);