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
	extractPaginationInfo,
	processApiResponseEntities,
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as autoAssetTagsApi } from '../api/autoassettags/autoassettags';
import { findOrganizationByName } from './organizations';

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
				name: 'Create Auto Asset Tag',
				value: 'create',
				description: 'Create a new auto asset tag',
				action: 'Create an auto asset tag',
			},
			{
				name: 'Delete Auto Asset Tag',
				value: 'delete',
				description: 'Delete an auto asset tag',
				action: 'Delete an auto asset tag',
			},
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
				description: 'Start the tagging process for an auto asset tag',
				action: 'Start tagging',
			},
			{
				name: 'Update Auto Asset Tag',
				value: 'update',
				description: 'Update an auto asset tag',
				action: 'Update an auto asset tag',
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
				operation: ['get', 'update', 'delete'],
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
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'string',
		default: '',
		placeholder: 'Enter tag name',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Name of the auto asset tag',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'Enter the query for the auto asset tag',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['create', 'update'],
			},
		},
		typeOptions: {
			rows: 3,
		},
		required: true,
		description: 'The query that defines the auto asset tag criteria',
	},
	{
		displayName: 'Auto Asset Tag for Tagging',
		name: 'startTaggingId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an auto asset tag...',
		displayOptions: {
			show: {
				resource: ['autoassettags'],
				operation: ['startTagging'],
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
		],
		required: true,
		description: 'The auto asset tag to start tagging process for',
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
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization for this auto asset tag. Default value 0 applies to ALL organizations.',
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
									errorMessage: 'Not a valid organization ID (must be a positive number or 0 for all organizations)',
								},
							},
						],
						placeholder: 'Enter Organization ID (0 for all organizations)',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'Enter organization name',
					},
				],
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
				resource: ['autoassettags'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter tags. Default value 0 fetches tags visible to ALL organizations. Other values fetch tags visible to ALL organizations AND the specified organization.',
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
									errorMessage: 'Not a valid organization ID (must be a positive number or 0 for default organization)',
								},
							},
						],
						placeholder: 'Enter Organization ID (0 for default organization)',
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
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter auto asset tags',
			},
		],
	},
];

export function extractAutoAssetTagId(autoAssetTag: any): string {
	if (typeof autoAssetTag === 'string') {
		return autoAssetTag;
	}
	return autoAssetTag?._id || '';
}

export function isValidAutoAssetTag(tag: any): boolean {
	return tag && typeof tag === 'object' && tag._id && tag.tag;
}

export async function fetchAllAutoAssetTags(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationId: number = 0,
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
			'filter[organizationIds]': organizationId,
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
	organizationId: number,
	tagName: string
): Promise<any | null> {
	try {
		// Use a smaller page size for name search to optimize performance
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': organizationId,
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

export function buildAutoAssetTagQueryParams(additionalFields: any, organizationId?: number): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	// Organization ID is required with default value 0
	queryParams['filter[organizationIds]'] = organizationId !== undefined ? organizationId : 0;

	if (additionalFields.pageNumber !== undefined) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}
	if (additionalFields.pageSize !== undefined) {
		queryParams.pageSize = additionalFields.pageSize;
	}
	if (additionalFields.searchTerm !== undefined) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}

	return queryParams;
}



export async function getAutoAssetTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);
		// Use organizationId 0 for all organizations in dropdown loading
		const organizationId = 0;
		const tags = await fetchAllAutoAssetTags(this, credentials, organizationId, filter);

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
		const tags = await fetchAllAutoAssetTags(this, credentials, 0);

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
					case 'create':
						const tagName = this.getNodeParameter('tagName', i) as string;
						const query = this.getNodeParameter('query', i) as string;
						const createFields = this.getNodeParameter('additionalFields', i) as any;

						// Handle organization resource locator
						let createOrgId: number = 0; // Default to all organizations
						if (createFields.organizationId) {
							const organizationResource = createFields.organizationId;
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

							// Validate and convert organization ID
							try {
								orgIdString = normalizeAndValidateId(orgIdString, 'Organization ID');
								createOrgId = parseInt(orgIdString);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						}

						const createRequest = {
							tag: tagName,
							query: query,
							organizationIds: [createOrgId]
						};

						const createResponse = await autoAssetTagsApi.createAutoAssetTag(this, credentials, createRequest);

						returnData.push({
							json: createResponse.result as any,
							pairedItem: { item: i },
						});
						break;

					case 'update':
						const updateTagResource = this.getNodeParameter('autoAssetTagId', i) as any;
						let updateTagId: string;

						if (updateTagResource.mode === 'list' || updateTagResource.mode === 'id') {
							const tagId = updateTagResource.value;
							try {
								updateTagId = normalizeAndValidateId(tagId, 'Auto Asset Tag ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						} else if (updateTagResource.mode === 'name') {
							const tagName = updateTagResource.value;
							if (!tagName || typeof tagName !== 'string' || tagName.trim() === '') {
								throw new NodeOperationError(this.getNode(), 'Auto asset tag name is required and must be a non-empty string', {
									itemIndex: i,
								});
							}
							try {
								const foundTag = await findAutoAssetTagByName(this, credentials, 0, tagName.trim());
								if (!foundTag) {
									throw new NodeOperationError(this.getNode(), `No auto asset tag found with name: ${tagName}`, {
										itemIndex: i,
									});
								}
								updateTagId = extractAutoAssetTagId(foundTag);
							} catch (error) {
								if (error instanceof NodeOperationError) {
									throw error;
								}
								throw new NodeOperationError(this.getNode(), `Failed to find auto asset tag by name: ${tagName}`, {
									itemIndex: i,
								});
							}
						} else {
							throw new NodeOperationError(this.getNode(), 'Invalid auto asset tag selection mode for update', {
								itemIndex: i,
							});
						}

						const updateTagName = this.getNodeParameter('tagName', i) as string;
						const updateQuery = this.getNodeParameter('query', i) as string;
						const updateFields = this.getNodeParameter('additionalFields', i) as any;

						// Handle organization resource locator for update
						let updateOrgId: number = 0;
						if (updateFields.organizationId) {
							const organizationResource = updateFields.organizationId;
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

							// Validate and convert organization ID
							try {
								orgIdString = normalizeAndValidateId(orgIdString, 'Organization ID');
								updateOrgId = parseInt(orgIdString);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						}

						const updateRequest = {
							tag: updateTagName,
							query: updateQuery,
							organizationIds: [updateOrgId]
						};

						const updateResponse = await autoAssetTagsApi.updateAutoAssetTag(this, credentials, updateTagId, updateRequest);

						returnData.push({
							json: updateResponse.result as any,
							pairedItem: { item: i },
						});
						break;

					case 'delete':
						const deleteTagResource = this.getNodeParameter('autoAssetTagId', i) as any;
						let deleteTagId: string;

						if (deleteTagResource.mode === 'list' || deleteTagResource.mode === 'id') {
							const tagId = deleteTagResource.value;
							try {
								deleteTagId = normalizeAndValidateId(tagId, 'Auto Asset Tag ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						} else if (deleteTagResource.mode === 'name') {
							const tagName = deleteTagResource.value;
							if (!tagName || typeof tagName !== 'string' || tagName.trim() === '') {
								throw new NodeOperationError(this.getNode(), 'Auto asset tag name is required and must be a non-empty string', {
									itemIndex: i,
								});
							}
							try {
								const foundTag = await findAutoAssetTagByName(this, credentials, 0, tagName.trim());
								if (!foundTag) {
									throw new NodeOperationError(this.getNode(), `No auto asset tag found with name: ${tagName}`, {
										itemIndex: i,
									});
								}
								deleteTagId = extractAutoAssetTagId(foundTag);
							} catch (error) {
								if (error instanceof NodeOperationError) {
									throw error;
								}
								throw new NodeOperationError(this.getNode(), `Failed to find auto asset tag by name: ${tagName}`, {
									itemIndex: i,
								});
							}
						} else {
							throw new NodeOperationError(this.getNode(), 'Invalid auto asset tag selection mode for delete', {
								itemIndex: i,
							});
						}

						await autoAssetTagsApi.deleteAutoAssetTag(this, credentials, deleteTagId);

						returnData.push({
							json: { success: true, deletedId: deleteTagId },
							pairedItem: { item: i },
						});
						break;

					case 'startTagging':
						const startTaggingResource = this.getNodeParameter('startTaggingId', i) as any;
						let startTaggingId: string;

						if (startTaggingResource.mode === 'list' || startTaggingResource.mode === 'id') {
							const tagId = startTaggingResource.value;
							try {
								startTaggingId = normalizeAndValidateId(tagId, 'Auto Asset Tag ID');
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						} else {
							throw new NodeOperationError(this.getNode(), 'Invalid auto asset tag selection mode for start tagging', {
								itemIndex: i,
							});
						}

						const startTaggingRequest = {
							autoAssetTagId: startTaggingId,
							filter: {} // Empty filter to tag all matching assets
						};

						const startTaggingResponse = await autoAssetTagsApi.startTagging(this, credentials, startTaggingRequest);

						returnData.push({
							json: startTaggingResponse.result as any,
							pairedItem: { item: i },
						});
						break;

					case 'getAll':
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						// Handle organization resource locator
						let organizationId: number = 0; // Default to all organizations
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

							// Validate and convert organization ID
							try {
								orgIdString = normalizeAndValidateId(orgIdString, 'Organization ID');
								organizationId = parseInt(orgIdString);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), error.message, {
									itemIndex: i,
								});
							}
						}

						const queryParams = buildAutoAssetTagQueryParams(additionalFields, organizationId);

						const getAllResponse = await autoAssetTagsApi.getAutoAssetTags(this, credentials, organizationId.toString(), queryParams);

						const entities = getAllResponse.result?.entities || [];
						const paginationInfo = extractPaginationInfo(getAllResponse.result);

						// Process entities with simplified pagination attached to each entity
						processApiResponseEntities(entities, returnData, i, {
							includePagination: true,
							paginationData: paginationInfo,
							excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
						});
						break;

					case 'get':
						const autoAssetTagResource = this.getNodeParameter('autoAssetTagId', i) as any;
						let autoAssetTagId: string;

						if (autoAssetTagResource.mode === 'list' || autoAssetTagResource.mode === 'id') {
							// For both list and id modes, the value should be the auto asset tag ID
							const tagId = autoAssetTagResource.value;
							try {
								autoAssetTagId = normalizeAndValidateId(tagId, 'Auto Asset Tag ID');
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
								const foundTag = await findAutoAssetTagByName(this, credentials, 0, tagName.trim());
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

						const getResponse = await autoAssetTagsApi.getAutoAssetTagById(this, credentials, autoAssetTagId);

						returnData.push({
							json: getResponse.result as any,
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
