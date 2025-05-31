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
		description: 'Manage organizations in Binalyze AIR',
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
				],
				default: 'organizations',
			},

			...OrganizationsOperations,
		],
	};

	methods = {
		loadOptions: {
			// Import load options methods from Organizations
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getOrganizationsOptions.call(this);
			},
		},
		listSearch: {
			// Import list search methods from Organizations for resource locators
			async getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				return getOrganizations.call(this, filter);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		// Delegate execution to the appropriate function based on resource
		switch (resource) {
			case 'organizations':
				return executeOrganizations.call(this);
			default:
				throw new ApplicationError(`Unknown resource: ${resource}`);
		}
	}
}
