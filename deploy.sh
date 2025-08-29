#!/bin/bash

# Job Status API Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="job-status-api"
DOCKER_IMAGE="job-status-api:latest"
CONTAINER_NAME="job-status-api-container"

echo -e "${GREEN}🚀 Job Status API Deployment Script${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Function to build the application
build_app() {
    echo -e "${YELLOW}Building application...${NC}"
    
    # Install dependencies
    if [ -f "package.json" ]; then
        echo "Installing npm dependencies..."
        npm ci --only=production
    fi
    
    # Build Docker image
    echo "Building Docker image..."
    docker build -t $DOCKER_IMAGE .
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Function to deploy with Docker Compose
deploy_compose() {
    echo -e "${YELLOW}Deploying with Docker Compose...${NC}"
    
    # Stop existing containers
    docker-compose down --remove-orphans
    
    # Start services
    docker-compose up -d
    
    echo -e "${GREEN}✅ Deployment completed successfully${NC}"
    echo -e "${YELLOW}Services are starting up...${NC}"
    echo -e "${GREEN}API: http://localhost:3000${NC}"
    echo -e "${GREEN}Documentation: http://localhost:3000/api-docs${NC}"
    echo -e "${GREEN}Health Check: http://localhost:3000/health${NC}"
    echo -e "${GREEN}pgAdmin: http://localhost:8080${NC}"
    echo -e "${GREEN}Redis Commander: http://localhost:8081${NC}"
}

# Function to deploy standalone Docker container
deploy_standalone() {
    echo -e "${YELLOW}Deploying standalone Docker container...${NC}"
    
    # Stop existing container
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo "Stopping existing container..."
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    
    # Run new container
    echo "Starting new container..."
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        --env-file .env \
        --restart unless-stopped \
        $DOCKER_IMAGE
    
    echo -e "${GREEN}✅ Standalone deployment completed successfully${NC}"
    echo -e "${GREEN}API: http://localhost:3000${NC}"
}

# Function to check deployment status
check_status() {
    echo -e "${YELLOW}Checking deployment status...${NC}"
    
    if command_exists docker-compose; then
        docker-compose ps
    fi
    
    # Check if API is responding
    echo "Checking API health..."
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✅ API is responding${NC}"
    else
        echo -e "${RED}❌ API is not responding${NC}"
    fi
}

# Function to view logs
view_logs() {
    echo -e "${YELLOW}Viewing logs...${NC}"
    
    if command_exists docker-compose; then
        docker-compose logs -f
    else
        docker logs -f $CONTAINER_NAME
    fi
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    
    if command_exists docker-compose; then
        docker-compose down
    else
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     - Build the application"
    echo "  deploy    - Deploy with Docker Compose"
    echo "  standalone- Deploy as standalone Docker container"
    echo "  status    - Check deployment status"
    echo "  logs      - View logs"
    echo "  stop      - Stop services"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy     # Deploy with Docker Compose"
    echo "  $0 standalone # Deploy standalone container"
    echo "  $0 status     # Check status"
}

# Main script logic
case "${1:-help}" in
    build)
        build_app
        ;;
    deploy)
        build_app
        deploy_compose
        ;;
    standalone)
        build_app
        deploy_standalone
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    stop)
        stop_services
        ;;
    help|*)
        show_help
        ;;
esac
