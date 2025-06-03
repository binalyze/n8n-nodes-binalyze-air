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
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	createLoadOptions,
	handleExecuteError,
	extractSimplifiedPaginationInfo,
	processApiResponseEntitiesWithSimplifiedPagination,
	requireValidId,
	catchAndFormatError,
} from './helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

export const TriageRulesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['triagerules'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new triage rule',
				action: 'Create a triage rule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a triage rule',
				action: 'Delete a triage rule',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many triage rules',
				action: 'Get many triage rules',
			},
			{
				name: 'Get Triage Rule',
				value: 'get',
				description: 'Retrieve a specific triage rule',
				action: 'Get a triage rule',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a triage rule',
				action: 'Update a triage rule',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Triage Rule',
		name: 'triageRuleId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a triage rule...',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['get', 'update', 'delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a triage rule...',
				typeOptions: {
					searchListMethod: 'getTriageRules',
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
							errorMessage: 'Not a valid triage rule ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter triage rule ID',
			},
		],
		required: true,
		description: 'The triage rule to operate on',
	},
	{
		displayName: 'Organization IDs',
		name: 'organizationIds',
		type: 'string',
		default: '0',
		placeholder: 'Enter organization IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['getAll'],
			},
		},
		required: true,
		description: 'Organization IDs to filter triage rules by (required by API). Use "0" to retrieve rules that are visible to all organizations. Specify a single organization ID to retrieve rules that are visible to that organization only alongside those that are visible to all organizations.',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		placeholder: 'Enter triage rule description',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Description of the triage rule (alphanumeric characters only)',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[a-zA-Z0-9 ._-]+$',
						errorMessage: 'Description must contain only alphanumeric characters, spaces, dots, underscores, and hyphens',
					},
				},
			],
		},
	},
	{
		displayName: 'Rule Content',
		name: 'rule',
		type: 'string',
		default: '',
		placeholder: 'Enter the rule content (YARA, Sigma, or osquery)',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update'],
			},
		},
		typeOptions: {
			rows: 10,
		},
		required: true,
		description: 'The rule content based on the selected engine (YARA, Sigma, or osquery)',
	},
	{
		displayName: 'Engine',
		name: 'engine',
		type: 'options',
		default: 'yara',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'YARA',
				value: 'yara',
			},
			{
				name: 'Sigma',
				value: 'sigma',
			},
			{
				name: 'Osquery',
				value: 'osquery',
			},
		],
		required: true,
		description: 'The engine type for the triage rule',
	},
	{
		displayName: 'Search In',
		name: 'searchIn',
		type: 'options',
		default: 'both',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update'],
				engine: ['yara'],
			},
		},
		options: [
			{
				name: 'File System',
				value: 'filesystem',
			},
			{
				name: 'Memory',
				value: 'memory',
			},
			{
				name: 'Both',
				value: 'both',
			}
		],
		required: true,
		description: 'Where to search when running the triage rule',
	},
	{
		displayName: 'Organization IDs',
		name: 'organizationIdsArray',
		type: 'string',
		default: '0',
		placeholder: 'Enter organization IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Organization IDs for this triage rule (comma-separated). Use "0" for all organizations.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Description Filter',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Filter triage rules by description',
			},
			{
				displayName: 'Engines Filter',
				name: 'engines',
				type: 'multiOptions',
				default: [],
				description: 'Filter by engine types',
				options: [
					{
						name: 'YARA',
						value: 'yara',
					},
					{
						name: 'Sigma',
						value: 'sigma',
					},
					{
						name: 'Osquery',
						value: 'osquery',
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
				default: 10,
				description: 'How many results to return per page',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Search In Filter',
				name: 'searchIn',
				type: 'multiOptions',
				default: [],
				description: 'Filter by search location',
				options: [
					{
						name: 'File System',
						value: 'filesystem',
					},
					{
						name: 'Memory',
						value: 'memory',
					},
					{
						name: 'Both',
						value: 'both',
					},
					{
						name: 'Event Records',
						value: 'event-records',
					},
				],
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter triage rules',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'createdAt',
				description: 'Attribute name to order the responses by',
				options: [
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Description',
						value: 'description',
					},
					{
						name: 'Search In',
						value: 'searchIn',
					},
					{
						name: 'Upload Date',
						value: 'uploadDate',
					},
				],
			},
			{
				displayName: 'Sort Type',
				name: 'sortType',
				type: 'options',
				default: 'ASC',
				description: 'Sort order',
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
				resource: ['triagerules'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '0',
				placeholder: 'Enter organization IDs (comma-separated)',
				description: 'Organization IDs to filter triage rules by when using "From List" selection. Use "0" to retrieve rules that are visible to all organizations.',
			},
		],
	},
];

export function extractTriageRuleId(triageRule: any): string {
	return extractEntityId(triageRule, '_id');
}

export function isValidTriageRule(triageRule: any): boolean {
	return isValidEntity(triageRule, ['_id']);
}

export async function fetchAllTriageRules(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationIds: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		const allTriageRules: any[] = [];
		let currentPage = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			const queryParams: Record<string, string | number> = {
				'pageNumber': currentPage,
				'pageSize': pageSize,
				'filter[organizationIds]': organizationIds,
			};

			if (searchFilter) {
				queryParams['filter[searchTerm]'] = searchFilter;
			}

			const options = buildRequestOptions(
				credentials,
				'GET',
				'/api/public/triages/rules',
				queryParams
			);

			const responseData = await context.helpers.httpRequest(options);
			validateApiResponse(responseData);

			const entities = responseData.result?.entities || [];
			allTriageRules.push(...entities);

			// Check if there are more pages
			const totalPageCount = responseData.result?.totalPageCount || 1;
			hasMorePages = currentPage < totalPageCount;
			currentPage++;
		}

		return allTriageRules;
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to fetch triage rules');
	}
}

export function buildTriageRuleQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {
		'filter[organizationIds]': organizationIds,
	};

	if (additionalFields.description) {
		queryParams['filter[description]'] = additionalFields.description;
	}

	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}

	if (additionalFields.searchIn && additionalFields.searchIn.length > 0) {
		queryParams['filter[searchIn]'] = additionalFields.searchIn.join(',');
	}

	if (additionalFields.engines && additionalFields.engines.length > 0) {
		queryParams['filter[engines]'] = additionalFields.engines.join(',');
	}

	if (additionalFields.pageNumber) {
		queryParams['pageNumber'] = additionalFields.pageNumber;
	}

	if (additionalFields.pageSize) {
		queryParams['pageSize'] = additionalFields.pageSize;
	}

	if (additionalFields.sortBy) {
		queryParams['sortBy'] = additionalFields.sortBy;
	}

	if (additionalFields.sortType) {
		queryParams['sortType'] = additionalFields.sortType;
	}

	return queryParams;
}

export async function getTriageRules(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Get organization IDs from additional fields if available, default to '0'
		let organizationIds = '0';
		try {
			const currentNodeParameters = this.getCurrentNodeParameters();
			const additionalFields = currentNodeParameters?.additionalFields as any;
			if (additionalFields?.organizationIds) {
				organizationIds = additionalFields.organizationIds;
			}
		} catch (error) {
			// If we can't get the current node parameters, use default
			organizationIds = '0';
		}

		const triageRules = await fetchAllTriageRules(this, credentials, organizationIds, filter);

		return createListSearchResults(
			triageRules,
			isValidTriageRule,
			(rule: any) => ({
				name: rule.description || rule._id || 'Unknown Rule',
				value: extractTriageRuleId(rule),
				url: rule.url || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load triage rules for selection');
	}
}

export async function getTriageRulesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const triageRules = await fetchAllTriageRules(this, credentials, '0');

		return createLoadOptions(
			triageRules,
			isValidTriageRule,
			(rule) => {
				const ruleId = extractTriageRuleId(rule);
				const name = rule.description || rule._id || `Rule ${ruleId || 'Unknown'}`;

				return {
					name,
					value: ruleId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load triage rules options');
	}
}

export async function executeTriageRules(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'getAll') {
				const organizationIds = this.getNodeParameter('organizationIds', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;
				const queryParams = buildTriageRuleQueryParams(organizationIds, additionalFields);

				const options = buildRequestOptions(
					credentials,
					'GET',
					'/api/public/triages/rules',
					queryParams
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				const entities = responseData.result?.entities || [];
				const paginationInfo = extractSimplifiedPaginationInfo(responseData.result);

				// Process entities with simplified pagination attached to each entity
				processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);
			} else if (operation === 'get') {
				const triageRuleResource = this.getNodeParameter('triageRuleId', i) as any;
				let triageRuleId: string;

				if (triageRuleResource.mode === 'list' || triageRuleResource.mode === 'id') {
					triageRuleId = triageRuleResource.value;
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid triage rule selection mode', {
						itemIndex: i,
					});
				}

				// Validate triage rule ID
				try {
					triageRuleId = requireValidId(triageRuleId, 'Triage Rule ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				const options = buildRequestOptions(
					credentials,
					'GET',
					`/api/public/triages/rules/${triageRuleId}`
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData);

				// Handle the response
				let triageRuleData;

				if (responseData.result?.entities && Array.isArray(responseData.result.entities)) {
					// If the result is an array, take the first item
					triageRuleData = responseData.result.entities[0];
				} else if (responseData.result) {
					// If the result is the triage rule object directly
					triageRuleData = responseData.result;
				} else {
					throw new NodeOperationError(this.getNode(), 'Unexpected response format from API', {
						itemIndex: i,
					});
				}

				if (!triageRuleData) {
					throw new NodeOperationError(this.getNode(), 'Triage rule not found', {
						itemIndex: i,
					});
				}

				returnData.push({
					json: triageRuleData,
					pairedItem: i,
				});
			} else if (operation === 'create') {
				const description = this.getNodeParameter('description', i) as string;
				const rule = this.getNodeParameter('rule', i) as string;
				const engine = this.getNodeParameter('engine', i) as string;
				const organizationIdsArray = this.getNodeParameter('organizationIdsArray', i) as string;

				// Get searchIn only if engine is 'yara'
				let searchIn: string | undefined;
				if (engine === 'yara') {
					searchIn = this.getNodeParameter('searchIn', i) as string;
				}

				// Validate required fields
				const trimmedDescription = description.trim();
				if (!trimmedDescription) {
					throw new NodeOperationError(this.getNode(), 'Description cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				const trimmedRule = rule.trim();
				if (!trimmedRule) {
					throw new NodeOperationError(this.getNode(), 'Rule content cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				// Parse organization IDs
				let organizationIds: number[];
				try {
					organizationIds = organizationIdsArray.split(',')
						.map(id => {
							const trimmed = id.trim();
							const parsed = parseInt(trimmed, 10);
							if (isNaN(parsed)) {
								throw new Error(`Invalid organization ID: ${trimmed}`);
							}
							return parsed;
						});
				} catch (error) {
					throw new NodeOperationError(this.getNode(),
						`Invalid organization IDs format: ${error.message}`, {
						itemIndex: i,
					});
				}

				// Build the request body
				const requestBody: any = {
					description: trimmedDescription,
					rule: trimmedRule,
					engine,
					organizationIds,
				};

				// Only include searchIn for YARA engine
				if (engine === 'yara' && searchIn) {
					requestBody.searchIn = searchIn;
				}

				const options = buildRequestOptions(
					credentials,
					'POST',
					'/api/public/triages/rules'
				);

				options.body = requestBody;

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData, 'Failed to create triage rule');

				returnData.push({
					json: responseData.result,
					pairedItem: i,
				});
			} else if (operation === 'update') {
				const triageRuleResource = this.getNodeParameter('triageRuleId', i) as any;
				const description = this.getNodeParameter('description', i) as string;
				const rule = this.getNodeParameter('rule', i) as string;
				const engine = this.getNodeParameter('engine', i) as string;
				const organizationIdsArray = this.getNodeParameter('organizationIdsArray', i) as string;

				// Get searchIn only if engine is 'yara'
				let searchIn: string | undefined;
				if (engine === 'yara') {
					searchIn = this.getNodeParameter('searchIn', i) as string;
				}

				let triageRuleId: string;

				if (triageRuleResource.mode === 'list' || triageRuleResource.mode === 'id') {
					triageRuleId = triageRuleResource.value;
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid triage rule selection mode', {
						itemIndex: i,
					});
				}

				// Validate triage rule ID
				try {
					triageRuleId = requireValidId(triageRuleId, 'Triage Rule ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				// Validate required fields
				const trimmedDescription = description.trim();
				if (!trimmedDescription) {
					throw new NodeOperationError(this.getNode(), 'Description cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				const trimmedRule = rule.trim();
				if (!trimmedRule) {
					throw new NodeOperationError(this.getNode(), 'Rule content cannot be empty or whitespace', {
						itemIndex: i,
					});
				}

				// Parse organization IDs
				let organizationIds: number[];
				try {
					organizationIds = organizationIdsArray.split(',')
						.map(id => {
							const trimmed = id.trim();
							const parsed = parseInt(trimmed, 10);
							if (isNaN(parsed)) {
								throw new Error(`Invalid organization ID: ${trimmed}`);
							}
							return parsed;
						});
				} catch (error) {
					throw new NodeOperationError(this.getNode(),
						`Invalid organization IDs format: ${error.message}`, {
						itemIndex: i,
					});
				}

				// Build the request body
				const requestBody: any = {
					description: trimmedDescription,
					rule: trimmedRule,
					engine,
					organizationIds,
				};

				// Only include searchIn for YARA engine
				if (engine === 'yara' && searchIn) {
					requestBody.searchIn = searchIn;
				}

				const options = buildRequestOptions(
					credentials,
					'PUT',
					`/api/public/triages/rules/${triageRuleId}`
				);

				options.body = requestBody;

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData, 'Failed to update triage rule');

				returnData.push({
					json: responseData.result,
					pairedItem: i,
				});
			} else if (operation === 'delete') {
				const triageRuleResource = this.getNodeParameter('triageRuleId', i) as any;

				let triageRuleId: string;

				if (triageRuleResource.mode === 'list' || triageRuleResource.mode === 'id') {
					triageRuleId = triageRuleResource.value;
				} else {
					throw new NodeOperationError(this.getNode(), 'Invalid triage rule selection mode', {
						itemIndex: i,
					});
				}

				// Validate triage rule ID
				try {
					triageRuleId = requireValidId(triageRuleId, 'Triage Rule ID');
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.message, {
						itemIndex: i,
					});
				}

				const options = buildRequestOptions(
					credentials,
					'DELETE',
					`/api/public/triages/rules/${triageRuleId}`
				);

				const responseData = await this.helpers.httpRequest(options);
				validateApiResponse(responseData, 'Failed to delete triage rule');

				returnData.push({
					json: {
						success: true,
						deleted: true,
						id: triageRuleId,
						message: 'Triage rule deleted successfully'
					},
					pairedItem: i,
				});
			}

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
