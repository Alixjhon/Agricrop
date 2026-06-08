#!/bin/bash

# CropWise AI Health Check Script
# This script performs comprehensive health checks on the deployed application

set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
BACKEND_URL="${BACKEND_URL:-http://localhost:5001}"
TIMEOUT=5
RETRIES=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_http() {
    local url="$1"
    local expected_status="${2:-200}"
    local retry_count=0
    
    while [ $retry_count -lt $RETRIES ]; do
        if curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" | grep -q "$expected_status"; then
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 1
    done
    
    return 1
}

check_json_response() {
    local url="$1"
    local field="$2"
    local expected_value="${3:-}"
    
    local response=$(curl -s --max-time $TIMEOUT "$url")
    
    if [ -z "$expected_value" ]; then
        echo "$response" | grep -q "\"$field\""
    else
        echo "$response" | grep -q "\"$field\".*:.*\"$expected_value\""
    fi
}

# Main health check
main() {
    local exit_code=0
    
    echo ""
    echo "=========================================="
    echo "  CropWise AI Health Check"
    echo "=========================================="
    echo ""
    
    # Check Frontend
    print_status "Checking Frontend..."
    if check_http "$FRONTEND_URL" "200"; then
        print_success "Frontend is responding (HTTP 200)"
    else
        print_error "Frontend is not responding"
        exit_code=1
    fi
    
    # Check Backend Health
    print_status "Checking Backend Health..."
    if check_http "$BACKEND_URL/health" "200"; then
        print_success "Backend health endpoint is responding"
        
        # Check health response content
        if check_json_response "$BACKEND_URL/health" "status" "OK"; then
            print_success "Backend status is OK"
        else
            print_warning "Backend status may not be OK"
        fi
    else
        print_error "Backend health endpoint is not responding"
        exit_code=1
    fi
    
    # Check Database Connection
    print_status "Checking Database Connection..."
    if check_http "$BACKEND_URL/health/db" "200"; then
        if check_json_response "$BACKEND_URL/health/db" "database" "connected"; then
            print_success "Database is connected"
        else
            print_warning "Database connection status unknown"
        fi
    else
        print_warning "Database health endpoint not responding"
    fi
    
    # Check API endpoints
    print_status "Checking API endpoints..."
    
    # Check if API documentation or root endpoint exists
    if check_http "$BACKEND_URL/api" "200"; then
        print_success "API root endpoint is responding"
    else
        # Some APIs might return 404 for root, which is acceptable
        print_warning "API root endpoint returned non-200 status (may be normal)"
    fi
    
    # Summary
    echo ""
    echo "=========================================="
    if [ $exit_code -eq 0 ]; then
        print_success "All health checks passed!"
    else
        print_error "Some health checks failed"
    fi
    echo "=========================================="
    echo ""
    
    return $exit_code
}

# Run main function
main "$@"