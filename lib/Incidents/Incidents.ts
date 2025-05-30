import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	NodeOperationError,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class Incidents implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Binalyze AIR',
		name: 'incidents',
		group: ['input'],
		version: 1,
		subtitle: 'Incidents: {{$parameter["operation"]}}',
		description: 'Manage incidents in Binalyze AIR',
		defaults: {
			name: 'Binalyze AIR Incidents',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve many incidents',
						action: 'Get many incidents',
					},
					{
						name: 'Get Incident by ID',
						value: 'getById',
						description: 'Retrieve a specific incident by ID',
						action: 'Get incident by ID',
					},
					{
						name: 'Create Incident',
						value: 'create',
						description: 'Create a new incident',
						action: 'Create incident',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Incident ID',
				name: 'incidentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['getById'],
					},
				},
				default: '',
				placeholder: 'Enter incident ID',
				description: 'The ID of the incident to retrieve',
			},
			{
				displayName: 'Incident Title',
				name: 'title',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'Enter incident title',
				description: 'The title of the incident to create',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'Enter incident description',
				description: 'The description of the incident',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('airCredentialsApi');
		const instanceUrl = credentials.instanceUrl as string;
		const token = credentials.token as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let endpoint = '';
				let method: IHttpRequestMethods = 'GET';
				let body: any = {};

				if (operation === 'getAll') {
					endpoint = '/api/public/incidents';
				} else if (operation === 'getById') {
					const incidentId = this.getNodeParameter('incidentId', i) as string;
					endpoint = `/api/public/incidents/${incidentId}`;
				} else if (operation === 'create') {
					endpoint = '/api/public/incidents';
					method = 'POST';
					body = {
						title: this.getNodeParameter('title', i) as string,
						description: this.getNodeParameter('description', i) as string,
					};
				}

				// Prepare the HTTP request options
				const options: IHttpRequestOptions = {
					method,
					url: `${instanceUrl}${endpoint}`,
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					json: true,
				};

				if (method === 'POST') {
					options.body = body;
				}

				// Make the HTTP request
				const responseData = await this.helpers.httpRequest(options);

				// Check if the response indicates success
				if (!responseData.success) {
					const errorMessage = responseData.errors && responseData.errors.length > 0
						? responseData.errors.join(', ')
						: 'API request failed';
					throw new NodeOperationError(this.getNode(), errorMessage, {
						itemIndex: i,
					});
				}

				// Handle the response based on operation
				if (operation === 'getAll') {
					const entities = responseData.result?.entities || [];
					entities.forEach((incident: any) => {
						returnData.push({
							json: incident,
							pairedItem: i,
						});
					});
				} else {
					const incidentData = responseData.result?.entities?.[0] || responseData.result;
					returnData.push({
						json: incidentData,
						pairedItem: i,
					});
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: i,
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
					});
				}
			}
		}

		return [returnData];
	}
}
