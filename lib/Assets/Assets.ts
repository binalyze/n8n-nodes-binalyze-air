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

export class Assets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Binalyze AIR',
		name: 'assets',
		group: ['input'],
		version: 1,
		subtitle: 'Assets: {{$parameter["operation"]}}',
		description: 'Manage assets in Binalyze AIR',
		defaults: {
			name: 'Binalyze AIR Assets',
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
						description: 'Retrieve many assets',
						action: 'Get many assets',
					},
					{
						name: 'Get Asset by ID',
						value: 'getById',
						description: 'Retrieve a specific asset by ID',
						action: 'Get asset by ID',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Asset ID',
				name: 'assetId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['getById'],
					},
				},
				default: '',
				placeholder: 'Enter asset ID',
				description: 'The ID of the asset to retrieve',
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

				if (operation === 'getAll') {
					endpoint = '/api/public/assets';
				} else if (operation === 'getById') {
					const assetId = this.getNodeParameter('assetId', i) as string;
					endpoint = `/api/public/assets/${assetId}`;
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
					entities.forEach((asset: any) => {
						returnData.push({
							json: asset,
							pairedItem: i,
						});
					});
				} else {
					const assetData = responseData.result?.entities?.[0] || responseData.result;
					returnData.push({
						json: assetData,
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
