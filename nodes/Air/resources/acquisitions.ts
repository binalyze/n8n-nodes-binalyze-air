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
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific acquisition profile',
				action: 'Get an acquisition profile',
			},
		],
		default: 'get',
	},

	// Organization for evidence tasks
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask'],
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
		description: 'The organization for the acquisition task',
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
				operation: ['assignEvidenceTask'],
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
				operation: ['assignEvidenceTask'],
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

	// Task Name for evidence acquisition tasks
	{
		displayName: 'Task Name',
		name: 'taskName',
		type: 'string',
		default: '',
		placeholder: 'Enter task name (optional)',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask'],
			},
		},
		description: 'Optional name for the acquisition task',
	},

	// Endpoint Filters (required for evidence tasks)
	{
		displayName: 'Endpoint Filters (Required)',
		name: 'endpointFilters',
		type: 'collection',
		placeholder: 'Add Filter - At least one filter is required',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask'],
			},
		},
		required: true,
		description: 'At least one filter must be defined to target specific endpoints',
		options: [
			{
				displayName: 'Filter By Asset Name',
				name: 'assetName',
				type: 'string',
				default: '',
				placeholder: 'Enter asset name',
				description: 'Filter assets by name',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				placeholder: 'Enter IP address',
				description: 'Filter assets by IP address',
			},
			{
				displayName: 'Filter By Management Status',
				name: 'managedStatus',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select management status',
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
				displayName: 'Filter By Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select platforms',
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
				description: 'Filter assets by search term',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated tags',
				description: 'Filter assets by tags (comma-separated)',
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

			if (operation === 'get') {
				// Get Single Acquisition Profile
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileId', i) as any;
				const profileId = normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID');

				responseData = await acquisitionsApi.getAcquisitionProfileById(this, credentials, profileId);
				responseData = responseData.result;

			} else if (operation === 'assignEvidenceTask') {
				// Assign Evidence Acquisition Task
				const organizationId = this.getNodeParameter('organizationId', i) as any;
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
				const taskName = this.getNodeParameter('taskName', i) as string;
				const endpointFilters = this.getNodeParameter('endpointFilters', i) as any;

				// Validate that at least one endpoint filter is provided
				const hasFilter = Boolean(
					endpointFilters.searchTerm ||
					endpointFilters.assetName ||
					endpointFilters.ipAddress ||
					(endpointFilters.platform && endpointFilters.platform.length > 0) ||
					(endpointFilters.onlineStatus && endpointFilters.onlineStatus.length > 0) ||
					(endpointFilters.managedStatus && endpointFilters.managedStatus.length > 0) ||
					endpointFilters.tags
				);

				if (!hasFilter) {
					throw new NodeOperationError(this.getNode(), 'At least one endpoint filter must be provided for evidence acquisition task', { itemIndex: i });
				}

				// Get organization ID
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
					filter: {
						organizationIds: [orgId], // Always include the selected organization
					},
				};

				if (taskName) {
					taskData.taskName = taskName;
				}

				// Build filter from endpoint filters
				if (endpointFilters.searchTerm) taskData.filter.searchTerm = endpointFilters.searchTerm;
				if (endpointFilters.assetName) taskData.filter.name = endpointFilters.assetName;
				if (endpointFilters.ipAddress) taskData.filter.ipAddress = endpointFilters.ipAddress;
				if (endpointFilters.platform) taskData.filter.platform = endpointFilters.platform;
				if (endpointFilters.onlineStatus) taskData.filter.onlineStatus = endpointFilters.onlineStatus;
				if (endpointFilters.managedStatus) taskData.filter.managedStatus = endpointFilters.managedStatus;
				if (endpointFilters.tags) taskData.filter.tags = endpointFilters.tags.split(',').map((tag: string) => tag.trim());

				responseData = await acquisitionsApi.assignEvidenceAcquisitionTask(this, credentials, taskData);
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
