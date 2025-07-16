# Test Directory

This directory contains end-to-end testing utilities for the n8n-nodes-binalyze-air project.

## E2E Testing Script

The `e2e.py` script downloads the latest test suite used for testing node's functionality.

### Features

- **Download workflows** from your n8n instance

### Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. The script will automatically prompt for your n8n API token on first use, or you can manually create `.env.local.yml` in the root directory:
   ```yaml
   N8N:
     API_TOKEN: your_actual_api_token_here
   ```

3. To get your API token:
   - Go to your n8n instance (default: http://localhost:5678)
   - Navigate to Settings → API
   - Create a new API key or copy an existing one

### Usage

#### Download a workflow from n8n:
```bash
python test/e2e.py download
```

#### Using npm scripts:
```bash
# Download workflow
yarn test:download
```

#### Advanced options:

### Files

- `e2e.py` - Main script for downloading and uploading workflows
- `requirements.txt` - Python dependencies (requests, PyYAML)
- `env.example` - Example YAML environment file showing required variables
- `n8n-nodes-binalyze-air-e2e.json` - Test workflow for running a quick e2e test
