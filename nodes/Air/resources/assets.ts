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
import { api as assetsApi } from '../api/assets/assets';
import { findOrganizationByName } from './organizations';

export const AssetsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['assets'],
			},
		},
		options: [
			{
				name: 'Add Tags',
				value: 'addTags',
				description: 'Add tags to assets by filter',
				action: 'Add tags to assets',
			},
			{
				name: 'Assign Isolation Task',
				value: 'setIsolation',
				description: 'Assign isolation task to an asset',
				action: 'Assign isolation task to an asset',
			},
			{
				name: 'Assign Reboot Task',
				value: 'reboot',
				description: 'Assign reboot task to an asset',
				action: 'Assign reboot task to assets',
			},
			{
				name: 'Assign Shutdown Task',
				value: 'shutdown',
				description: 'Assign shutdown task to an asset',
				action: 'Assign shutdown task to asset',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific asset',
				action: 'Get an asset',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many assets',
				action: 'Get many assets',
			},
			{
				name: 'Get Tasks',
				value: 'getAssetTasks',
				description: 'Get tasks for a specific asset',
				action: 'Get asset tasks',
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				description: 'Remove tags from assets by filter',
				action: 'Remove tags from assets',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
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
							regex: '^[0-9]+$',
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization to get assets from',
	},
	{
		displayName: 'Asset',
		name: 'assetId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an asset...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['get', 'getAssetTasks'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an asset...',
				typeOptions: {
					searchListMethod: 'getAssets',
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
							errorMessage: 'Not a valid asset ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter asset ID',
			},
		],
		required: true,
		description: 'The asset to operate on',
	},

	// Additional fields for getAll operation
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter By Asset Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Enter asset name',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				placeholder: 'Enter IP address',
			},
			{
				displayName: 'Filter By Isolation Status',
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
			},
			{
				displayName: 'Filter By Managed Status',
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
			},
			{
				displayName: 'Filter By Online Status',
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
			},
			{
				displayName: 'Filter By Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Windows',
						value: 'windows',
					},
					{
						name: 'macOS',
						value: 'darwin',
					},
					{
						name: 'Linux',
						value: 'linux',
					},
				],
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				placeholder: 'Enter search term',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2,tag3',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Page number to retrieve',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				description: 'Number of assets to return per page',
			},
		],
	},

	// Tags for add/remove tags operations
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		placeholder: 'tag1,tag2,tag3',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['addTags', 'removeTags'],
			},
		},
		required: true,
		description: 'Tags to add or remove (comma-separated). Tags must contain only lowercase letters, numbers, hyphens, underscores, dots, backslashes, spaces, @, &, and colons.',
	},

	// Organization for add tags operation (required field)
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['addTags'],
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
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization to add tags for assets in (required for Add Tags operation)',
	},

	// Organization for remove tags operation (required field)
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['removeTags'],
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
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization to remove tags from assets in (required for Remove Tags operation)',
	},

	// Filter options for operations that modify assets by filter
	{
		displayName: 'Filter Options',
		name: 'filterOptions',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['addTags', 'removeTags'],
			},
		},
		options: [
			{
				displayName: 'Excluded Asset IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'asset1,asset2,asset3',
				description: 'Specific asset IDs to exclude (comma-separated)',
			},
			{
				displayName: 'Filter By Asset Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Enter asset name',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				placeholder: 'Enter IP address',
			},
			{
				displayName: 'Filter By Isolation Status',
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
			},
			{
				displayName: 'Filter By Label',
				name: 'label',
				type: 'string',
				default: '',
				placeholder: 'Enter label',
			},
			{
				displayName: 'Filter By Managed Status',
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
			},
			{
				displayName: 'Filter By Online Status',
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
			},
			{
				displayName: 'Filter By Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select an organization...',
				displayOptions: {
					show: {
						'/operation': ['removeTags'],
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
									errorMessage: 'Not a valid organization ID (must be a number)',
								},
							},
						],
						placeholder: 'Enter organization ID',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'Enter organization name',
					},
				],
				description: 'For Add Tags operation, use the organization field above instead',
			},
			{
				displayName: 'Filter By Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Windows',
						value: 'windows',
					},
					{
						name: 'macOS',
						value: 'darwin',
					},
					{
						name: 'Linux',
						value: 'linux',
					},
				],
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				placeholder: 'Enter search term',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2,tag3',
			},
			{
				displayName: 'Included Asset IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'asset1,asset2,asset3',
				description: 'Specific asset IDs to include (comma-separated)',
			},
		],
	},

	// Organization for reboot operation
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['reboot'],
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
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization that contains the asset',
	},

	// Asset for reboot operation
	{
		displayName: 'Asset',
		name: 'assetId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an asset...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['reboot'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an asset...',
				typeOptions: {
					searchListMethod: 'getAssetsByOrganizationForDeviceActions',
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
							errorMessage: 'Not a valid asset ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter asset ID',
			},
		],
		required: true,
		description: 'The asset to reboot',
	},

	// Organization for shutdown operation
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['shutdown'],
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
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization that contains the asset',
	},

	// Asset for shutdown operation
	{
		displayName: 'Asset',
		name: 'assetId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an asset...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['shutdown'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an asset...',
				typeOptions: {
					searchListMethod: 'getAssetsByOrganizationForDeviceActions',
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
							errorMessage: 'Not a valid asset ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter asset ID',
			},
		],
		required: true,
		description: 'The asset to shutdown',
	},

	// Organization for assign isolation task operation
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['setIsolation'],
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
							errorMessage: 'Not a valid organization ID (must be a number)',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization that contains the asset',
	},

	// Asset for assign isolation task operation
	{
		displayName: 'Asset',
		name: 'assetId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an asset...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['setIsolation'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an asset...',
				typeOptions: {
					searchListMethod: 'getAssetsByOrganizationForDeviceActions',
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
							errorMessage: 'Not a valid asset ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter asset ID',
			},
		],
		required: true,
		description: 'The asset to assign isolation task to',
	},

	// Isolation enabled field for assign isolation task operation
	{
		displayName: 'Isolation Enabled',
		name: 'isolationEnabled',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['setIsolation'],
			},
		},
		required: true,
		description: 'Whether to enable or disable isolation on the selected assets',
	},


];

// ===== HELPER FUNCTIONS =====

export function extractAssetId(asset: any): string {
	return extractEntityId(asset, 'asset');
}

export function isValidAsset(asset: any): boolean {
	return isValidEntity(asset, ['name', 'ipAddress']);
}

export async function fetchAllAssets(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationId: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		const queryParams: Record<string, string | number> = {
			'pageSize': pageSize,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const responseData = await assetsApi.getAssets(context, credentials, organizationId, queryParams);
		return responseData.result?.entities || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetching assets');
	}
}

export function buildAssetQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationIds,
	};

	// Add search term if provided
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}

	// Add asset name filter if provided
	if (additionalFields.name) {
		queryParams['filter[name]'] = additionalFields.name;
	}

	// Add IP address filter if provided
	if (additionalFields.ipAddress) {
		queryParams['filter[ipAddress]'] = additionalFields.ipAddress;
	}

	// Add platform filter if provided
	if (additionalFields.platform && additionalFields.platform.length > 0) {
		queryParams['filter[platform]'] = Array.isArray(additionalFields.platform)
			? additionalFields.platform.join(',')
			: additionalFields.platform;
	}

	// Add online status filter if provided
	if (additionalFields.onlineStatus && additionalFields.onlineStatus.length > 0) {
		queryParams['filter[onlineStatus]'] = Array.isArray(additionalFields.onlineStatus)
			? additionalFields.onlineStatus.join(',')
			: additionalFields.onlineStatus;
	}

	// Add managed status filter if provided
	if (additionalFields.managedStatus && additionalFields.managedStatus.length > 0) {
		queryParams['filter[managedStatus]'] = Array.isArray(additionalFields.managedStatus)
			? additionalFields.managedStatus.join(',')
			: additionalFields.managedStatus;
	}

	// Add isolation status filter if provided
	if (additionalFields.isolationStatus && additionalFields.isolationStatus.length > 0) {
		queryParams['filter[isolationStatus]'] = Array.isArray(additionalFields.isolationStatus)
			? additionalFields.isolationStatus.join(',')
			: additionalFields.isolationStatus;
	}

	// Add tags filter if provided
	if (additionalFields.tags) {
		queryParams['filter[tags]'] = additionalFields.tags;
	}

	// Add pagination parameters
	if (additionalFields.pageSize) {
		queryParams['pageSize'] = additionalFields.pageSize;
	}

	if (additionalFields.page) {
		queryParams['page'] = additionalFields.page;
	}

	return queryParams;
}

export function buildAssetFilter(filterOptions: any): any {
	const filter: any = {};

	if (filterOptions.searchTerm) {
		filter.searchTerm = filterOptions.searchTerm;
	}

	if (filterOptions.name) {
		filter.name = filterOptions.name;
	}

	if (filterOptions.ipAddress) {
		filter.ipAddress = filterOptions.ipAddress;
	}

	if (filterOptions.label) {
		filter.label = filterOptions.label;
	}

	if (filterOptions.platform && filterOptions.platform.length > 0) {
		filter.platform = filterOptions.platform;
	}

	if (filterOptions.onlineStatus && filterOptions.onlineStatus.length > 0) {
		filter.onlineStatus = filterOptions.onlineStatus;
	}

	if (filterOptions.managedStatus && filterOptions.managedStatus.length > 0) {
		filter.managedStatus = filterOptions.managedStatus;
	}

	if (filterOptions.isolationStatus && filterOptions.isolationStatus.length > 0) {
		filter.isolationStatus = filterOptions.isolationStatus;
	}

	if (filterOptions.tags) {
		filter.tags = filterOptions.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
	}

	if (filterOptions.includedEndpointIds) {
		filter.includedEndpointIds = filterOptions.includedEndpointIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
	}

	if (filterOptions.excludedEndpointIds) {
		filter.excludedEndpointIds = filterOptions.excludedEndpointIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
	}

	// Handle organization ID
	if (filterOptions.organizationId) {
		const organizationResource = filterOptions.organizationId;
		if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
			const orgIdNumber = parseInt(organizationResource.value, 10);
			if (!isNaN(orgIdNumber)) {
				filter.organizationIds = [orgIdNumber];
			}
		} else if (organizationResource.mode === 'name') {
			// This will need to be resolved in the execution context
			filter.organizationName = organizationResource.value;
		}
	}

	return filter;
}

// Helper function to validate tags
function validateTags(tags: string[]): { valid: boolean; invalidTags: string[] } {
	// Based on ASSET_TAG_NAME regex: /^[a-z\d\-_.\\\s@&:]+$/i
	const tagRegex = /^[a-z\d\-_.\\\s@&:]+$/i;
	const invalidTags = tags.filter(tag => !tagRegex.test(tag));

	return {
		valid: invalidTags.length === 0,
		invalidTags
	};
}



// ===== LOAD OPTIONS METHODS =====

export async function getAssets(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const assets = await fetchAllAssets(this, credentials, '0', searchTerm);

		return createListSearchResults(
			assets,
			isValidAsset,
			(asset) => ({
				name: `${asset.name} (${asset.ipAddress})`,
				value: extractAssetId(asset),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'loading assets');
	}
}

/**
 * Get assets for a specific organization (context-aware for device action operations)
 */
export async function getAssetsByOrganizationForDeviceActions(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Try to get the organization from the current node parameters
		let organizationId = '0'; // Default to all organizations
		try {
			const currentParams = this.getCurrentNodeParameters();
			if (currentParams && currentParams.organizationId) {
				const orgResource = currentParams.organizationId as any;
				if (typeof orgResource === 'object') {
					if (orgResource.mode === 'id' || orgResource.mode === 'list') {
						organizationId = orgResource.value || '0';
					}
					// Skip name resolution for ILoadOptionsFunctions context
				} else if (typeof orgResource === 'string') {
					organizationId = orgResource;
				}
			}
		} catch (error) {
			// If we can't get the current parameters, fall back to default
		}

		const assets = await fetchAllAssets(this, credentials, organizationId, searchTerm);

		return createListSearchResults(
			assets,
			isValidAsset,
			(asset) => ({
				name: `${asset.name} (${asset.ipAddress})`,
				value: extractAssetId(asset),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'loading assets');
	}
}

export async function getAssetsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const assets = await fetchAllAssets(this, credentials);

		return createLoadOptions(
			assets,
			isValidAsset,
			(asset) => ({
				name: `${asset.name} (${asset.ipAddress})`,
				value: extractAssetId(asset),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'loading assets');
	}
}

// ===== EXECUTION FUNCTION =====

export async function executeAssets(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			switch (operation) {
				case 'getAll': {
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;
					const organizationResource = this.getNodeParameter('organizationId', i) as any;

					// Handle organization resource locator (now mandatory)
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
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build query parameters from additionalFields
					const queryParams = buildAssetQueryParams(organizationId, additionalFields);

					// Use the API method with query parameters
					const responseData = await assetsApi.getAssets(this, credentials, organizationId, queryParams);

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

				case 'get': {
					const assetResource = this.getNodeParameter('assetId', i) as any;
					let assetId: string;

					if (assetResource.mode === 'list' || assetResource.mode === 'id') {
						assetId = assetResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid asset selection mode', {
							itemIndex: i,
						});
					}

					// Validate asset ID
					try {
						assetId = normalizeAndValidateId(assetId, 'Asset ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Use the API method
					const responseData = await assetsApi.getAssetById(this, credentials, assetId);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'getAssetTasks': {
					const assetResource = this.getNodeParameter('assetId', i) as any;
					let assetId: string;

					if (assetResource.mode === 'list' || assetResource.mode === 'id') {
						assetId = assetResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid asset selection mode', {
							itemIndex: i,
						});
					}

					// Validate asset ID
					try {
						assetId = normalizeAndValidateId(assetId, 'Asset ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Use the API method
					const responseData = await assetsApi.getAssetTasks(this, credentials, assetId);

					// Return tasks as array of individual items from entities
					const entities = responseData.result?.entities || [];
					if (entities.length > 0) {
						entities.forEach((task: any) => {
							returnData.push({
								json: task,
								pairedItem: i,
							});
						});
					} else {
						// Return empty result if no tasks found
						returnData.push({
							json: {},
							pairedItem: i,
						});
					}
					break;
				}

				case 'addTags': {
					const tagsString = this.getNodeParameter('tags', i) as string;
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Parse and validate tags
					const tags = tagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);

					if (tags.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
							itemIndex: i,
						});
					}

					// Validate tag format
					const validation = validateTags(tags);
					if (!validation.valid) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid tag format for: ${validation.invalidTags.join(', ')}. Tags must contain only lowercase letters, numbers, hyphens, underscores, dots, backslashes, spaces, @, &, and colons.`,
							{ itemIndex: i }
						);
					}

					// Handle organization ID from resource locator (required field)
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
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', { itemIndex: i });
					}

					// Validate organization ID
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}

					// Convert organization ID to number
					const orgIdNumber = parseInt(organizationId, 10);
					if (isNaN(orgIdNumber)) {
						throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number', {
							itemIndex: i,
						});
					}

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							const resolvedOrgIdNumber = parseInt(orgId, 10);
							if (!isNaN(resolvedOrgIdNumber)) {
								filter.organizationIds = [resolvedOrgIdNumber];
							}
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Set the required organization ID in the filter (this is required by the API)
					filter.organizationIds = [orgIdNumber];

					// Build the request data
					const requestData = {
						tags,
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.addTagsToAssets(this, credentials, requestData);

					returnData.push({
						json: responseData as any,
						pairedItem: i,
					});
					break;
				}

				case 'removeTags': {
					const tagsString = this.getNodeParameter('tags', i) as string;
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Parse and validate tags
					const tags = tagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);

					if (tags.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
							itemIndex: i,
						});
					}

					// Validate tag format
					const validation = validateTags(tags);
					if (!validation.valid) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid tag format for: ${validation.invalidTags.join(', ')}. Tags must contain only lowercase letters, numbers, hyphens, underscores, dots, backslashes, spaces, @, &, and colons.`,
							{ itemIndex: i }
						);
					}

					// Handle organization ID from resource locator (required field)
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
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', { itemIndex: i });
					}

					// Validate organization ID
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}

					// Convert organization ID to number
					const orgIdNumber = parseInt(organizationId, 10);
					if (isNaN(orgIdNumber)) {
						throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number', {
							itemIndex: i,
						});
					}

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							const resolvedOrgIdNumber = parseInt(orgId, 10);
							if (!isNaN(resolvedOrgIdNumber)) {
								filter.organizationIds = [resolvedOrgIdNumber];
							}
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Set the required organization ID in the filter (this is required by the API)
					filter.organizationIds = [orgIdNumber];

					// Build the request data
					const requestData = {
						tags,
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.removeTagsFromAssets(this, credentials, requestData);

					returnData.push({
						json: responseData as any,
						pairedItem: i,
					});
					break;
				}

				case 'reboot': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const assetResource = this.getNodeParameter('assetId', i) as any;

					// Handle organization ID from resource locator
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
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', { itemIndex: i });
					}

					// Validate organization ID
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}

					// Convert organization ID to number
					const orgIdNumber = parseInt(organizationId, 10);
					if (isNaN(orgIdNumber)) {
						throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number', {
							itemIndex: i,
						});
					}

					// Handle asset ID from resource locator
					let assetId: string;
					if (assetResource.mode === 'list' || assetResource.mode === 'id') {
						assetId = assetResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid asset selection mode', {
							itemIndex: i,
						});
					}

					// Validate asset ID
					try {
						assetId = normalizeAndValidateId(assetId, 'Asset ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build filter with only the selected asset ID
					const filter = {
						organizationIds: [orgIdNumber],
						includedEndpointIds: [assetId],
					};

					// Build the request data
					const requestData = {
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.rebootAssets(this, credentials, requestData);

					// Process the result - each task is returned as a separate item
					if (responseData.result && responseData.result.length > 0) {
						responseData.result.forEach((task: any) => {
							returnData.push({
								json: task,
								pairedItem: i,
							});
						});
					} else {
						// Return empty result if no tasks were created
						returnData.push({
							json: {},
							pairedItem: i,
						});
					}
					break;
				}

				case 'shutdown': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const assetResource = this.getNodeParameter('assetId', i) as any;

					// Handle organization ID from resource locator
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
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', { itemIndex: i });
					}

					// Validate organization ID
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}

					// Convert organization ID to number
					const orgIdNumber = parseInt(organizationId, 10);
					if (isNaN(orgIdNumber)) {
						throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number', {
							itemIndex: i,
						});
					}

					// Handle asset ID from resource locator
					let assetId: string;
					if (assetResource.mode === 'list' || assetResource.mode === 'id') {
						assetId = assetResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid asset selection mode', {
							itemIndex: i,
						});
					}

					// Validate asset ID
					try {
						assetId = normalizeAndValidateId(assetId, 'Asset ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build filter with only the selected asset ID
					const filter = {
						organizationIds: [orgIdNumber],
						includedEndpointIds: [assetId],
					};

					// Build the request data
					const requestData = {
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.shutdownAssets(this, credentials, requestData);

					// Process the result - each task is returned as a separate item
					if (responseData.result && responseData.result.length > 0) {
						responseData.result.forEach((task: any) => {
							returnData.push({
								json: task,
								pairedItem: i,
							});
						});
					} else {
						// Return empty result if no tasks were created
						returnData.push({
							json: {},
							pairedItem: i,
						});
					}
					break;
				}

				case 'setIsolation': {
					const organizationResource = this.getNodeParameter('organizationId', i) as any;
					const assetResource = this.getNodeParameter('assetId', i) as any;
					const isolationEnabled = this.getNodeParameter('isolationEnabled', i) as boolean;

					// Handle organization ID from resource locator
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
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', { itemIndex: i });
					}

					// Validate organization ID
					try {
						organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
					}

					// Convert organization ID to number
					const orgIdNumber = parseInt(organizationId, 10);
					if (isNaN(orgIdNumber)) {
						throw new NodeOperationError(this.getNode(), 'Organization ID must be a valid number', {
							itemIndex: i,
						});
					}

					// Handle asset ID from resource locator
					let assetId: string;
					if (assetResource.mode === 'list' || assetResource.mode === 'id') {
						assetId = assetResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid asset selection mode', {
							itemIndex: i,
						});
					}

					// Validate asset ID
					try {
						assetId = normalizeAndValidateId(assetId, 'Asset ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build filter with only the selected asset ID
					const filter = {
						organizationIds: [orgIdNumber],
						includedEndpointIds: [assetId],
					};

					// Build the request data
					const requestData = {
						enabled: isolationEnabled,
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.setIsolationOnAssets(this, credentials, requestData);

					// Process the result - each task is returned as a separate item
					if (responseData.result && responseData.result.length > 0) {
						responseData.result.forEach((task: any) => {
							returnData.push({
								json: task,
								pairedItem: i,
							});
						});
					} else {
						// Return empty result if no tasks were created
						returnData.push({
							json: {},
							pairedItem: i,
						});
					}
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
