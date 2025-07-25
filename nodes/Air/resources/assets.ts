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
				name: 'Assign Task',
				value: 'assignTask',
				description: 'Assign task to assets',
				action: 'Assign task to assets',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific asset',
				action: 'Get an asset',
			},
			{
				name: 'Get Asset Tasks',
				value: 'getAssetTasks',
				description: 'Get tasks for a specific asset',
				action: 'Get asset tasks',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many assets',
				action: 'Get many assets',
			},
			{
				name: 'Purge and Uninstall',
				value: 'purgeAndUninstall',
				description: 'Purge and uninstall assets by filter',
				action: 'Purge and uninstall assets',
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				description: 'Remove tags from assets by filter',
				action: 'Remove tags from assets',
			},
			{
				name: 'Uninstall',
				value: 'uninstall',
				description: 'Uninstall assets without purge by filter',
				action: 'Uninstall assets',
			},
		],
		default: 'getAll',
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
				displayName: 'Filter By Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select an organization...',
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
						value: 'macos',
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

	// Case ID for assign task operation
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['assignTask'],
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
		description: 'The case to assign the task to',
	},

	// Task Choice for assign task operation
	{
		displayName: 'Task Choice',
		name: 'taskChoice',
		type: 'string',
		default: '',
		placeholder: 'Enter task choice',
		displayOptions: {
			show: {
				resource: ['assets'],
				operation: ['assignTask'],
			},
		},
		required: true,
		description: 'The task configuration choice',
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
		description: 'Tags to add or remove (comma-separated)',
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
				operation: ['assignTask', 'addTags', 'removeTags', 'uninstall', 'purgeAndUninstall'],
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
						value: 'macos',
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
			filter.organizationIds = [organizationResource.value];
		} else if (organizationResource.mode === 'name') {
			// This will need to be resolved in the execution context
			filter.organizationName = organizationResource.value;
		}
	}

	return filter;
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

					// Handle organization resource locator from additional fields
					let organizationId: string = '0'; // Default to all organizations

					if (additionalFields.organizationId) {
						const organizationResource = additionalFields.organizationId;
						let orgIdString: string;

						if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
							orgIdString = organizationResource.value;
						} else if (organizationResource.mode === 'name') {
							try {
								orgIdString = await findOrganizationByName(this, credentials, organizationResource.value);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
							}
						} else {
							throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
								itemIndex: i,
							});
						}

						// Validate and use organization ID
						try {
							organizationId = normalizeAndValidateId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
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

				case 'assignTask': {
					const caseResource = this.getNodeParameter('caseId', i) as any;
					const taskChoice = this.getNodeParameter('taskChoice', i) as string;
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					let caseId: string;

					if (caseResource.mode === 'list' || caseResource.mode === 'id') {
						caseId = caseResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid case selection mode', {
							itemIndex: i,
						});
					}

					// Validate case ID
					try {
						caseId = normalizeAndValidateId(caseId, 'Case ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							filter.organizationIds = [orgId];
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Build the request data
					const requestData = {
						caseId,
						taskConfig: {
							choice: taskChoice,
						},
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.assignAssetTasks(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'addTags': {
					const tagsString = this.getNodeParameter('tags', i) as string;
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Parse tags
					const tags = tagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);

					if (tags.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
							itemIndex: i,
						});
					}

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							filter.organizationIds = [orgId];
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Build the request data
					const requestData = {
						tags,
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.addTagsToAssets(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'removeTags': {
					const tagsString = this.getNodeParameter('tags', i) as string;
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Parse tags
					const tags = tagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);

					if (tags.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one tag must be provided', {
							itemIndex: i,
						});
					}

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							filter.organizationIds = [orgId];
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Build the request data
					const requestData = {
						tags,
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.removeTagsFromAssets(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'uninstall': {
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							filter.organizationIds = [orgId];
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Build the request data
					const requestData = {
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.uninstallAssets(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'purgeAndUninstall': {
					const filterOptions = this.getNodeParameter('filterOptions', i) as any;

					// Build filter from filterOptions
					const filter = buildAssetFilter(filterOptions);

					// Handle organization name resolution if needed
					if (filter.organizationName) {
						try {
							const orgId = await findOrganizationByName(this, credentials, filter.organizationName);
							filter.organizationIds = [orgId];
							delete filter.organizationName;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					}

					// Build the request data
					const requestData = {
						filter,
					};

					// Use the API method
					const responseData = await assetsApi.purgeAndUninstallAssets(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
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
