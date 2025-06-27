# TODO: API Implementation Coverage

This document lists all tasks needed to ensure complete API endpoint coverage based on the Binalyze AIR API Postman collection.

## ✅ Currently Implemented (Needs Review/Updates)

### 1. Acquisitions
- **API Folder**: `/nodes/Air/api/acquisitions/`
- **Resource**: `acquisitions.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review and verify all acquisition profile operations
  - [ ] Ensure off-network task creation is supported
  - [ ] Validate evidence and image acquisition task assignments

### 2. Assets  
- **API Folder**: `/nodes/Air/api/assets/`
- **Resource**: `assets.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review asset management operations
  - [ ] Verify tag assignment/removal functionality
  - [ ] Check task assignment capabilities (reboot, shutdown, isolation, etc.)
  - [ ] Validate processor operations

### 3. Auth
- **API Folder**: `/nodes/Air/api/auth/`
- **Resource**: `auth.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review authentication operations
  - [ ] Ensure auth check functionality is complete

### 4. Baseline
- **API Folder**: `/nodes/Air/api/baseline/`
- **Resource**: `baselines.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review baseline acquisition operations
  - [ ] Verify comparison functionality
  - [ ] Check comparison result report generation

### 5. Cases
- **API Folder**: `/nodes/Air/api/cases/`
- **Resource**: `cases.ts`
- **Status**: ✅ Implemented (with sub-modules)
- **Sub-modules**:
  - [ ] `/nodes/Air/api/cases/notes/` - Review note operations
  - [ ] `/nodes/Air/api/cases/export/` - Review export operations
- **Tasks**:
  - [ ] Verify all case management operations (create, update, close, open, archive)
  - [ ] Check case ownership changes
  - [ ] Validate endpoint and task assignment management
  - [ ] Review case activities, endpoints, tasks, and users retrieval

### 6. Evidence
- **API Folder**: `/nodes/Air/api/evidence/`
- **Resource**: `evidence.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Verify repository management (SMB, SFTP, FTPS, Azure, S3)
  - [ ] Check PPC file operations
  - [ ] Validate task report downloads
  - [ ] Ensure repository validation operations

### 7. Notifications
- **API Folder**: `/nodes/Air/api/notifications/`
- **Resource**: `notifications.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review notification management
  - [ ] Verify mark as read functionality
  - [ ] Check bulk operations

### 8. Organizations
- **API Folder**: `/nodes/Air/api/organizations/`
- **Resource**: `organizations.ts`
- **Status**: ✅ Implemented (with sub-modules)
- **Sub-modules**:
  - [ ] `/nodes/Air/api/organizations/users/` - Review user assignment operations
- **Tasks**:
  - [ ] Verify organization CRUD operations
  - [ ] Check deployment settings management
  - [ ] Validate tag operations
  - [ ] Review shareable deployment functionality

### 9. Params
- **API Folder**: `/nodes/Air/api/params/`
- **Resource**: `params.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review drone analyzers retrieval
  - [ ] Check acquisition artifact/evidence lists
  - [ ] Verify E-Discovery patterns
  - [ ] Validate MITRE ATT&CK data

### 10. Policies
- **API Folder**: `/nodes/Air/api/policies/`
- **Resource**: `policies.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review policy CRUD operations
  - [ ] Check priority management
  - [ ] Verify match statistics functionality

### 11. Settings
- **API Folder**: `/nodes/Air/api/settings/`
- **Resource**: `settings.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review settings retrieval
  - [ ] Verify banner message updates

### 12. Tasks
- **API Folder**: `/nodes/Air/api/tasks/`
- **Resource**: `tasks.ts`
- **Status**: ✅ Implemented (with sub-modules)
- **Sub-modules**:
  - [ ] `/nodes/Air/api/tasks/assignments/` - Review assignment operations
- **Tasks**:
  - [ ] Verify task management operations
  - [ ] Check task cancellation and deletion
  - [ ] Review assignment management

### 13. Users
- **API Folder**: `/nodes/Air/api/users/`
- **Resource**: `users.ts`
- **Status**: ✅ Implemented
- **Tasks**:
  - [ ] Review user management operations
  - [ ] Check password management
  - [ ] Verify TFA reset functionality

## ❌ Missing Implementations

### 1. API Tokens ✅ **COMPLETED**
- **API Folder**: `/nodes/Air/api/apitokens/` ✅ **IMPLEMENTED**
- **Resource**: ✅ **IMPLEMENTED** - `apitokens.ts`
- **Required Operations**:
  - [x] Get API Tokens
  - [x] Get API Token by ID
  - [x] Create API Token
  - [x] Update API Token by ID
  - [x] Delete API Token by ID

### 2. Audit Logs
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/auditlogs/`
- **Resource**: ❌ **MISSING** - Create `auditlogs.ts`
- **Required Operations**:
  - [ ] Export Audit Logs
  - [ ] Get Audit Logs

### 3. Auto Asset Tags
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/autoassettags/`
- **Resource**: ✅ Exists `autoassettags.ts` (but missing API implementation)
- **Required Operations**:
  - [ ] Create Auto Asset Tag
  - [ ] Update Auto Asset Tag
  - [ ] Get Auto Asset Tags
  - [ ] Get Auto Asset Tag by ID
  - [ ] Delete Auto Asset Tag by ID
  - [ ] Start Tagging

### 4. Backup
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/backup/`
- **Resource**: ❌ **MISSING** - Create `backup.ts`
- **Required Operations**:
  - [ ] Implement backup operations (details from postman collection)

### 5. Cloud Forensics
- **API Folder**: `/nodes/Air/api/cloudforensics/` ❌ **EMPTY**
- **Resource**: ❌ **MISSING** - Create `cloudforensics.ts`
- **Required Sub-modules**:
  - [ ] Create `/nodes/Air/api/cloudforensics/accounts/`
  - [ ] Create `/nodes/Air/api/cloudforensics/eventsubscription/`
- **Required Operations**:
  - [ ] Cloud Accounts CRUD operations
  - [ ] Cloud Account sync operations
  - [ ] Event Subscription management

### 6. InterACT
- **API Folder**: `/nodes/Air/api/interact/` ❌ **EMPTY**
- **Resource**: ❌ **MISSING** - Create `interact.ts`
- **Required Sub-modules**:
  - [ ] Create `/nodes/Air/api/interact/library/`
  - [ ] Create `/nodes/Air/api/interact/shell/`
- **Required Operations**:
  - [ ] Execute interACT commands (sync/async)
  - [ ] Interrupt interACT commands
  - [ ] Session management
  - [ ] Command message retrieval
  - [ ] Assign InterACT Shell Tasks

### 7. Investigation Hub
- **API Folder**: `/nodes/Air/api/investigationhub/` ❌ **EMPTY**
- **Resource**: ❌ **MISSING** - Create `investigationhub.ts`
- **Required Sub-modules**:
  - [ ] Create `/nodes/Air/api/investigationhub/investigations/`
  - [ ] Create `/nodes/Air/api/investigationhub/evidence/`
  - [ ] Create `/nodes/Air/api/investigationhub/findings/`
  - [ ] Create `/nodes/Air/api/investigationhub/comments/`
  - [ ] Create `/nodes/Air/api/investigationhub/activities/`
  - [ ] Create `/nodes/Air/api/investigationhub/advancedfilters/`
- **Required Operations**:
  - [ ] Investigation management
  - [ ] Evidence structure and data retrieval
  - [ ] SQL query execution
  - [ ] Comments management
  - [ ] Activities management
  - [ ] Advanced filters CRUD

### 8. License
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/license/`
- **Resource**: ❌ **MISSING** - Create `license.ts`
- **Required Operations**:
  - [ ] License management operations

### 9. Logger
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/logger/`
- **Resource**: ❌ **MISSING** - Create `logger.ts`
- **Required Operations**:
  - [ ] Logger operations

### 10. Multipart Upload
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/multipartupload/`
- **Resource**: ❌ **MISSING** - Create `multipartupload.ts`
- **Required Operations**:
  - [ ] Multipart upload management

### 11. Preset Filters
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/presetfilters/`
- **Resource**: ❌ **MISSING** - Create `presetfilters.ts`
- **Required Operations**:
  - [ ] Get Preset Filters
  - [ ] Create Preset Filter
  - [ ] Update Preset Filter by ID
  - [ ] Delete Preset Filter by ID

### 12. Recent Activities
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/recentactivities/`
- **Resource**: ❌ **MISSING** - Create `recentactivities.ts`
- **Required Operations**:
  - [ ] Get Recent Activities
  - [ ] Create Recent Activity

### 13. Relay Server
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/relayserver/`
- **Resource**: ❌ **MISSING** - Create `relayserver.ts`
- **Required Operations**:
  - [ ] Relay server task management

### 14. Triage Rules
- **API Folder**: `/nodes/Air/api/triagerules/`
- **Resource**: ✅ Exists `triagerules.ts`
- **Tasks**:
  - [ ] Review current implementation against postman collection
  - [ ] Ensure triage rule tags management is included
  - [ ] Verify triage task assignment operations

### 15. User Management
- **API Folder**: `/nodes/Air/api/usermanagement/` ❌ **EMPTY**
- **Resource**: ❌ **MISSING** - Create `usermanagement.ts`
- **Required Sub-modules**:
  - [ ] Create `/nodes/Air/api/usermanagement/roles/`
  - [ ] Create `/nodes/Air/api/usermanagement/groups/`
- **Required Operations**:
  - [ ] Role management (CRUD, privileges)
  - [ ] User group management (CRUD)
  - [ ] API user creation

### 16. Webhooks
- **API Folder**: ❌ **MISSING** - Create `/nodes/Air/api/webhooks/`
- **Resource**: ❌ **MISSING** - Create `webhooks.ts`
- **Required Operations**:
  - [ ] Create Webhook
  - [ ] Update Webhook by ID
  - [ ] Delete Webhook by ID
  - [ ] Webhook Executions (GET/POST)
  - [ ] Task Details Data

## 🔄 Resource Updates Needed

### 1. Update repositories.ts
- **Current**: Exists as standalone resource
- **Task**: [ ] Integrate with evidence.ts or create separate evidence repositories resource

### 2. Create Missing Resources
- [x] Create `apitokens.ts` resource
- [ ] Create `auditlogs.ts` resource  
- [ ] Create `backup.ts` resource
- [ ] Create `cloudforensics.ts` resource
- [ ] Create `interact.ts` resource
- [ ] Create `investigationhub.ts` resource
- [ ] Create `license.ts` resource
- [ ] Create `logger.ts` resource
- [ ] Create `multipartupload.ts` resource
- [ ] Create `presetfilters.ts` resource
- [ ] Create `recentactivities.ts` resource
- [ ] Create `relayserver.ts` resource
- [ ] Create `usermanagement.ts` resource
- [ ] Create `webhooks.ts` resource

## 🔍 Verification Tasks

### 1. API Implementation Completeness
- [ ] Compare each existing API implementation with postman collection endpoints
- [ ] Ensure all HTTP methods (GET, POST, PUT, DELETE) are covered where applicable
- [ ] Verify all query parameters and request bodies are supported

### 2. Resource-API Alignment
- [ ] Ensure each resource file has corresponding API implementation
- [ ] Verify resource operations match available API endpoints
- [ ] Check for deprecated or missing operations

### 3. Testing Coverage
- [ ] Ensure all new API implementations have corresponding tests
- [ ] Update existing tests to cover any new functionality
- [ ] Verify integration with n8n workflow patterns

## 📚 Documentation Updates

### 1. README.md Updates
- [ ] Add all new resources to the resources list
- [ ] Update supported operations for each resource
- [ ] Remove any deprecated information
- [ ] Add Table of Contents section

### 2. Code Documentation
- [ ] Add JSDoc comments to all new API implementations
- [ ] Document complex operations and parameters
- [ ] Ensure consistent code style across all implementations

## 🔧 Technical Improvements

### 1. Code Standardization
- [ ] Review and standardize error handling across all API implementations
- [ ] Ensure consistent parameter validation
- [ ] Implement proper TypeScript typing for all endpoints

### 2. Helper Functions
- [ ] Create shared utility functions for common operations
- [ ] Implement consistent response formatting
- [ ] Add helper functions for complex parameter building

---

**Priority Levels:**
- 🔥 **High**: Core functionality endpoints (Auth, Cases, Assets, Organizations, Users)
- 📊 **Medium**: Investigative and management features (Investigation Hub, Cloud Forensics, Webhooks)
- 🔧 **Low**: Administrative and utility features (Logger, Recent Activities, License)

**Estimated Implementation Time:** 4-6 weeks for complete coverage 
