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
	executeBaselines,
	getAssetsByOrganization,
	getTasksByAsset,
	getAssetsByOrganizationForReport,
	getComparisonTasksByAsset
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
	EvidenceOperations,
	executeEvidence
} from './resources/evidence';

import {
	InterACTOperations,
	executeInterACT
} from './resources/interact';

export class Air implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AIR',
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
			name: 'AIR',
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
						name: 'Asset',
						value: 'assets',
						description: 'Manage endpoint assets and their operations',
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
						name: 'Evidence',
						value: 'evidence',
						description: 'Evidence management and downloads',
					},
					{
						name: 'InterACT',
						value: 'interact',
						description: 'Interactive shell sessions and command execution on devices',
					},
					{
						name: 'Organization',
						value: 'organizations',
						description: 'Manage organizations',
					},
					{
						name: 'Repository',
						value: 'repositories',
						description: 'Manage evidence repositories',
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
			...AssetsOperations,
			...BaselinesOperations,
			...CasesOperations,
			...EvidenceOperations,
			...InterACTOperations,
			...OrganizationsOperations,
			...RepositoriesOperations,
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
			// Import load options methods from Assets
			async getAssets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAssetsOptions.call(this);
			},
			// Import load options methods from Cases
			async getCases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getCasesOptions.call(this);
			},
			// Import load options methods from Organizations
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getOrganizationsOptions.call(this);
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
			// Import list search methods from Assets for resource locators
			async getAssets(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAssets.call(this, filter);
			},
			// Import context-aware list search methods from Baselines for resource locators
			async getAssetsByOrganization(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAssetsByOrganization.call(this, filter);
			},
			async getTasksByAsset(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getTasksByAsset.call(this, filter);
			},
			async getAssetsByOrganizationForReport(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAssetsByOrganizationForReport.call(this, filter);
			},
			async getComparisonTasksByAsset(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getComparisonTasksByAsset.call(this, filter);
			},
			// Import list search methods from Cases for resource locators
			async getCases(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getCases.call(this, filter);
			},
			// Import list search methods from Organizations for resource locators
			async getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getOrganizations.call(this, filter);
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
			case 'assets':
				return executeAssets.call(this);
			case 'baselines':
				return executeBaselines.call(this);
			case 'cases':
				return executeCases.call(this);
			case 'evidence':
				return executeEvidence.call(this);
			case 'interact':
				return executeInterACT.call(this);
			case 'organizations':
				return executeOrganizations.call(this);
			case 'repositories':
				return executeRepositories.call(this);
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
