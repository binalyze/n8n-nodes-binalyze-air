#!/bin/bash

# Setup development link for n8n custom node
echo "Setting up development link for Binalyze AIR n8n node..."

# Build the project first
echo "Building the project..."
npm run build

# Check if ~/.n8n/nodes directory exists, create if not
if [ ! -d ~/.n8n/nodes ]; then
    echo "Creating ~/.n8n/nodes directory..."
    mkdir -p ~/.n8n/nodes
fi

# Navigate to n8n nodes directory
cd ~/.n8n/nodes

# Install/link the custom node
echo "Installing custom node in n8n nodes directory..."
npm install ~/Projects/Binalyze/n8n-nodes-binalyze-air

echo "✅ Development link setup complete!"
echo "Your custom node should now be available in n8n."
echo "Restart n8n to see the changes."
