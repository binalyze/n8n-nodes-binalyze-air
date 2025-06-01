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
	extractSimplifiedPaginationInfo,
	processApiResponseEntitiesWithSimplifiedPagination,
	requireValidId,
	catchAndFormatError,
} from './helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

export const UsersOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['users'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many users',
				action: 'Get many users',
			},
			{
				name: 'Get User',
				value: 'get',
				description: 'Retrieve a specific user',
				action: 'Get a user',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'User',
		name: 'userId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a user...',
				typeOptions: {
					searchListMethod: 'getUsers',
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
							errorMessage: 'Not a valid user ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter user ID (alphanumeric or GUID)',
			},
			{
				displayName: 'By Username',
				name: 'username',
				type: 'string',
				placeholder: 'Enter username or email',
			},
		],
		required: true,
		description: 'The user to retrieve',
	},
	{
		displayName: 'Organization Filter',
		name: 'organizationIds',
		type: 'string',
		default: '0',
		placeholder: 'Enter organization IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['getAll'],
			},
		},
		required: true,
		description: 'Organization IDs to filter users by (required by API). Use "0" for all organizations.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Users Not in Organization',
				name: 'includeNotInOrganization',
				type: 'boolean',
				default: false,
				description: 'Whether to include users not assigned to any organization',
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
				displayName: 'Roles Filter',
				name: 'roles',
				type: 'string',
				default: '',
				description: 'Filter users by roles (comma-separated)',
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
		],
	},
];

/**
 * Extract user ID from user object with comprehensive field checking
 */
export function extractUserId(user: any): string {
	return extractEntityId(user, 'user');
}

/**
 * Validate that a user has a valid ID and required fields
 */
export function isValidUser(user: any): boolean {
	return isValidEntity(user, ['username', 'email']);
}

/**
 * Fetch all users across multiple pages
 */
export async function fetchAllUsers(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationIds: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	const allUsers: any[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const queryParams: Record<string, string | number> = {
			pageNumber: currentPage,
			pageSize,
			'filter[organizationIds]': organizationIds,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/user-management/users',
			queryParams
		);

		const responseData = await context.helpers.httpRequest(options);
		validateApiResponse(responseData, 'Failed to fetch users');

		const users = responseData.result?.entities || [];
		allUsers.push(...users);

		// Check if there are more pages using the actual API pagination structure
		const result = responseData.result;
		if (result && result.currentPage && result.totalPageCount && result.currentPage < result.totalPageCount) {
			currentPage++;
		} else {
			hasMorePages = false;
		}
	}

	return allUsers;
}

/**
 * Search for user by exact username match across all pages
 */
export async function findUserByUsername(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	username: string,
	organizationIds: string = '0'
): Promise<string> {
	const searchUsername = username.trim();

	if (!searchUsername) {
		throw new Error('Username cannot be empty');
	}

	let currentPage = 1;
	let foundMatch = false;
	let userId: string | undefined;

	// Search through all pages until we find a match
	while (!foundMatch) {
		const queryParams = {
			pageNumber: currentPage,
			pageSize: 100,
			'filter[organizationIds]': organizationIds,
		};

		const options = buildRequestOptions(
			credentials,
			'GET',
			'/api/public/user-management/users',
			queryParams
		);

		const searchResponse = await context.helpers.httpRequest(options);
		validateApiResponse(searchResponse, 'Failed to search for user');

		const users = searchResponse.result?.entities || [];

		if (users.length === 0) {
			break; // No more results
		}

		// Look for exact match (case-insensitive) by username or email
		const exactMatch = users.find((user: any) =>
			(user.username && user.username.toLowerCase() === searchUsername.toLowerCase()) ||
			(user.email && user.email.toLowerCase() === searchUsername.toLowerCase())
		);

		if (exactMatch) {
			foundMatch = true;
			userId = extractUserId(exactMatch);
			break;
		}

		// Check if there are more pages using the actual API pagination structure
		const result = searchResponse.result;
		if (result && result.currentPage && result.totalPageCount && result.currentPage < result.totalPageCount) {
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
			'/api/public/user-management/users',
			{
				pageNumber: 1,
				pageSize: 10,
				'filter[organizationIds]': organizationIds,
			}
		);

		const suggestionResponse = await context.helpers.httpRequest(suggestionOptions);
		const suggestions = suggestionResponse.success && suggestionResponse.result?.entities
			? suggestionResponse.result.entities
				.map((user: any) => user.username || user.email)
				.filter(Boolean)
				.slice(0, 5)
			: [];

		let errorMessage = `User '${searchUsername}' not found.`;
		if (suggestions.length > 0) {
			errorMessage += ` Similar users: ${suggestions.join(', ')}`;
		}

		throw new Error(errorMessage);
	}

	return userId!;
}

/**
 * Build query parameters for user list operations
 */
export function buildUserQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationIds,
	};

	if (additionalFields.includeNotInOrganization !== undefined) {
		queryParams['filter[includeNotInOrganization]'] = additionalFields.includeNotInOrganization;
	}
	if (additionalFields.pageNumber) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize) {
		queryParams.pageSize = additionalFields.pageSize;
	}
	if (additionalFields.roles) {
		queryParams['filter[roles]'] = additionalFields.roles;
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
export async function getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const allUsers = await fetchAllUsers(this, credentials, '0', filter);

		return createListSearchResults(
			allUsers,
			isValidUser,
			(user: any) => ({
				name: user.username || user.email || `User ${extractUserId(user)}`,
				value: extractUserId(user),
				url: user.url || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load users');
	}
}

// Load options method for dropdowns (legacy support)
export async function getUsersOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const allUsers = await fetchAllUsers(this, credentials, '0');

		return createLoadOptions(
			allUsers,
			isValidUser,
			(user) => {
				const userId = extractUserId(user);
				const name = user.username || user.email || `User ${userId || 'Unknown'}`;

				return {
					name,
					value: userId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load users');
	}
}

// Execute function for users
export async function executeUsers(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'getAll') {
				const organizationIds = String(this.getNodeParameter('organizationIds', i)).trim();
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				// Validate that organizationIds is provided
				if (!organizationIds) {
					throw new NodeOperationError(this.getNode(), 'Organization IDs are required', {
						itemIndex: i,
					});
				}

				const queryParams = buildUserQueryParams(organizationIds, additionalFields);

				const options = buildRequestOptions(
					credentials,
					'GET',
					'/api/public/user-management/users',
					queryParams
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				const entities = responseData.result?.entities || [];
				const paginationInfo = extractSimplifiedPaginationInfo(responseData.result);

				// Process entities with simplified pagination attached to each entity
				processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);
			} else if (operation === 'get') {
				const userResource = this.getNodeParameter('userId', i) as any;
				let userId: string;

				if (userResource.mode === 'list' || userResource.mode === 'id') {
					userId = userResource.value;
				} else if (userResource.mode === 'username') {
					try {
						userId = await findUserByUsername(this, credentials, userResource.value);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid user selection mode', {
						itemIndex: i,
					});
				}

				// Validate user ID
				try {
					userId = requireValidId(userId, 'User ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				const options = buildRequestOptions(
					credentials,
					'GET',
					`/api/public/user-management/users/${userId}`
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				// Handle the response - user API returns the user object directly in result
				const userData = responseData.result;

				if (!userData) {
					throw new NodeOperationError(this.getNode(), 'User not found', {
						itemIndex: i,
					});
				}

				returnData.push({
					json: userData,
					pairedItem: i,
				});
			}

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
