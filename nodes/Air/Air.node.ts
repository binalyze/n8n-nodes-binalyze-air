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
	UsersOperations,
	getUsers,
	getUsersOptions,
	executeUsers
} from './resources/users';

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
		description: 'Manage organizations, repositories, and users in Binalyze AIR',
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
						name: 'User',
						value: 'users',
						description: 'Manage users',
					},
				],
				default: 'organizations',
			},

			...OrganizationsOperations,
			...RepositoriesOperations,
			...UsersOperations,
		],
	};

	methods = {
		loadOptions: {
			// Import load options methods from Organizations
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getOrganizationsOptions.call(this);
			},
			// Import load options methods from Repositories
			async getRepositories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getRepositoriesOptions.call(this);
			},
			// Import load options methods from Users
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getUsersOptions.call(this);
			},
		},
		listSearch: {
			// Import list search methods from Organizations for resource locators
			async getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getOrganizations.call(this, filter);
			},
			// Import list search methods from Repositories for resource locators
			async getRepositories(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getRepositories.call(this, filter);
			},
			// Import list search methods from Users for resource locators
			async getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getUsers.call(this, filter);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		// Delegate execution to the appropriate function based on resource
		switch (resource) {
			case 'organizations':
				return executeOrganizations.call(this);
			case 'repositories':
				return executeRepositories.call(this);
			case 'users':
				return executeUsers.call(this);
			default:
				throw new ApplicationError(`Unknown resource: ${resource}`);
		}
	}
}
