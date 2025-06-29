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
  - [Authentication](#authentication)
  - [Baselines](#baselines)
  - [Cases](#cases)
  - [Evidence](#evidence)
  - [InterACT](#interact)
  - [Notifications](#notifications)
  - [Organizations](#organizations)
  - [Policies](#policies)
  - [Repositories](#repositories)
  - [Settings](#settings)
  - [Tasks](#tasks)
  - [Triage Rules](#triage-rules)
  - [Users](#users)
- [Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Configuration

Before using this node, you need to configure your Binalyze AIR credentials:

1. In n8n, go to Settings → Credentials
2. Add a new credential for "Binalyze AIR API"
3. Enter your AIR instance URL and API token

## Error Handling

This node implements comprehensive error handling for all API operations:

- **HTTP Error Responses**: Properly converts API error responses (including validation errors) to n8n errors
- **Multiple Error Formats**: Supports both standard HTTP error format and AIR API-specific error format
- **Detailed Error Information**: Provides context-specific error messages with operation details
- **Validation Error Support**: Handles arrays of validation errors from the API
- **Graceful Degradation**: Continues on failure when configured to do so

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

## Supported Resources

### Acquisitions
Manage evidence acquisition profiles and tasks.

### Assets
Manage endpoints and their associated tasks, tags, and status.

### Auto Asset Tags
Create and manage automatic asset tagging rules.

### Authentication
Verify authentication status.

### Baselines
Acquire and compare system baselines.

### Cases
Manage incident response cases, notes, and activities.

### Evidence
Download and manage evidence files and reports.

### InterACT
Execute commands and interact with endpoints remotely.

### Notifications
Manage system notifications.

### Organizations
Manage organizations and their users.

### Policies
Create and manage collection policies.

### Repositories
Manage evidence repositories.

### Settings
Access system settings.

### Tasks
Manage and monitor tasks and assignments.

### Triage Rules
Create and manage triage rules for automated analysis.

### Users
Manage user accounts and permissions.

## Development

To set up the development environment:

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Link for local development: `npm run dev:link`

For detailed development instructions, see [GUIDELINES.md](GUIDELINES.md).
