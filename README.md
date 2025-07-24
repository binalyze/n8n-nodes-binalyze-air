![Banner image](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/main/assets/header-image.jpg)

# n8n-nodes-binalyze-air

This is an n8n community node that integrates with Binalyze AIR (Automated Incident Response) platform.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Supported Resources](#supported-resources)
  - [Acquisitions](#acquisitions)
  - [Assets](#assets)
  - [Auto Asset Tags](#auto-asset-tags)
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
- `assignEvidenceTask` - Assign an evidence acquisition task by filter with advanced configuration
  - **Enhanced Features:**
    - Task naming and scheduling (immediate or scheduled execution)
    - Task configuration (CPU limits, bandwidth limits, disk space limits, compression settings)
    - Drone analysis configuration (auto-pilot mode, custom analyzers, MITRE ATT&CK framework)
    - Event log collection settings (date ranges, event count limits)
    - Advanced endpoint filtering (by platform, status, tags, organization, etc.)
- `assignImageTask` - Assign an image acquisition task by filter with advanced configuration
  - **Enhanced Features:**
    - Same comprehensive configuration options as evidence tasks
    - Disk imaging specific settings and parameters
- `createOffNetworkTask` - Create an off-network acquisition task
- `get` - Retrieve a specific acquisition profile

### Assets
Manage endpoints and their associated tasks, tags, and status.

**Operations:**
- `addTags` - Add tags to assets by filter
- `assignTask` - Assign task to assets
- `get` - Retrieve a specific asset
- `getAssetTasks` - Get tasks for a specific asset
- `getAll` - Retrieve many assets
- `purgeAndUninstall` - Purge and uninstall assets by filter
- `removeTags` - Remove tags from assets by filter
- `uninstall` - Uninstall assets without purge by filter

### Auto Asset Tags
Create and manage automatic asset tagging rules.

**Operations:**
- `create` - Create a new auto asset tag
- `delete` - Delete an auto asset tag
- `get` - Retrieve a specific auto asset tag
- `getAll` - Retrieve many auto asset tags
- `startTagging` - Start the tagging process for an auto asset tag
- `update` - Update an auto asset tag

### Baselines
Acquire and compare system baselines.

**Operations:**
- `acquireBaseline` - Acquire baseline for endpoints
- `compareBaseline` - Compare baseline with task results
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
Manage evidence repositories.

**Operations:**
- `get` - Get a repository by name
- `getAll` - Get many repositories

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
3. Link the project using: 
 - `npm link` 
 - `npm link n8n-nodes-binalyze-air` 
4. And then run: `yarn dev` to start n8n in watch mode

## Testing

The project includes an end-to-end testing workflow that can be managed using the e2e.py script.

### Prerequisites

1. Create a `.env.local.yml` file in the project root with your credentials:
   ```yaml
   # Binalyze AIR credentials for creating test credentials in n8n
   AIR:
     INSTANCE_URL: https://your-air-instance.binalyze.io
     API_TOKEN: api_xxxxxxxxxxxxxxxxxxxxxxxxxx

   # n8n instance configuration
   N8N:
     INSTANCE_URL: http://127.0.0.1:5678
     API_TOKEN: your_n8n_api_token_here
   ```

2. Ensure your n8n instance is running and you have a valid API token.

### Download Test Workflow

To download the test workflow from your n8n instance:
```bash
yarn test:download
```
Or using the Python script directly:
```bash
python test/e2e.py download
```

This will download the `n8n-nodes-binalyze-air-e2e` workflow and save it to `test/n8n-nodes-binalyze-air-e2e.json`.

### Command Options

Both commands support additional options:

```bash
# Use a custom n8n instance URL
python test/e2e.py download --url http://n8n.example.com:5678

# Use a custom workflow name
python test/e2e.py download --name my-custom-workflow
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
