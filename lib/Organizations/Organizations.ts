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
	INodeListSearchResult,
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
						name: 'Get Organization',
						value: 'get',
						description: 'Retrieve a specific organization',
						action: 'Get an organization',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select an organization...',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select an organization...',
						typeOptions: {
							searchListMethod: 'getOrganizations',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9]+',
									errorMessage: 'Not a valid organization ID',
								},
							},
						],
						placeholder: 'Enter organization ID',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'Enter organization name',
					},
				],
				required: true,
				description: 'The organization to retrieve',
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
		listSearch: {
			async getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
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
								...(filter && { 'filter[searchTerm]': filter }),
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

					// Filter organizations by name if filter is provided
					let filteredOrganizations = allOrganizations;
					if (filter) {
						const lowerFilter = filter.toLowerCase();
						filteredOrganizations = allOrganizations.filter((organization: any) =>
							organization.name?.toLowerCase().includes(lowerFilter)
						);
					}

					// Format organizations for list search result
					return {
						results: filteredOrganizations.map((organization: any) => ({
							name: organization.name,
							value: organization._id.toString(),
							url: `${instanceUrl}/organizations/${organization._id}`,
						})),
					};
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
				} else if (operation === 'get') {
					const organizationIdParam = this.getNodeParameter('organizationId', i) as { mode: string; value: string };

					if (organizationIdParam.mode === 'list' || organizationIdParam.mode === 'id') {
						// For list and id modes, the value is the organization ID
						const organizationId = organizationIdParam.value;
						endpoint = `/api/public/organizations/${organizationId}`;
					} else if (organizationIdParam.mode === 'name') {
						// For name mode, we need to search for the organization by name
						const organizationName = organizationIdParam.value;
						endpoint = '/api/public/organizations';
						qs['filter[name]'] = organizationName;
						qs.pageSize = 1; // We only want the first match
					}
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
				} else if (operation === 'get') {
					const organizationIdParam = this.getNodeParameter('organizationId', i) as { mode: string; value: string };

					if (organizationIdParam.mode === 'name') {
						// For name mode, we get a filtered list, take the first match
						const entities = responseData.result?.entities || [];
						if (entities.length > 0) {
							returnData.push({
								json: entities[0],
								pairedItem: i,
							});
						} else {
							throw new NodeOperationError(this.getNode(), `Organization with name "${organizationIdParam.value}" not found`, {
								itemIndex: i,
							});
						}
					} else {
						// For list and id modes, the result should contain the single organization
						// Check if result.entities exists and has data, otherwise use result directly
						const organizationData = responseData.result?.entities?.[0] || responseData.result;
						returnData.push({
							json: organizationData,
							pairedItem: i,
						});
					}
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
