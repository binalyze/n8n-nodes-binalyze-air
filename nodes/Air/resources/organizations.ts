import {
	IExecuteFunctions,
	INodeExecutionData,
	IHttpRequestOptions,
	NodeOperationError,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

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
		// Get credentials
		const credentials = await this.getCredentials('airCredentialsApi');

		if (!credentials) {
			throw new Error('No credentials provided for Binalyze AIR');
		}

		const instanceUrl = credentials.instanceUrl as string;
		const token = credentials.token as string;

		if (!instanceUrl || !token) {
			throw new Error('Missing instanceUrl or token in Binalyze AIR credentials');
		}

		// Normalize instanceUrl by removing trailing slashes
		const normalizedInstanceUrl = instanceUrl.replace(/\/+$/, '');

		// Collect all organizations across multiple pages
		const allOrganizations: any[] = [];
		let currentPage = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			// Build URL with pagination and optional search filter
			let url = `${normalizedInstanceUrl}/api/public/organizations?pageNumber=${currentPage}&pageSize=100`;
			if (filter) {
				url += `&filter[searchTerm]=${encodeURIComponent(filter)}`;
			}

			const options: IHttpRequestOptions = {
				method: 'GET',
				url,
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				json: true,
			};

			const responseData = await this.helpers.httpRequest(options);

			if (!responseData.success) {
				const errorMessage = responseData.errors?.join(', ') || 'Failed to fetch organizations';
				throw new Error(`API Error: ${errorMessage}`);
			}

			const organizations = responseData.result?.entities || [];
			allOrganizations.push(...organizations);

			// Check if there are more pages
			const pagination = responseData.result?.pagination;
			if (pagination && pagination.pageNumber < pagination.totalPages) {
				currentPage++;
			} else {
				hasMorePages = false;
			}
		}

		// Process and filter organizations
		const results: INodeListSearchItems[] = allOrganizations
			.filter((org: any) => {
				// More comprehensive ID validation - check for multiple possible ID field names
				const orgId = org._id ?? org.id ?? org.organizationId ?? org.Id;
				return org && orgId !== undefined && orgId !== null && orgId !== '' && orgId !== 0 && org.name;
			})
			.map((organization: any) => {
				// Use the same ID logic as in the search
				const orgId = organization._id ?? organization.id ?? organization.organizationId ?? organization.Id;
				return {
					name: organization.name,
					value: String(orgId),
					url: organization.url || '', // Include additional data if available
				};
			})
			// Apply client-side filtering for better search results (in case API filtering is limited)
			.filter((item: any) =>
				!filter ||
				item.name.toLowerCase().includes(filter.toLowerCase()) ||
				item.value === filter
			)
			.sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

		return { results };
	} catch (error) {
		// More descriptive error message for debugging
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to load organizations: ${errorMessage}`);
	}
}

// Load options method for dropdowns (legacy support)
export async function getOrganizationsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		// Get credentials
		const credentials = await this.getCredentials('airCredentialsApi');

		if (!credentials) {
			throw new Error('No credentials provided for Binalyze AIR');
		}

		const instanceUrl = credentials.instanceUrl as string;
		const token = credentials.token as string;

		if (!instanceUrl || !token) {
			throw new Error('Missing instanceUrl or token in Binalyze AIR credentials');
		}

		// Normalize instanceUrl by removing trailing slashes
		const normalizedInstanceUrl = instanceUrl.replace(/\/+$/, '');

		const allOrganizations: any[] = [];
		let currentPage = 1;
		let hasMorePages = true;

		try {
			while (hasMorePages) {
				const options: IHttpRequestOptions = {
					method: 'GET',
					url: `${normalizedInstanceUrl}/api/public/organizations?pageNumber=${currentPage}&pageSize=100`,
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					json: true,
				};

				const responseData = await this.helpers.httpRequest(options);

				if (!responseData.success) {
					throw new Error(responseData.errors?.join(', ') || 'Failed to fetch organizations');
				}

				const organizations = responseData.result?.entities || [];
				allOrganizations.push(...organizations);

				const pagination = responseData.result?.pagination;
				if (pagination && pagination.pageNumber < pagination.totalPages) {
					currentPage++;
				} else {
					hasMorePages = false;
				}
			}

			// Filter out organizations without valid IDs before mapping
			const validOrganizations = allOrganizations.filter(org => {
				const orgId = org._id ?? org.id ?? org.organizationId ?? org.Id;
				return org && orgId !== undefined && orgId !== null && orgId !== '' && orgId !== 0;
			});

			return validOrganizations.map((organization) => {
				const orgId = organization._id ?? organization.id ?? organization.organizationId ?? organization.Id;
				const name = organization.name || `Organization ${orgId || 'Unknown'}`;
				const value = String(orgId);

				return {
					name,
					value,
				};
			});
		} catch (error) {
			throw new Error(`Failed to load organizations: ${error.message}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to load organizations: ${errorMessage}`);
	}
}

// Execute function for organizations
export async function executeOrganizations(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	// Get credentials
	const credentials = await this.getCredentials('airCredentialsApi');

	if (!credentials) {
		throw new Error('No credentials provided for Binalyze AIR');
	}

	const instanceUrl = credentials.instanceUrl as string;
	const token = credentials.token as string;

	if (!instanceUrl || !token) {
		throw new Error('Missing instanceUrl or token in Binalyze AIR credentials');
	}

	// Normalize instanceUrl by removing trailing slashes
	const normalizedInstanceUrl = instanceUrl.replace(/\/+$/, '');

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;
			let endpoint = '';
			let method: IHttpRequestMethods = 'GET';
			const queryParams: string[] = [];

			if (operation === 'getAll') {
				endpoint = '/api/public/organizations';

				// Handle additional fields
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;
				if (additionalFields.nameFilter) {
					queryParams.push(`filter[name]=${encodeURIComponent(additionalFields.nameFilter)}`);
				}
				if (additionalFields.pageNumber) {
					queryParams.push(`pageNumber=${additionalFields.pageNumber}`);
				}
				if (additionalFields.pageSize) {
					queryParams.push(`pageSize=${additionalFields.pageSize}`);
				}
				if (additionalFields.searchTerm) {
					queryParams.push(`filter[searchTerm]=${encodeURIComponent(additionalFields.searchTerm)}`);
				}
				if (additionalFields.sortBy) {
					queryParams.push(`sortBy=${additionalFields.sortBy}`);
				}
				if (additionalFields.sortType) {
					queryParams.push(`sortType=${additionalFields.sortType}`);
				}

				if (queryParams.length > 0) {
					endpoint += `?${queryParams.join('&')}`;
				}
			} else if (operation === 'get') {
				const organizationResource = this.getNodeParameter('organizationId', i) as any;

				let organizationId: string | undefined;

				if (organizationResource.mode === 'list') {
					// Resource Locator 'From List' mode
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'id') {
					// Resource Locator 'By ID' mode
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					// Resource Locator 'By Name' mode - Enhanced search logic
					const searchName = organizationResource.value.trim();

					if (!searchName) {
						throw new NodeOperationError(this.getNode(), 'Organization name cannot be empty', {
							itemIndex: i,
						});
					}

					// Search for organization by name with improved logic
					let currentPage = 1;
					let foundMatch = false;

					// Search through all pages until we find a match
					while (!foundMatch) {
						const searchOptions: IHttpRequestOptions = {
							method: 'GET',
							url: `${normalizedInstanceUrl}/api/public/organizations?pageNumber=${currentPage}&pageSize=100&filter[searchTerm]=${encodeURIComponent(searchName)}`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Accept': 'application/json',
								'Content-Type': 'application/json',
							},
							json: true,
						};

						const searchResponse = await this.helpers.httpRequest(searchOptions);

						if (!searchResponse.success) {
							const errorMessage = searchResponse.errors?.join(', ') || 'Search request failed';
							throw new NodeOperationError(this.getNode(), `Failed to search for organization: ${errorMessage}`, {
								itemIndex: i,
							});
						}

						const organizations = searchResponse.result?.entities || [];

						if (organizations.length === 0) {
							break; // No more results
						}

						// Look for exact match (case-insensitive)
						const exactMatch = organizations.find((org: any) =>
							org.name && org.name.toLowerCase() === searchName.toLowerCase()
						);

						if (exactMatch) {
							foundMatch = true;

							// More comprehensive ID validation
							const orgId = exactMatch._id ?? exactMatch.id ?? exactMatch.organizationId ?? exactMatch.Id;

							if (orgId === undefined || orgId === null || orgId === '' || orgId === 0) {
								throw new NodeOperationError(this.getNode(),
									`Organization '${searchName}' found but has no valid ID. ` +
									`ID value: ${orgId}, ID type: ${typeof orgId}. ` +
									`Available fields: ${Object.keys(exactMatch).join(', ')}`, {
									itemIndex: i,
								});
							}

							organizationId = String(orgId);
							break;
						}

						// Check if there are more pages
						const pagination = searchResponse.result?.pagination;
						if (pagination && pagination.pageNumber < pagination.totalPages) {
							currentPage++;
						} else {
							break; // No more pages
						}
					}

					if (!foundMatch) {
						// Provide helpful error message with suggestions
						const searchOptions: IHttpRequestOptions = {
							method: 'GET',
							url: `${normalizedInstanceUrl}/api/public/organizations?pageNumber=1&pageSize=10&filter[searchTerm]=${encodeURIComponent(searchName)}`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Accept': 'application/json',
								'Content-Type': 'application/json',
							},
							json: true,
						};

						const suggestionResponse = await this.helpers.httpRequest(searchOptions);
						const suggestions = suggestionResponse.success && suggestionResponse.result?.entities
							? suggestionResponse.result.entities.map((org: any) => org.name).slice(0, 5)
							: [];

						let errorMessage = `Organization '${searchName}' not found.`;
						if (suggestions.length > 0) {
							errorMessage += ` Similar organizations: ${suggestions.join(', ')}`;
						}

						throw new NodeOperationError(this.getNode(), errorMessage, {
							itemIndex: i,
						});
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

				endpoint = `/api/public/organizations/${organizationId}`;
			}

			// Prepare the HTTP request options
			const options: IHttpRequestOptions = {
				method,
				url: `${normalizedInstanceUrl}${endpoint}`,
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
			} else {
				// For 'get' operation, the response structure might vary
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
