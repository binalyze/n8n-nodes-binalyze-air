import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	buildRequestOptions,
	validateApiResponse,
	extractOrganizationId,
	isValidOrganization,
	fetchAllOrganizations,
	findOrganizationByName,
	buildOrganizationQueryParams,
} from './helpers';

export const OrganizationsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organizations'],
			},
		},
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
				resource: ['organizations'],
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
				resource: ['organizations'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Name Filter',
				name: 'nameFilter',
				type: 'string',
				default: '',
				description: 'Filter organizations by exact name match',
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
				description: 'Search organizations by name (supports partial matches)',
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
];

// List search method for resource locator
export async function getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await fetchAllOrganizations(this, credentials, filter);

		// Process and filter organizations
		const results: INodeListSearchItems[] = allOrganizations
			.filter(isValidOrganization)
			.map((organization: any) => ({
				name: organization.name,
				value: extractOrganizationId(organization),
				url: organization.url || '',
			}))
			// Apply client-side filtering for better search results
			.filter((item: any) =>
				!filter ||
				item.name.toLowerCase().includes(filter.toLowerCase()) ||
				item.value === filter
			)
			.sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

		return { results };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to load organizations: ${errorMessage}`);
	}
}

// Load options method for dropdowns (legacy support)
export async function getOrganizationsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await fetchAllOrganizations(this, credentials);

		// Filter out organizations without valid IDs before mapping
		const validOrganizations = allOrganizations.filter(isValidOrganization);

		return validOrganizations.map((organization) => {
			const orgId = extractOrganizationId(organization);
			const name = organization.name || `Organization ${orgId || 'Unknown'}`;

			return {
				name,
				value: orgId,
			};
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to load organizations: ${errorMessage}`);
	}
}

// Execute function for organizations
export async function executeOrganizations(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'getAll') {
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;
				const queryParams = buildOrganizationQueryParams(additionalFields);

				const options = buildRequestOptions(
					credentials,
					'GET',
					'/api/public/organizations',
					queryParams
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				const entities = responseData.result?.entities || [];
				const pagination = responseData.result?.pagination;

				// Add pagination info to each item if available
				entities.forEach((organization: any) => {
					returnData.push({
						json: {
							...organization,
							...(pagination && { _pagination: pagination }),
						},
						pairedItem: i,
					});
				});
			} else if (operation === 'get') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;
				let organizationId: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					try {
						organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
						itemIndex: i,
					});
				}

				// Validate organization ID
				if (!organizationId || organizationId.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Organization ID cannot be empty', {
						itemIndex: i,
					});
				}

				const options = buildRequestOptions(
					credentials,
					'GET',
					`/api/public/organizations/${organizationId}`
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				// Handle the response based on operation
				let organizationData;

				if (responseData.result?.entities && Array.isArray(responseData.result.entities)) {
					// If the result is an array, take the first item
					organizationData = responseData.result.entities[0];
				} else if (responseData.result) {
					// If the result is the organization object directly
					organizationData = responseData.result;
				} else {
					throw new NodeOperationError(this.getNode(), 'Unexpected response format from API', {
						itemIndex: i,
					});
				}

				if (!organizationData) {
					throw new NodeOperationError(this.getNode(), 'Organization not found', {
						itemIndex: i,
					});
				}

				returnData.push({
					json: organizationData,
					pairedItem: i,
				});
			}

		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error instanceof Error ? error.message : 'Unknown error occurred',
						errorDetails: error instanceof NodeOperationError ? {
							type: 'NodeOperationError',
							cause: error.cause,
						} : undefined,
					},
					pairedItem: i,
				});
			} else {
				throw error instanceof NodeOperationError ? error : new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}
	}

	return [returnData];
}
