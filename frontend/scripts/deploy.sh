#!/bin/bash

# CropWise AI Deployment Script
# This script builds and deploys the application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose v2 is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "All dependencies are installed."
}

docker_compose() {
    docker compose "$@"
}

check_env_files() {
    print_status "Checking environment files..."
    
    if [ ! -f ".env" ]; then
        print_warning "Frontend .env file not found. Copying from .env.example..."
        cp .env.example .env
    fi
    
    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env file not found. Copying from backend/.env.example..."
        cp backend/.env.example backend/.env
        print_warning "Please update backend/.env with your actual values before deploying!"
    fi
}

build_images() {
    print_status "Building Docker images..."
    docker_compose -f docker-compose.yml build --no-cache
    print_success "Docker images built successfully."
}

start_services() {
    print_status "Starting services..."
    docker_compose -f docker-compose.yml up -d
    print_success "Services started successfully."
}

login_registry() {
    if [ -z "${DEPLOY_GHCR_USERNAME:-}" ] || [ -z "${DEPLOY_GHCR_TOKEN:-}" ]; then
        print_error "DEPLOY_GHCR_USERNAME and DEPLOY_GHCR_TOKEN are required for release deployments."
        exit 1
    fi

    print_status "Logging in to container registry..."
    printf '%s' "$DEPLOY_GHCR_TOKEN" | docker login ghcr.io -u "$DEPLOY_GHCR_USERNAME" --password-stdin
}

release() {
    print_status "Deploying prebuilt production images..."

    if [ -z "${FRONTEND_IMAGE:-}" ] || [ -z "${BACKEND_IMAGE:-}" ]; then
        print_error "FRONTEND_IMAGE and BACKEND_IMAGE must be set for release deployments."
        exit 1
    fi

    check_dependencies
    check_env_files
    login_registry

    docker_compose -f docker-compose.deploy.yml pull
    docker_compose -f docker-compose.deploy.yml up -d --remove-orphans
    health_check

    print_success "Production release deployed successfully."
}

run_migrations() {
    print_status "Running database migrations..."
    # Note: Migrations would need to be run inside the backend container
    # This is a placeholder - adjust based on your migration needs
    print_warning "Database migrations should be run manually if needed."
}

health_check() {
    print_status "Performing health check..."
    sleep 5  # Wait for services to start
    
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s http://localhost/health > /dev/null 2>&1; then
            print_success "Health check passed!"
            return 0
        fi
        retry_count=$((retry_count + 1))
        print_warning "Health check attempt $retry_count/$max_retries failed. Retrying..."
        sleep 2
    done
    
    print_error "Health check failed after $max_retries attempts."
    return 1
}

show_logs() {
    print_status "Showing recent logs..."
    if [ -n "${FRONTEND_IMAGE:-}" ] || [ -n "${BACKEND_IMAGE:-}" ]; then
        docker_compose -f docker-compose.deploy.yml logs --tail=50
        return
    fi

    docker_compose -f docker-compose.yml logs --tail=50
}

# Main deployment function
deploy() {
    print_status "Starting CropWise AI deployment..."
    echo ""
    
    check_dependencies
    echo ""
    
    check_env_files
    echo ""
    
    build_images
    echo ""
    
    start_services
    echo ""
    
    health_check
    echo ""
    
    print_success "=========================================="
    print_success "  CropWise AI deployed successfully!"
    print_success "=========================================="
    echo ""
    print_status "Application is running at: http://localhost"
    print_status "Backend API is running at: http://localhost:5001"
    echo ""
    print_status "Useful commands:"
    echo "  - View logs: docker compose -f docker-compose.yml logs -f"
    echo "  - Stop services: docker compose -f docker-compose.yml down"
    echo "  - Restart services: docker compose -f docker-compose.yml restart"
    echo "  - Update and redeploy: ./scripts/deploy.sh update"
}

# Update function for redeployment
update() {
    print_status "Updating CropWise AI deployment..."
    
    docker_compose -f docker-compose.yml pull
    build_images
    docker_compose -f docker-compose.yml up -d
    health_check
    
    print_success "Deployment updated successfully!"
}

# Stop function
stop() {
    print_status "Stopping CropWise AI services..."
    docker_compose -f docker-compose.yml down
    docker_compose -f docker-compose.deploy.yml down || true
    print_success "Services stopped successfully."
}

# Clean function - removes all containers, images, and volumes
clean() {
    print_warning "This will remove all containers, images, and volumes!"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker_compose -f docker-compose.yml down -v --rmi all --remove-orphans
        docker_compose -f docker-compose.deploy.yml down -v --rmi all --remove-orphans || true
        print_success "All resources cleaned up."
    fi
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    update)
        update
        ;;
    release)
        release
        ;;
    stop)
        stop
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean
        ;;
    *)
        echo "Usage: $0 {deploy|update|release|stop|logs|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Build and deploy the application (default)"
        echo "  update  - Update and redeploy the application"
        echo "  release - Deploy prebuilt registry images"
        echo "  stop    - Stop all services"
        echo "  logs    - Show recent logs"
        echo "  clean   - Remove all containers, images, and volumes"
        exit 1
        ;;
esac
