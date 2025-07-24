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
				name: 'Assign Image Acquisition Task',
				value: 'assignImageTask',
				description: 'Assign an image acquisition task by filter',
				action: 'Assign an image acquisition task',
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
		],
		default: 'get',
	},

	// Organization for evidence and off-network tasks
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask', 'createOffNetworkTask'],
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

	// Task Name for evidence and image acquisition tasks
	{
		displayName: 'Task Name',
		name: 'taskName',
		type: 'string',
		default: '',
		placeholder: 'Enter task name (optional)',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask', 'assignImageTask'],
			},
		},
		description: 'Optional name for the acquisition task',
	},

	// Additional Fields -> Endpoint Filters (renamed and made required)
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

	// Keep Additional Fields for assignImageTask operation only
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Filter By Asset Name',
				name: 'assetName',
				type: 'string',
				default: '',
				placeholder: 'Enter asset name',
				displayOptions: {
					show: {
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
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
						'/operation': ['assignImageTask'],
					},
				},
				description: 'Filter assets by tags (comma-separated)',
			},
		],
	},

	// Task Configuration (keep for assignImageTask only)
	{
		displayName: 'Task Configuration',
		name: 'taskConfig',
		type: 'collection',
		placeholder: 'Add Configuration',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Bandwidth Limit (MB/s)',
				name: 'bandwidthLimit',
				type: 'number',
				default: 0,
				placeholder: '0 = unlimited',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						choice: ['useCustomOptions'],
					},
				},
				description: 'Maximum bandwidth usage in MB/s (0 for unlimited)',
			},
			{
				displayName: 'Configuration Choice',
				name: 'choice',
				type: 'options',
				default: 'useCustomOptions',
				description: 'Whether to use custom options or default configuration',
				options: [
					{
						name: 'Use Custom Options',
						value: 'useCustomOptions',
					},
					{
						name: 'Use Default Options',
						value: 'useDefaultOptions',
					},
				],
			},
			{
				displayName: 'CPU Usage Limit (%)',
				name: 'cpuUsageLimit',
				type: 'number',
				default: 50,
				placeholder: '50',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				displayOptions: {
					show: {
						choice: ['useCustomOptions'],
					},
				},
				description: 'Maximum CPU usage percentage for the task',
			},
			{
				displayName: 'Disk Space Limit (GB)',
				name: 'diskSpaceLimit',
				type: 'number',
				default: 0,
				placeholder: '0 = unlimited',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						choice: ['useCustomOptions'],
					},
				},
				description: 'Maximum disk space usage in GB (0 for unlimited)',
			},
			{
				displayName: 'Enable Compression',
				name: 'enableCompression',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						choice: ['useCustomOptions'],
					},
				},
				description: 'Whether to enable compression for evidence files',
			},
		],
	},

	// Drone Configuration (keep for assignImageTask only)
	{
		displayName: 'Drone Configuration',
		name: 'droneConfig',
		type: 'collection',
		placeholder: 'Add Drone Settings',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Auto Pilot',
				name: 'autoPilot',
				type: 'boolean',
				default: false,
				description: 'Whether to enable automatic drone analysis',
			},
			{
				displayName: 'Enable Drone',
				name: 'enabled',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						autoPilot: [true],
					},
				},
				description: 'Whether to enable drone analysis with custom settings',
			},
			{
				displayName: 'Enable MITRE ATT&CK',
				name: 'mitreEnabled',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						autoPilot: [false],
					},
				},
				description: 'Whether to enable MITRE ATT&CK framework analysis',
			},
			{
				displayName: 'Keywords',
				name: 'keywords',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated keywords',
				displayOptions: {
					show: {
						autoPilot: [false],
						enabled: [true],
					},
				},
				description: 'Keywords for drone analysis (comma-separated)',
			},
			{
				displayName: 'Minimum Score',
				name: 'minScore',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				displayOptions: {
					show: {
						autoPilot: [false],
						enabled: [true],
					},
				},
				description: 'Minimum score for drone findings',
			},
		],
	},

	// Event Log Records Configuration (keep for assignImageTask only)
	{
		displayName: 'Event Log Configuration',
		name: 'eventLogConfig',
		type: 'collection',
		placeholder: 'Add Event Log Settings',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Start date for event log collection (ISO8601 UTC format)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'End date for event log collection (ISO8601 UTC format)',
			},
			{
				displayName: 'Max Event Count',
				name: 'maxEventCount',
				type: 'number',
				default: 4000,
				placeholder: '4000',
				typeOptions: {
					minValue: -1,
				},
				description: 'Maximum number of events to collect per event type (-1 for unlimited)',
			},
		],
	},

	// Task Scheduler Configuration (keep for assignImageTask only)
	{
		displayName: 'Scheduler Configuration',
		name: 'schedulerConfig',
		type: 'collection',
		placeholder: 'Add Scheduler Settings',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		options: [
			{
				displayName: 'Custom Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'UTC',
				displayOptions: {
					show: {
						when: ['scheduled'],
						timezoneType: ['custom'],
					},
				},
				description: 'Custom timezone identifier (e.g., UTC, America/New_York)',
			},
			{
				displayName: 'Execution Type',
				name: 'when',
				type: 'options',
				default: 'now',
				description: 'When to execute the task',
				options: [
					{
						name: 'Now',
						value: 'now',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
			},
			{
				displayName: 'Repeat Task',
				name: 'isRepeat',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						when: ['scheduled'],
					},
				},
				description: 'Whether to repeat the task',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						when: ['scheduled'],
					},
				},
				description: 'When to start the scheduled task',
			},
			{
				displayName: 'Timezone Type',
				name: 'timezoneType',
				type: 'options',
				default: 'asset',
				displayOptions: {
					show: {
						when: ['scheduled'],
					},
				},
				options: [
					{
						name: 'Asset Timezone',
						value: 'asset',
					},
					{
						name: 'Custom Timezone',
						value: 'custom',
					},
				],
				description: 'Timezone to use for scheduling',
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

			} else if (operation === 'assignImageTask') {
				// Assign Image Acquisition Task
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
				const taskName = this.getNodeParameter('taskName', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;
				const taskConfig = this.getNodeParameter('taskConfig', i) as any;
				const droneConfig = this.getNodeParameter('droneConfig', i) as any;
				const eventLogConfig = this.getNodeParameter('eventLogConfig', i) as any;
				const schedulerConfig = this.getNodeParameter('schedulerConfig', i) as any;

				const taskData: any = {
					caseId: normalizeAndValidateId(caseId.value || caseId, 'Case ID'),
					acquisitionProfileId: normalizeAndValidateId(acquisitionProfileId.value || acquisitionProfileId, 'Acquisition Profile ID'),
					filter: {},
					taskConfig: {
						choice: taskConfig.choice || 'useCustomOptions',
						saveTo: {},
						cpu: { usageLimit: taskConfig.cpuUsageLimit || 50 },
						bandwidth: { limit: taskConfig.bandwidthLimit || 0 },
						diskSpace: { limit: taskConfig.diskSpaceLimit || 0 },
						compression: { enabled: taskConfig.enableCompression !== false },
						sendTo: {},
					},
					droneConfig: {
						autoPilot: droneConfig.autoPilot || false,
						enabled: droneConfig.enabled || false,
						mitreEnabled: droneConfig.mitreEnabled !== false,
						analyzers: [],
						keywords: droneConfig.keywords ? droneConfig.keywords.split(',').map((k: string) => k.trim()) : [],
						minScore: droneConfig.minScore || 50,
					},
					eventLogRecordsConfig: {
						startDate: eventLogConfig.startDate || null,
						endDate: eventLogConfig.endDate || null,
						maxEventCount: eventLogConfig.maxEventCount || 4000,
					},
				};

				if (taskName) {
					taskData.taskName = taskName;
				}

				// Add scheduler configuration if provided
				if (schedulerConfig.when && schedulerConfig.when !== 'now') {
					taskData.schedulerConfig = {
						when: schedulerConfig.when,
						timezoneType: schedulerConfig.timezoneType || 'asset',
						timezone: schedulerConfig.timezone || undefined,
						startDate: schedulerConfig.startDate ? new Date(schedulerConfig.startDate).getTime() : undefined,
						isRepeat: schedulerConfig.isRepeat || false,
					};
				} else {
					taskData.schedulerConfig = { when: 'now' };
				}

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
				const organizationId = this.getNodeParameter('organizationId', i) as any;
				const caseId = this.getNodeParameter('caseId', i) as any;
				const acquisitionProfileId = this.getNodeParameter('acquisitionProfileIdForTask', i) as any;
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
