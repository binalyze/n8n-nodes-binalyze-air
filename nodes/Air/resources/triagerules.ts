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
	requireValidId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';
import { api as triagesApi } from '../api/triages/triages';
import { api as tagsApi } from '../api/triages/tags/tags';

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
				name: 'Assign Triage Task',
				value: 'assignTask',
				description: 'Assign a triage task',
				action: 'Assign a triage task',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new triage rule',
				action: 'Create a triage rule',
			},
			{
				name: 'Create Rule Tag',
				value: 'createTag',
				description: 'Create a new rule tag',
				action: 'Create a tag',
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
				name: 'Get Rule Tags',
				value: 'getRuleTags',
				description: 'Retrieve rule tags',
				action: 'Get rule tags',
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
			{
				name: 'Validate',
				value: 'validate',
				description: 'Validate a triage rule',
				action: 'Validate a triage rule',
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
		description: 'Description of the triage rule (you must use spaces, hyphens, underscores, at sign or alphanumeric characters)',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[a-zA-Z0-9 _@-]+$',
						errorMessage: 'Description must contain only alphanumeric characters, spaces, hyphens, underscores, and at sign (@)',
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
				operation: ['create', 'update', 'validate'],
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
	// Fields for Assign Triage Task operation
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		default: '',
		placeholder: 'Enter case ID',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['assignTask'],
			},
		},
		required: true,
		description: 'ID of the case to assign the triage task to',
	},
	{
		displayName: 'Triage Rule IDs',
		name: 'triageRuleIds',
		type: 'string',
		default: '',
		placeholder: 'Enter triage rule IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['assignTask'],
			},
		},
		required: true,
		description: 'Comma-separated list of triage rule IDs to assign',
	},
	{
		displayName: 'Task Choice',
		name: 'taskChoice',
		type: 'options',
		default: 'auto',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['assignTask'],
			},
		},
		options: [
			{
				name: 'Auto',
				value: 'auto',
			},
			{
				name: 'Manual',
				value: 'manual',
			},
		],
		required: true,
		description: 'Task configuration choice',
	},
	{
		displayName: 'Enable MITRE ATT&CK',
		name: 'mitreAttackEnabled',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['assignTask'],
			},
		},
		description: 'Whether to enable MITRE ATT&CK framework',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['assignTask'],
			},
		},
		options: [
			{
				displayName: 'Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Exclude specific endpoint IDs',
			},
			{
				displayName: 'Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				description: 'Filter by group full path',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				description: 'Filter by group ID',
			},
			{
				displayName: 'Included Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Include specific endpoint IDs',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'Filter by IP address',
			},
			{
				displayName: 'Isolation Status',
				name: 'isolationStatus',
				type: 'multiOptions',
				default: [],
				description: 'Filter by isolation status',
				options: [
					{ name: 'Isolated', value: 'isolated' },
					{ name: 'Not Isolated', value: 'not_isolated' },
				],
			},
			{
				displayName: 'Issue',
				name: 'issue',
				type: 'string',
				default: '',
				description: 'Filter by issue',
			},
			{
				displayName: 'Managed Status',
				name: 'managedStatus',
				type: 'multiOptions',
				default: [],
				description: 'Filter by managed status',
				options: [
					{ name: 'Managed', value: 'managed' },
					{ name: 'Unmanaged', value: 'unmanaged' },
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by endpoint name',
			},
			{
				displayName: 'Online Status',
				name: 'onlineStatus',
				type: 'multiOptions',
				default: [],
				description: 'Filter by online status',
				options: [
					{ name: 'Online', value: 'online' },
					{ name: 'Offline', value: 'offline' },
				],
			},
			{
				displayName: 'Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '',
				placeholder: 'Enter organization IDs (comma-separated)',
				description: 'Filter by organization IDs',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				description: 'Filter by platform',
				options: [
					{ name: 'Windows', value: 'windows' },
					{ name: 'Linux', value: 'linux' },
					{ name: 'MacOS', value: 'macos' },
				],
			},
			{
				displayName: 'Policy',
				name: 'policy',
				type: 'string',
				default: '',
				description: 'Filter by policy',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter endpoints',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter tags (comma-separated)',
				description: 'Filter by tags',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'Filter by version',
			},
		],
	},
	{
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'string',
		default: '',
		placeholder: 'Enter tag name',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['createTag'],
			},
		},
		required: true,
		description: 'Name of the tag to create',
	},
	{
		displayName: 'Organization ID',
		name: 'tagOrganizationId',
		type: 'number',
		default: 0,
		placeholder: 'Enter organization ID',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['createTag'],
			},
		},
		required: true,
		description: 'Organization ID for the tag (use 0 for all organizations)',
		typeOptions: {
			minValue: 0,
		},
	},
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'number',
		default: 0,
		placeholder: 'Enter organization ID',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['getRuleTags'],
			},
		},
		required: true,
		description: 'Organization ID to filter rule tags by (required by API). Use 0 to retrieve tags that are visible to all organizations.',
		typeOptions: {
			minValue: 0,
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
				resource: ['triagerules'],
				operation: ['getRuleTags'],
			},
		},
		options: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter rule tags',
			},
			{
				displayName: 'With Count',
				name: 'withCount',
				type: 'boolean',
				default: true,
				description: 'Whether to include count information in the response',
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
		// Build query parameters
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': organizationIds
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		if (pageSize) {
			queryParams['pageSize'] = pageSize;
		}

		const response = await triagesApi.getTriageRules(context, credentials, organizationIds, queryParams);
		return response.result?.entities || [];
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

		// Build query parameters
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': organizationIds
		};

		const response = await triagesApi.getTriageRules(this, credentials, organizationIds, queryParams);
		const triageRules = response.result?.entities || [];

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

		// Build query parameters
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': '0'
		};

		const response = await triagesApi.getTriageRules(this, credentials, '0', queryParams);
		const triageRules = response.result?.entities || [];

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

			switch (operation) {
				case 'getAll': {
					const organizationIds = this.getNodeParameter('organizationIds', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Build query parameters from additionalFields
					const queryParams = buildTriageRuleQueryParams(organizationIds, additionalFields);

					// Use the new API method with query parameters
					const responseData = await triagesApi.getTriageRules(this, credentials, organizationIds, queryParams);

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

					// Use the new API method
					const responseData = await triagesApi.getTriageRuleById(this, credentials, triageRuleId);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'create': {
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
					let organizationIds: (string | number)[];
					try {
						organizationIds = organizationIdsArray.split(',')
							.map(id => {
								const trimmed = id.trim();
								const parsed = parseInt(trimmed, 10);
								if (isNaN(parsed)) {
									return trimmed; // Keep as string if not a number
								}
								return parsed;
							});
					} catch (error) {
						throw new NodeOperationError(this.getNode(),
							`Invalid organization IDs format: ${error.message}`, {
							itemIndex: i,
						});
					}

					// Build the request data
					const requestData: any = {
						description: trimmedDescription,
						rule: trimmedRule,
						engine,
						organizationIds,
						searchIn: searchIn || 'both', // Default to 'both' if not specified
					};

					// Use the new API method
					const responseData = await triagesApi.createTriageRule(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'update': {
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
					let organizationIds: (string | number)[];
					try {
						organizationIds = organizationIdsArray.split(',')
							.map(id => {
								const trimmed = id.trim();
								const parsed = parseInt(trimmed, 10);
								if (isNaN(parsed)) {
									return trimmed; // Keep as string if not a number
								}
								return parsed;
							});
					} catch (error) {
						throw new NodeOperationError(this.getNode(),
							`Invalid organization IDs format: ${error.message}`, {
							itemIndex: i,
						});
					}

					// Build the request data
					const requestData: any = {
						description: trimmedDescription,
						rule: trimmedRule,
						searchIn: searchIn || 'both', // Default to 'both' if not specified
						organizationIds,
					};

					// Use the new API method
					const responseData = await triagesApi.updateTriageRule(this, credentials, triageRuleId, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'delete': {
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

					// Use the new API method
					await triagesApi.deleteTriageRule(this, credentials, triageRuleId);

					returnData.push({
						json: {
							success: true,
							deleted: true,
							id: triageRuleId,
							message: 'Triage rule deleted successfully'
						},
						pairedItem: i,
					});
					break;
				}

				case 'createTag': {
					const tagName = this.getNodeParameter('tagName', i) as string;
					const tagOrganizationId = this.getNodeParameter('tagOrganizationId', i) as number;

					// Validate required fields
					if (!tagName) {
						throw new NodeOperationError(this.getNode(), 'Tag name cannot be empty', {
							itemIndex: i,
						});
					}

					// Use the new API method
					const responseData = await tagsApi.createTriageTag(this, credentials, tagName, tagOrganizationId);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'getRuleTags': {
					const organizationId = this.getNodeParameter('organizationId', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Get withCount, defaulting to true if not specified
					const withCount = additionalFields.withCount !== undefined ? additionalFields.withCount : true;

					// Get searchTerm from additionalFields
					const searchTerm = additionalFields.searchTerm || undefined;

					// Use the new API method
					const responseData = await tagsApi.getTriageTags(this, credentials, organizationId.toString(), withCount, searchTerm);

					const entities = responseData.result || [];
					const paginationInfo = extractPaginationInfo(responseData.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'validate': {
					const rule = this.getNodeParameter('rule', i) as string;

					// Validate required fields
					const trimmedRule = rule.trim();
					if (!trimmedRule) {
						throw new NodeOperationError(this.getNode(), 'Rule content cannot be empty or whitespace', {
							itemIndex: i,
						});
					}

					// Build the request data
					const requestData = {
						rule: trimmedRule,
					};

					// Use the new API method
					const responseData = await triagesApi.validateTriageRule(this, credentials, requestData);

					returnData.push({
						json: {
							valid: responseData.success,
							errors: responseData.errors || [],
							message: responseData.success ? 'Rule is valid' : 'Rule validation failed'
						},
						pairedItem: i,
					});
					break;
				}

				case 'assignTask': {
					const caseId = this.getNodeParameter('caseId', i) as string;
					const triageRuleIds = this.getNodeParameter('triageRuleIds', i) as string;
					const taskChoice = this.getNodeParameter('taskChoice', i) as string;
					const mitreAttackEnabled = this.getNodeParameter('mitreAttackEnabled', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Validate required fields
					if (!caseId.trim()) {
						throw new NodeOperationError(this.getNode(), 'Case ID cannot be empty', {
							itemIndex: i,
						});
					}

					if (!triageRuleIds.trim()) {
						throw new NodeOperationError(this.getNode(), 'Triage rule IDs cannot be empty', {
							itemIndex: i,
						});
					}

					// Parse triage rule IDs
					const ruleIds = triageRuleIds.split(',').map(id => id.trim()).filter(id => id.length > 0);

					// Build filter object
					const filter: any = {};

					if (additionalFields.searchTerm) filter.searchTerm = additionalFields.searchTerm;
					if (additionalFields.name) filter.name = additionalFields.name;
					if (additionalFields.ipAddress) filter.ipAddress = additionalFields.ipAddress;
					if (additionalFields.groupId) filter.groupId = additionalFields.groupId;
					if (additionalFields.groupFullPath) filter.groupFullPath = additionalFields.groupFullPath;
					if (additionalFields.managedStatus && additionalFields.managedStatus.length > 0) {
						filter.managedStatus = additionalFields.managedStatus;
					}
					if (additionalFields.isolationStatus && additionalFields.isolationStatus.length > 0) {
						filter.isolationStatus = additionalFields.isolationStatus;
					}
					if (additionalFields.platform && additionalFields.platform.length > 0) {
						filter.platform = additionalFields.platform;
					}
					if (additionalFields.issue) filter.issue = additionalFields.issue;
					if (additionalFields.onlineStatus && additionalFields.onlineStatus.length > 0) {
						filter.onlineStatus = additionalFields.onlineStatus;
					}
					if (additionalFields.tags) {
						filter.tags = additionalFields.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
					}
					if (additionalFields.version) filter.version = additionalFields.version;
					if (additionalFields.policy) filter.policy = additionalFields.policy;
					if (additionalFields.includedEndpointIds) {
						filter.includedEndpointIds = additionalFields.includedEndpointIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
					}
					if (additionalFields.excludedEndpointIds) {
						filter.excludedEndpointIds = additionalFields.excludedEndpointIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
					}
					if (additionalFields.organizationIds) {
						filter.organizationIds = additionalFields.organizationIds.split(',').map((id: string) => {
							const trimmed = id.trim();
							const parsed = parseInt(trimmed, 10);
							return isNaN(parsed) ? trimmed : parsed;
						}).filter((id: string | number) => id !== '');
					}

					// Build the request data
					const requestData = {
						caseId: caseId.trim(),
						triageRuleIds: ruleIds,
						taskConfig: {
							choice: taskChoice,
						},
						mitreAttack: {
							enabled: mitreAttackEnabled,
						},
						filter,
					};

					// Use the new API method
					const responseData = await triagesApi.assignTriageTask(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
