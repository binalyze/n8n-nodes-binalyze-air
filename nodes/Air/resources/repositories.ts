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
} from './helpers';

export const RepositoriesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['repositories'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many repositories',
				action: 'Get many repositories',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'number',
		required: true,
		default: 0,
		placeholder: 'Enter organization ID',
		displayOptions: {
			show: {
				resource: ['repositories'],
				operation: ['getAll'],
			},
		},
		description: 'The organization ID to filter repositories by (0 for default organization)',
		typeOptions: {
			minValue: 0,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['repositories'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'All Organizations',
				name: 'allOrganizations',
				type: 'boolean',
				default: false,
				description: 'Whether to include repositories from all organizations',
			},
			{
				displayName: 'Host Filter',
				name: 'host',
				type: 'string',
				default: '',
				description: 'Filter repositories by host',
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
				displayName: 'Path Filter',
				name: 'path',
				type: 'string',
				default: '',
				description: 'Filter repositories by path',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search repositories by name (supports partial matches)',
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
						name: 'Host',
						value: 'host',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Path',
						value: 'path',
					},
					{
						name: 'Type',
						value: 'type',
					},
					{
						name: 'Username',
						value: 'username',
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
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'smb',
				description: 'Filter repositories by type',
				options: [
					{
						name: 'Amazon S3',
						value: 'amazon-s3',
					},
					{
						name: 'Azure Storage',
						value: 'azure-storage',
					},
					{
						name: 'FTPS',
						value: 'ftps',
					},
					{
						name: 'SFTP',
						value: 'sftp',
					},
					{
						name: 'SMB',
						value: 'smb',
					},
				],
			},
			{
				displayName: 'Username Filter',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Filter repositories by username',
			},
		],
	},
];

/**
 * Build query parameters for repositories API
 */
export function buildRepositoryQueryParams(organizationId: number, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationId,
	};

	// Add pagination parameters
	if (additionalFields.pageNumber !== undefined) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize !== undefined) {
		queryParams.pageSize = additionalFields.pageSize;
	}

	// Add sorting parameters
	if (additionalFields.sortBy) {
		queryParams.sortBy = additionalFields.sortBy;
	}
	if (additionalFields.sortType) {
		queryParams.sortType = additionalFields.sortType;
	}

	// Add filter parameters
	if (additionalFields.type) {
		queryParams['filter[type]'] = additionalFields.type;
	}
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}
	if (additionalFields.path) {
		queryParams['filter[path]'] = additionalFields.path;
	}
	if (additionalFields.username) {
		queryParams['filter[username]'] = additionalFields.username;
	}
	if (additionalFields.host) {
		queryParams['filter[host]'] = additionalFields.host;
	}
	if (additionalFields.allOrganizations !== undefined) {
		queryParams['filter[allOrganizations]'] = additionalFields.allOrganizations ? 'true' : 'false';
	}

	return queryParams;
}

/**
 * Validate that a repository has essential fields
 */
export function isValidRepository(repository: any): boolean {
	if (!repository) return false;

	// Check for essential repository fields
	const hasId = repository._id || repository.id;
	const hasName = repository.name;
	const hasType = repository.type;

	return !!(hasId && hasName && hasType);
}

/**
 * Extract repository ID from repository object
 */
export function extractRepositoryId(repository: any): string {
	const repoId = repository._id ?? repository.id ?? repository.repositoryId ?? repository.Id;

	if (repoId === undefined || repoId === null || repoId === '' || repoId === 0) {
		throw new Error(
			`Repository has no valid ID. ID value: ${repoId}, ID type: ${typeof repoId}. ` +
			`Available fields: ${Object.keys(repository).join(', ')}`
		);
	}

	return String(repoId);
}

/**
 * Fetch all repositories across multiple pages
 */
export async function fetchAllRepositories(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: any,
	organizationId: number,
	filter?: string,
	pageSize: number = 100
): Promise<any[]> {
	const allRepositories: any[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': organizationId,
			pageNumber: currentPage,
			pageSize,
		};

		if (filter) {
			queryParams['filter[searchTerm]'] = filter;
		}

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/evidences/repositories',
			queryParams
		);

		const responseData = await context.helpers.httpRequest(options);
		validateApiResponse(responseData, 'Failed to fetch repositories');

		const repositories = responseData.result?.entities || [];
		allRepositories.push(...repositories);

		// Check if there are more pages
		const pagination = responseData.result?.pagination;
		if (pagination && pagination.pageNumber < pagination.totalPages) {
			currentPage++;
		} else {
			hasMorePages = false;
		}
	}

	return allRepositories;
}

// List search method for resource locator
export async function getRepositories(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		// For this implementation, we'll need an organizationId parameter from context
		// This is a simplified version - in practice you might want to get this from a parameter
		const organizationId = 0; // Default to all organizations
		const allRepositories = await fetchAllRepositories(this, credentials, organizationId, filter);

		// Process and filter repositories
		const results: INodeListSearchItems[] = allRepositories
			.filter(isValidRepository)
			.map((repository: any) => ({
				name: `${repository.name} (${repository.type})`,
				value: extractRepositoryId(repository),
				url: repository.url || '',
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
		throw new Error(`Failed to load repositories: ${errorMessage}`);
	}
}

// Load options method for dropdowns (legacy support)
export async function getRepositoriesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		// For this implementation, we'll use default organizationId
		const organizationId = 0;
		const allRepositories = await fetchAllRepositories(this, credentials, organizationId);

		// Filter out repositories without valid IDs before mapping
		const validRepositories = allRepositories.filter(isValidRepository);

		return validRepositories.map((repository) => {
			const repoId = extractRepositoryId(repository);
			const name = repository.name || `Repository ${repoId || 'Unknown'}`;
			const type = repository.type ? ` (${repository.type})` : '';

			return {
				name: `${name}${type}`,
				value: repoId,
			};
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		throw new Error(`Failed to load repositories: ${errorMessage}`);
	}
}

// Execute function for repositories
export async function executeRepositories(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'getAll') {
				const organizationId = this.getNodeParameter('organizationId', i) as number;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				// Validate organization ID
				if (organizationId === undefined || organizationId === null || (typeof organizationId !== 'number') || organizationId < 0) {
					throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number (0 or greater)', {
						itemIndex: i,
					});
				}

				const queryParams = buildRepositoryQueryParams(organizationId, additionalFields);

				const options = buildRequestOptions(
					credentials,
					'GET',
					'/api/public/evidences/repositories',
					queryParams
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				const entities = responseData.result?.entities || [];
				const pagination = responseData.result?.pagination;

				// Add pagination info to each item if available
				entities.forEach((repository: any) => {
					returnData.push({
						json: {
							...repository,
							...(pagination && { _pagination: pagination }),
						},
						pairedItem: i,
					});
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
