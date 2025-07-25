import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
} from 'n8n-workflow';

import {
	getAirCredentials,
	validateApiResponse,
	extractEntityId,
	isValidEntity,
	handleExecuteError,
	normalizeAndValidateId,
	createListSearchResults,
	createLoadOptions,
	extractPaginationInfo,
	processApiResponseEntities,
} from '../utils/helpers';

// Import user utilities for Resource Locator pattern
import { findUserByUsername, fetchAllUsers, isValidUser, extractUserId } from './users';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import {
	api as casesApi,
	Case,
	CasesResponse,
	CaseActivitiesResponse,
	CaseEndpointsResponse,
	CaseTasksResponse,
	CaseUsersResponse
} from '../api/cases/cases';
import { api as organizationsApi } from '../api/organizations/organizations';

export const CasesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cases'],
			},
		},
		options: [
			{
				name: 'Change Owner',
				value: 'changeOwner',
				description: 'Change the owner of a case',
				action: 'Change case owner',
			},
			{
				name: 'Check Name',
				value: 'checkName',
				description: 'Check if a case name is available',
				action: 'Check case name availability',
			},
			{
				name: 'Close Case',
				value: 'closeCase',
				description: 'Close a specific case',
				action: 'Close a case',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new case',
				action: 'Create a case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific case',
				action: 'Get a case',
			},
			{
				name: 'Get Activities',
				value: 'getActivities',
				description: 'Get activities for a specific case',
				action: 'Get case activities',
			},
			{
				name: 'Get Endpoints',
				value: 'getEndpoints',
				description: 'Get endpoints for a specific case',
				action: 'Get case endpoints',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many cases',
				action: 'Get many cases',
			},
			{
				name: 'Get Tasks',
				value: 'getTasks',
				description: 'Get tasks for a specific case',
				action: 'Get case tasks',
			},
			{
				name: 'Get Users',
				value: 'getUsers',
				description: 'Get users for a specific case',
				action: 'Get case users',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: [
					'get',
				],
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
							regex: '^[a-zA-Z0-9-_]+$',
							errorMessage: 'Not a valid case ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter case ID',
			},
		],
		required: true,
		description: 'The ID of the case to retrieve',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select organization...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: [
					'getActivities',
					'getEndpoints',
					'getTasks',
					'getUsers',
					'changeOwner',
					'closeCase',
				],
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
		description: 'Organization to filter cases',
	},
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: [
					'getActivities',
					'getEndpoints',
					'getTasks',
					'getUsers',
					'changeOwner',
					'closeCase'
				],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a case...',
				typeOptions: {
					searchListMethod: 'getCases',
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
							errorMessage: 'Not a valid case ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter case ID',
			},
		],
		required: true,
		description: 'The case to operate on',
	},
	{
		displayName: 'Case Name',
		name: 'caseName',
		type: 'string',
		default: '',
		placeholder: 'Enter case name',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create', 'checkName'],
			},
		},
		required: true,
		description: 'The name of the case',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select organization...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create', 'getAll'],
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
		description: 'Organization for the case. For getAll operation, use "0" for all organizations.',
	},
	{
		displayName: 'Owner User',
		name: 'ownerUserId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
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
		description: 'The user who will own the case',
	},
	{
		displayName: 'New Owner User',
		name: 'newOwnerUserId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['changeOwner'],
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
		description: 'The new owner user for the case',
	},

	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		default: 'public-to-organization',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Public to Organization',
				value: 'public-to-organization',
			},
			{
				name: 'Private to Users',
				value: 'private-to-users',
			},
		],
		required: true,
		description: 'The visibility of the case',
	},
	{
		displayName: 'Assigned User IDs',
		name: 'assignedUserIds',
		type: 'string',
		default: '',
		placeholder: 'Enter comma-separated user IDs (optional)',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
				visibility: ['private-to-users'],
			},
		},
		description: 'Comma-separated list of user IDs to assign to the case (required for private cases)',
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'The page number to retrieve',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 20,
				description: 'The number of items per page',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter cases',
			},
			{
				displayName: 'Filter By Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'Archived',
						value: 'archived',
					},
				],
				description: 'Filter cases by status',
			},
		],
	},

];

// Helper functions
export function extractCaseId(caseItem: any): string {
	return extractEntityId(caseItem, '_id');
}

export function isValidCase(caseItem: any): boolean {
	return isValidEntity(caseItem, ['_id']);
}

export async function resolveUserResourceLocator(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	userResource: any,
	itemIndex: number,
	organizationIds?: string
): Promise<string> {
	if (!userResource || typeof userResource !== 'object') {
		throw new Error('Invalid user resource locator');
	}

	let userId: string;

	if (userResource.mode === 'list' || userResource.mode === 'id') {
		userId = userResource.value;
	} else if (userResource.mode === 'username') {
		try {
			// Use the provided organization IDs or default to '0' for all organizations
			const orgIds = organizationIds || '0';
			userId = await findUserByUsername(context, credentials, userResource.value, orgIds);
		} catch (error) {
			throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : String(error)}`);
		}
	} else {
		throw new Error('Invalid user selection mode');
	}

	return normalizeAndValidateId(userId, 'User ID');
}

export async function resolveCaseResourceLocator(
	context: IExecuteFunctions,
	caseResource: any,
	itemIndex: number
): Promise<string> {
	if (!caseResource || typeof caseResource !== 'object') {
		throw new Error('Invalid case resource locator');
	}

	let caseId: string;

	if (caseResource.mode === 'list' || caseResource.mode === 'id') {
		caseId = caseResource.value;
	} else {
		throw new Error('Invalid case selection mode');
	}

	return normalizeAndValidateId(caseId, 'Case ID');
}

/**
 * Helper function to get organization ID from the current node context
 * This attempts to access the organization parameter from the current node configuration
 * Falls back to '0' (all organizations) if the organization cannot be determined
 */
function getOrganizationIdFromContext(context: ILoadOptionsFunctions): string {
	try {
		// Try to get the current node parameters which includes the organization selection
		const currentParams = context.getCurrentNodeParameters();
		if (currentParams && currentParams.organizationId) {
			const orgResource = currentParams.organizationId as any;

			// Handle different organization resource locator modes
			if (typeof orgResource === 'object') {
				if (orgResource.mode === 'id' || orgResource.mode === 'list') {
					return orgResource.value || '0';
				}
				// For 'name' mode, we can't resolve it here without credentials, so fall back to default
				return '0';
			} else if (typeof orgResource === 'string') {
				return orgResource;
			}
		}
	} catch (error) {
		// If we can't get the current parameters (e.g., during initial dropdown loading),
		// fall back to default
	}

	// Default to all organizations if we can't determine the specific organization
	return '0';
}

export async function findOrganizationByName(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	organizationName: string
): Promise<string> {
	try {
		const organizations = await organizationsApi.getOrganizations(context, credentials, {
			pageSize: 100,
			searchTerm: organizationName
		});

		if (!organizations.success || !organizations.result || !organizations.result.entities) {
			throw new Error('Failed to fetch organizations or invalid response structure');
		}

		const matchingOrg = organizations.result.entities.find(
			(org: any) => org.name && org.name.toLowerCase() === organizationName.toLowerCase()
		);

		if (!matchingOrg) {
			throw new Error(`Organization with name "${organizationName}" not found`);
		}

		return String(matchingOrg._id);
	} catch (error) {
		throw new Error(`Failed to find organization by name: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// Load options functions
export async function getCases(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const credentials = await getAirCredentials(this);

	try {
		// Try to get the currently selected organization ID
		let organizationIds = '0'; // Default to all organizations
		try {
			// Get the current node parameters to access the organizationId
			const currentParams = this.getCurrentNodeParameters();
			if (currentParams && currentParams.organizationId) {
				const organizationId = currentParams.organizationId as any;
				if (typeof organizationId === 'string') {
					organizationIds = organizationId;
				} else if (organizationId && typeof organizationId === 'object') {
					if (organizationId.mode === 'id' || organizationId.mode === 'list') {
						organizationIds = organizationId.value || '0';
					} else if (organizationId.mode === 'name' && organizationId.value) {
						// For name mode, we need to resolve the organization name to ID
						try {
							organizationIds = await findOrganizationByName(this as unknown as IExecuteFunctions, credentials, organizationId.value);
						} catch (error) {
							// If we can't resolve the name, fall back to default
							organizationIds = '0';
						}
					}
				}
			}
		} catch (error) {
			// If organizationId parameter doesn't exist or can't be accessed, use default
		}

		const response = await casesApi.getCases(this, credentials, organizationIds, {
			pageSize: 100,
			searchTerm: filter
		});

		validateApiResponse(response, 'Failed to fetch cases');

		if (!response.result?.entities) {
			return { results: [] };
		}

		return createListSearchResults(
			response.result.entities,
			isValidCase,
			(caseItem) => ({
				name: caseItem.name || 'Unnamed Case',
				value: extractCaseId(caseItem),
			}),
			filter
		);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to fetch cases for selection');
	}
}

export async function getCasesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await getAirCredentials(this);

	try {
		// Try to get the currently selected organization ID
		let organizationIds = '0'; // Default to all organizations
		try {
			// Get the current node parameters to access the organizationId
			const currentParams = this.getCurrentNodeParameters();
			if (currentParams && currentParams.organizationId) {
				const organizationId = currentParams.organizationId as any;
				if (typeof organizationId === 'string') {
					organizationIds = organizationId;
				} else if (organizationId && typeof organizationId === 'object') {
					if (organizationId.mode === 'id' || organizationId.mode === 'list') {
						organizationIds = organizationId.value || '0';
					} else if (organizationId.mode === 'name' && organizationId.value) {
						// For name mode, we need to resolve the organization name to ID
						try {
							organizationIds = await findOrganizationByName(this as unknown as IExecuteFunctions, credentials, organizationId.value);
						} catch (error) {
							// If we can't resolve the name, fall back to default
							organizationIds = '0';
						}
					}
				}
			}
		} catch (error) {
			// If organizationId parameter doesn't exist or can't be accessed, use default
		}

		const response = await casesApi.getCases(this, credentials, organizationIds, { pageSize: 100 });

		validateApiResponse(response, 'Failed to fetch cases');

		if (!response.result?.entities) {
			return [];
		}

		return createLoadOptions(
			response.result.entities,
			isValidCase,
			(caseItem) => ({
				name: caseItem.name || 'Unnamed Case',
				value: extractCaseId(caseItem),
			})
		);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to fetch cases options');
	}
}

// Load options function for users (required for Resource Locator)
export async function getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const organizationIds = getOrganizationIdFromContext(this);

		// Use the organization-specific user search
		const allUsers = await fetchAllUsers(this, credentials, organizationIds, filter);

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
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to fetch users for selection');
	}
}

// Main execution function
export async function executeCases(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const operation = this.getNodeParameter('operation', 0) as string;

	const credentials = await getAirCredentials(this);

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			let responseData: any;

			switch (operation) {
				case 'getAll':
					responseData = await executeGetAllCases.call(this, credentials, itemIndex);
					break;
				case 'get':
					responseData = await executeGetCase.call(this, credentials, itemIndex);
					break;
				case 'create':
					responseData = await executeCreateCase.call(this, credentials, itemIndex);
					break;
				case 'closeCase':
					responseData = await executeCloseCase.call(this, credentials, itemIndex);
					break;
				case 'changeOwner':
					responseData = await executeChangeOwner.call(this, credentials, itemIndex);
					break;
				case 'checkName':
					responseData = await executeCheckName.call(this, credentials, itemIndex);
					break;
				case 'getActivities':
					responseData = await executeGetActivities.call(this, credentials, itemIndex);
					break;
				case 'getEndpoints':
					responseData = await executeGetEndpoints.call(this, credentials, itemIndex);
					break;
				case 'getTasks':
					responseData = await executeGetTasks.call(this, credentials, itemIndex);
					break;
				case 'getUsers':
					responseData = await executeGetUsers.call(this, credentials, itemIndex);
					break;
				default:
					throw new Error(`Unknown operation: ${operation}`);
			}

			// Handle different response structures
			if (operation === 'getAll' || operation === 'getActivities' || operation === 'getEndpoints' || operation === 'getTasks' || operation === 'getUsers') {
				// For operations that return multiple entities with pagination info
				const entities = responseData.result?.entities || [];
				const paginationInfo = extractPaginationInfo(responseData.result);

				// Process entities with simplified pagination attached to each entity
				processApiResponseEntities(entities, returnData, itemIndex, {
					includePagination: true,
					paginationData: paginationInfo,
					excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
				});
			} else if (operation === 'checkName') {
				// For checkName operation, return the full response structure consistently
				returnData.push({
					json: responseData,
					pairedItem: { item: itemIndex },
				});
			} else {
				// For single entity operations
				const jsonData = responseData.result || responseData;
				returnData.push({
					json: jsonData,
					pairedItem: { item: itemIndex },
				});
			}
		} catch (error) {
			handleExecuteError(this, error, itemIndex, returnData);
		}
	}

	return [returnData];
}

// Individual operation functions
async function executeGetAllCases(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CasesResponse> {
	const organizationResource = this.getNodeParameter('organizationId', itemIndex) as any;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as any;

	let organizationIds = '0';

	if (organizationResource.mode === 'id') {
		organizationIds = organizationResource.value;
	} else if (organizationResource.mode === 'name') {
		organizationIds = await findOrganizationByName(this, credentials, organizationResource.value);
	} else if (organizationResource.mode === 'list') {
		organizationIds = organizationResource.value;
	}

	const response = await casesApi.getCases(this, credentials, organizationIds, additionalFields);
	validateApiResponse(response, 'Failed to fetch cases');
	return response;
}

async function executeGetCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	// Organization is selected in the UI to filter the case dropdown, but not needed for the API call
	// The API retrieves the case by its ID regardless of organization
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.getCase(this, credentials, caseId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to get case: ${errorMessage}`);
	}

	if (!response.result) {
		throw new Error('Case not found');
	}

	return response;
}

async function executeCreateCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseName = this.getNodeParameter('caseName', itemIndex) as string;
	const organizationResource = this.getNodeParameter('organizationId', itemIndex) as any;
	const ownerUserResource = this.getNodeParameter('ownerUserId', itemIndex) as any;
	const visibility = this.getNodeParameter('visibility', itemIndex) as string;
	const assignedUserIdsParam = this.getNodeParameter('assignedUserIds', itemIndex, '') as string;
	let organizationId: number;

	if (organizationResource.mode === 'id') {
		organizationId = parseInt(organizationResource.value);
	} else if (organizationResource.mode === 'name') {
		const orgId = await findOrganizationByName(this, credentials, organizationResource.value);
		organizationId = parseInt(orgId);
	} else if (organizationResource.mode === 'list') {
		organizationId = parseInt(organizationResource.value);
	} else {
		throw new Error('Invalid organization selection');
	}

	// Resolve owner user ID using Resource Locator
	const ownerUserId = await resolveUserResourceLocator(this, credentials, ownerUserResource, itemIndex, organizationId.toString());

	// Process assigned user IDs
	let assignedUserIds: string[] = [];
	if (assignedUserIdsParam.trim()) {
		assignedUserIds = assignedUserIdsParam.split(',').map(id => id.trim()).filter(id => id);
	}

	// Validate that assignedUserIds is provided for private-to-users visibility
	if (visibility === 'private-to-users' && assignedUserIds.length === 0) {
		throw new Error('Assigned User IDs are required when visibility is set to "private-to-users"');
	}

	const caseData = {
		organizationId,
		name: caseName,
		ownerUserId,
		visibility,
		assignedUserIds
	};

	const response = await casesApi.createCase(this, credentials, caseData);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to create case: ${errorMessage}`);
	}

	return response;
}




async function executeCloseCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.closeCase(this, credentials, caseId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to close case: ${errorMessage}`);
	}

	return response;
}



async function executeChangeOwner(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);
	const newOwnerUserResource = this.getNodeParameter('newOwnerUserId', itemIndex) as any;

	// Resolve new owner user ID using Resource Locator
	const newOwnerUserId = await resolveUserResourceLocator(this, credentials, newOwnerUserResource, itemIndex, '0');

	const response = await casesApi.changeOwner(this, credentials, caseId, newOwnerUserId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to change case owner: ${errorMessage}`);
	}

	return response;
}

async function executeCheckName(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: boolean; statusCode: number; errors: string[] }> {
	const caseName = this.getNodeParameter('caseName', itemIndex) as string;

	const response = await casesApi.checkCaseName(this, credentials, caseName);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to check case name: ${errorMessage}`);
	}

	return response;
}

async function executeGetActivities(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseActivitiesResponse> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.getCaseActivities(this, credentials, caseId);
	validateApiResponse(response, 'Failed to fetch case activities');
	return response;
}

async function executeGetEndpoints(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseEndpointsResponse> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.getCaseEndpoints(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case endpoints');
	return response;
}

async function executeGetTasks(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseTasksResponse> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.getCaseTasksById(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case tasks');
	return response;
}

async function executeGetUsers(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseUsersResponse> {
	const caseResource = this.getNodeParameter('caseId', itemIndex) as any;
	const caseId = await resolveCaseResourceLocator(this, caseResource, itemIndex);

	const response = await casesApi.getCaseUsers(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case users');
	return response;
}


