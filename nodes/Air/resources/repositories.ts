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
	extractPaginationInfo,
	processApiResponseEntities,
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { findOrganizationByName } from './organizations';

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
				name: 'Get',
				value: 'get',
				description: 'Get a repository by name',
				action: 'Get a repository',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many repositories',
				action: 'Get many repositories',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Repository',
		name: 'repositoryId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a repository...',
		displayOptions: {
			show: {
				resource: ['repositories'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a repository...',
				typeOptions: {
					searchListMethod: 'getRepositories',
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
							errorMessage: 'Not a valid repository ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter repository ID (numeric or GUID)',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter repository name',
			},
		],
		required: true,
		description: 'The repository to retrieve',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select organization...',
		displayOptions: {
			show: {
				resource: ['repositories'],
				operation: ['getAll'],
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
							regex: '^[0-9,\\s]+$',
							errorMessage: 'Organization IDs must be comma-separated numbers. Use "0" for all organizations.',
						},
					},
				],
				placeholder: 'Enter organization IDs (comma-separated) or "0" for all',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'Organization(s) to filter repositories. Use "0" for all organizations, specific IDs for multiple organizations, or search by name for a single organization.',
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
				description: 'Whether to include all organizations in the search',
			},
			{
				displayName: 'Filter By Host',
				name: 'host',
				type: 'string',
				default: '',
				description: 'Filter repositories by host',
			},
			{
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter repositories by name (exact match)',
			},
			{
				displayName: 'Filter By Path',
				name: 'path',
				type: 'string',
				default: '',
				description: 'Filter repositories by path',
			},
			{
				displayName: 'Filter By Type',
				name: 'type',
				type: 'multiOptions',
				default: [],
				description: 'Filter repositories by type (multiple selection supported)',
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
				displayName: 'Filter By Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Filter repositories by username',
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
				default: 100,
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
				description: 'Search repositories by name (supports partial matches)',
			},
		],
	},
];

/**
 * Build query parameters for repositories API
 */
export function buildRepositoryQueryParams(organizationId: string, additionalFields: any): Record<string, string | number> {
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

	// Add filter parameters
	if (additionalFields.type && additionalFields.type.length > 0) {
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
	if (additionalFields.name) {
		queryParams['filter[name]'] = additionalFields.name;
	}
	if (additionalFields.allOrganizations) {
		queryParams['filter[allOrganizations]'] = 'true';
	}

	return queryParams;
}

/**
 * Validate that a repository has essential fields
 */
export function isValidRepository(repository: any): boolean {
	return isValidEntity(repository, ['name', 'type']);
}

/**
 * Extract repository ID from repository object
 */
export function extractRepositoryId(repository: any): string {
	return extractEntityId(repository, 'repository');
}

/**
 * Fetch all repositories across multiple pages
 */
export async function fetchAllRepositories(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: any,
	organizationId: string,
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

		// Check if there are more pages using the actual API pagination structure
		const result = responseData.result;
		if (result && result.currentPage && result.totalPageCount && result.currentPage < result.totalPageCount) {
			currentPage++;
		} else {
			hasMorePages = false;
		}
	}

	return allRepositories;
}

/**
 * Get a single repository by ID
 */
export async function getRepositoryById(
	context: IExecuteFunctions,
	credentials: any,
	organizationId: string,
	repositoryId: string
): Promise<any | null> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationId,
		'filter[id]': repositoryId,
		pageSize: 1,
	};

	const options = buildRequestOptions(
		credentials,
		'GET',
		'/api/public/evidences/repositories',
		queryParams
	);

	const responseData = await context.helpers.httpRequest(options);
	validateApiResponse(responseData, 'Failed to fetch repository');

	const repositories = responseData.result?.entities || [];
	return repositories.length > 0 ? repositories[0] : null;
}

/**
 * Get a single repository by name using searchTerm filter
 */
export async function getRepositoryByName(
	context: IExecuteFunctions,
	credentials: any,
	organizationId: string,
	repositoryName: string
): Promise<any | null> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationId,
		'filter[searchTerm]': repositoryName,
		pageSize: 100, // Get a reasonable page size to find the repository
	};

	const options = buildRequestOptions(
		credentials,
		'GET',
		'/api/public/evidences/repositories',
		queryParams
	);

	const responseData = await context.helpers.httpRequest(options);
	validateApiResponse(responseData, 'Failed to fetch repository');

	const repositories = responseData.result?.entities || [];

	// Find exact match by name (case-insensitive)
	const exactMatch = repositories.find((repo: any) =>
		repo.name && repo.name.toLowerCase() === repositoryName.toLowerCase()
	);

	if (exactMatch) {
		return exactMatch;
	}

	// If no exact match, return the first partial match
	if (repositories.length > 0) {
		return repositories[0];
	}

	return null;
}

// List search method for resource locator
export async function getRepositories(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		// For this implementation, we'll need an organizationId parameter from context
		// This is a simplified version - in practice you might want to get this from a parameter
		const organizationId = '0'; // Default to all organizations
		const allRepositories = await fetchAllRepositories(this, credentials, organizationId, filter);

		return createListSearchResults(
			allRepositories,
			isValidRepository,
			(repository: any) => ({
				name: `${repository.name} (${repository.type})`,
				value: extractRepositoryId(repository),
				url: repository.url || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load repositories');
	}
}

// Load options method for dropdowns (legacy support)
export async function getRepositoriesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		// For this implementation, we'll use default organizationId
		const organizationId = '0';
		const allRepositories = await fetchAllRepositories(this, credentials, organizationId);

		return createLoadOptions(
			allRepositories,
			isValidRepository,
			(repository) => {
				const repoId = extractRepositoryId(repository);
				const name = repository.name || `Repository ${repoId || 'Unknown'}`;
				const type = repository.type ? ` (${repository.type})` : '';

				return {
					name: `${name}${type}`,
					value: repoId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load repositories');
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

			switch (operation) {
				case 'get': {
					// Use default organization ID (0) for get operation to retrieve repositories visible to all organizations
					const organizationId = '0';
					const repositoryResource = this.getNodeParameter('repositoryId', i) as any;

					let repository: any | null = null;

					if (repositoryResource.mode === 'list' || repositoryResource.mode === 'id') {
						// For both list and id modes, the value should be the repository ID
						const repositoryId = repositoryResource.value;
						try {
							const validatedRepositoryId = normalizeAndValidateId(repositoryId, 'Repository ID');
							repository = await getRepositoryById(this, credentials, organizationId, validatedRepositoryId);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					} else if (repositoryResource.mode === 'name') {
						// For name mode, search by name
						const repositoryName = repositoryResource.value;
						if (!repositoryName || typeof repositoryName !== 'string' || repositoryName.trim() === '') {
							throw new NodeOperationError(this.getNode(), 'Repository name is required and must be a non-empty string', {
								itemIndex: i,
							});
						}
						repository = await getRepositoryByName(this, credentials, organizationId, repositoryName.trim());
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid repository selection mode', {
							itemIndex: i,
						});
					}

					if (repository) {
						returnData.push({
							json: repository,
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `No repository found with ${repositoryResource.mode}: ${repositoryResource.value}`, {
							itemIndex: i,
						});
					}
					break;
				}

				case 'getAll': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;
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
					if (!organizationId || String(organizationId).trim() === '') {
						throw new NodeOperationError(this.getNode(), 'Organization ID cannot be empty', {
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
					const paginationInfo = extractPaginationInfo(responseData.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`, {
						itemIndex: i,
					});
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
