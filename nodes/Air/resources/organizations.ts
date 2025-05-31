import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	buildRequestOptions,
	validateApiResponse,
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	processApiResponseEntities,
	catchAndFormatError,
} from './helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

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
				name: 'Get Organization',
				value: 'get',
				description: 'Retrieve a specific organization',
				action: 'Get an organization',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many organizations',
				action: 'Get many organizations',
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
							regex: '^[a-zA-Z0-9-_]+$',
							errorMessage: 'Not a valid organization ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter organization ID (numeric or GUID)',
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

/**
 * Extract organization ID from organization object with comprehensive field checking
 */
export function extractOrganizationId(organization: any): string {
	return extractEntityId(organization, 'organization');
}

/**
 * Validate that an organization has a valid ID and name
 */
export function isValidOrganization(org: any): boolean {
	return isValidEntity(org, ['name']);
}

/**
 * Fetch all organizations across multiple pages
 */
export async function fetchAllOrganizations(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	const allOrganizations: any[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const queryParams: Record<string, string | number> = {
			pageNumber: currentPage,
			pageSize,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			queryParams
		);

		const responseData = await context.helpers.httpRequest(options);
		validateApiResponse(responseData, 'Failed to fetch organizations');

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

	return allOrganizations;
}

/**
 * Search for organization by exact name match across all pages
 */
export async function findOrganizationByName(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	organizationName: string
): Promise<string> {
	const searchName = organizationName.trim();

	if (!searchName) {
		throw new Error('Organization name cannot be empty');
	}

	let currentPage = 1;
	let foundMatch = false;
	let organizationId: string | undefined;

	// Search through all pages until we find a match
	while (!foundMatch) {
		const queryParams = {
			pageNumber: currentPage,
			pageSize: 100,
			'filter[searchTerm]': searchName,
		};

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			queryParams
		);

		const searchResponse = await context.helpers.httpRequest(options);
		validateApiResponse(searchResponse, 'Failed to search for organization');

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
			organizationId = extractOrganizationId(exactMatch);
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
		const suggestionOptions = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/organizations',
			{
				pageNumber: 1,
				pageSize: 10,
				'filter[searchTerm]': searchName,
			}
		);

		const suggestionResponse = await context.helpers.httpRequest(suggestionOptions);
		const suggestions = suggestionResponse.success && suggestionResponse.result?.entities
			? suggestionResponse.result.entities.map((org: any) => org.name).slice(0, 5)
			: [];

		let errorMessage = `Organization '${searchName}' not found.`;
		if (suggestions.length > 0) {
			errorMessage += ` Similar organizations: ${suggestions.join(', ')}`;
		}

		throw new Error(errorMessage);
	}

	return organizationId!;
}

/**
 * Build query parameters for organization list operations
 */
export function buildOrganizationQueryParams(additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	if (additionalFields.nameFilter) {
		queryParams['filter[name]'] = additionalFields.nameFilter;
	}
	if (additionalFields.pageNumber) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize) {
		queryParams.pageSize = additionalFields.pageSize;
	}
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}
	if (additionalFields.sortBy) {
		queryParams.sortBy = additionalFields.sortBy;
	}
	if (additionalFields.sortType) {
		queryParams.sortType = additionalFields.sortType;
	}

	return queryParams;
}

// List search method for resource locator
export async function getOrganizations(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await fetchAllOrganizations(this, credentials, filter);

		return createListSearchResults(
			allOrganizations,
			isValidOrganization,
			(organization: any) => ({
				name: organization.name,
				value: extractOrganizationId(organization),
				url: organization.url || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load organizations');
	}
}

// Load options method for dropdowns (legacy support)
export async function getOrganizationsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const allOrganizations = await fetchAllOrganizations(this, credentials);

		return createLoadOptions(
			allOrganizations,
			isValidOrganization,
			(organization) => {
				const orgId = extractOrganizationId(organization);
				const name = organization.name || `Organization ${orgId || 'Unknown'}`;

				return {
					name,
					value: orgId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load organizations');
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

				processApiResponseEntities(entities, pagination, returnData, i);
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
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
