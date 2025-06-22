![Banner image](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/main/assets/header-image.jpg)

# n8n-nodes-binalyze-air

## Table of Contents

- [What is Binalyze AIR?](#what-is-binalyze-air)
- [Features](#features)
  - [Acquisitions](#acquisitions)
  - [Assets](#assets)
  - [Auth](#auth)
  - [Auto Asset Tags](#auto-asset-tags)
  - [Baselines](#baselines)
  - [Cases](#cases)
  - [Evidence](#evidence)
  - [Notifications](#notifications)
  - [Organizations](#organizations)
  - [Params](#params)
  - [Policies](#policies)
  - [Repositories](#repositories)
  - [Settings](#settings)
  - [Tasks](#tasks)
  - [Triage Rules](#triage-rules)
  - [Users](#users)
- [Authentication](#authentication)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Testing](#testing)
- [Development](#development)
- [Support and Documentation](#support-and-documentation)
- [License](#license)

This package provides comprehensive n8n node integration for [Binalyze AIR](https://binalyze.com), enabling you to automate and integrate AIR's digital investigation and incident response capabilities directly into your n8n workflows.

## What is Binalyze AIR?

Binalyze AIR is a comprehensive digital investigation and incident response platform that enables organizations to collect, analyze, and manage digital evidence from endpoints, cloud services, and mobile devices. This n8n integration allows you to programmatically interact with AIR's core resources and automate investigation workflows.

## Features

The Binalyze AIR node provides access to fifteen main resource categories with comprehensive operations:

### Acquisitions

Manage acquisition profiles and evidence collection tasks:

- **Assign Evidence Acquisition Task** - Schedule evidence collection tasks on endpoints using predefined acquisition profiles with comprehensive filtering options including group, IP, platform, online status, and management status
- **Assign Image Acquisition Task** - Create disk imaging tasks for forensic analysis using acquisition profiles with endpoint filtering and volume selection capabilities
- **Create Acquisition Profile** - Build new acquisition profiles with custom artifact and evidence collection settings for different investigation scenarios
- **Create Off-Network Acquisition Task** - Generate acquisition tasks for offline or disconnected endpoints that can be executed when connectivity is restored
- **Delete Acquisition Profile** - Remove acquisition profiles and associated configurations from the system
- **Get** - Retrieve detailed information about specific acquisition profiles including settings, artifacts, and evidence types
- **Get Many** - Browse multiple acquisition profiles with filtering by organization and comprehensive search capabilities
- **Update Acquisition Profile** - Modify existing acquisition profiles including artifact settings, evidence types, and organizational assignments

### Assets

Manage endpoint assets and their operations:

- **Add Tags** - Apply metadata tags to assets based on filter criteria for bulk categorization and organization
- **Assign Task** - Create and assign tasks to assets with comprehensive filtering options including group, IP, platform, and status criteria
- **Get** - Retrieve detailed information about specific assets including system details, status, and metadata
- **Get Asset Tasks** - View all tasks associated with a specific asset for tracking and management
- **Get Many** - Browse multiple assets with advanced filtering by organization, platform, online status, isolation status, and comprehensive search capabilities
- **Purge and Uninstall** - Completely remove assets from the system including all associated data and configurations
- **Remove Tags** - Remove existing metadata tags from assets based on filter criteria for bulk tag management
- **Uninstall** - Remove assets from management without purging historical data and configurations

### Auth

Authentication and session management:

- **Check Authentication** - Verify current authentication status and retrieve user session information including user details, permissions, and session expiration

### Auto Asset Tags

Manage automated asset tagging rules and processes:

- **Get** - Retrieve details of a specific auto asset tag by ID or name
- **Get Many** - Retrieve multiple auto asset tags with filtering, pagination, and organization-scoped access

### Baselines

Manage system baseline acquisition and comparison operations:

- **Acquire Baseline** - Initiate baseline acquisition for endpoints with comprehensive filtering options including group, IP, isolation status, and platform-specific criteria
- **Compare Baseline** - Compare current task results against established baselines for change detection
- **Get Comparison Report** - Retrieve detailed baseline comparison reports for analysis

### Cases

Comprehensive case management for digital investigations:

- **Archive Case** - Archive completed cases to maintain organized case history
- **Change Owner** - Transfer case ownership between users for workload management
- **Check Name** - Verify case name availability before creation to prevent duplicates
- **Close Case** - Mark cases as completed and finalize investigation status
- **Create** - Create new investigation cases with detailed metadata and organization assignment
- **Get** - Retrieve comprehensive details of specific cases including all associated data
- **Get Activities** - Access complete case activity logs and audit trails
- **Get Endpoints** - List all endpoints associated with a case for scope management
- **Get Many** - Browse multiple cases with advanced filtering, pagination, and search capabilities
- **Get Tasks** - View all tasks assigned to a case for progress tracking
- **Get Users** - List users assigned to a case for collaboration management
- **Import Task Assignments** - Bulk import task assignments from external sources
- **Open Case** - Reactivate archived or closed cases for continued investigation
- **Remove Endpoints** - Remove specific endpoints from case scope
- **Remove Task Assignment** - Unassign specific tasks from cases
- **Update** - Modify case details, metadata, and configuration settings

### Evidence

Manage evidence files and downloads for digital forensics:

- **Download PPC File** - Download endpoint PPC (Portable Case) files containing collected evidence with comprehensive filtering options including group, IP, platform, online status, and management status
- **Download Task Report** - Download detailed task execution reports in multiple formats (PDF, HTML, JSON) with endpoint filtering and customizable reporting options
- **Get PPC File Info** - Retrieve detailed information about PPC files including file size, path, creation date, and associated task metadata

### Notifications

Manage user notifications and notification status:

- **Delete All Notifications** - Remove all notifications for the current user to clear notification history
- **Get Many** - Retrieve multiple notifications with filtering by read status, type, and comprehensive search capabilities
- **Mark All as Read** - Mark all notifications as read for the current user to clear unread indicators
- **Mark as Read by ID** - Mark a specific notification as read by its unique identifier

### Organizations

Manage organizational structure and user assignments:

- **Add Tags** - Apply metadata tags to organizations for categorization and filtering
- **Assign Users** - Add users to organizations with appropriate access permissions
- **Check Name Exists** - Verify organization name availability to prevent conflicts
- **Create** - Create new organizations with contact information and deployment settings
- **Delete** - Remove organizations and associated configurations
- **Get** - Retrieve detailed organization information including settings and metadata
- **Get Many** - Browse multiple organizations with comprehensive filtering options
- **Get Shareable Deployment Info** - Access deployment package information for agent distribution
- **Get Users** - List all users assigned to an organization with role information
- **Remove Tags** - Remove existing metadata tags from organizations
- **Remove User** - Unassign users from organizations while preserving user accounts
- **Update** - Modify organization details, settings, and configuration
- **Update Deployment Token** - Regenerate deployment tokens for enhanced security
- **Update Shareable Deployment** - Configure shareable deployment settings and access permissions

### Params

Retrieve system configuration parameters and data for integration with other tools and processes:

- **Get Acquisition Artifacts** - Retrieve the list of available acquisition artifacts including file types, registry keys, and system information that can be collected during evidence acquisition processes
- **Get Acquisition Evidence** - Retrieve the list of available evidence types that can be collected during acquisition tasks including memory dumps, disk images, and system logs
- **Get Drone Analyzers** - Retrieve the list of available analysis engines and tools that can be used to process collected evidence and generate insights
- **Get E-Discovery Patterns** - Retrieve predefined e-discovery search patterns and filters for legal and compliance investigations including keyword searches and content filters
- **Get MITRE ATT&CK Techniques** - Retrieve the complete list of MITRE ATT&CK framework techniques and tactics available for threat hunting and security analysis

### Policies

Manage security policies for endpoint protection and compliance:

- **Create Policy** - Create new security policies with custom rules, priority settings, and organizational assignments for comprehensive endpoint protection
- **Delete Policy** - Remove security policies and associated configurations from the system while preserving historical data
- **Get** - Retrieve detailed information about specific policies including rules, priority, enabled status, and metadata
- **Get Many** - Browse multiple policies with filtering by organization, enabled status, name, description, and comprehensive search capabilities
- **Get Policy Match Stats** - Generate statistics showing how many endpoints match specific policy criteria with detailed filtering options including group, IP, platform, online status, isolation status, and management status
- **Update Policy** - Modify existing policies including rules, priority, enabled status, and organizational assignments
- **Update Policies Priorities** - Bulk update priority settings for multiple policies to optimize policy execution order and system performance

### Repositories

Manage evidence storage and repository configurations:

- **Get** - Retrieve details of specific evidence repositories by ID or name
- **Get Many** - Browse multiple repositories with filtering by type, organization, host, path, and search capabilities

### Settings

Manage system settings and configuration:

- **Update Banner Message** - Update the system banner message that is displayed to users, with options to enable or disable the banner and customize the message content

### Tasks

Manage task execution and monitoring operations:

- **Cancel Task** - Stop running tasks to free up system resources
- **Cancel Task Assignment** - Cancel specific task assignments while preserving the base task
- **Delete Task** - Permanently remove tasks and associated data from the system
- **Delete Task Assignment** - Remove specific task assignments from cases or endpoints
- **Get** - Retrieve comprehensive details of specific tasks including status and results
- **Get Many** - Browse multiple tasks with filtering by organization, execution type, name, and status
- **Get Task Assignments** - List all assignments for a specific task across different cases

### Triage Rules

Manage detection and analysis rules for threat hunting and automated analysis:

- **Assign Triage Task** - Create and assign triage tasks to cases with endpoint filtering and scheduling options
- **Create Triage Rule** - Build new detection rules using YARA, Sigma, or osquery engines
- **Create Triage Rule Tag** - Create organizational tags for rule categorization and management
- **Delete Triage Rule** - Remove triage rules and associated configurations from the system
- **Get** - Retrieve detailed information about specific triage rules including content and metadata
- **Get Many** - Browse multiple triage rules with filtering by organization, engine type, tags, and search capabilities
- **Get Triage Rule Tags** - List available rule tags for organization and filtering purposes
- **Update Triage Rule** - Modify existing triage rules including content, settings, and organizational assignments
- **Validate Triage Rule** - Verify rule syntax and content for YARA, Sigma, and osquery engines before deployment

### Users

Manage user accounts and access permissions:

- **Get** - Retrieve detailed information about specific users by ID, username, or email
- **Get Many** - Browse multiple users with filtering by organization, roles, and comprehensive search capabilities

## Authentication

The node uses API token-based authentication:

- **AIR Instance URL** - The base URL of your Binalyze AIR instance (e.g., `https://air-demo.binalyze.com`)
- **AIR API Token** - A valid API token generated from your AIR instance's Integrations > API Tokens section

Most resources support n8n Resource Locator pattern for a better UX:
- **From List** - Select from a searchable dropdown of available items
- **By ID** - Direct identification using numeric or GUID identifiers
- **By Name** - Human-readable identification using names

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and npm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  npm install n8n -g
  ```

## Installation

To use this node in your n8n instance:

1. Install the package:
   ```bash
   npm install n8n-nodes-binalyze-air
   ```

2. Restart your n8n instance to load the new node.

3. Configure your Binalyze AIR credentials in n8n:
   - Go to Settings > Credentials
   - Add new credential for "Binalyze AIR Credentials API"
   - Enter your AIR instance URL and API token

## Testing

The project includes a test suite workflow that demonstrates all available operations and provides comprehensive testing scenarios.

### Download Test Suite

1. Create a `.env.local.yml` file in the root directory with your n8n API token:
   ```yaml
   N8N:
     API_TOKEN: your_actual_api_token_here
   ```

2. Generate an API token in your n8n instance:
   - Go to Settings → API → Personal access tokens
   - Create a new token with appropriate permissions

3. Download the test suite workflow:
   ```bash
   npm run test:download
   ```

This downloads the `n8n-nodes-binalyze-air-spec` workflow from your local n8n instance at http://localhost:5678 and saves it as `n8n-nodes-binalyze-air-spec.json` in the test directory.

The test suite workflow includes comprehensive examples for all supported operations across auto asset tags, organizations, users, evidence repositories, and triage rules.

## Development

For detailed guidance on creating and publishing nodes, refer to the [n8n documentation](https://docs.n8n.io/integrations/creating-nodes/).

### Development Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/binalyze/n8n-nodes-binalyze-air.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link for local development:
   ```bash
   npm link
   ```

5. Go to ~/.n8n/nodes/node_modules folder and link to the package:
   ```bash
   npm link n8n-nodes-binalyze-air 
   ```

6. Restart n8n to see Binalyze AIR as a community package:
   ```bash
   n8n start
   ```

### Development Commands

- **Build**: `npm run build`
- **Development**: `npm run dev`
- **Linting**: `npm run lint`
- **Auto-fix linting**: `npm run lintfix`
- **Download n8n test suite workflow**: `npm run test:download`

## Support and Documentation

- [Binalyze AIR Documentation](https://kb.binalyze.com)
- [n8n Documentation](https://docs.n8n.io)
- [Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)

## License

[MIT](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/master/LICENSE.md)
