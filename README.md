![Banner image](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/main/assets/header-image.jpg)

# n8n-nodes-binalyze-air

## Table of Contents

- [What is Binalyze AIR?](#what-is-binalyze-air)
- [Features](#features)
  - [Auto Asset Tags](#auto-asset-tags)
  - [Organizations](#organizations)
  - [Users](#users)
  - [Evidence Repositories](#evidence-repositories)
  - [Triage Rules](#triage-rules)
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

The Binalyze AIR node provides access to five main resource categories with comprehensive operations:

### Auto Asset Tags

Manage automated asset tagging rules and processes:

- **Get** - Retrieve details of a specific auto asset tag by ID
- **Get Many** - Retrieve multiple auto asset tags with filtering and pagination
- **Start Tagging** - Initiate automated tagging processes on filtered endpoints

Features include platform-specific conditions for Linux, Windows, and macOS systems, complex condition logic with AND/OR operators, and support for various condition types including hostname, IP address, subnet, osquery, process, file, and directory.

### Organizations

Manage organizations within your AIR instance:

- **Get Organization** - Retrieve details of a specific organization by ID or name
- **Get Many Organizations** - Retrieve multiple organizations with filtering and pagination
- **Create Organization** - Create new organizations with contact information and settings
- **Get Users** - Retrieve users assigned to a specific organization
- **Add Tags** - Add metadata tags to organizations for better categorization
- **Remove Tags** - Remove existing tags from organizations

### Users

Manage user accounts and permissions:

- **Get User** - Retrieve details of a specific user by ID, username, or email
- **Get Many Users** - Retrieve multiple users with advanced filtering options

Features include filtering by organization membership, role-based filtering, search by username or email, and sorting capabilities.

### Evidence Repositories

Manage evidence storage and repositories:

- **Get Repository** - Retrieve details of a specific evidence repository by ID or name
- **Get Many Repositories** - Retrieve multiple repositories with comprehensive filtering

Features include organization-scoped repository access, filtering by host, path, or name, and support for different repository types.

### Triage Rules

Manage detection and analysis rules for threat hunting:

- **Get Triage Rule** - Retrieve details of a specific triage rule by ID or name
- **Get Many Triage Rules** - Retrieve multiple triage rules with comprehensive filtering
- **Create Triage Rule** - Create new triage rules for detection and analysis
- **Update Triage Rule** - Modify existing triage rules by ID or name
- **Delete Triage Rule** - Remove triage rules by ID or name
- **Validate Triage Rule** - Validate rule syntax and content for YARA, Sigma, and osquery engines
- **Assign Triage Task** - Assign triage tasks to cases with endpoint filtering
- **Get Rule Tags** - Retrieve rule tags with organization filtering
- **Create Rule Tag** - Create new rule tags with organization selection

Features include support for multiple detection engines (YARA, Sigma, and osquery), flexible search locations, and comprehensive CRUD operations.

## Authentication

The node uses API token-based authentication:

- **AIR Instance URL** - The base URL of your Binalyze AIR instance (e.g., `https://air-demo.binalyze.com`)
- **AIR API Token** - A valid API token generated from your AIR instance's Integrations > API Tokens section

All resources support flexible identification methods:
- **From List** - Select from a searchable dropdown of available items
- **By ID** - Direct identification using numeric or GUID identifiers
- **By Name/Username** - Human-readable identification using names or usernames

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
