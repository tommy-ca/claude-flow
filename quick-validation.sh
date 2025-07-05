#!/bin/bash

echo "🧪 Quick Validation for Safe Removals..."
echo "========================================"

# Test basic CLI without Deno files
echo -e "\n🔍 Testing CLI without Deno files..."
mv deno.json deno.json.temp 2>/dev/null
mv deno.lock deno.lock.temp 2>/dev/null

node cli.js --version
RESULT=$?

mv deno.json.temp deno.json 2>/dev/null
mv deno.lock.temp deno.lock 2>/dev/null

if [ $RESULT -eq 0 ]; then
    echo "✅ CLI works without Deno files - SAFE TO REMOVE"
else
    echo "❌ CLI needs Deno files"
fi

# Check duplicate directories
echo -e "\n🔍 Checking duplicate .claude directories..."
echo "Template source: $(ls src/cli/simple-commands/init/templates/commands | wc -l) files"
echo "Duplicate 1: $(ls claude-flow-mcp-test/.claude/commands 2>/dev/null | wc -l) files"
echo "Duplicate 2: $(ls flow-2-init/.claude/commands 2>/dev/null | wc -l) files"

# List Python cache
echo -e "\n🔍 Python cache files:"
find . -name "__pycache__" -type d | wc -l
echo "$(find . -name "__pycache__" -type d | wc -l) __pycache__ directories found"

# Check unused dependencies
echo -e "\n🔍 Checking for Babel usage..."
grep -r "@babel" src/ --include="*.ts" --include="*.js" 2>/dev/null | wc -l
echo "$(grep -r "@babel" src/ --include="*.ts" --include="*.js" 2>/dev/null | wc -l) Babel references in source"

echo -e "\n✨ Quick validation complete!"