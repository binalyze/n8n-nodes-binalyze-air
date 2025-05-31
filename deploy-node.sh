#!/bin/bash

# deploy-node.sh - Deploy custom n8n nodes for local testing
# This script builds the project, deploys to local n8n, and restarts n8n

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="n8n-nodes-binalyze-air"
N8N_CUSTOM_NODES_DIR="$HOME/.n8n/custom"
N8N_NODE_MODULES_DIR="$HOME/.n8n/node_modules"
PACKAGE_DIR="$N8N_CUSTOM_NODES_DIR/$PROJECT_NAME"

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js and npm."
        exit 1
    fi

    # Check Node.js version compatibility with n8n
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

    if [ "$NODE_MAJOR" -lt 18 ] || [ "$NODE_MAJOR" -eq 19 ] || [ "$NODE_MAJOR" -eq 21 ] || [ "$NODE_MAJOR" -gt 22 ]; then
        print_error "Node.js version $NODE_VERSION is not supported by n8n."
        print_error "n8n requires Node.js v18.17.0 (recommended), v20, or v22."
        print_warning "Please switch to a compatible Node.js version using nvm:"
        echo -e "  ${YELLOW}nvm install 20${NC}     # Install Node.js v20"
        echo -e "  ${YELLOW}nvm use 20${NC}         # Switch to Node.js v20"
        echo -e "  ${YELLOW}nvm alias default 20${NC} # Set v20 as default"
        echo ""
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        print_warning "Continuing with unsupported Node.js version..."
    else
        print_success "Node.js version $NODE_VERSION is compatible with n8n"
    fi

    if ! command_exists n8n; then
        print_warning "n8n is not installed globally. Installing n8n..."
        npm install -g n8n
    fi

    print_success "Prerequisites check completed"
}

# Kill any running n8n instances
kill_n8n() {
    print_status "Stopping any running n8n instances..."

    # Find and kill n8n processes
    N8N_PIDS=$(pgrep -f "n8n" || true)

    if [ -n "$N8N_PIDS" ]; then
        echo "$N8N_PIDS" | xargs kill -TERM 2>/dev/null || true
        sleep 2

        # Force kill if still running
        N8N_PIDS=$(pgrep -f "n8n" || true)
        if [ -n "$N8N_PIDS" ]; then
            echo "$N8N_PIDS" | xargs kill -KILL 2>/dev/null || true
        fi

        print_success "Stopped n8n instances"
    else
        print_status "No running n8n instances found"
    fi
}

# Build the project
build_project() {
    print_status "Building the project..."

    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
        print_status "Cleaned previous build"
    fi

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi

    # Build the project
    npm run build

    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created"
        exit 1
    fi

    print_success "Project built successfully"
}

# Deploy to local n8n
deploy_to_n8n() {
    print_status "Deploying to local n8n custom directory..."

    # Create n8n custom directory if it doesn't exist
    mkdir -p "$N8N_CUSTOM_NODES_DIR"

    # Remove existing package if it exists
    if [ -d "$PACKAGE_DIR" ]; then
        rm -rf "$PACKAGE_DIR"
        print_status "Removed existing package"
    fi

    # Create package directory
    mkdir -p "$PACKAGE_DIR"

    # Copy built files
    cp -r dist/* "$PACKAGE_DIR/"
    cp package.json "$PACKAGE_DIR/"
    cp index.js "$PACKAGE_DIR/" 2>/dev/null || true

    # Copy any additional files that might be needed
    if [ -f "README.md" ]; then
        cp README.md "$PACKAGE_DIR/"
    fi

    print_success "Deployed to $PACKAGE_DIR"
}

# Install package dependencies in n8n
install_dependencies() {
    print_status "Installing package dependencies in n8n..."

    cd "$PACKAGE_DIR"

    # Install peer dependencies if package.json exists
    if [ -f "package.json" ]; then
        # Install only production dependencies
        npm install --production --no-optional 2>/dev/null || true
    fi

    cd - > /dev/null
    print_success "Dependencies installed"
}

# Start n8n
start_n8n() {
    print_status "Starting n8n..."

    # Set environment variables for development
    export N8N_CUSTOM_EXTENSION_ENV="$N8N_CUSTOM_NODES_DIR"

    print_success "n8n is starting..."
    print_status "You can access n8n at: http://localhost:5678"
    print_status "Press Ctrl+C to stop n8n"

    # Start n8n in the foreground
    N8N_LOG_LEVEL=debug n8n start
}

# Main execution
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Custom n8n Node Deployment Script    ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    check_prerequisites
    kill_n8n
    build_project
    deploy_to_n8n
    install_dependencies

    echo ""
    print_success "Deployment completed successfully!"
    echo ""

		start_n8n

		print_status "Your custom nodes are deployed to: $PACKAGE_DIR"
}

# Handle script interruption
trap 'print_warning "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
