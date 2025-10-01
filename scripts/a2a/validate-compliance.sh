#!/bin/bash

# A2A Compliance Validation Script
# Usage: ./validate-compliance.sh [level] [--verbose]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/reports/a2a"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LEVEL="${1:-all}"
VERBOSE="${2:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/compliance_${LEVEL}_${TIMESTAMP}.json"

# Create report directory
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}=== A2A Compliance Validation ===${NC}"
echo "Level: ${LEVEL}"
echo "Timestamp: ${TIMESTAMP}"
echo "Report: ${REPORT_FILE}"
echo ""

# Function to run tests and capture results
run_tests() {
    local level=$1
    local test_command=$2

    echo -e "${YELLOW}Running Level ${level} tests...${NC}"

    if [ "$VERBOSE" = "--verbose" ]; then
        npm run "$test_command" || return 1
    else
        npm run "$test_command" > /dev/null 2>&1 || return 1
    fi

    echo -e "${GREEN}✓ Level ${level} tests passed${NC}"
    return 0
}

# Function to validate message format
validate_messages() {
    echo -e "${YELLOW}Validating message formats...${NC}"

    # Check if test messages exist
    if [ ! -d "${PROJECT_ROOT}/tests/a2a/fixtures/messages" ]; then
        echo -e "${RED}✗ Message fixtures not found${NC}"
        return 1
    fi

    # Validate each message
    local passed=0
    local failed=0

    for msg_file in "${PROJECT_ROOT}"/tests/a2a/fixtures/messages/*.json; do
        if npx ajv validate -s "${PROJECT_ROOT}/schemas/a2a-message.json" -d "$msg_file" > /dev/null 2>&1; then
            ((passed++))
        else
            ((failed++))
            echo -e "${RED}✗ Invalid message: $(basename "$msg_file")${NC}"
        fi
    done

    echo "Messages validated: ${passed} passed, ${failed} failed"

    if [ $failed -gt 0 ]; then
        return 1
    fi

    echo -e "${GREEN}✓ All messages valid${NC}"
    return 0
}

# Function to check CRDT implementation
check_crdt() {
    echo -e "${YELLOW}Checking CRDT implementation...${NC}"

    # Check if CRDT files exist
    local crdt_files=(
        "src/a2a/memory/crdt/lww-set.ts"
        "src/a2a/memory/crdt/or-set.ts"
        "src/a2a/memory/crdt/vector-clock.ts"
    )

    local missing=0
    for file in "${crdt_files[@]}"; do
        if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
            echo -e "${RED}✗ Missing: ${file}${NC}"
            ((missing++))
        fi
    done

    if [ $missing -gt 0 ]; then
        echo -e "${RED}✗ CRDT implementation incomplete${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ CRDT implementation complete${NC}"
    return 0
}

# Function to check discovery implementation
check_discovery() {
    echo -e "${YELLOW}Checking discovery implementation...${NC}"

    # Check if discovery files exist
    local discovery_files=(
        "src/a2a/discovery/discovery-service.ts"
        "src/a2a/discovery/registry.ts"
        "src/a2a/discovery/health-monitor.ts"
    )

    local missing=0
    for file in "${discovery_files[@]}"; do
        if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
            echo -e "${RED}✗ Missing: ${file}${NC}"
            ((missing++))
        fi
    done

    if [ $missing -gt 0 ]; then
        echo -e "${RED}✗ Discovery implementation incomplete${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ Discovery implementation complete${NC}"
    return 0
}

# Function to generate compliance report
generate_report() {
    local level=$1
    local results=$2

    cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "level": "$level",
  "version": "1.0.0",
  "results": $results,
  "summary": {
    "total_tests": $(echo "$results" | jq '.tests | length'),
    "passed": $(echo "$results" | jq '[.tests[] | select(.status == "passed")] | length'),
    "failed": $(echo "$results" | jq '[.tests[] | select(.status == "failed")] | length'),
    "skipped": $(echo "$results" | jq '[.tests[] | select(.status == "skipped")] | length')
  }
}
EOF

    echo -e "${GREEN}Report generated: ${REPORT_FILE}${NC}"
}

# Level 1 validation
validate_level1() {
    echo -e "${BLUE}=== Level 1: Basic Messaging ===${NC}"

    local results='{"tests":[]}'
    local overall_status=0

    # JSON-RPC compliance
    if run_tests 1 "test:a2a:jsonrpc"; then
        results=$(echo "$results" | jq '.tests += [{"name": "JSON-RPC 2.0", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "JSON-RPC 2.0", "status": "failed"}]')
        overall_status=1
    fi

    # Message validation
    if validate_messages; then
        results=$(echo "$results" | jq '.tests += [{"name": "Message Format", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Message Format", "status": "failed"}]')
        overall_status=1
    fi

    # Transport layer
    if run_tests 1 "test:a2a:transport"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Transport Layer", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Transport Layer", "status": "failed"}]')
        overall_status=1
    fi

    # Authentication
    if run_tests 1 "test:a2a:auth"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Authentication", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Authentication", "status": "failed"}]')
        overall_status=1
    fi

    generate_report 1 "$results"
    return $overall_status
}

# Level 2 validation
validate_level2() {
    echo -e "${BLUE}=== Level 2: Memory Synchronization ===${NC}"

    local results='{"tests":[]}'
    local overall_status=0

    # CRDT implementation
    if check_crdt; then
        results=$(echo "$results" | jq '.tests += [{"name": "CRDT Implementation", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "CRDT Implementation", "status": "failed"}]')
        overall_status=1
    fi

    # Memory operations
    if run_tests 2 "test:a2a:memory"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Memory Operations", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Memory Operations", "status": "failed"}]')
        overall_status=1
    fi

    # Sync protocol
    if run_tests 2 "test:a2a:sync"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Sync Protocol", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Sync Protocol", "status": "failed"}]')
        overall_status=1
    fi

    # Conflict resolution
    if run_tests 2 "test:a2a:conflicts"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Conflict Resolution", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Conflict Resolution", "status": "failed"}]')
        overall_status=1
    fi

    generate_report 2 "$results"
    return $overall_status
}

# Level 3 validation
validate_level3() {
    echo -e "${BLUE}=== Level 3: Service Discovery ===${NC}"

    local results='{"tests":[]}'
    local overall_status=0

    # Discovery implementation
    if check_discovery; then
        results=$(echo "$results" | jq '.tests += [{"name": "Discovery Implementation", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Discovery Implementation", "status": "failed"}]')
        overall_status=1
    fi

    # Registration
    if run_tests 3 "test:a2a:registration"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Agent Registration", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Agent Registration", "status": "failed"}]')
        overall_status=1
    fi

    # Capability matching
    if run_tests 3 "test:a2a:capabilities"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Capability Matching", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Capability Matching", "status": "failed"}]')
        overall_status=1
    fi

    # Health checks
    if run_tests 3 "test:a2a:health"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Health Checks", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Health Checks", "status": "failed"}]')
        overall_status=1
    fi

    generate_report 3 "$results"
    return $overall_status
}

# Level 4 validation
validate_level4() {
    echo -e "${BLUE}=== Level 4: Full Compliance ===${NC}"

    local results='{"tests":[]}'
    local overall_status=0

    # Advanced messaging
    if run_tests 4 "test:a2a:advanced"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Advanced Messaging", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Advanced Messaging", "status": "failed"}]')
        overall_status=1
    fi

    # Security
    if run_tests 4 "test:a2a:security"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Security Features", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Security Features", "status": "failed"}]')
        overall_status=1
    fi

    # Observability
    if run_tests 4 "test:a2a:observability"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Observability", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Observability", "status": "failed"}]')
        overall_status=1
    fi

    # Interoperability
    if run_tests 4 "test:a2a:interop"; then
        results=$(echo "$results" | jq '.tests += [{"name": "Interoperability", "status": "passed"}]')
    else
        results=$(echo "$results" | jq '.tests += [{"name": "Interoperability", "status": "failed"}]')
        overall_status=1
    fi

    generate_report 4 "$results"
    return $overall_status
}

# Main validation logic
main() {
    cd "$PROJECT_ROOT"

    local exit_code=0

    case "$LEVEL" in
        1)
            validate_level1 || exit_code=1
            ;;
        2)
            validate_level2 || exit_code=1
            ;;
        3)
            validate_level3 || exit_code=1
            ;;
        4)
            validate_level4 || exit_code=1
            ;;
        all)
            validate_level1 || exit_code=1
            validate_level2 || exit_code=1
            validate_level3 || exit_code=1
            validate_level4 || exit_code=1
            ;;
        *)
            echo -e "${RED}Invalid level: ${LEVEL}${NC}"
            echo "Usage: $0 [1|2|3|4|all] [--verbose]"
            exit 1
            ;;
    esac

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}=== Validation PASSED ===${NC}"
    else
        echo -e "${RED}=== Validation FAILED ===${NC}"
    fi

    echo "Report: ${REPORT_FILE}"

    exit $exit_code
}

# Run main function
main
