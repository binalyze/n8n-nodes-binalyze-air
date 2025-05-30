import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ApplicationError,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

// Import the existing node classes
import { Organizations } from '../../lib/Organizations/Organizations';
import { Assets } from '../../lib/Assets/Assets';
import { Incidents } from '../../lib/Incidents/Incidents';

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
		subtitle: '{{$parameter["resource"]}}: {{$parameter["operation"]}}',
		description: 'Manage organizations, assets, and incidents in Binalyze AIR',
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
						name: 'Asset',
						value: 'assets',
						description: 'Manage assets',
					},
					{
						name: 'Incident',
						value: 'incidents',
						description: 'Manage incidents',
					},
				],
				default: 'organizations',
			},
			// Organizations properties
			...(new Organizations().description.properties!.map((prop: any) => ({
				...prop,
				displayOptions: {
					...prop.displayOptions,
					show: {
						resource: ['organizations'],
						...prop.displayOptions?.show,
					},
				},
			}))),
			// Assets properties
			...(new Assets().description.properties!.map((prop: any) => ({
				...prop,
				displayOptions: {
					...prop.displayOptions,
					show: {
						resource: ['assets'],
						...prop.displayOptions?.show,
					},
				},
			}))),
			// Incidents properties
			...(new Incidents().description.properties!.map((prop: any) => ({
				...prop,
				displayOptions: {
					...prop.displayOptions,
					show: {
						resource: ['incidents'],
						...prop.displayOptions?.show,
					},
				},
			}))),
		],
	};

	methods = {
		loadOptions: {
			// Import load options methods from Organizations node
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const organizationsNode = new Organizations();
				return organizationsNode.methods.loadOptions.getOrganizations.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		// Delegate execution to the appropriate node based on resource
		switch (resource) {
			case 'organizations': {
				const organizationsNode = new Organizations();
				return organizationsNode.execute.call(this);
			}
			case 'assets': {
				const assetsNode = new Assets();
				return assetsNode.execute.call(this);
			}
			case 'incidents': {
				const incidentsNode = new Incidents();
				return incidentsNode.execute.call(this);
			}
			default:
				throw new ApplicationError(`Unknown resource: ${resource}`);
		}
	}
}
