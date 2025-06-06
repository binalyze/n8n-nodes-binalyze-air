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
	requireValidId,
	createListSearchResults,
	createLoadOptions,
	extractPaginationInfo,
	processApiResponseEntities,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';
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
				name: 'Archive Case',
				value: 'archiveCase',
				description: 'Archive a specific case',
				action: 'Archive a case',
			},
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
			{
				name: 'Import Task Assignments',
				value: 'importTaskAssignments',
				description: 'Import task assignments to a case',
				action: 'Import task assignments to case',
			},
			{
				name: 'Open Case',
				value: 'openCase',
				description: 'Open a specific case',
				action: 'Open a case',
			},
			{
				name: 'Remove Endpoints',
				value: 'removeEndpoints',
				description: 'Remove endpoints from a case',
				action: 'Remove endpoints from case',
			},
			{
				name: 'Remove Task Assignment',
				value: 'removeTaskAssignment',
				description: 'Remove a task assignment from a case',
				action: 'Remove task assignment from case',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a specific case',
				action: 'Update a case',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		default: '',
		placeholder: 'Enter case ID',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: [
					'get',
					'update',
					'archiveCase',
					'closeCase',
					'openCase',
					'changeOwner',
					'getActivities',
					'getEndpoints',
					'getTasks',
					'getUsers',
					'removeEndpoints',
					'removeTaskAssignment',
					'importTaskAssignments'
				],
			},
		},
		required: true,
		description: 'The ID of the case',
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
		displayName: 'Owner User ID',
		name: 'ownerUserId',
		type: 'string',
		default: '',
		placeholder: 'Enter owner user ID',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'The ID of the user who will own the case',
	},
	{
		displayName: 'New Owner User ID',
		name: 'newOwnerUserId',
		type: 'string',
		default: '',
		placeholder: 'Enter new owner user ID',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['changeOwner'],
			},
		},
		required: true,
		description: 'The ID of the new owner user',
	},
	{
		displayName: 'Task Assignment ID',
		name: 'taskAssignmentId',
		type: 'string',
		default: '',
		placeholder: 'Enter task assignment ID',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['removeTaskAssignment'],
			},
		},
		required: true,
		description: 'The ID of the task assignment to remove',
	},
	{
		displayName: 'Task Assignment IDs',
		name: 'taskAssignmentIds',
		type: 'string',
		default: '',
		placeholder: 'Enter task assignment IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['importTaskAssignments'],
			},
		},
		required: true,
		description: 'Comma-separated list of task assignment IDs to import',
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		default: 'private',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Private',
				value: 'private',
			},
			{
				name: 'Public',
				value: 'public',
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
		placeholder: 'Enter user IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['create'],
			},
		},
		description: 'Comma-separated list of user IDs to assign to the case',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assigned User IDs',
				name: 'assignedUserIds',
				type: 'string',
				default: '',
				placeholder: 'Enter user IDs (comma-separated)',
				description: 'Comma-separated list of user IDs to assign to the case',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the case',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'json',
				default: '[]',
				description: 'JSON array of notes for the case',
			},
			{
				displayName: 'Owner User ID',
				name: 'ownerUserId',
				type: 'string',
				default: '',
				description: 'The new owner user ID',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'open',
				options: [
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
				description: 'The status of the case',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				default: 'private',
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				description: 'The visibility of the case',
			},
		],
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
				displayName: 'Assigned User ID',
				name: 'assignedUserId',
				type: 'string',
				default: '',
				description: 'Filter cases by assigned user ID',
			},
			{
				displayName: 'Owner User ID',
				name: 'ownerUserId',
				type: 'string',
				default: '',
				description: 'Filter cases by owner user ID',
			},
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
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'createdAt',
				options: [
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Updated At',
						value: 'updatedAt',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Status',
						value: 'status',
					},
				],
				description: 'Sort cases by field',
			},
			{
				displayName: 'Sort Type',
				name: 'sortType',
				type: 'options',
				default: 'desc',
				options: [
					{
						name: 'Ascending',
						value: 'asc',
					},
					{
						name: 'Descending',
						value: 'desc',
					},
				],
				description: 'Sort direction',
			},
			{
				displayName: 'Status Filter',
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
	{
		displayName: 'Endpoint Filter Options',
		name: 'endpointFilter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['cases'],
				operation: ['removeEndpoints'],
			},
		},
		options: [
			{
				displayName: 'Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Endpoint IDs to exclude',
			},
			{
				displayName: 'Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				description: 'Filter by group full path',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				description: 'Filter by group ID',
			},
			{
				displayName: 'Included Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Endpoint IDs to include',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'Filter by IP address',
			},
			{
				displayName: 'Isolation Status',
				name: 'isolationStatus',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Isolated',
						value: 'isolated',
					},
					{
						name: 'Not Isolated',
						value: 'not_isolated',
					},
				],
				description: 'Filter by isolation status',
			},
			{
				displayName: 'Issue',
				name: 'issue',
				type: 'string',
				default: '',
				description: 'Filter by issue',
			},
			{
				displayName: 'Managed Status',
				name: 'managedStatus',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Managed',
						value: 'managed',
					},
					{
						name: 'Unmanaged',
						value: 'unmanaged',
					},
				],
				description: 'Filter by managed status',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by endpoint name',
			},
			{
				displayName: 'Online Status',
				name: 'onlineStatus',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Online',
						value: 'online',
					},
					{
						name: 'Offline',
						value: 'offline',
					},
				],
				description: 'Filter by online status',
			},
			{
				displayName: 'Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '',
				placeholder: 'Enter organization IDs (comma-separated)',
				description: 'Organization IDs to filter by',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Windows',
						value: 'windows',
					},
					{
						name: 'Linux',
						value: 'linux',
					},
					{
						name: 'macOS',
						value: 'macos',
					},
				],
				description: 'Filter by platform',
			},
			{
				displayName: 'Policy',
				name: 'policy',
				type: 'string',
				default: '',
				description: 'Filter by policy',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term for endpoints',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter tags (comma-separated)',
				description: 'Filter by tags',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'Filter by version',
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
		const response = await casesApi.getCases(this, credentials, '0', {
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
		const response = await casesApi.getCases(this, credentials, '0', { pageSize: 100 });

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
				case 'update':
					responseData = await executeUpdateCase.call(this, credentials, itemIndex);
					break;
				case 'archiveCase':
					responseData = await executeArchiveCase.call(this, credentials, itemIndex);
					break;
				case 'closeCase':
					responseData = await executeCloseCase.call(this, credentials, itemIndex);
					break;
				case 'openCase':
					responseData = await executeOpenCase.call(this, credentials, itemIndex);
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
				case 'removeEndpoints':
					responseData = await executeRemoveEndpoints.call(this, credentials, itemIndex);
					break;
				case 'removeTaskAssignment':
					responseData = await executeRemoveTaskAssignment.call(this, credentials, itemIndex);
					break;
				case 'importTaskAssignments':
					responseData = await executeImportTaskAssignments.call(this, credentials, itemIndex);
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
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

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
	const ownerUserId = this.getNodeParameter('ownerUserId', itemIndex) as string;
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

	const assignedUserIds = assignedUserIdsParam ? assignedUserIdsParam.split(',').map(id => id.trim()) : [];

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

async function executeUpdateCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as any;

	const updateData: any = {};

	if (updateFields.name) {
		updateData.name = updateFields.name;
	}
	if (updateFields.ownerUserId) {
		updateData.ownerUserId = updateFields.ownerUserId;
	}
	if (updateFields.visibility) {
		updateData.visibility = updateFields.visibility;
	}
	if (updateFields.status) {
		updateData.status = updateFields.status;
	}
	if (updateFields.assignedUserIds) {
		updateData.assignedUserIds = updateFields.assignedUserIds.split(',').map((id: string) => id.trim());
	}
	if (updateFields.notes) {
		try {
			updateData.notes = JSON.parse(updateFields.notes);
		} catch (error) {
			throw new Error('Invalid JSON format for notes');
		}
	}

	if (Object.keys(updateData).length === 0) {
		throw new Error('At least one field must be provided for update');
	}

	const response = await casesApi.updateCase(this, credentials, caseId, updateData);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to update case: ${errorMessage}`);
	}

	return response;
}

async function executeArchiveCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.archiveCase(this, credentials, caseId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to archive case: ${errorMessage}`);
	}

	return response;
}

async function executeCloseCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.closeCase(this, credentials, caseId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to close case: ${errorMessage}`);
	}

	return response;
}

async function executeOpenCase(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.openCase(this, credentials, caseId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to open case: ${errorMessage}`);
	}

	return response;
}

async function executeChangeOwner(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');
	const newOwnerUserId = requireValidId(this.getNodeParameter('newOwnerUserId', itemIndex) as string, 'New Owner User ID');

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
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.getCaseActivities(this, credentials, caseId);
	validateApiResponse(response, 'Failed to fetch case activities');
	return response;
}

async function executeGetEndpoints(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseEndpointsResponse> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.getCaseEndpoints(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case endpoints');
	return response;
}

async function executeGetTasks(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseTasksResponse> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.getCaseTasksById(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case tasks');
	return response;
}

async function executeGetUsers(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<CaseUsersResponse> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');

	const response = await casesApi.getCaseUsers(this, credentials, caseId, '0');
	validateApiResponse(response, 'Failed to fetch case users');
	return response;
}

async function executeRemoveEndpoints(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');
	const endpointFilter = this.getNodeParameter('endpointFilter', itemIndex, {}) as any;

	// Build filter object
	const filter: any = {};

	if (endpointFilter.searchTerm) filter.searchTerm = endpointFilter.searchTerm;
	if (endpointFilter.name) filter.name = endpointFilter.name;
	if (endpointFilter.ipAddress) filter.ipAddress = endpointFilter.ipAddress;
	if (endpointFilter.groupId) filter.groupId = endpointFilter.groupId;
	if (endpointFilter.groupFullPath) filter.groupFullPath = endpointFilter.groupFullPath;
	if (endpointFilter.managedStatus && endpointFilter.managedStatus.length > 0) {
		filter.managedStatus = endpointFilter.managedStatus;
	}
	if (endpointFilter.isolationStatus && endpointFilter.isolationStatus.length > 0) {
		filter.isolationStatus = endpointFilter.isolationStatus;
	}
	if (endpointFilter.platform && endpointFilter.platform.length > 0) {
		filter.platform = endpointFilter.platform;
	}
	if (endpointFilter.issue) filter.issue = endpointFilter.issue;
	if (endpointFilter.onlineStatus && endpointFilter.onlineStatus.length > 0) {
		filter.onlineStatus = endpointFilter.onlineStatus;
	}
	if (endpointFilter.tags) {
		filter.tags = endpointFilter.tags.split(',').map((tag: string) => tag.trim());
	}
	if (endpointFilter.version) filter.version = endpointFilter.version;
	if (endpointFilter.policy) filter.policy = endpointFilter.policy;
	if (endpointFilter.includedEndpointIds) {
		filter.includedEndpointIds = endpointFilter.includedEndpointIds.split(',').map((id: string) => id.trim());
	}
	if (endpointFilter.excludedEndpointIds) {
		filter.excludedEndpointIds = endpointFilter.excludedEndpointIds.split(',').map((id: string) => id.trim());
	}
	if (endpointFilter.organizationIds) {
		filter.organizationIds = endpointFilter.organizationIds.split(',').map((id: string) => parseInt(id.trim()));
	}

	const response = await casesApi.removeEndpointsFromCase(this, credentials, caseId, filter);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to remove endpoints from case: ${errorMessage}`);
	}

	return response;
}

async function executeRemoveTaskAssignment(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');
	const taskAssignmentId = requireValidId(this.getNodeParameter('taskAssignmentId', itemIndex) as string, 'Task Assignment ID');

	const response = await casesApi.removeTaskAssignmentFromCase(this, credentials, caseId, taskAssignmentId);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to remove task assignment from case: ${errorMessage}`);
	}

	return response;
}

async function executeImportTaskAssignments(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
	const caseId = requireValidId(this.getNodeParameter('caseId', itemIndex) as string, 'Case ID');
	const taskAssignmentIdsParam = this.getNodeParameter('taskAssignmentIds', itemIndex) as string;

	const taskAssignmentIds = taskAssignmentIdsParam.split(',').map(id => id.trim());

	if (taskAssignmentIds.length === 0) {
		throw new Error('At least one task assignment ID must be provided');
	}

	const response = await casesApi.importTaskAssignmentsToCase(this, credentials, caseId, taskAssignmentIds);

	if (!response.success) {
		const errorMessage = response.errors?.join(', ') || 'API request failed';
		throw new Error(`Failed to import task assignments to case: ${errorMessage}`);
	}

	return response;
}
