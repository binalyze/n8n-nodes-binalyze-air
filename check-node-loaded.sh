#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Binalyze AIR Node Status${NC}"
echo -e "${BLUE}=================================${NC}"

# Check if n8n is running
if ! pgrep -f "n8n" > /dev/null; then
    echo -e "${RED}❌ n8n is not running${NC}"
    echo -e "${YELLOW}💡 Start n8n with: ./restart-n8n.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ n8n is running${NC}"

# Check if the node is linked in ~/.n8n/nodes
if [ -L ~/.n8n/nodes/node_modules/n8n-nodes-binalyze-air ]; then
    echo -e "${GREEN}✅ Node is linked in ~/.n8n/nodes${NC}"
    echo -e "${BLUE}   Link target: $(readlink ~/.n8n/nodes/node_modules/n8n-nodes-binalyze-air)${NC}"
else
    echo -e "${RED}❌ Node is not linked in ~/.n8n/nodes${NC}"
    echo -e "${YELLOW}💡 Run: ./setup-dev-link.sh${NC}"
fi

# Check if dist folder exists and has the required files
if [ -d "./dist" ]; then
    echo -e "${GREEN}✅ dist folder exists${NC}"

    if [ -f "./dist/nodes/Air/Air.node.js" ]; then
        echo -e "${GREEN}✅ Node JavaScript file exists${NC}"
    else
        echo -e "${RED}❌ Node JavaScript file missing${NC}"
        echo -e "${YELLOW}💡 Run: npm run build${NC}"
    fi

    if [ -f "./dist/credentials/AirApi.credentials.js" ]; then
        echo -e "${GREEN}✅ Credentials JavaScript file exists${NC}"
    else
        echo -e "${RED}❌ Credentials JavaScript file missing${NC}"
        echo -e "${YELLOW}💡 Run: npm run build${NC}"
    fi
else
    echo -e "${RED}❌ dist folder does not exist${NC}"
    echo -e "${YELLOW}💡 Run: npm run build${NC}"
fi

echo -e "\n${BLUE}🌐 n8n is available at: http://localhost:5678${NC}"
echo -e "${YELLOW}💡 Look for 'Binalyze AIR' in the node palette${NC}"
