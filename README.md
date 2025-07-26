![Banner image](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/main/assets/header-image.jpg)

# n8n-nodes-binalyze-air

This is an n8n community node that integrates with Binalyze AIR (Automated Incident Response) platform.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Supported Resources](#supported-resources)
  - [Acquisitions](#acquisitions)
  - [Assets](#assets)
  - [Baselines](#baselines)
  - [Cases](#cases)
  - [Evidence](#evidence)
  - [InterACT](#interact)
  - [Organizations](#organizations)
  - [Repositories](#repositories)
  - [Tasks](#tasks)
  - [Triage Rules](#triage-rules)
  - [Users](#users)
- [Development](#development)
- [Testing](#testing)
- [TODO](#todo)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/verified-install/) in the n8n community nodes documentation.

## Configuration

Before using this node, you need to configure your Binalyze AIR credentials:

### Step 1: Create AIR API Key

1. Go to AIR > Integrations > API Tokens > Add New
	* Provide a Token Name
	* Select an Organization
	* Select a Role
	* Define Expiration time
2. Click Save button, and copy the token as you will not be able to see it again
3. Click 'I got the token' button

### Step 2: Create AIR Credentials on your n8n instance

1. In n8n, go to Settings → Credentials
2. Add a new credential for "Binalyze AIR API"
3. Enter your AIR instance URL and API token

## Supported Resources

This node provides comprehensive coverage of Binalyze AIR's features listed below:

### Acquisitions
Manage evidence acquisition profiles and tasks with comprehensive configuration options.

**Operations:**
- `get` - Retrieve a specific acquisition profile
  - **Enhanced Features:**
    - **Organization Selection:** Select the organization that owns the acquisition profile
    - **Filtered Profile Selection:** Acquisition profiles are automatically filtered based on the selected organization
- `assignEvidenceTask` - Assign an evidence acquisition task by filter with advanced configuration
  - **Enhanced Features:**
    - **Enable DRONE:** Toggle DRONE analysis with AutoPilot and MITRE ATT&CK detection (required)
    - **Save To Configuration:** Choose between local storage or evidence repositories
      - **Local Storage:** Configure platform-specific paths for Windows, Linux, and macOS (when custom paths are needed)
      - **Repository Storage:** Select evidence repositories with resource locator support
      - **Volume Management:** Automatically use the most free volume (default) or configure custom paths per platform
    - **Task Configuration:** Comprehensive task customization with policy or custom options
    - **Evidence Repository Selection:** Choose evidence repositories for automatic evidence storage
    - **Platform Configuration:** Automatic repository configuration for Windows, Linux, macOS, and AIX
    - **Resource Management:** CPU limits, bandwidth limits, disk space reservation
    - **Compression & Encryption:** Enable compression and optional encryption with password protection
    - **Advanced Endpoint Filtering:** Filter by platform, status, tags, organization, IP address, etc.
- `assignImageTask` - Assign an image acquisition task by filter with advanced configuration
  - **Enhanced Features:**
    - Same comprehensive configuration options as evidence tasks
    - Disk imaging specific settings and parameters
- `createOffNetworkTask` - Create an off-network acquisition task

### Assets
Manage endpoints and their associated tasks, tags, and status.

**Operations:**
- `addTags` - Add tags to assets by filter
- `get` - Retrieve a specific asset
- `getAssetTasks` - Get tasks for a specific asset
- `getAll` - Retrieve many assets
  - **Enhanced Features:**
    - **Organization Selection:** Required organization selection to filter assets by organization
- `removeTags` - Remove tags from assets by filter

### Baselines
Acquire and compare system baselines.

**Operations:**
- `acquireBaseline` - Acquire baseline for endpoints
  - **Enhanced Features:**
    - **Organization Selection:** Select an organization using resource locator (by list or ID)
      - Automatically filters available cases based on the selected organization
      - Organization ID is included in the endpoint filters for baseline acquisition
      - When "All Organizations" (ID: 0) is selected, all organizations are included in the baseline acquisition
    - **Case Selection:** Select a case using resource locator (by list or ID)
    - **Endpoint Filters (Required):** At least one filter must be defined to target specific endpoints
      - Filter by endpoint name, IP address, management status, online status, platform
      - Filter by search term, tags, group path/ID, isolation status, issue, policy, version
      - Filter by organization IDs, include/exclude specific endpoint IDs
- `compareBaseline` - Compare two baseline acquisition results from the same endpoint
  - **Enhanced Features:**
    - **Organization Selection:** Select an organization using resource locator (by list or ID)
      - Filters available assets based on the selected organization
    - **Asset Selection:** Select an asset using resource locator (by list or ID)
      - Automatically filters available baseline acquisition tasks based on the selected asset
    - **Baseline 1:** Select the first baseline acquisition task using resource locator (by list or ID)
      - Must be a completed baseline acquisition task from the selected asset
    - **Baseline 2:** Select the second baseline acquisition task using resource locator (by list or ID)
      - Must be a completed baseline acquisition task from the selected asset
    - **Important Notes:**
      - Both tasks must be baseline acquisition tasks (not regular acquisition tasks)
      - Both tasks must have been executed on the same endpoint/asset
      - Both tasks must have completed successfully
      - The two tasks must be different (cannot compare a task with itself)
      - The task list shows only baseline acquisition tasks that were executed on the selected asset
- `getComparisonReport` - Get baseline comparison report

### Cases
Manage incident response cases, notes, and activities.

**Operations:**
- `archiveCase` - Archive a specific case
- `changeOwner` - Change the owner of a case
- `checkName` - Check if a case name is available
- `closeCase` - Close a specific case
- `create` - Create a new case
- `get` - Retrieve a specific case
- `getActivities` - Get activities for a specific case
- `getEndpoints` - Get endpoints for a specific case
- `getAll` - Retrieve many cases
- `getTasks` - Get tasks for a specific case
- `getUsers` - Get users for a specific case
- `importTaskAssignments` - Import task assignments to a case
- `openCase` - Open a specific case
- `removeEndpoints` - Remove endpoints from a case
- `removeTaskAssignment` - Remove a task assignment from a case
- `update` - Update a specific case

### Evidence
Download and manage evidence files and reports.

**Operations:**
- `downloadPpc` - Download endpoint PPC file
- `downloadReport` - Download endpoint task report
- `getPpcInfo` - Get endpoint PPC file information

### InterACT
Execute commands and interact with endpoints remotely.

**Operations:**
- `assignTask` - Assign an InterACT shell task to endpoints
- `closeSession` - Close an InterACT session
- `executeCommand` - Execute a command in an InterACT session
- `executeAsyncCommand` - Execute an asynchronous command in an InterACT session
- `getCommandMessage` - Get the result of a command execution
- `interruptCommand` - Interrupt a running command

### Organizations
Manage organizations and their users.

**Operations:**
- `addTags` - Add tags to an organization
- `assignUsers` - Assign users to an organization
- `checkNameExists` - Check if an organization name already exists
- `create` - Create a new organization
- `get` - Retrieve a specific organization
- `getAll` - Retrieve many organizations
- `getShareableDeploymentInfo` - Get shareable deployment information
- `getUsers` - Retrieve users assigned to an organization
- `removeTags` - Remove tags from an organization
- `removeUser` - Remove a user from an organization
- `update` - Update an organization
- `updateShareableDeployment` - Update organization shareable deployment status

### Repositories
Manage evidence repositories with comprehensive filtering and search capabilities.

**Operations:**
- `get` - Get a repository by name, ID, or from list selection
- `getAll` - Get many repositories with advanced filtering options
  - **Enhanced Filtering:** Filter by host, path, username, name, repository type (multiple selection)
  - **Organization Support:** Filter by organization with support for all organizations option
  - **Search Capabilities:** Full-text search with partial name matching
  - **Repository Types:** Support for SMB, SFTP, FTPS, Amazon S3, and Azure Storage repositories
  - **Pagination Support:** Configurable page size and page number for large result sets

### Tasks
Manage and monitor tasks and assignments.

**Operations:**
- `cancelTask` - Cancel a specific task
- `cancelTaskAssignment` - Cancel a specific task assignment
- `deleteTask` - Delete a specific task
- `deleteTaskAssignment` - Delete a specific task assignment
- `get` - Retrieve a specific task
- `getAll` - Retrieve many tasks
- `getTaskAssignments` - Retrieve assignments for a specific task

### Triage Rules
Create and manage triage rules for automated analysis.

**Operations:**
- `assignTask` - Assign a triage task
- `create` - Create a new triage rule
- `createTag` - Create a new rule tag
- `delete` - Delete a triage rule
- `get` - Retrieve a specific triage rule
- `getAll` - Retrieve many triage rules
- `getRuleTags` - Retrieve rule tags
- `update` - Update a triage rule
- `validate` - Validate a triage rule

### Users
Manage user accounts and permissions.

**Operations:**
- `getAll` - Retrieve many users
- `get` - Retrieve a specific user

## Development

To set up the development environment:

1. Clone this repository
2. Install dependencies: `yarn install`
3. Build the project: `yarn build`
4. Link the project using: 
   - `npm link`
   - `npm link n8n-nodes-binalyze-air`
5. Start the development environment:
   - `yarn dev` - Start n8n in watch mode with automatic rebuilds
   - `yarn debug` - Start n8n in debug mode with verbose logging

### Development Scripts

- `yarn build` - Build the project
- `yarn dev` - Start development environment with file watching
- `yarn debug` - Start development environment with debug logging enabled
- `yarn restart:n8n` - Restart n8n without rebuilding

### Debug Mode

The `yarn debug` command enables comprehensive debug logging to help troubleshoot issues:

**Features:**
- **Verbose Logging**: Sets `N8N_LOG_LEVEL=debug` for detailed n8n logs
- **Console Output**: Direct log output to console (`N8N_LOG_OUTPUT=console`)
- **Debug Patterns**: Enables debug output for n8n core and community nodes (`DEBUG=n8n*,n8n-nodes-*`)
- **Error Details**: Shows detailed error information (`N8N_DETAILED_ERROR_OUTPUT=true`)
- **Development Mode**: Sets `NODE_ENV=development` for enhanced debugging

**Usage:**
```bash
# Start development with debug logging
yarn debug

# Or manually start debug mode
./scripts/dev-watch.sh --debug
./scripts/restart-n8n.sh --debug
```

**Debug Output Examples:**
```
16:38:21.490   debug   Loaded all credentials and nodes from n8n-nodes-binalyze-air { "credentials": 1, "nodes": 1 }
16:38:21.662   info    n8n ready on ::, port 5678
16:38:23.607   info    Version: 1.103.2
```

When debug mode is active, you'll see detailed information about:
- Node and credential loading
- API requests and responses
- Workflow execution steps
- Error stack traces
- Internal n8n operations

## Testing

The project includes an end-to-end testing workflow that can be managed using the e2e.js script.

### Prerequisites

1. Create a `.env.local.yml` file in the project root with your credentials:
   ```yaml
   # n8n instance configuration
   N8N:
     INSTANCE_URL: http://127.0.0.1:5678
     API_TOKEN: your_n8n_api_token_here
   ```

2. Ensure your n8n instance is running and you have a valid API token.

### Download Test Workflow

To download the test workflow from your n8n instance:
```bash
npm run test:download
# or
yarn test:download
```
Or using the Node.js script directly:
```bash
node test/e2e.js download
```

This will download the `n8n-nodes-binalyze-air-e2e` workflow and save it to `test/n8n-nodes-binalyze-air-e2e.json`.

### Command Options

Both commands support additional options:

```bash
# Use a custom n8n instance URL
node test/e2e.js download --url http://n8n.example.com:5678

# Use a custom workflow name
node test/e2e.js download --name my-custom-workflow

# Use a custom output file
node test/e2e.js download --file my-workflow.json
```

### Error Response Formats Supported

1. **Standard HTTP Error Format**:
   ```json
   {
     "message": [
       "name is required",
       "name should not be empty"
     ],
     "error": "Bad Request",
     "statusCode": 400
   }
   ```

2. **AIR API Error Format**:
   ```json
   {
     "success": false,
     "errors": ["Invalid parameter", "Missing required field"],
     "statusCode": 400
   }
   ```

## TODO
- Add Asset isolation, shutdown, and reboot
- Add Triggers / Event Subscriptions
