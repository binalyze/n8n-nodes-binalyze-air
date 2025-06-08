#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Binalyze AIR Development Environment${NC}"
echo -e "${BLUE}=============================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping development environment...${NC}"

    # Kill background processes
    if [ ! -z "$TS_PID" ]; then
        kill $TS_PID 2>/dev/null
    fi
    if [ ! -z "$WATCHER_PID" ]; then
        kill $WATCHER_PID 2>/dev/null
    fi

    # Stop n8n
    pkill -TERM -f "n8n" 2>/dev/null

    echo -e "${GREEN}✅ Development environment stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Initial build
echo -e "${YELLOW}📦 Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Initial build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Initial build completed${NC}"

# Start n8n
echo -e "${YELLOW}🌐 Starting n8n...${NC}"
./restart-n8n.sh

# Start TypeScript watch in background
echo -e "${YELLOW}👀 Starting TypeScript watch mode...${NC}"
npm run watch:ts &
TS_PID=$!

# Wait a moment for TypeScript to initialize
sleep 2

# Start file watcher in background
echo -e "${YELLOW}🔍 Starting file watcher...${NC}"
npm run watch:restart &
WATCHER_PID=$!

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${GREEN}🌐 n8n is available at: http://localhost:5678${NC}"
echo -e "${YELLOW}📝 Watching for TypeScript changes...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Wait for background processes
wait $TS_PID $WATCHER_PID
