# Test Directory

This directory contains testing utilities for the n8n-nodes-binalyze-air project.

## Workflow Download Script

The `download_workflow.py` script allows you to download workflows from your local n8n instance.

### Setup

1. Create a `.env.local.yml` file in the root directory of the project with your N8N API token:
   ```yaml
   N8N:
     API_TOKEN: your_actual_api_token_here
   ```

2. Generate an API token in your n8n instance:
   - Go to Settings → API → Personal access tokens
   - Create a new token with appropriate permissions

### Usage

Run the download script using the npm script:

```bash
npm run test:download
```

This will:
- Install required Python dependencies (requests, PyYAML)
- Download the workflow named 'n8n-nodes-binalyze-air-spec' from http://localhost:5678
- Save it as `n8n-nodes-binalyze-air-spec.json` in the test directory

### Files

- `download_workflow.py` - Main script for downloading workflows
- `requirements.txt` - Python dependencies
- `env.example` - Example YAML environment file showing required variables
- `n8n-nodes-binalyze-air-spec.json` - Downloaded workflow (created after running the script) 
