import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	NodeOperationError,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class Organizations implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Binalyze AIR',
		name: 'organizations',
		group: ['input'],
		version: 1,
		subtitle: 'Organizations: {{$parameter["operation"]}}',
		description: 'Manage organizations in Binalyze AIR',
		defaults: {
			name: 'Binalyze AIR Organizations',
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
						description: 'Retrieve many organizations',
						action: 'Get many organizations',
					},
					{
						name: 'Get Organization by ID',
						value: 'getById',
						description: 'Retrieve a specific organization by ID',
						action: 'Get organization by ID',
					},
					{
						name: 'Get Organization by Name',
						value: 'getByName',
						description: 'Retrieve a specific organization by selecting from a list',
						action: 'Get organization by name',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['getById'],
					},
				},
				default: '',
				placeholder: 'Enter organization ID',
				description: 'The ID of the organization to retrieve',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organizationName',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['getByName'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Name Filter',
						name: 'nameFilter',
						type: 'string',
						default: '',
						description: 'Filter organizations by name',
					},
					{
						displayName: 'Page Number',
						name: 'pageNumber',
						type: 'number',
						default: 1,
						description: 'Which page of results to return',
						typeOptions: {
							minValue: 1,
						},
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 10,
						description: 'How many results to return per page',
						typeOptions: {
							minValue: 1,
						},
					},
					{
						displayName: 'Search Term',
						name: 'searchTerm',
						type: 'string',
						default: '',
						description: 'Search term to filter organizations',
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'options',
						default: 'createdAt',
						description: 'Attribute name to order the responses by',
						options: [
							{
								name: 'Created At',
								value: 'createdAt',
							},
							{
								name: 'Name',
								value: 'name',
							},
						],
					},
					{
						displayName: 'Sort Type',
						name: 'sortType',
						type: 'options',
						default: 'ASC',
						description: 'Sort order',
						options: [
							{
								name: 'Ascending',
								value: 'ASC',
							},
							{
								name: 'Descending',
								value: 'DESC',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// Get credentials
				const credentials = await this.getCredentials('airCredentialsApi');
				const instanceUrl = credentials.instanceUrl as string;
				const token = credentials.token as string;

				const allOrganizations: any[] = [];
				let currentPage = 1;
				let hasMorePages = true;

				try {
					while (hasMorePages) {
						// Prepare the HTTP request options to fetch organizations with pagination
						const options: IHttpRequestOptions = {
							method: 'GET',
							url: `${instanceUrl}/api/public/organizations`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Accept': 'application/json',
								'Content-Type': 'application/json',
							},
							qs: {
								pageNumber: currentPage,
								pageSize: 100, // Use a larger page size to reduce API calls
								sortBy: 'name', // Sort by name for better UX
								sortType: 'ASC',
							},
							json: true,
						};

						// Make the HTTP request
						const responseData = await this.helpers.httpRequest(options);

						// Check if the response indicates success
						if (!responseData.success) {
							throw new NodeOperationError(this.getNode(), 'Failed to fetch organizations');
						}

						// Extract entities from result.entities
						const entities = responseData.result?.entities || [];
						allOrganizations.push(...entities);

						// Check if there are more pages
						const { currentPage: responsePage, totalPageCount } = responseData.result;
						hasMorePages = responsePage < totalPageCount;
						currentPage++;
					}

					// Format all organizations for dropdown
					return allOrganizations.map((organization: any) => ({
						name: organization.name,
						value: organization._id.toString(),
					}));
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Failed to load organizations: ${error.message}`);
				}
			},
		},
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
				const qs: { [key: string]: any } = {};

				if (operation === 'getAll') {
					endpoint = '/api/public/organizations';

					// Handle additional fields
					const additionalFields = this.getNodeParameter('additionalFields', i) as {
						pageNumber?: number;
						pageSize?: number;
						sortBy?: string;
						sortType?: string;
						nameFilter?: string;
						searchTerm?: string;
					};

					if (additionalFields.pageNumber) {
						qs.pageNumber = additionalFields.pageNumber;
					}
					if (additionalFields.pageSize) {
						qs.pageSize = additionalFields.pageSize;
					}
					if (additionalFields.sortBy) {
						qs.sortBy = additionalFields.sortBy;
					}
					if (additionalFields.sortType) {
						qs.sortType = additionalFields.sortType;
					}
					if (additionalFields.nameFilter) {
						qs['filter[name]'] = additionalFields.nameFilter;
					}
					if (additionalFields.searchTerm) {
						qs['filter[searchTerm]'] = additionalFields.searchTerm;
					}
				} else if (operation === 'getById') {
					const organizationId = this.getNodeParameter('organizationId', i) as string;
					endpoint = `/api/public/organizations/${organizationId}`;
				} else if (operation === 'getByName') {
					const organizationId = this.getNodeParameter('organizationName', i) as string;
					endpoint = `/api/public/organizations/${organizationId}`;
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
					qs,
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
					// Extract entities from result.entities
					const entities = responseData.result?.entities || [];
					entities.forEach((organization: any) => {
						returnData.push({
							json: organization,
							pairedItem: i,
						});
					});
				} else if (operation === 'getByName') {
					// For getByName, the result should contain the single organization
					// Check if result.entities exists and has data, otherwise use result directly
					const organizationData = responseData.result?.entities?.[0] || responseData.result;
					returnData.push({
						json: organizationData,
						pairedItem: i,
					});
				} else {
					// For getById, the result should contain the single organization
					// Check if result.entities exists and has data, otherwise use result directly
					const organizationData = responseData.result?.entities?.[0] || responseData.result;
					returnData.push({
						json: organizationData,
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
