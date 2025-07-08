#!/bin/bash

echo "Testing claude-flow ES Module Fix"
echo "================================="

# Create test directory
TEST_DIR="es-module-test"
mkdir -p $TEST_DIR

# Create package.json with ES module
cat > $TEST_DIR/package.json << 'EOF'
{
  "name": "test-es-module",
  "version": "1.0.0",
  "type": "module",
  "description": "Test ES module project"
}
EOF

# Test npx directly
echo "Testing with npx claude-flow@alpha..."
cd $TEST_DIR
npx claude-flow@alpha init

# Check if wrapper was created
if [ -f "./claude-flow" ]; then
    echo "✓ Wrapper created successfully"
    
    # Check wrapper content
    echo ""
    echo "Wrapper content (first 20 lines):"
    head -20 ./claude-flow
    
    # Test execution
    echo ""
    echo "Testing wrapper execution..."
    ./claude-flow --version
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
        echo "✓ Wrapper executed successfully!"
    else
        echo "✗ Wrapper failed with exit code: $RESULT"
    fi
else
    echo "✗ Wrapper not created"
fi

# Cleanup
cd ..
rm -rf $TEST_DIR

echo ""
echo "Test complete!"