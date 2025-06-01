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
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	extractSimplifiedPaginationInfo,
	processApiResponseEntitiesWithSimplifiedPagination,
	requireValidId,
	catchAndFormatError,
} from './helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

export const AutoAssetTagsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['autoassettags'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific auto asset tag',
				action: 'Get an auto asset tag',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many auto asset tags',
				action: 'Get many auto asset tags',
			},
			{
				name: 'Start Tagging',
				value: 'startTagging',
				description: 'Start auto asset tagging process',
				action: 'Start auto asset tagging',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Auto Asset Tag',
		name: 'autoAssetTagId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an auto asset tag...',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an auto asset tag...',
				typeOptions: {
					searchListMethod: 'getAutoAssetTags',
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
							errorMessage: 'Not a valid auto asset tag ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter auto asset tag ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter auto asset tag name',
			},
		],
		required: true,
		description: 'The auto asset tag to work with',
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		default: '{\n  "organizationIds": [0],\n  "searchTerm": "",\n  "managedStatus": ["managed"],\n  "isolationStatus": [],\n  "platform": [],\n  "onlineStatus": [],\n  "tags": []\n}',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['startTagging'],
			},
		},
		required: true,
		description: 'Filter criteria for endpoints to tag',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	{
		displayName: 'Scheduler Config',
		name: 'schedulerConfig',
		type: 'json',
		default: '{\n  "when": "now"\n}',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['startTagging'],
			},
		},
		required: true,
		description: 'Scheduler configuration for the tagging operation',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Organization ID',
				name: 'organizationIds',
				type: 'number',
				default: 0,
				description: 'Organization ID to filter tags. Default value 0 fetches tags visible to ALL organizations. Other values fetch tags visible to ALL organizations AND the specified organization.',
				typeOptions: {
					minValue: 0,
				},
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
					maxValue: 100,
				},
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter auto asset tags',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
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
						name: 'Tag',
						value: 'tag',
					},
				],
				default: 'createdAt',
				description: 'Attribute name to order the responses by',
			},
			{
				displayName: 'Sort Type',
				name: 'sortType',
				type: 'options',
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
				default: 'ASC',
				description: 'Sort order',
			},
		],
	},
];

export function extractAutoAssetTagId(autoAssetTag: any): string {
	if (typeof autoAssetTag === 'string') {
		return autoAssetTag;
	}
	return autoAssetTag?._id || autoAssetTag?.id || '';
}

export function isValidAutoAssetTag(tag: any): boolean {
	return tag && typeof tag === 'object' && (tag._id || tag.id) && tag.tag;
}

export async function fetchAllAutoAssetTags(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	let allTags: any[] = [];
	let currentPage = 1;
	let hasMorePages = true;

	while (hasMorePages) {
		const queryParams: Record<string, string | number> = {
			pageNumber: currentPage,
			pageSize,
			'filter[organizationIds]': 0,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const options = buildRequestOptions(credentials, 'GET', '/api/public/auto-asset-tag', queryParams);

		try {
			const responseData = await context.helpers.httpRequest(options);
			validateApiResponse(responseData, 'Failed to fetch auto asset tags');

			const tags = responseData.result?.entities || [];
			allTags.push(...tags);

			// Check if there are more pages using the actual API pagination structure
			const result = responseData.result;
			if (result && result.currentPage && result.totalPageCount && result.currentPage < result.totalPageCount) {
				currentPage++;
			} else {
				hasMorePages = false;
			}
		} catch (error) {
			throw catchAndFormatError(error, 'Failed to fetch auto asset tags');
		}
	}

	return allTags;
}

export async function findAutoAssetTagByName(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	tagName: string
): Promise<any | null> {
	try {
		// Use a smaller page size for name search to optimize performance
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': 0,
			'filter[searchTerm]': tagName,
			pageSize: 100, // Get a reasonable page size to find the tag
		};

		const options = buildRequestOptions(credentials, 'GET', '/api/public/auto-asset-tag', queryParams);
		const responseData = await context.helpers.httpRequest(options);
		validateApiResponse(responseData, 'Failed to fetch auto asset tags');

		const tags = responseData.result?.entities || [];

		// Find exact match by name (case-insensitive)
		const exactMatch = tags.find((tag: any) =>
			tag.tag && tag.tag.toLowerCase() === tagName.toLowerCase()
		);

		if (exactMatch) {
			return exactMatch;
		}

		// If no exact match, return the first partial match
		if (tags.length > 0) {
			return tags[0];
		}

		return null;
	} catch (error) {
		throw catchAndFormatError(error, `Failed to find auto asset tag by name: ${tagName}`);
	}
}

export function buildAutoAssetTagQueryParams(additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	// Organization ID is required with default value 0
	queryParams['filter[organizationIds]'] = additionalFields.organizationIds !== undefined
		? additionalFields.organizationIds
		: 0;

	if (additionalFields.pageNumber !== undefined) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize !== undefined) {
		queryParams.pageSize = additionalFields.pageSize;
	}
	if (additionalFields.sortBy !== undefined) {
		queryParams.sortBy = additionalFields.sortBy;
	}
	if (additionalFields.sortType !== undefined) {
		queryParams.sortType = additionalFields.sortType;
	}
	if (additionalFields.searchTerm !== undefined) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}

	return queryParams;
}

export async function getAutoAssetTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		const tags = await fetchAllAutoAssetTags(this, credentials, filter);

		return createListSearchResults(
			tags,
			isValidAutoAssetTag,
			(tag: any) => ({
				name: tag.tag,
				value: extractAutoAssetTagId(tag),
				url: tag.url || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load auto asset tags for selection');
	}
}

export async function getAutoAssetTagsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const tags = await fetchAllAutoAssetTags(this, credentials);

		return createLoadOptions(
			tags,
			isValidAutoAssetTag,
			(tag: any) => {
				const tagId = extractAutoAssetTagId(tag);
				const name = tag.tag || `Auto Asset Tag ${tagId || 'Unknown'}`;

				return {
					name,
					value: tagId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load auto asset tags options');
	}
}

export async function executeAutoAssetTags(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	try {
		const credentials = await getAirCredentials(this);

		for (let i = 0; i < items.length; i++) {
			try {
				switch (operation) {
					case 'getAll':
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;
						const queryParams = buildAutoAssetTagQueryParams(additionalFields);

						const getAllOptions = buildRequestOptions(credentials, 'GET', '/api/public/auto-asset-tag', queryParams);
						const getAllResponse = await this.helpers.httpRequest(getAllOptions);
						validateApiResponse(getAllResponse, 'Failed to get auto asset tags');

						const entities = getAllResponse.result?.entities || [];
						const paginationInfo = extractSimplifiedPaginationInfo(getAllResponse.result);

						// Process entities with simplified pagination attached to each entity
						processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);
						break;

					case 'get':
						const autoAssetTagResource = this.getNodeParameter('autoAssetTagId', i) as any;
						let autoAssetTagId: string;

						if (autoAssetTagResource.mode === 'list' || autoAssetTagResource.mode === 'id') {
							// For both list and id modes, the value should be the auto asset tag ID
							const tagId = autoAssetTagResource.value;
							try {
								autoAssetTagId = requireValidId(tagId, 'Auto Asset Tag ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						} else if (autoAssetTagResource.mode === 'name') {
							// For name mode, search by name
							const tagName = autoAssetTagResource.value;
							if (!tagName || typeof tagName !== 'string' || tagName.trim() === '') {
								throw new NodeOperationError(this.getNode(), 'Auto asset tag name is required and must be a non-empty string', {
									itemIndex: i,
								});
							}
							try {
								const foundTag = await findAutoAssetTagByName(this, credentials, tagName.trim());
								if (!foundTag) {
									throw new NodeOperationError(this.getNode(), `No auto asset tag found with name: ${tagName}`, {
										itemIndex: i,
									});
								}
								autoAssetTagId = extractAutoAssetTagId(foundTag);
							} catch (error) {
								if (error instanceof NodeOperationError) {
									throw error;
								}
								throw new NodeOperationError(this.getNode(), `Failed to find auto asset tag by name: ${tagName}`, {
									itemIndex: i,
								});
							}
						} else {
							throw new NodeOperationError(this.getNode(), 'Invalid auto asset tag selection mode', {
								itemIndex: i,
							});
						}

						const getOptions = buildRequestOptions(credentials, 'GET', `/api/public/auto-asset-tag/${autoAssetTagId}`);
						const getResponse = await this.helpers.httpRequest(getOptions);
						validateApiResponse(getResponse, 'Failed to get auto asset tag');

						returnData.push({
							json: getResponse.result,
							pairedItem: { item: i },
						});
						break;

					case 'startTagging':
						const filter = this.getNodeParameter('filter', i) as string;
						const schedulerConfig = this.getNodeParameter('schedulerConfig', i) as string;

						const startTaggingData = {
							filter: JSON.parse(filter),
							schedulerConfig: JSON.parse(schedulerConfig),
						};

						const startTaggingOptions = buildRequestOptions(credentials, 'POST', '/api/public/auto-asset-tag/start-tagging');
						startTaggingOptions.body = startTaggingData;
						const startTaggingResponse = await this.helpers.httpRequest(startTaggingOptions);
						validateApiResponse(startTaggingResponse, 'Failed to start tagging');

						returnData.push({
							json: startTaggingResponse.result,
							pairedItem: { item: i },
						});
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
				}
			} catch (error) {
				handleExecuteError(this, error, i, returnData);
			}
		}

		return [returnData];
	} catch (error) {
		throw catchAndFormatError(error, 'execute auto asset tags operation');
	}
}
