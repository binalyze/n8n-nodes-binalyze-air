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
import { api as evidenceRepositoriesApi } from '../api/evidence/evidencerepositories';
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

	// Acquisition Profile for evidence acquisition and off-network tasks only
	{
		displayName: 'Acquisition Profile',
		name: 'acquisitionProfileIdForTask',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an acquisition profile...',
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

	// Task Configuration
	{
		displayName: 'Task Configuration',
		name: 'taskConfig',
		type: 'collection',
		placeholder: 'Add Configuration',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignEvidenceTask'],
			},
		},
		required: true,
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
						choice: ['use-custom-options'],
					},
				},
				description: 'Maximum bandwidth usage in MB/s (0 for unlimited)',
			},
			{
				displayName: 'Configuration Choice',
				name: 'choice',
				type: 'options',
				default: 'use-custom-options',
				description: 'Whether to use custom options or default policy',
				options: [
					{
						name: 'Use Custom Options',
						value: 'use-custom-options',
					},
					{
						name: 'Use Policy',
						value: 'use-policy',
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
						choice: ['use-custom-options'],
					},
				},
				description: 'Maximum CPU usage percentage for the task',
			},
			{
				displayName: 'Disk Space Reserve (GB)',
				name: 'diskSpaceReserve',
				type: 'number',
				default: 0,
				placeholder: '0 = unlimited',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				description: 'Disk space to reserve in GB (0 for unlimited)',
			},
			{
				displayName: 'Enable Compression',
				name: 'enableCompression',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				description: 'Whether to enable compression for evidence files',
			},
			{
				displayName: 'Enable Encryption',
				name: 'enableEncryption',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				description: 'Whether to enable encryption for evidence files',
			},
			{
				displayName: 'Encryption Password',
				name: 'encryptionPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'Enter encryption password',
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
						enableEncryption: [true],
					},
				},
				description: 'Password for encrypting evidence files',
			},
			{
				displayName: 'Evidence Repository',
				name: 'evidenceRepository',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select an evidence repository...',
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select an evidence repository...',
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
									errorMessage: 'Not a valid evidence repository ID (must contain only letters, numbers, hyphens, and underscores)',
								},
							},
						],
						placeholder: 'Enter evidence repository ID',
					},
				],
				required: true,
				description: 'The evidence repository to store evidence files',
			},
		],
	},

	// Organization for image acquisition (simplified filtering)
	{
		displayName: 'Organization',
		name: 'imageOrganizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
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
		description: 'The organization context for the image acquisition task',
	},

	// Disk Image Options for assignImageTask operation
	{
		displayName: 'Disk Image Options',
		name: 'diskImageOptions',
		type: 'collection',
		placeholder: 'Configure Image Settings',
		default: {},
		displayOptions: {
			show: {
				resource: ['acquisitions'],
				operation: ['assignImageTask'],
			},
		},
		required: true,
		options: [
			{
				displayName: 'Chunk Size (Bytes)',
				name: 'chunkSize',
				type: 'number',
				default: 0,
				placeholder: '0 = default',
				typeOptions: {
					minValue: 0,
				},
				description: 'Size of chunks in bytes (0 for default)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'Enter image description',
				displayOptions: {
					show: {
						imageType: ['EWF2'],
					},
				},
				description: 'Description for the EWF2 image (only for EWF2 format)',
			},
			{
				displayName: 'Endpoints and Volumes',
				name: 'endpoints',
				type: 'fixedCollection',
				default: [],
				placeholder: 'Add Endpoint',
				typeOptions: {
					multipleValues: true,
					minValue: 1,
				},
				options: [
					{
						displayName: 'Endpoint',
						name: 'endpoint',
						values: [
							{
								displayName: 'Endpoint ID',
								name: 'endpointId',
								type: 'string',
								default: '',
								placeholder: 'Enter endpoint ID',
								required: true,
								description: 'The ID of the endpoint to image',
							},
							{
								displayName: 'Volumes',
								name: 'volumes',
								type: 'string',
								default: '',
								placeholder: 'Enter comma-separated volumes (e.g., /dev/disk3s5,/dev/disk3s4)',
								required: true,
								description: 'Comma-separated list of volumes to image',
							},
						],
					},
				],
				description: 'Configure which endpoints and volumes to image',
			},
			{
				displayName: 'Examiner Name',
				name: 'examinerName',
				type: 'string',
				default: '',
				placeholder: 'Enter examiner name',
				displayOptions: {
					show: {
						imageType: ['EWF2'],
					},
				},
				description: 'Name of the examiner for the EWF2 image (only for EWF2 format)',
			},
			{
				displayName: 'Image Type',
				name: 'imageType',
				type: 'options',
				default: 'dd',
				required: true,
				options: [
					{
						name: 'DD (Raw Image)',
						value: 'dd',
					},
					{
						name: 'EWF2 (Expert Witness Format)',
						value: 'EWF2',
					},
				],
				description: 'The format for the disk image',
			},
			{
				displayName: 'Single File',
				name: 'singleFile',
				type: 'boolean',
				default: false,
				description: 'Whether to create a single image file',
			},
			{
				displayName: 'Start Offset (Bytes)',
				name: 'startOffset',
				type: 'number',
				default: 0,
				placeholder: '0 = start from beginning',
				typeOptions: {
					minValue: 0,
				},
				description: 'Starting offset in bytes (0 for beginning)',
			},
		],
	},

	// Task Configuration for assignImageTask operation
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
		required: true,
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
						choice: ['use-custom-options'],
					},
				},
				description: 'Maximum bandwidth usage in MB/s (0 for unlimited)',
			},
			{
				displayName: 'Configuration Choice',
				name: 'choice',
				type: 'options',
				default: 'use-custom-options',
				description: 'Whether to use custom options or default policy',
				options: [
					{
						name: 'Use Custom Options',
						value: 'use-custom-options',
					},
					{
						name: 'Use Policy',
						value: 'use-policy',
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
						choice: ['use-custom-options'],
					},
				},
				description: 'Maximum CPU usage percentage for the task',
			},
			{
				displayName: 'Disk Space Reserve (GB)',
				name: 'diskSpaceReserve',
				type: 'number',
				default: 0,
				placeholder: '0 = unlimited',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				description: 'Disk space to reserve in GB (0 for unlimited)',
			},
			{
				displayName: 'Enable Compression',
				name: 'enableCompression',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						choice: ['use-custom-options'],
					},
				},
				description: 'Whether to enable compression for image files',
			},
		],
	},

	// Task Scheduler Configuration for assignImageTask operation
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

// Helper functions for evidence repositories
export function extractEvidenceRepositoryId(evidenceRepository: any): string {
	return extractEntityId(evidenceRepository, 'evidence repository');
}

export function isValidEvidenceRepository(evidenceRepository: any): boolean {
	return isValidEntity(evidenceRepository, ['name']);
}

export async function fetchAllEvidenceRepositories(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationIds: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		const repositories = await evidenceRepositoriesApi.getAllEvidenceRepositories(
			context,
			credentials,
			organizationIds,
			searchFilter,
			pageSize
		);
		return repositories || [];
	} catch (error) {
		throw new Error(`Failed to fetch evidence repositories: ${error instanceof Error ? error.message : String(error)}`);
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

export async function getEvidenceRepositories(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const organizationIds = '0'; // Use default or get from context

		const evidenceRepositories = await fetchAllEvidenceRepositories(
			this,
			credentials,
			organizationIds,
			searchTerm
		);

		return createListSearchResults(
			evidenceRepositories,
			isValidEvidenceRepository,
			(repository) => ({
				name: repository.name,
				value: extractEvidenceRepositoryId(repository),
				url: '',
			}),
			searchTerm
		);
	} catch (error) {
		const formattedError = catchAndFormatError(error, 'search evidence repositories');
		throw formattedError;
	}
}

export async function getEvidenceRepositoriesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const organizationIds = '0'; // Use default or get from context

		const evidenceRepositories = await fetchAllEvidenceRepositories(
			this,
			credentials,
			organizationIds
		);

		return createLoadOptions(
			evidenceRepositories,
			isValidEvidenceRepository,
			(repository) => ({
				name: repository.name,
				value: extractEvidenceRepositoryId(repository),
			})
		);
	} catch (error) {
		const formattedError = catchAndFormatError(error, 'load evidence repositories options');
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
				const taskConfig = this.getNodeParameter('taskConfig', i) as any;

				// Validate that at least one endpoint filter is provided
				const hasFilters = endpointFilters && Object.keys(endpointFilters).some(key => {
					const value = endpointFilters[key];
					if (Array.isArray(value)) {
						return value.length > 0;
					}
					return value && value.toString().trim().length > 0;
				});

				if (!hasFilters) {
					throw new NodeOperationError(this.getNode(), 'At least one endpoint filter must be provided to target specific endpoints');
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

				// Build TaskConfig
				taskData.taskConfig = {
					choice: taskConfig.choice || 'use-custom-options',
				};

				if (taskConfig.choice === 'use-custom-options') {
					// Get evidence repository ID
					const evidenceRepositoryId = normalizeAndValidateId(
						taskConfig.evidenceRepository?.value || taskConfig.evidenceRepository,
						'Evidence Repository ID'
					);

					// Configure save to repository for all platforms
					taskData.taskConfig.saveTo = {
						windows: {
							location: 'repository',
							path: 'C:\\Binalyze\\AIR',
							useMostFreeVolume: true,
							repositoryId: evidenceRepositoryId,
							tmp: 'Binalyze\\AIR\\tmp',
							directCollection: false,
						},
						linux: {
							location: 'repository',
							path: 'opt/binalyze/air',
							useMostFreeVolume: true,
							repositoryId: evidenceRepositoryId,
							tmp: 'opt/binalyze/air/tmp',
							directCollection: false,
						},
						macos: {
							location: 'repository',
							path: 'opt/binalyze/air',
							useMostFreeVolume: true,
							repositoryId: evidenceRepositoryId,
							tmp: 'opt/binalyze/air/tmp',
							directCollection: false,
						},
						aix: {
							location: 'repository',
							path: 'opt/binalyze/air',
							useMostFreeVolume: true,
							repositoryId: evidenceRepositoryId,
							tmp: 'opt/binalyze/air/tmp',
						},
					};

					// Configure other task settings
					taskData.taskConfig.cpu = {
						limit: taskConfig.cpuUsageLimit || 50,
					};

					taskData.taskConfig.bandwidth = {
						limit: taskConfig.bandwidthLimit || 0,
					};

					taskData.taskConfig.diskSpace = {
						reserve: taskConfig.diskSpaceReserve || 0,
					};

					taskData.taskConfig.compression = {
						enabled: taskConfig.enableCompression !== false,
						encryption: {
							enabled: taskConfig.enableEncryption || false,
							password: taskConfig.encryptionPassword || null,
						},
					};

					// Set sendTo location based on whether evidence repository is selected
					if (taskConfig.evidenceRepository) {
						taskData.taskConfig.sendTo = {
							location: 'repository',
							repositoryId: evidenceRepositoryId,
						};
					} else {
						taskData.taskConfig.sendTo = {
							location: 'user-local',
						};
					}
				}

				responseData = await acquisitionsApi.assignEvidenceAcquisitionTask(this, credentials, taskData);
				responseData = responseData.result;

			} else if (operation === 'assignImageTask') {
				// Assign Image Acquisition Task
				const caseId = this.getNodeParameter('caseId', i) as any;
				const taskName = this.getNodeParameter('taskName', i) as string;
				const imageOrganizationId = this.getNodeParameter('imageOrganizationId', i) as any;
				const diskImageOptions = this.getNodeParameter('diskImageOptions', i) as any;
				const taskConfig = this.getNodeParameter('taskConfig', i) as any;
				const schedulerConfig = this.getNodeParameter('schedulerConfig', i) as any;

				// Get organization ID
				let orgId: number;
				if (imageOrganizationId.mode === 'name') {
					const orgIdString = await findOrganizationByName(this, credentials, imageOrganizationId.value);
					orgId = parseInt(orgIdString, 10);
				} else {
					orgId = parseInt(imageOrganizationId.value || imageOrganizationId, 10);
				}

				// Transform endpoints array format for API
				const endpoints = diskImageOptions.endpoints?.endpoint?.map((ep: any) => ({
					endpointId: ep.endpointId,
					volumes: ep.volumes.split(',').map((vol: string) => vol.trim()),
				})) || [];

				if (endpoints.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one endpoint with volumes must be configured for image acquisition');
				}

				const taskData: any = {
					caseId: normalizeAndValidateId(caseId.value || caseId, 'Case ID'),
					filter: {
						organizationIds: [orgId],
					},
					taskConfig: {
						choice: taskConfig.choice || 'use-custom-options',
					},
					diskImageOptions: {
						endpoints: endpoints,
						chunkSize: diskImageOptions.chunkSize || 0,
						startOffset: diskImageOptions.startOffset || 0,
						singleFile: diskImageOptions.singleFile || false,
						imageType: diskImageOptions.imageType || 'dd',
					},
					schedulerConfig: { when: 'now' },
				};

				// Add EWF2-specific options if applicable
				if (diskImageOptions.imageType === 'EWF2') {
					if (diskImageOptions.description) {
						taskData.diskImageOptions.description = diskImageOptions.description;
					}
					if (diskImageOptions.examinerName) {
						taskData.diskImageOptions.examinerName = diskImageOptions.examinerName;
					}
				}

				if (taskName) {
					taskData.taskName = taskName;
				}

				// Configure task settings if using custom options
				if (taskConfig.choice === 'use-custom-options') {
					taskData.taskConfig.cpu = { limit: taskConfig.cpuUsageLimit || 50 };
					taskData.taskConfig.bandwidth = { limit: taskConfig.bandwidthLimit || 0 };
					taskData.taskConfig.diskSpace = { reserve: taskConfig.diskSpaceReserve || 0 };
					taskData.taskConfig.compression = { enabled: taskConfig.enableCompression !== false };
				}

				// Add scheduler configuration if provided
				if (schedulerConfig && schedulerConfig.when && schedulerConfig.when !== 'now') {
					taskData.schedulerConfig = {
						when: schedulerConfig.when,
						timezoneType: schedulerConfig.timezoneType || 'asset',
						timezone: schedulerConfig.timezone || undefined,
						startDate: schedulerConfig.startDate ? new Date(schedulerConfig.startDate).getTime() : undefined,
						isRepeat: schedulerConfig.isRepeat || false,
					};
				}

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

