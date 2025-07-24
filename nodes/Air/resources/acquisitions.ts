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
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as acquisitionsApi } from '../api/acquisitions/acquisitions';
import { findOrganizationByName } from './organizations';

export const AcquisitionsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['acquisitions'],
			},
		},
		options: [
			{
				name: 'Assign Evidence Acquisition Task',
				value: 'assignEvidenceTask',
				description: 'Assign an evidence acquisition task by filter',
				action: 'Assign an evidence acquisition task',
			},
			{
				name: 'Assign Image Acquisition Task',
				value: 'assignImageTask',
				description: 'Assign an image acquisition task by filter',
				action: 'Assign an image acquisition task',
			},
			{
				name: 'Create Acquisition Profile',
				value: 'create',
				description: 'Create a new acquisition profile',
				action: 'Create an acquisition profile',
			},
			{
				name: 'Create Off-Network Acquisition Task',
				value: 'createOffNetworkTask',
				description: 'Create an off-network acquisition task',
				action: 'Create an off network acquisition task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific acquisition profile',
				action: 'Get an acquisition profile',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many acquisition profiles',
				action: 'Get many acquisition profiles',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Acquisition Profile',
		name: 'acquisitionProfileId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an acquisition profile...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an acquisition profile...',
				typeOptions: {
					searchListMethod: 'getAcquisitionProfiles',
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
							errorMessage: 'Not a valid acquisition profile ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter acquisition profile ID',
			},
		],
		required: true,
		description: 'The acquisition profile to operate on',
	},

	// Profile Name
	{
		displayName: 'Profile Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'Enter acquisition profile name',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Name of the acquisition profile',
	},

	// Profile Description
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		placeholder: 'Enter acquisition profile description',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['create'],
			},
		},
		description: 'Description of the acquisition profile',
	},

	// Organization ID for create operations
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['create'],
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
							regex: '^[0-9]+$',
							errorMessage: 'Not a valid organization ID (must be numeric)',
						},
					},
				],
				placeholder: 'Enter organization ID (e.g., 123)',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization for the acquisition profile',
	},

	// Case ID for task operations
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask', 'assignImageTask', 'createOffNetworkTask'],
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
		description: 'The case to assign the acquisition task to',
	},

	// Acquisition Profile for task operations
	{
		displayName: 'Acquisition Profile',
		name: 'acquisitionProfileIdForTask',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an acquisition profile...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask', 'assignImageTask', 'createOffNetworkTask'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an acquisition profile...',
				typeOptions: {
					searchListMethod: 'getAcquisitionProfiles',
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
							errorMessage: 'Not a valid acquisition profile ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter acquisition profile ID',
			},
		],
		required: true,
		description: 'The acquisition profile to use for the task',
	},

	// Task Name for off-network tasks
	{
		displayName: 'Task Name',
		name: 'taskName',
		type: 'string',
		default: '',
		placeholder: 'Enter task name',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['createOffNetworkTask'],
			},
		},
		required: true,
		description: 'Name of the off-network acquisition task',
	},

	// Task Description for off-network tasks
	{
		displayName: 'Task Description',
		name: 'taskDescription',
		type: 'string',
		default: '',
		placeholder: 'Enter task description',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['createOffNetworkTask'],
			},
		},
		description: 'Description of the off-network acquisition task',
	},

	// Organization for off-network tasks
	{
		displayName: 'Organization',
		name: 'organizationIdForTask',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['createOffNetworkTask'],
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
							regex: '^[0-9]+$',
							errorMessage: 'Not a valid organization ID (must be numeric)',
						},
					},
				],
				placeholder: 'Enter organization ID (e.g., 123)',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization for the off-network acquisition task',
	},

	// Additional Fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['getAll', 'create', 'assignEvidenceTask', 'assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Artifacts',
				name: 'artifacts',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select artifacts to collect',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				options: [
					{
						name: 'Browser History',
						value: 'browser_history',
					},
					{
						name: 'File System',
						value: 'file_system',
					},
					{
						name: 'Installed Software',
						value: 'installed_software',
					},
					{
						name: 'Memory Dump',
						value: 'memory_dump',
					},
					{
						name: 'Network Connections',
						value: 'network_connections',
					},
					{
						name: 'Registry',
						value: 'registry',
					},
					{
						name: 'System Information',
						value: 'system_info',
					},
				],
				description: 'Artifacts to collect during acquisition',
			},
			{
				displayName: 'Evidence Types',
				name: 'evidence',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select evidence types to collect',
				displayOptions: {
					show: {
						'/operation': ['create'],
					},
				},
				options: [
					{
						name: 'Documents',
						value: 'documents',
					},
					{
						name: 'Executables',
						value: 'executables',
					},
					{
						name: 'Files',
						value: 'files',
					},
					{
						name: 'Images',
						value: 'images',
					},
					{
						name: 'Logs',
						value: 'logs',
					},
				],
				description: 'Evidence types to collect during acquisition',
			},
			{
				displayName: 'Filter By Asset Name',
				name: 'assetName',
				type: 'string',
				default: '',
				placeholder: 'Enter asset name',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
				description: 'Filter assets by name',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				placeholder: 'Enter IP address',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
				description: 'Filter assets by IP address',
			},
			{
				displayName: 'Filter By Management Status',
				name: 'managedStatus',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select management status',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
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
				description: 'Filter assets by management status',
			},
			{
				displayName: 'Filter By Online Status',
				name: 'onlineStatus',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select online status',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
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
				description: 'Filter assets by online status',
			},
			{
				displayName: 'Filter By Organization',
				name: 'filterOrganizationIds',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select organizations to filter by',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getOrganizationsOptions',
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Filter By Organization',
				name: 'organizationIds',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select organizations to filter by',
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getOrganizationsOptions',
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Filter By Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select platforms',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
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
					{
						name: 'AIX',
						value: 'aix',
					},
				],
				description: 'Filter assets by platform',
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				placeholder: 'Enter search term',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
				description: 'Filter assets by search term',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated tags',
				displayOptions: {
					show: {
						'/operation': ['assignEvidenceTask', 'assignImageTask'],
					},
				},
				description: 'Filter assets by tags (comma-separated)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						'/operation': ['getAll'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
			},
		],
	},
];

// Helper functions for acquisitions
export function extractAcquisitionProfileId(acquisitionProfile: any): string {
	return extractEntityId(acquisitionProfile, 'acquisition profile');
}

export function isValidAcquisitionProfile(acquisitionProfile: any): boolean {
	return isValidEntity(acquisitionProfile, ['name']);
}

export async function fetchAllAcquisitionProfiles(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationIds: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		const queryParams: Record<string, string | number> = {
			pageSize,
		};

		if (searchFilter) {
			queryParams['search'] = searchFilter;
		}

		const response = await acquisitionsApi.getAcquisitionProfiles(context, credentials, organizationIds, queryParams);
		return response.result.entities || [];
	} catch (error) {
		throw new Error(`Failed to fetch acquisition profiles: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export function buildAcquisitionProfileQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	// Handle organization filter
	if (additionalFields.organizationIds && additionalFields.organizationIds.length > 0) {
		queryParams['filter[organizationIds]'] = additionalFields.organizationIds.join(',');
	} else if (organizationIds !== '0') {
		queryParams['filter[organizationIds]'] = organizationIds;
	}

	// Handle limit
	if (additionalFields.limit) {
		queryParams.pageSize = additionalFields.limit;
	}

	return queryParams;
}

// Load options methods
export async function getAcquisitionProfiles(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const organizationIds = '0'; // Use default or get from context

		const acquisitionProfiles = await fetchAllAcquisitionProfiles(
			this,
			credentials,
			organizationIds,
			searchTerm
		);

		return createListSearchResults(
			acquisitionProfiles,
			isValidAcquisitionProfile,
			(profile) => ({
				name: profile.name,
				value: extractAcquisitionProfileId(profile),
				url: '',
			}),
			searchTerm
		);
	} catch (error) {
		const formattedError = catchAndFormatError(error, 'search acquisition profiles');
		throw formattedError;
	}
}

export async function getAcquisitionProfilesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const organizationIds = '0'; // Use default or get from context

		const acquisitionProfiles = await fetchAllAcquisitionProfiles(
			this,
			credentials,
			organizationIds
		);

		return createLoadOptions(
			acquisitionProfiles,
			isValidAcquisitionProfile,
			(profile) => ({
				name: profile.name,
				value: extractAcquisitionProfileId(profile),
			})
		);
	} catch (error) {
		const formattedError = catchAndFormatError(error, 'load acquisition profiles options');
		throw formattedError;
	}
}

// Main execute function
export async function executeAcquisitions(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const credentials = await getAirCredentials(this);
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: any;

			if (operation === 'getAll') {
				// Get Many Acquisition Profiles
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;
				const organizationIds = '0'; // Default or get from context

				const queryParams = buildAcquisitionProfileQueryParams(organizationIds, additionalFields);
				const response = await acquisitionsApi.getAcquisitionProfiles(this, credentials, organizationIds, queryParams);

				const entities = response.result.entities || [];
				const paginationInfo = extractPaginationInfo(response.result);

				processApiResponseEntities(entities, returnData, i, {
					includePagination: true,
					paginationData: paginationInfo,
				});

				continue;

			} else if (operation === 'get') {
				// Get Single Acquisition Profile
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileId', i) as any;
				const profileId = normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID');

				responseData = await acquisitionsApi.getAcquisitionProfileById(this, credentials, profileId);
				responseData = responseData.result;

			} else if (operation === 'create') {
				// Create Acquisition Profile
				const name = this.getNodeParameter('name', i) as string;
				const description = this.getNodeParameter('description', i, '') as string;
				const organizationId = this.getNodeParameter('organizationId', i) as any;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				let orgId: number;
				if (organizationId.mode === 'name') {
					const orgIdString = await findOrganizationByName(this, credentials, organizationId.value);
					orgId = parseInt(orgIdString, 10);
				} else {
					orgId = parseInt(organizationId.value || organizationId, 10);
				}

				const profileData: any = {
					name,
					organizationId: orgId,
				};

				if (description) {
					profileData.description = description;
				}

				if (additionalFields.artifacts || additionalFields.evidence) {
					profileData.settings = {};
					if (additionalFields.artifacts) {
						profileData.settings.artifacts = additionalFields.artifacts;
					}
					if (additionalFields.evidence) {
						profileData.settings.evidence = additionalFields.evidence;
					}
				}

				responseData = await acquisitionsApi.createAcquisitionProfile(this, credentials, profileData);
				responseData = responseData.result;

			} else if (operation === 'assignEvidenceTask') {
				// Assign Evidence Acquisition Task
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				const taskData: any = {
					caseId: normalizeAndValidateId(caseId.value || caseId, 'Case ID'),
					acquisitionProfileId: normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID'),
					filter: {},
				};

				// Build filter from additional fields
				if (additionalFields.searchTerm) taskData.filter.searchTerm = additionalFields.searchTerm;
				if (additionalFields.assetName) taskData.filter.name = additionalFields.assetName;
				if (additionalFields.ipAddress) taskData.filter.ipAddress = additionalFields.ipAddress;
				if (additionalFields.platform) taskData.filter.platform = additionalFields.platform;
				if (additionalFields.onlineStatus) taskData.filter.onlineStatus = additionalFields.onlineStatus;
				if (additionalFields.managedStatus) taskData.filter.managedStatus = additionalFields.managedStatus;
				if (additionalFields.tags) taskData.filter.tags = additionalFields.tags.split(',').map((tag: string) => tag.trim());
				if (additionalFields.filterOrganizationIds) taskData.filter.organizationIds = additionalFields.filterOrganizationIds.map((id: string) => parseInt(id, 10));

				responseData = await acquisitionsApi.assignEvidenceAcquisitionTask(this, credentials, taskData);
				responseData = responseData.result;

			} else if (operation === 'assignImageTask') {
				// Assign Image Acquisition Task
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				const taskData: any = {
					caseId: normalizeAndValidateId(caseId.value || caseId, 'Case ID'),
					acquisitionProfileId: normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID'),
					filter: {},
				};

				// Build filter from additional fields
				if (additionalFields.searchTerm) taskData.filter.searchTerm = additionalFields.searchTerm;
				if (additionalFields.assetName) taskData.filter.name = additionalFields.assetName;
				if (additionalFields.ipAddress) taskData.filter.ipAddress = additionalFields.ipAddress;
				if (additionalFields.platform) taskData.filter.platform = additionalFields.platform;
				if (additionalFields.onlineStatus) taskData.filter.onlineStatus = additionalFields.onlineStatus;
				if (additionalFields.managedStatus) taskData.filter.managedStatus = additionalFields.managedStatus;
				if (additionalFields.tags) taskData.filter.tags = additionalFields.tags.split(',').map((tag: string) => tag.trim());
				if (additionalFields.filterOrganizationIds) taskData.filter.organizationIds = additionalFields.filterOrganizationIds.map((id: string) => parseInt(id, 10));

				responseData = await acquisitionsApi.assignImageAcquisitionTask(this, credentials, taskData);
				responseData = responseData.result;

			} else if (operation === 'createOffNetworkTask') {
				// Create Off-Network Acquisition Task
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
				const organizationId = this.getNodeParameter('organizationIdForTask', i) as any;
				const taskName = this.getNodeParameter('taskName', i) as string;
				const taskDescription = this.getNodeParameter('taskDescription', i, '') as string;

				let orgId: number;
				if (organizationId.mode === 'name') {
					const orgIdString = await findOrganizationByName(this, credentials, organizationId.value);
					orgId = parseInt(orgIdString, 10);
				} else {
					orgId = parseInt(organizationId.value || organizationId, 10);
				}

				const taskData: any = {
					caseId: normalizeAndValidateId(caseId.value || caseId, 'Case ID'),
					acquisitionProfileId: normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID'),
					organizationId: orgId,
					name: taskName,
				};

				if (taskDescription) {
					taskData.description = taskDescription;
				}

				responseData = await acquisitionsApi.createOffNetworkAcquisitionTask(this, credentials, taskData);
				responseData = responseData.result;

			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"`);
			}

			const executionData: INodeExecutionData = {
				json: responseData,
				pairedItem: {
					item: i,
				},
			};

			returnData.push(executionData);

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
