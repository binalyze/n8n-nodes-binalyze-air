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
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as apiTokensApi } from '../api/apitokens/apitokens';
import { findOrganizationByName } from './organizations';

export const ApiTokensOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['apitokens'],
			},
		},
		options: [
			{
				name: 'Create API Token',
				value: 'create',
				description: 'Create a new API token',
				action: 'Create an API token',
			},
			{
				name: 'Delete API Token',
				value: 'delete',
				description: 'Delete an API token',
				action: 'Delete an API token',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific API token',
				action: 'Get an API token',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many API tokens',
				action: 'Get many API tokens',
			},
			{
				name: 'Update API Token',
				value: 'update',
				description: 'Update an API token',
				action: 'Update an API token',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'API Token',
		name: 'apiTokenId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an API token...',
		displayOptions: {
			show: {
				resource: ['apitokens'],
				operation: ['get', 'update', 'delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an API token...',
				typeOptions: {
					searchListMethod: 'getApiTokens',
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
							errorMessage: 'Not a valid API token ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter API token ID',
			},
		],
		required: true,
		description: 'The API token to operate on',
	},

	// Fields for Create and Update operations
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'Enter API token name',
		displayOptions: {
			show: {
				resource: ['apitokens'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Name of the API token',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[a-zA-Z0-9 _@-]+$',
						errorMessage: 'Name must contain only alphanumeric characters, spaces, hyphens, underscores, and at sign (@)',
					},
				},
			],
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
				resource: ['apitokens'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization for this API token. Use "0" for default organization.',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'Enter API token description',
				description: 'Optional description for the API token',
			},
			{
				displayName: 'Expires At',
				name: 'expiresAt',
				type: 'dateTime',
				default: '',
				description: 'Optional expiration date for the API token',
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
				resource: ['apitokens'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'Enter API token description',
				description: 'Optional description for the API token',
			},
			{
				displayName: 'Expires At',
				name: 'expiresAt',
				type: 'dateTime',
				default: '',
				description: 'Optional expiration date for the API token',
			},
			{
				displayName: 'Is Active',
				name: 'isActive',
				type: 'boolean',
				default: true,
				description: 'Whether the API token is active',
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
				resource: ['apitokens'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter By Active Status',
				name: 'isActive',
				type: 'boolean',
				default: true,
				description: 'Whether to filter by active status',
			},
			{
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter API tokens by name',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter API tokens by. Use "0" to retrieve tokens that are visible to all organizations.',
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
				resource: ['apitokens'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter by. Use "0" for default organization.',
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
		],
	},
];

// ===== HELPER FUNCTIONS =====

export function extractApiTokenId(apiToken: any): string {
	return extractEntityId(apiToken);
}

export function isValidApiToken(apiToken: any): boolean {
	return isValidEntity(apiToken);
}

export async function fetchAllApiTokens(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationId: string = '0',
	searchFilter?: string
): Promise<any[]> {
	try {
		const queryParams: Record<string, any> = {};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const response = await apiTokensApi.getApiTokens(context, credentials, organizationId, queryParams);
		return response.result.entities || [];
	} catch (error) {
		throw new Error(`Failed to fetch API tokens: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export function buildApiTokenQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	if (organizationIds && organizationIds !== '0') {
		queryParams['filter[organizationIds]'] = organizationIds;
	}

	if (additionalFields.name) {
		queryParams['filter[name]'] = additionalFields.name;
	}

	if (additionalFields.isActive !== undefined) {
		queryParams['filter[isActive]'] = additionalFields.isActive;
	}

	if (additionalFields.pageNumber) {
		queryParams.pageNumber = additionalFields.pageNumber;
	}

	if (additionalFields.pageSize) {
		queryParams.pageSize = additionalFields.pageSize;
	}

	return queryParams;
}

// ===== LOAD OPTIONS METHODS =====

export async function getApiTokens(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		const apiTokens = await fetchAllApiTokens(this, credentials, '0', searchTerm);

		return createListSearchResults(
			apiTokens,
			isValidApiToken,
			(token: any) => ({
				name: token.name || `API Token ${token._id}`,
				value: extractApiTokenId(token),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load API tokens for selection');
	}
}

export async function getApiTokensOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);

		const apiTokens = await fetchAllApiTokens(this, credentials);

		return createLoadOptions(
			apiTokens,
			isValidApiToken,
			(token) => {
				const tokenId = extractApiTokenId(token);
				const name = token.name || token._id || `Token ${tokenId || 'Unknown'}`;

				return {
					name,
					value: tokenId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load API tokens options');
	}
}

// ===== EXECUTE FUNCTION =====

export async function executeApiTokens(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0) as string;
	const credentials = await getAirCredentials(this);

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			switch (operation) {
				case 'create': {
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

					// Handle organization ID
					let organizationId = 0;
					if (additionalFields.organizationId) {
						const orgIdInput = additionalFields.organizationId;
						if (typeof orgIdInput === 'object') {
							if (orgIdInput.mode === 'name' && orgIdInput.value) {
								const org = await findOrganizationByName(this, credentials, orgIdInput.value);
								organizationId = parseInt(extractEntityId(org), 10) || 0;
							} else if (orgIdInput.mode === 'id' && orgIdInput.value) {
								organizationId = parseInt(orgIdInput.value, 10) || 0;
							}
						} else if (typeof orgIdInput === 'string' || typeof orgIdInput === 'number') {
							organizationId = parseInt(String(orgIdInput), 10) || 0;
						}
					}

					const requestData: any = {
						name,
						organizationId,
					};

					if (additionalFields.description) {
						requestData.description = additionalFields.description;
					}

					if (additionalFields.expiresAt) {
						requestData.expiresAt = additionalFields.expiresAt;
					}

					const response = await apiTokensApi.createApiToken(this, credentials, requestData);

					if (response.success) {
						returnData.push({
							json: response.result as any,
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Create API token failed: ${response.errors?.join(', ') || 'Unknown error'}`, { itemIndex: i });
					}
					break;
				}

				case 'update': {
					const apiTokenResource = this.getNodeParameter('apiTokenId', i) as any;
					let apiTokenId: string;

					if (apiTokenResource.mode === 'list' || apiTokenResource.mode === 'id') {
						apiTokenId = apiTokenResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid API token selection mode', {
							itemIndex: i,
						});
					}

					// Validate API token ID
					try {
						apiTokenId = normalizeAndValidateId(apiTokenId, 'API Token ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

					const requestData: any = {
						name,
					};

					if (additionalFields.description) {
						requestData.description = additionalFields.description;
					}

					if (additionalFields.expiresAt) {
						requestData.expiresAt = additionalFields.expiresAt;
					}

					if (additionalFields.isActive !== undefined) {
						requestData.isActive = additionalFields.isActive;
					}

					const response = await apiTokensApi.updateApiToken(this, credentials, apiTokenId, requestData);

					if (response.success) {
						returnData.push({
							json: response.result as any,
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Update API token failed: ${response.errors?.join(', ') || 'Unknown error'}`, { itemIndex: i });
					}
					break;
				}

				case 'delete': {
					const apiTokenResource = this.getNodeParameter('apiTokenId', i) as any;
					let apiTokenId: string;

					if (apiTokenResource.mode === 'list' || apiTokenResource.mode === 'id') {
						apiTokenId = apiTokenResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid API token selection mode', {
							itemIndex: i,
						});
					}

					// Validate API token ID
					try {
						apiTokenId = normalizeAndValidateId(apiTokenId, 'API Token ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await apiTokensApi.deleteApiToken(this, credentials, apiTokenId);

					if (response.success) {
						returnData.push({
							json: { success: true, _id: apiTokenId },
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Delete API token failed: ${response.errors?.join(', ') || 'Unknown error'}`, { itemIndex: i });
					}
					break;
				}

				case 'get': {
					const apiTokenResource = this.getNodeParameter('apiTokenId', i) as any;
					let apiTokenId: string;

					if (apiTokenResource.mode === 'list' || apiTokenResource.mode === 'id') {
						apiTokenId = apiTokenResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid API token selection mode', {
							itemIndex: i,
						});
					}

					// Validate API token ID
					try {
						apiTokenId = normalizeAndValidateId(apiTokenId, 'API Token ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await apiTokensApi.getApiTokenById(this, credentials, apiTokenId);

					if (response.success) {
						returnData.push({
							json: response.result as any,
							pairedItem: { item: i },
						});
					} else {
						throw new NodeOperationError(this.getNode(), `Get API token failed: ${response.errors?.join(', ') || 'Unknown error'}`, { itemIndex: i });
					}
					break;
				}

				case 'getAll': {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

					// Handle organization ID
					let organizationIds = '0';
					if (additionalFields.organizationId) {
						const orgIdInput = additionalFields.organizationId;
						if (typeof orgIdInput === 'object') {
							if (orgIdInput.mode === 'name' && orgIdInput.value) {
								const org = await findOrganizationByName(this, credentials, orgIdInput.value);
								organizationIds = extractEntityId(org);
							} else if (orgIdInput.mode === 'id' && orgIdInput.value) {
								organizationIds = orgIdInput.value;
							}
						} else if (typeof orgIdInput === 'string' || typeof orgIdInput === 'number') {
							organizationIds = String(orgIdInput);
						}
					}

										const queryParams = buildApiTokenQueryParams(organizationIds, additionalFields);
					const response = await apiTokensApi.getApiTokens(this, credentials, organizationIds, queryParams);

					if (response.success) {
						const entities = response.result?.entities || [];
						const paginationInfo = extractPaginationInfo(response.result);

						// Process entities with simplified pagination attached to each entity
						for (const entity of entities) {
							if (isValidApiToken(entity)) {
								returnData.push({
									json: { ...entity, ...paginationInfo } as any,
									pairedItem: { item: i },
								});
							}
						}
					} else {
						throw new NodeOperationError(this.getNode(), `Get API tokens failed: ${response.errors?.join(', ') || 'Unknown error'}`, { itemIndex: i });
					}
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`, { itemIndex: i });
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
