![Banner image](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/main/assets/header-image.jpg)

# n8n-nodes-binalyze-air

This package provides comprehensive n8n node integration for [Binalyze AIR](https://binalyze.com), enabling you to automate and integrate AIR's digital investigation and incident response capabilities directly into your n8n workflows.

## What is Binalyze AIR?

Binalyze AIR is a comprehensive digital investigation and incident response platform that enables organizations to collect, analyze, and manage digital evidence from endpoints, cloud services, and mobile devices. This n8n integration allows you to programmatically interact with AIR's core resources and automate investigation workflows.

## Features

The Binalyze AIR node provides access to five main resource categories with comprehensive operations:

### 🏷️ Auto Asset Tags

Manage automated asset tagging rules and processes:

- **Get** - Retrieve details of a specific auto asset tag by ID
- **Get Many** - Retrieve multiple auto asset tags with filtering and pagination
- **Start Tagging** - Initiate automated tagging processes on filtered endpoints

**Auto Asset Tag Features:**
- Platform-specific conditions for Linux, Windows, and macOS systems
- Complex condition logic with AND/OR operators
- Support for various condition types: hostname, IP address, subnet, osquery, process, file, directory
- Flexible condition operators: running, exist, is, contains, starts-with, ends-with, in-range, has-result, not-running, not-exist, has-no-result
- Scheduled tagging operations with immediate or scheduled execution
- Advanced endpoint filtering for targeted tagging operations
- Organization-scoped access with configurable organization ID filtering (default: 0 for all organizations)

### 🏢 Organizations

Manage organizations within your AIR instance:

- **Get Organization** - Retrieve details of a specific organization by ID or name
- **Get Many Organizations** - Retrieve multiple organizations with filtering and pagination
- **Create Organization** - Create new organizations with contact information and settings
- **Get Users** - Retrieve users assigned to a specific organization
- **Add Tags** - Add metadata tags to organizations for better categorization
- **Remove Tags** - Remove existing tags from organizations

**Organization Features:**
- Support for shareable deployment configuration
- Contact person management
- Tag-based organization for improved searchability
- Flexible identification by ID or name

### 👤 Users

Manage user accounts and permissions:

- **Get User** - Retrieve details of a specific user by ID, username, or email
- **Get Many Users** - Retrieve multiple users with advanced filtering options

**User Management Features:**
- Filter users by organization membership
- Role-based filtering capabilities
- Search by username or email address
- Include users not assigned to any organization
- Sorting by creation date or username
- Pagination support for large user bases

### 📁 Evidence Repositories

Manage evidence storage and repositories:

- **Get Repository** - Retrieve details of a specific evidence repository by ID or name
- **Get Many Repositories** - Retrieve multiple repositories with comprehensive filtering

**Repository Management Features:**
- Organization-scoped repository access
- Filter repositories by host, path, or name
- Search repositories with partial name matching
- Sort repositories by creation date, host, name, path, or type
- Pagination support for large repository collections
- Support for different repository types and configurations

### 🔍 Triage Rules

Manage detection and analysis rules for threat hunting:

- **Get Triage Rule** - Retrieve details of a specific triage rule by ID or name
- **Get Many Triage Rules** - Retrieve multiple triage rules with comprehensive filtering
- **Create Triage Rule** - Create new triage rules for detection and analysis
- **Update Triage Rule** - Modify existing triage rules by ID or name
- **Delete Triage Rule** - Remove triage rules by ID or name
- **Get Rule Tags** - Retrieve rule tags filtered by organization ID
- **Create Rule Tag** - Create new rule tags for organizing triage rules

**Triage Rule Features:**
- Support for multiple detection engines: YARA, Sigma, and osquery
- Flexible search locations: file system, memory, both, or event records
- Organization-scoped rule management with configurable organization access for all operations including individual rule retrieval
- Advanced filtering by description, search location, engine type, and search terms
- Rule validation and syntax checking
- Comprehensive CRUD operations with resource locator support
- Detailed rule content management with multi-line editor support
- Rule tag management with organization-specific filtering (single organization ID)

## Authentication

The node uses API token-based authentication with the following requirements:

- **AIR Instance URL** - The base URL of your Binalyze AIR instance (e.g., `https://air-demo.binalyze.com`)
- **AIR API Token** - A valid API token generated from your AIR instance's Integrations > API Tokens section

## Resource Locators

All resources support flexible identification methods:

- **From List** - Select from a searchable dropdown of available items
- **By ID** - Direct identification using numeric or GUID identifiers
- **By Name/Username** - Human-readable identification using names or usernames

## Advanced Features

### Pagination Support
All "Get Many" operations support configurable pagination:
- Customizable page size (default: 10 items per page)
- Page number selection for navigation
- Efficient handling of large datasets

### Filtering and Sorting
Comprehensive filtering options across all resources:
- **Organizations**: Sort by creation date or name
- **Users**: Filter by roles, organization membership, sort by creation date or username
- **Repositories**: Filter by host, path, search term, sort by multiple attributes
- **Triage Rules**: Filter by description, search location, engine type, sort by creation date, description, or search location

### Error Handling
Robust error handling with detailed error messages for:
- Invalid credentials or instance URLs
- Missing or invalid resource identifiers
- API rate limits and connectivity issues
- Data validation errors

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and pnpm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  npm install n8n -g
  ```
* Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

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

## Usage Examples

### Basic Organization Management
- Retrieve all organizations and their details
- Create new organizations for different investigation teams
- Manage organization tags for better categorization

### User Administration
- Get user lists filtered by specific organizations
- Retrieve user details for access management
- Monitor user assignments across organizations

### Evidence Repository Operations
- List all repositories within an organization
- Search for specific repositories by name or path
- Monitor repository status and configurations

### Triage Rule Management
- Create and manage YARA, Sigma, and osquery detection rules
- Update existing rules for improved threat detection
- Filter rules by engine type and search location
- Delete outdated or unnecessary rules

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

### Testing

Run linting to check for errors:
```bash
npm run lint
```

Auto-fix linting errors when possible:
```bash
npm run lintfix
```

Test your node locally by following the [n8n local testing guide](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/).

## Recent Updates

### Auto Asset Tags Organization ID Filter for Get Operation
- **Added**: Organization ID parameter to Auto Asset Tags "Get" operation
- **Feature**: Users can now filter auto asset tags by organization when using "By ID" and "By Name" modes
- **Limitation**: "From List" mode shows all organizations (ID 0) due to n8n framework limitations during dropdown population
- **Usage**: Set Organization ID to filter results in "By ID" and "By Name" modes, or use 0 for all organizations
- **Alignment**: Now matches the Organization ID filtering pattern used in other resources

## Support and Documentation

- [Binalyze AIR Documentation](https://kb.binalyze.com)
- [n8n Documentation](https://docs.n8n.io)
- [Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)

## License

[MIT](https://github.com/binalyze/n8n-nodes-binalyze-air/blob/master/LICENSE.md)
