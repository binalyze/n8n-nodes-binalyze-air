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
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	extractPaginationInfo,
	processApiResponseEntities,
	requireValidId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';
import { api as usersApi, User } from '../api/users/users';
import {
	findOrganizationByName,
} from './organizations';

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
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Not a valid organization ID (must be numeric)',
						},
					},
				],
				placeholder: 'Enter organization ID (use 0 for all organizations)',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		description: 'The organization to filter users by',
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
				default: 100,
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
): Promise<User[]> {
	const allUsers: User[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const additionalParams = {
			pageNumber: currentPage,
			pageSize,
			searchTerm: searchFilter,
		};

		const responseData = await usersApi.getUsers(context, credentials, organizationIds, additionalParams);

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
 * Search for user by exact username match
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

	// First try searching with the search term
	const responseData = await usersApi.getUsers(context, credentials, organizationIds, {
		searchTerm: searchUsername,
	});
	const users = responseData.result?.entities || [];

	// Look for exact match (case-insensitive) by username or email
	let exactMatch = users.find((user: User) =>
		(user.username && user.username.toLowerCase() === searchUsername.toLowerCase()) ||
		(user.email && user.email.toLowerCase() === searchUsername.toLowerCase())
	);

	// If no exact match found in search results, try fetching all users and search locally
	if (!exactMatch) {
		const allUsersResponse = await usersApi.getUsers(context, credentials, organizationIds);
		const allUsers = allUsersResponse.result?.entities || [];

		exactMatch = allUsers.find((user: User) =>
			(user.username && user.username.toLowerCase() === searchUsername.toLowerCase()) ||
			(user.email && user.email.toLowerCase() === searchUsername.toLowerCase())
		);
	}

	if (!exactMatch) {
		// Provide helpful error message with suggestions
		const suggestions = users
			.map((user: User) => user.username || user.email)
			.filter(Boolean)
			.slice(0, 5);

		let errorMessage = `User '${searchUsername}' not found.`;
		if (suggestions.length > 0) {
			errorMessage += ` Similar users: ${suggestions.join(', ')}`;
		}

		throw new Error(errorMessage);
	}

	return extractUserId(exactMatch);
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

			switch (operation) {
				case 'getAll': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					let organizationId: string;

					if (organizationResource.mode === 'id') {
						organizationId = organizationResource.value;
					} else if (organizationResource.mode === 'name') {
						try {
							if (organizationResource.value.toLowerCase() === 'all organizations') {
								organizationId = '0';
							} else {
								organizationId = await findOrganizationByName(this, credentials, organizationResource.value);
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
							itemIndex: i,
						});
					}

					// Validate organization ID (allow 0 for all organizations)
					if (!organizationId && organizationId !== '0') {
						throw new NodeOperationError(this.getNode(), 'Organization selection is required', {
							itemIndex: i,
						});
					}

					// Build additional parameters from the additionalFields
					const additionalParams = {
						includeNotInOrganization: additionalFields.includeNotInOrganization,
						pageNumber: additionalFields.pageNumber,
						pageSize: additionalFields.pageSize,
						roles: additionalFields.roles,
					};

					const responseData = await usersApi.getUsers(this, credentials, organizationId, additionalParams);

					const entities = responseData.result?.entities || [];
					const paginationInfo = extractPaginationInfo(responseData.result);

					// Attach pagination info to entities
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'get': {
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

					const responseData = await usersApi.getUserById(this, credentials, userId);

					// Handle the response - user API returns the user object directly in result
					const userData = responseData.result;

					if (!userData) {
						throw new NodeOperationError(this.getNode(), 'User not found', {
							itemIndex: i,
						});
					}

					returnData.push({
						json: userData as any,
						pairedItem: i,
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
// Test comment
