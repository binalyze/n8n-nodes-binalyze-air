#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
DEBUG_MODE=false
for arg in "$@"; do
    case $arg in
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--debug] [--help]"
            echo "  --debug    Enable verbose debug logging for n8n"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown argument: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}🔄 Restarting n8n...${NC}"
if [ "$DEBUG_MODE" = true ]; then
    echo -e "${YELLOW}🐛 Debug mode enabled - verbose logging activated${NC}"
fi

# Function to kill n8n processes
kill_n8n() {
    # Find n8n processes
    N8N_PIDS=$(pgrep -f "n8n" 2>/dev/null)

    if [ ! -z "$N8N_PIDS" ]; then
        echo -e "${YELLOW}📋 Found running n8n processes: $N8N_PIDS${NC}"

        # Try graceful shutdown first
        echo -e "${YELLOW}🛑 Attempting graceful shutdown...${NC}"
        pkill -TERM -f "n8n" 2>/dev/null

        # Wait longer for graceful shutdown to handle database cleanup
        sleep 5

        # Check if any n8n processes are still running
        REMAINING_PIDS=$(pgrep -f "n8n" 2>/dev/null)

        if [ ! -z "$REMAINING_PIDS" ]; then
            echo -e "${RED}⚠️  Forcefully killing remaining n8n processes: $REMAINING_PIDS${NC}"
            pkill -KILL -f "n8n" 2>/dev/null
            sleep 2
        fi

        echo -e "${GREEN}✅ Successfully stopped n8n processes${NC}"
    else
        echo -e "${GREEN}ℹ️  No running n8n processes found${NC}"
    fi
}

# Function to start n8n
start_n8n() {
    echo -e "${YELLOW}🚀 Starting n8n...${NC}"

    # Clean up any stale database locks (for SQLite)
    if [ -f ~/.n8n/database.sqlite.lock ]; then
        echo -e "${YELLOW}🧹 Removing stale database lock...${NC}"
        rm -f ~/.n8n/database.sqlite.lock
    fi

    # Set up environment variables
    export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
    export N8N_RUNNERS_ENABLED=true

    if [ "$DEBUG_MODE" = true ]; then
        echo -e "${YELLOW}🐛 Enabling comprehensive debug logging...${NC}"
        export N8N_LOG_LEVEL=debug
        export N8N_LOG_OUTPUT=console
        export DEBUG=n8n*,n8n-nodes-*
        export NODE_ENV=development
        export N8N_DETAILED_ERROR_OUTPUT=true
        echo -e "${YELLOW}Debug environment variables set:${NC}"
        echo -e "${YELLOW}  N8N_LOG_LEVEL=debug${NC}"
        echo -e "${YELLOW}  N8N_LOG_OUTPUT=console${NC}"
        echo -e "${YELLOW}  DEBUG=n8n*,n8n-nodes-*${NC}"
        echo -e "${YELLOW}  N8N_DETAILED_ERROR_OUTPUT=true${NC}"
    fi

    # Check if n8n is installed globally
    if command -v n8n &> /dev/null; then
        echo -e "${GREEN}📦 Using globally installed n8n${NC}"
        if [ "$DEBUG_MODE" = true ]; then
            # In debug mode, run in foreground with visible output
            echo -e "${YELLOW}🐛 Running n8n in debug mode (logs will be visible)${NC}"
            n8n &
        else
            nohup n8n > /dev/null 2>&1 &
        fi
    # Check if n8n is available via npx
    elif command -v npx &> /dev/null; then
        echo -e "${GREEN}📦 Using n8n via npx${NC}"
        if [ "$DEBUG_MODE" = true ]; then
            # In debug mode, run in foreground with visible output
            echo -e "${YELLOW}🐛 Running n8n in debug mode (logs will be visible)${NC}"
            npx n8n &
        else
            nohup npx n8n > /dev/null 2>&1 &
        fi
    else
        echo -e "${RED}❌ n8n not found. Please install n8n globally with: npm install -g n8n${NC}"
        exit 1
    fi

    # Wait for n8n to start
    sleep 3

    # Check if n8n is responding
    local retries=0
    local max_retries=10

    while [ $retries -lt $max_retries ]; do
        if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
            NEW_PID=$(pgrep -f "n8n" 2>/dev/null | tail -1)
            echo -e "${GREEN}✅ n8n started successfully with PID: $NEW_PID${NC}"
            echo -e "${GREEN}🌐 n8n is available at: http://localhost:5678${NC}"
            return 0
        fi

        retries=$((retries + 1))
        echo -e "${YELLOW}⏳ Waiting for n8n to be ready... ($retries/$max_retries)${NC}"
        sleep 2
    done

    echo -e "${RED}❌ n8n failed to start or become ready within timeout${NC}"
    return 1
}

# Main execution
kill_n8n
start_n8n

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 n8n restart completed!${NC}"
else
    echo -e "${RED}❌ n8n restart failed!${NC}"
    exit 1
fi
