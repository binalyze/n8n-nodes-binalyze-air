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
		description: 'Manage organizations and repositories in Binalyze AIR',
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
				],
				default: 'organizations',
			},

			...OrganizationsOperations,
			...RepositoriesOperations,
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
			default:
				throw new ApplicationError(`Unknown resource: ${resource}`);
		}
	}
}
