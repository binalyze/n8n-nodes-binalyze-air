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

# Check if build script exists
if ! npm run | grep -q "build"; then
    echo -e "${RED}❌ No 'build' script found in package.json${NC}"
    exit 1
fi

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

# Function to build and restart on file changes
watch_and_restart() {
    echo -e "${YELLOW}👀 Watching for TypeScript file changes...${NC}"

    # Use inotifywait if available, otherwise fall back to find-based polling
    if command -v inotifywait >/dev/null 2>&1; then
        # Using inotifywait for efficient file watching
        while true; do
            # Watch for changes in TypeScript files
            inotifywait -r -e modify,create,delete --include='.*\.ts$' ./nodes ./credentials >/dev/null 2>&1

            echo -e "${BLUE}🔄 TypeScript files changed, rebuilding...${NC}"

            # Build the project
            npm run build >/dev/null 2>&1
            BUILD_STATUS=$?

            if [ $BUILD_STATUS -eq 0 ]; then
                echo -e "${GREEN}✅ Build successful, restarting n8n...${NC}"
                ./restart-n8n.sh
                echo -e "${GREEN}🌐 n8n restarted and available at: http://localhost:5678${NC}"
            else
                echo -e "${RED}❌ Build failed! Fix the errors before n8n will be restarted.${NC}"
                echo -e "${YELLOW}Running build with verbose output to show errors:${NC}"
                npm run build
            fi
        done
    else
        # Fallback to polling method
        echo -e "${YELLOW}📝 Using polling method (install inotify-tools for better performance)${NC}"
        LAST_CHANGE=0

        while true; do
            # Find the most recent TypeScript file modification (cross-platform)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                CURRENT_CHANGE=$(find ./nodes ./credentials -name "*.ts" -type f -exec stat -f "%m" {} \; 2>/dev/null | sort -n | tail -1)
            else
                # Linux and other Unix systems
                CURRENT_CHANGE=$(find ./nodes ./credentials -name "*.ts" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1 | cut -d. -f1)
            fi

            if [ ! -z "$CURRENT_CHANGE" ] && [ "$CURRENT_CHANGE" != "$LAST_CHANGE" ]; then
                LAST_CHANGE=$CURRENT_CHANGE

                echo -e "${BLUE}🔄 TypeScript files changed, rebuilding...${NC}"

                # Build the project
                npm run build >/dev/null 2>&1
                BUILD_STATUS=$?

                if [ $BUILD_STATUS -eq 0 ]; then
                    echo -e "${GREEN}✅ Build successful, restarting n8n...${NC}"
                    ./restart-n8n.sh
                    echo -e "${GREEN}🌐 n8n restarted and available at: http://localhost:5678${NC}"
                else
                    echo -e "${RED}❌ Build failed! Fix the errors before n8n will be restarted.${NC}"
                    echo -e "${YELLOW}Running build with verbose output to show errors:${NC}"
                    npm run build
                fi
            fi

            sleep 2
        done
    fi
}

# Start the watch and restart function in background
watch_and_restart &
WATCHER_PID=$!

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${GREEN}🌐 n8n is available at: http://localhost:5678${NC}"
echo -e "${YELLOW}📝 Watching for TypeScript changes...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Wait for the watcher process
wait $WATCHER_PID
