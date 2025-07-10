#!/bin/bash

# E2E Test Runner Script for claude-flow
# This script orchestrates all E2E tests in Docker

set -e

echo "🚀 Claude Flow E2E Test Suite"
echo "============================="
echo ""

# Configuration
COMPOSE_FILE="docker-test/docker-compose.test.yml"
PROJECT_NAME="claude-flow-e2e"
REPORT_DIR="docker-test/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "error")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "info")
            echo -e "${YELLOW}ℹ️  ${message}${NC}"
            ;;
    esac
}

# Function to cleanup containers
cleanup() {
    print_status "info" "Cleaning up test containers..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Create report directory
mkdir -p $REPORT_DIR

# Build test images
print_status "info" "Building test images..."
docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build --parallel

# Run tests based on arguments
if [ "$1" == "quick" ]; then
    # Quick smoke test
    print_status "info" "Running quick smoke tests..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm npx-test
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm feature-discovery
    
elif [ "$1" == "performance" ]; then
    # Performance benchmarks only
    print_status "info" "Running performance benchmarks..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm benchmark
    
elif [ "$1" == "integration" ]; then
    # Integration tests only
    print_status "info" "Running integration tests..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm integration-runner
    
else
    # Run all tests
    print_status "info" "Running complete E2E test suite..."
    
    # Start dependencies
    print_status "info" "Starting test dependencies..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d redis postgres
    
    # Wait for services to be ready
    sleep 5
    
    # Run tests in sequence
    TESTS=(
        "npx-test:NPX Deployment"
        "feature-discovery:Feature Discovery"
        "config-test:Configuration Persistence"
        "transparency-test:Transparency Verification"
        "workflow-test:User Workflows"
        "platform-amd64:Platform AMD64"
        "integration-runner:Integration Suite"
    )
    
    # Add platform-specific tests if not on CI
    if [ -z "$CI" ]; then
        TESTS+=("platform-arm64:Platform ARM64")
    fi
    
    # Add benchmarks if requested
    if [ "$2" == "--with-benchmarks" ]; then
        TESTS+=("benchmark:Performance Benchmarks")
    fi
    
    FAILED_TESTS=()
    PASSED_TESTS=()
    
    for test_entry in "${TESTS[@]}"; do
        IFS=':' read -r service description <<< "$test_entry"
        
        echo ""
        echo "Running: $description"
        echo "----------------------------------------"
        
        if docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm $service; then
            PASSED_TESTS+=("$description")
            print_status "success" "$description completed"
        else
            FAILED_TESTS+=("$description")
            print_status "error" "$description failed"
        fi
    done
    
    # Generate final report
    print_status "info" "Generating test reports..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm report-generator
fi

# Display summary
echo ""
echo "======================================"
echo "📊 E2E Test Summary"
echo "======================================"

if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "✅ Passed Tests (${#PASSED_TESTS[@]}):"
    for test in "${PASSED_TESTS[@]}"; do
        echo "   - $test"
    done
fi

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed Tests (${#FAILED_TESTS[@]}):"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   - $test"
    done
fi

# Copy reports to host
if [ -d "$REPORT_DIR" ]; then
    echo ""
    print_status "info" "Test reports available in: $REPORT_DIR"
    ls -la $REPORT_DIR/*.{json,html,xml} 2>/dev/null || true
fi

# Exit with appropriate code
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    print_status "error" "E2E tests failed!"
    exit 1
else
    print_status "success" "All E2E tests passed!"
    exit 0
fi