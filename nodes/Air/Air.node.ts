import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
	ApplicationError,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

// Import operations and functions from resources
import {
	BaselinesOperations,
	executeBaselines
} from './resources/baselines';
import {
	CasesOperations,
	getCases,
	getCasesOptions,
	executeCases
} from './resources/cases';
import {
	OrganizationsOperations,
	getOrganizations,
	getOrganizationsOptions,
	executeOrganizations
} from './resources/organizations';
import {
	RepositoriesOperations,
	getRepositories,
	getRepositoriesOptions,
	executeRepositories
} from './resources/repositories';
import {
	TasksOperations,
	getTasks,
	getTasksOptions,
	executeTasks
} from './resources/tasks';
import {
	UsersOperations,
	getUsers,
	getUsersOptions,
	executeUsers
} from './resources/users';
import {
	AutoAssetTagsOperations,
	getAutoAssetTags,
	getAutoAssetTagsOptions,
	executeAutoAssetTags
} from './resources/autoassettags';
import {
	TriageRulesOperations,
	getTriageRules,
	getTriageRulesOptions,
	getTriageTags,
	executeTriageRules,
	getTriageTagsOptions
} from './resources/triagerules';
import {
	AssetsOperations,
	getAssets,
	getAssetsOptions,
	executeAssets
} from './resources/assets';
import {
	AcquisitionsOperations,
	getAcquisitionProfiles,
	getAcquisitionProfilesOptions,
	executeAcquisitions
} from './resources/acquisitions';
import {
	NotificationsOperations,
	getNotifications,
	getNotificationsOptions,
	executeNotifications
} from './resources/notifications';
import {
	AuthOperations,
	executeAuth
} from './resources/auth';
import {
	EvidenceOperations,
	executeEvidence
} from './resources/evidence';
import {
	PoliciesOperations,
	getPolicies,
	getPoliciesOptions,
	executePolicies
} from './resources/policies';
import {
	ParamsOperations,
	getDroneAnalyzers,
	getDroneAnalyzersOptions,
	getAcquisitionArtifacts,
	getAcquisitionArtifactsOptions,
	getAcquisitionEvidence,
	getAcquisitionEvidenceOptions,
	getEDiscoveryPatterns,
	getEDiscoveryPatternsOptions,
	getMitreAttackTechniques,
	getMitreAttackTechniquesOptions,
	executeParams
} from './resources/params';
import {
	SettingsOperations,
	executeSettings
} from './resources/settings';
import {
	ApiTokensOperations,
	getApiTokens,
	getApiTokensOptions,
	executeApiTokens
} from './resources/apitokens';
import {
	CloudForensicsOperations,
	getCloudAccounts,
	executeCloudForensics
} from './resources/cloudforensics';

import {
	InterACTOperations,
	executeInterACT
} from './resources/interact';
import {
	AuditLogsOperations,
	executeAuditLogs
} from './resources/auditlogs';

export class Air implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Binalyze AIR',
		name: 'air',
		icon: {
			light: 'file:b-logo-dark.svg',
			dark: 'file:b-logo-light.svg',
		} as const,
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage Binalyze AIR resources',
		defaults: {
			name: 'Binalyze AIR',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'airApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Acquisition',
						value: 'acquisitions',
						description: 'Manage acquisition profiles and remote acquisitions',
					},
					{
						name: 'API Token',
						value: 'apitokens',
						description: 'Manage API tokens',
					},
					{
						name: 'Asset',
						value: 'assets',
						description: 'Manage endpoint assets and their operations',
					},
					{
						name: 'Audit Log',
						value: 'auditlogs',
						description: 'Manage and export audit logs',
					},
					{
						name: 'Auth',
						value: 'auth',
						description: 'Authentication and session management',
					},
					{
						name: 'Auto Asset Tag',
						value: 'autoassettags',
						description: 'Manage auto asset tags',
					},
					{
						name: 'Baseline',
						value: 'baselines',
						description: 'Manage baselines and comparisons',
					},
					{
						name: 'Case',
						value: 'cases',
						description: 'Manage cases and case operations',
					},
					{
						name: 'Cloud Forensic',
						value: 'cloudforensics',
						description: 'Manage cloud accounts and event subscriptions for forensic analysis',
					},
					{
						name: 'Evidence',
						value: 'evidence',
						description: 'Evidence file management and downloads',
					},
					{
						name: 'InterACT',
						value: 'interact',
						description: 'Interactive shell sessions and command execution on endpoints',
					},
					{
						name: 'Notification',
						value: 'notifications',
						description: 'Manage user notifications',
					},
					{
						name: 'Organization',
						value: 'organizations',
						description: 'Manage organizations',
					},
					{
						name: 'Param',
						value: 'params',
						description: 'Configuration parameters and system data',
					},
					{
						name: 'Policy',
						value: 'policies',
						description: 'Manage security policies',
					},
					{
						name: 'Repository',
						value: 'repositories',
						description: 'Manage evidence repositories',
					},
					{
						name: 'Setting',
						value: 'settings',
						description: 'System settings management',
					},
					{
						name: 'Task',
						value: 'tasks',
						description: 'Manage tasks and task assignments',
					},
					{
						name: 'Triage Rule',
						value: 'triagerules',
						description: 'Manage triage rules',
					},
					{
						name: 'User',
						value: 'users',
						description: 'Manage users',
					},
				],
				default: 'organizations',
			},

			...AcquisitionsOperations,
			...ApiTokensOperations,
			...AssetsOperations,
			...AuditLogsOperations,
			...AuthOperations,
			...AutoAssetTagsOperations,
			...BaselinesOperations,
			...CasesOperations,
			...CloudForensicsOperations,
			...EvidenceOperations,
			...InterACTOperations,
			...NotificationsOperations,
			...OrganizationsOperations,
			...ParamsOperations,
			...PoliciesOperations,
			...RepositoriesOperations,
			...SettingsOperations,
			...TasksOperations,
			...TriageRulesOperations,
			...UsersOperations,
		],
	};

	methods = {
		loadOptions: {
			// Import load options methods from Acquisitions
			async getAcquisitionProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAcquisitionProfilesOptions.call(this);
			},
			// Import load options methods from API Tokens
			async getApiTokens(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getApiTokensOptions.call(this);
			},
			// Import load options methods from Assets
			async getAssets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAssetsOptions.call(this);
			},
			// Import load options methods from Auto Asset Tags
			async getAutoAssetTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAutoAssetTagsOptions.call(this);
			},
			// Import load options methods from Cases
			async getCases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getCasesOptions.call(this);
			},
			// Import load options methods from Notifications
			async getNotifications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getNotificationsOptions.call(this);
			},
			// Import load options methods from Organizations
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getOrganizationsOptions.call(this);
			},
			// Import load options methods from Policies
			async getPolicies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPoliciesOptions.call(this);
			},
			// Import load options methods from Params
			async getDroneAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getDroneAnalyzersOptions.call(this);
			},
			async getAcquisitionArtifacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAcquisitionArtifactsOptions.call(this);
			},
			async getAcquisitionEvidence(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAcquisitionEvidenceOptions.call(this);
			},
			async getEDiscoveryPatterns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getEDiscoveryPatternsOptions.call(this);
			},
			async getMitreAttackTechniques(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getMitreAttackTechniquesOptions.call(this);
			},
			// Import load options methods from Repositories
			async getRepositories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getRepositoriesOptions.call(this);
			},
			// Import load options methods from Tasks
			async getTasks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getTasksOptions.call(this);
			},
			// Import load options methods from Triage Rules
			async getTriageRules(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getTriageRulesOptions.call(this);
			},
			// Import load options methods from Triage Tags
			async getTriageTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getTriageTagsOptions.call(this);
			},
			// Import load options methods from Users
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getUsersOptions.call(this);
			},
		},
		listSearch: {
			// Import list search methods from Acquisitions for resource locators
			async getAcquisitionProfiles(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAcquisitionProfiles.call(this, filter);
			},
			// Import list search methods from API Tokens for resource locators
			async getApiTokens(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getApiTokens.call(this, filter);
			},
			// Import list search methods from Assets for resource locators
			async getAssets(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAssets.call(this, filter);
			},
			// Import list search methods from Auto Asset Tags for resource locators
			async getAutoAssetTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAutoAssetTags.call(this, filter);
			},
			// Import list search methods from Cases for resource locators
			async getCases(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getCases.call(this, filter);
			},
			// Import list search methods from Cloud Forensics for resource locators
			async getCloudAccounts(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getCloudAccounts.call(this, filter);
			},
			// Import list search methods from Notifications for resource locators
			async getNotifications(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getNotifications.call(this, filter);
			},
			// Import list search methods from Organizations for resource locators
			async getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getOrganizations.call(this, filter);
			},
			// Import list search methods from Policies for resource locators
			async getPolicies(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getPolicies.call(this, filter);
			},
			// Import list search methods from Params for resource locators
			async getDroneAnalyzers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getDroneAnalyzers.call(this, filter);
			},
			async getAcquisitionArtifacts(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAcquisitionArtifacts.call(this, filter);
			},
			async getAcquisitionEvidence(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAcquisitionEvidence.call(this, filter);
			},
			async getEDiscoveryPatterns(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getEDiscoveryPatterns.call(this, filter);
			},
			async getMitreAttackTechniques(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getMitreAttackTechniques.call(this, filter);
			},
			// Import list search methods from Repositories for resource locators
			async getRepositories(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getRepositories.call(this, filter);
			},
			// Import list search methods from Tasks for resource locators
			async getTasks(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getTasks.call(this, filter);
			},
			// Import list search methods from Triage Rules for resource locators
			async getTriageRules(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getTriageRules.call(this, filter);
			},
			// Import list search methods from Triage Tags for resource locators
			async getTriageTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getTriageTags.call(this, filter);
			},
			// Import list search methods from Users for resource locators
			async getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getUsers.call(this, filter);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		this.logger.debug(`Executing: ${this.getNode().name}/${resource} for workflow ${this.getWorkflow().name}`);

		// Delegate execution to the appropriate function based on resource
		switch (resource) {
			case 'acquisitions':
				return executeAcquisitions.call(this);
			case 'apitokens':
				return executeApiTokens.call(this);
			case 'assets':
				return executeAssets.call(this);
			case 'auditlogs':
				return executeAuditLogs.call(this);
			case 'auth':
				return executeAuth.call(this);
			case 'autoassettags':
				return executeAutoAssetTags.call(this);
			case 'baselines':
				return executeBaselines.call(this);
			case 'cases':
				return executeCases.call(this);
			case 'cloudforensics':
				return executeCloudForensics.call(this);
			case 'evidence':
				return executeEvidence.call(this);
			case 'interact':
				return executeInterACT.call(this);
			case 'notifications':
				return executeNotifications.call(this);
			case 'organizations':
				return executeOrganizations.call(this);
			case 'params':
				return executeParams.call(this);
			case 'policies':
				return executePolicies.call(this);
			case 'repositories':
				return executeRepositories.call(this);
			case 'settings':
				return executeSettings.call(this);
			case 'tasks':
				return executeTasks.call(this);
			case 'triagerules':
				return executeTriageRules.call(this);
			case 'users':
				return executeUsers.call(this);
			default:
				throw new ApplicationError(`Unknown resource: ${resource}`);
		}
	}
}
