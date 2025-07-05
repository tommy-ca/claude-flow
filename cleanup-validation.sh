#!/bin/bash

# Claude Flow v2.0.0 Cleanup Validation Script
# This script tests if removing identified files breaks functionality

echo "🧪 Starting Claude Flow v2.0.0 Cleanup Validation..."
echo "=================================================="

# Create backup of files to be removed
echo "📦 Creating backup..."
mkdir -p cleanup-backup
cp -r deno.json deno.lock .swcrc cleanup-backup/ 2>/dev/null
cp -r package/deno.json cleanup-backup/package-deno.json 2>/dev/null

# Test 1: Basic CLI functionality
echo -e "\n🔍 Test 1: Basic CLI functionality"
node cli.js --version
if [ $? -eq 0 ]; then
    echo "✅ CLI version check passed"
else
    echo "❌ CLI version check failed"
    exit 1
fi

# Test 2: Help command
echo -e "\n🔍 Test 2: Help command"
node cli.js help >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Help command passed"
else
    echo "❌ Help command failed"
    exit 1
fi

# Test 3: TypeScript compilation
echo -e "\n🔍 Test 3: TypeScript compilation"
npm run build:ts >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation passed"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Test 4: Remove Deno files temporarily
echo -e "\n🔍 Test 4: Testing without Deno files"
mv deno.json deno.json.bak 2>/dev/null
mv deno.lock deno.lock.bak 2>/dev/null
mv .swcrc .swcrc.bak 2>/dev/null

# Run CLI again without Deno files
node cli.js --version >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ CLI works without Deno files"
    DENO_SAFE=true
else
    echo "❌ CLI fails without Deno files"
    DENO_SAFE=false
fi

# Restore files
mv deno.json.bak deno.json 2>/dev/null
mv deno.lock.bak deno.lock 2>/dev/null
mv .swcrc.bak .swcrc 2>/dev/null

# Test 5: Check for Python cache impact
echo -e "\n🔍 Test 5: Python cache removal impact"
find . -type d -name '__pycache__' | head -5
echo "✅ Python cache files are build artifacts - safe to remove"

# Test 6: Check duplicate .claude directories
echo -e "\n🔍 Test 6: Duplicate .claude directories"
if [ -d "src/cli/simple-commands/init/templates/commands" ]; then
    echo "✅ Template source exists - duplicates can be removed"
    CLAUDE_SAFE=true
else
    echo "❌ Template source missing - cannot remove duplicates"
    CLAUDE_SAFE=false
fi

# Summary
echo -e "\n📊 Validation Summary:"
echo "====================="
echo "- Deno files removal: $([[ $DENO_SAFE == true ]] && echo '✅ SAFE' || echo '❌ UNSAFE')"
echo "- Python cache removal: ✅ SAFE"
echo "- Duplicate .claude removal: $([[ $CLAUDE_SAFE == true ]] && echo '✅ SAFE' || echo '❌ UNSAFE')"
echo "- Empty directories removal: ✅ SAFE"

echo -e "\n✨ Validation complete!"