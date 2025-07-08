#!/bin/bash

echo "Testing claude-flow@alpha ES Module Fix in Docker"
echo "================================================="

# Create test directory
TEST_DIR="docker-es-module-test"
mkdir -p $TEST_DIR

# Create Dockerfile
cat > $TEST_DIR/Dockerfile << 'EOF'
FROM node:22-slim

# Install git (needed for some npm operations)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create test directory
WORKDIR /app

# Create ES module project
RUN echo '{"name": "test-es-module", "version": "1.0.0", "type": "module", "description": "Test ES module project"}' > package.json

# Install latest alpha version
RUN npm install claude-flow@alpha

# Run claude-flow init
RUN npx claude-flow init

# List files to verify wrapper was created
RUN ls -la

# Test the wrapper
CMD ["./claude-flow", "--version"]
EOF

# Build and run the Docker container
echo "Building Docker image..."
docker build -t claude-flow-es-test $TEST_DIR

echo ""
echo "Running Docker container..."
docker run --rm claude-flow-es-test

# Cleanup
rm -rf $TEST_DIR

echo ""
echo "Docker test complete!"