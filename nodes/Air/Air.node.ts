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
	executeTriageRules
} from './resources/triagerules';

export class Air implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Binalyze AIR',
		name: 'air',
		icon: {
			light: 'file:logo.black.svg',
			dark: 'file:logo.white.svg',
		} as const,
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage organizations, repositories, users, auto asset tags, triage rules, baselines, cases, and tasks in Binalyze AIR',
		defaults: {
			name: 'Binalyze AIR',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'airCredentialsApi',
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

			...AutoAssetTagsOperations,
			...BaselinesOperations,
			...CasesOperations,
			...OrganizationsOperations,
			...RepositoriesOperations,
			...TasksOperations,
			...TriageRulesOperations,
			...UsersOperations,
		],
	};

	methods = {
		loadOptions: {
			// Import load options methods from Auto Asset Tags
			async getAutoAssetTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getAutoAssetTagsOptions.call(this);
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
			// Import load options methods from Users
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getUsersOptions.call(this);
			},
		},
		listSearch: {
			// Import list search methods from Auto Asset Tags for resource locators
			async getAutoAssetTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getAutoAssetTags.call(this, filter);
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
			case 'autoassettags':
				return executeAutoAssetTags.call(this);
			case 'baselines':
				return executeBaselines.call(this);
			case 'cases':
				return executeCases.call(this);
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
