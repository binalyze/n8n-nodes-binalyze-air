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
import { api as triageRulesApi } from '../api/triagerules/triagerules';
import { findOrganizationByName } from './organizations';

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
				name: 'Create Triage Rule',
				value: 'create',
				description: 'Create a new triage rule',
				action: 'Create a triage rule',
			},
			{
				name: 'Create Triage Rule Tag',
				value: 'createTag',
				description: 'Create a new rule tag',
				action: 'Create a tag',
			},
			{
				name: 'Delete Triage Rule',
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
				name: 'Get Triage Rule Tags',
				value: 'getRuleTags',
				description: 'Retrieve rule tags',
				action: 'Get rule tags',
			},
			{
				name: 'Update Triage Rule',
				value: 'update',
				description: 'Update a triage rule',
				action: 'Update a triage rule',
			},
			{
				name: 'Validate Triage Rule',
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
		displayName: 'Rule Engine',
		name: 'engine',
		type: 'options',
		default: 'yara',
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['create', 'update', 'validate'],
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
		displayName: 'Rule Description',
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
				name: 'File System & Memory',
				value: 'both',
			}
		],
		required: true,
		description: 'Where to search when running the triage rule',
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
				description: 'Organization for this triage rule. Use "0" for all organizations.',
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
				displayName: 'Rule Tag IDs',
				name: 'tagIds',
				type: 'string',
				default: '',
				placeholder: 'Enter tag IDs (comma-separated)',
				description: 'Optional comma-separated list of tag IDs to associate with this triage rule',
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
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter: Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Filter triage rules by description',
			},
			{
				displayName: 'Filter: Engines',
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
				displayName: 'Filter: Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter triage rules',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter triage rules by. Use "0" to retrieve rules that are visible to all organizations.',
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
				resource: ['triagerules'],
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
				description: 'Organization to filter triage rules by when using "From List" selection. Use "0" to retrieve rules that are visible to all organizations.',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization for this triage rule. Use "0" for all organizations.',
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
				displayName: 'Filter: Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				description: 'Filter by group full path',
			},
			{
				displayName: 'Filter: Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				description: 'Filter by group ID',
			},
			{
				displayName: 'Filter: IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'Filter by IP address',
			},
			{
				displayName: 'Filter: Isolation Status',
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
				displayName: 'Filter: Issue',
				name: 'issue',
				type: 'string',
				default: '',
				description: 'Filter by issue',
			},
			{
				displayName: 'Filter: Managed Status',
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
				displayName: 'Filter: Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by endpoint name',
			},
			{
				displayName: 'Filter: Online Status',
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
				displayName: 'Filter: Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Filter by organization',
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
				displayName: 'Filter: Platform',
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
				displayName: 'Filter: Policy',
				name: 'policy',
				type: 'string',
				default: '',
				description: 'Filter by policy',
			},
			{
				displayName: 'Filter: Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter tags (comma-separated)',
				description: 'Filter by tags',
			},
			{
				displayName: 'Filter: Version',
				name: 'version',
				type: 'string',
				default: '',
				description: 'Filter by version',
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
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter endpoints',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['triagerules'],
				operation: ['createTag'],
			},
		},
		options: [
			{
				displayName: 'Organization',
				name: 'tagOrganizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization for the tag (use 0 for all organizations)',
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
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter rule tags by. Use 0 to retrieve tags that are visible to all organizations.',
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
				displayName: 'Filter: Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter rule tags',
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

export function extractTriageTagId(triageTag: any): string {
	return extractEntityId(triageTag, '_id');
}

export function isValidTriageTag(triageTag: any): boolean {
	return isValidEntity(triageTag, ['name']);
}

export async function fetchAllTriageTags(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationId: string = '0',
	searchFilter?: string
): Promise<any[]> {
	try {
		const response = await triageRulesApi.getTriageTags(context, credentials, organizationId, searchFilter);
		return response.result || [];
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to fetch triage tags');
	}
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

		const response = await triageRulesApi.getTriageRules(context, credentials, organizationIds, queryParams);
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

		// Get organization ID from additional fields if available, default to '0'
		let organizationId = '0';
		try {
			const currentNodeParameters = this.getCurrentNodeParameters();
			const additionalFields = currentNodeParameters?.additionalFields as any;
			if (additionalFields?.organizationId) {
				const organizationResource = additionalFields.organizationId;
				let orgIdString: string;

				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					orgIdString = organizationResource.value;
				} else {
					// For name mode, fallback to default since we can't resolve names in load options context
					orgIdString = '0';
				}

				organizationId = requireValidId(orgIdString, 'Organization ID');
			}
		} catch (error) {
			// If we can't get the current node parameters, use default
			organizationId = '0';
		}

		// Build query parameters with search filter
		const queryParams: Record<string, string | number> = {
			'filter[organizationIds]': organizationId
		};

		if (filter) {
			queryParams['filter[searchTerm]'] = filter;
		}

		const response = await triageRulesApi.getTriageRules(this, credentials, organizationId, queryParams);
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

		const response = await triageRulesApi.getTriageRules(this, credentials, '0', queryParams);
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

export async function getTriageTags(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Get organization ID from current node parameters if available, default to '0'
		let organizationId = '0';
		try {
			const currentNodeParameters = this.getCurrentNodeParameters();
			const organizationResource = currentNodeParameters?.organizationId as any;
			if (organizationResource) {
				if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
					organizationId = organizationResource.value;
				} else if (organizationResource.mode === 'name') {
					// For name mode, fallback to default since we can't resolve names in load options context
					organizationId = '0';
				}

				// Validate the organization ID
				try {
					organizationId = requireValidId(organizationId, 'Organization ID');
				} catch (error) {
					// If validation fails, use default
					organizationId = '0';
				}
			}
		} catch (error) {
			// If we can't get the current node parameters, use default
			organizationId = '0';
		}

		// Get searchTerm from filter parameter
		const searchTerm = filter || undefined;

		const response = await triageRulesApi.getTriageTags(this, credentials, organizationId, searchTerm);
		const tags = response.result || [];

		return createListSearchResults(
			tags,
			(tag: any) => tag && typeof tag === 'object' && tag._id && tag.name,
			(tag: any) => ({
				name: tag.name,
				value: tag._id
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load triage tags for selection');
	}
}

export async function getTriageTagsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);

		// Use default organization ID for all tags
		const organizationId = '0';

		const response = await triageRulesApi.getTriageTags(this, credentials, organizationId);
		const tags = response.result || [];

		return createLoadOptions(
			tags,
			isValidTriageTag,
			(tag) => {
				const tagId = extractTriageTagId(tag);
				const name = tag.name || tag._id || `Tag ${tagId || 'Unknown'}`;

				return {
					name,
					value: tagId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'Failed to load triage tags options');
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
							organizationId = requireValidId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Build query parameters from additionalFields
					const queryParams = buildTriageRuleQueryParams(organizationId, additionalFields);

					// Use the new API method with query parameters
					const responseData = await triageRulesApi.getTriageRules(this, credentials, organizationId, queryParams);

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
					const responseData = await triageRulesApi.getTriageRuleById(this, credentials, triageRuleId);

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
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Get optional tag IDs from additional fields
					let tagIds: string[] | undefined;
					try {
						const tagIdsString = additionalFields.tagIds as string;
						if (tagIdsString && tagIdsString.trim()) {
							tagIds = tagIdsString.split(',').map(id => id.trim()).filter(id => id.length > 0);
						}
					} catch (error) {
						// Tag IDs are optional, so we can continue without them
						tagIds = undefined;
					}

					// Get searchIn based on engine type
					let searchIn: string;
					if (engine === 'yara') {
						searchIn = this.getNodeParameter('searchIn', i) as string;
					} else if (engine === 'osquery') {
						searchIn = 'system';
					} else if (engine === 'sigma') {
						searchIn = 'event-records';
					} else {
						// Fallback for unknown engines
						throw new NodeOperationError(this.getNode(), `Invalid triage engine ${engine}`, {
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

						// Validate and convert organization ID
						try {
							organizationId = requireValidId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Convert to array for API compatibility
					const organizationIds: number[] = [parseInt(organizationId, 10)];

					// Build the request data
					const requestData: any = {
						description: trimmedDescription,
						rule: trimmedRule,
						engine,
						organizationIds,
						searchIn,
					};

					// Add tag IDs if provided
					if (tagIds && tagIds.length > 0) {
						requestData.tagIds = tagIds;
					}

					try {
						// Use the new API method
						const responseData = await triageRulesApi.createTriageRule(this, credentials, requestData);

						// Check if the response indicates success
						if (responseData.success) {
							returnData.push({
								json: responseData.result as any,
								pairedItem: i,
							});
						} else {
							// Handle API error responses
							returnData.push({
								json: {
									success: false,
									error: true,
									message: 'Failed to create triage rule',
									errors: responseData.errors || [],
									statusCode: responseData.statusCode || 400,
									result: responseData.result || null
								},
								pairedItem: i,
							});
						}
					} catch (error: any) {
						// Handle validation errors and other exceptions
						if (error.response?.data) {
							const errorData = error.response.data;
							returnData.push({
								json: {
									success: false,
									error: true,
									message: errorData.message || 'Failed to create triage rule',
									errors: errorData.errors || [error.message || 'Unknown validation error'],
									statusCode: errorData.statusCode || error.response.status,
									result: errorData.result || null
								},
								pairedItem: i,
							});
						} else {
							// Handle other types of errors (like validation errors in the message)
							returnData.push({
								json: {
									success: false,
									error: true,
									message: 'Failed to create triage rule',
									errors: [error.message || 'Unknown error occurred during rule creation'],
									statusCode: error.statusCode || 500,
									result: null
								},
								pairedItem: i,
							});
						}
					}
					break;
				}

				case 'update': {
					const triageRuleResource = this.getNodeParameter('triageRuleId', i) as any;
					const description = this.getNodeParameter('description', i) as string;
					const rule = this.getNodeParameter('rule', i) as string;
					const engine = this.getNodeParameter('engine', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Get searchIn based on engine type
					let searchIn: string;
					if (engine === 'yara') {
						searchIn = this.getNodeParameter('searchIn', i) as string;
					} else if (engine === 'osquery') {
						searchIn = 'system';
					} else if (engine === 'sigma') {
						searchIn = 'event-records';
					} else {
						// Fallback for unknown engines
						throw new NodeOperationError(this.getNode(), `Invalid triage engine ${engine}`, {
							itemIndex: i,
						});
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

						// Validate and convert organization ID
						try {
							organizationId = requireValidId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Convert to array for API compatibility
					const organizationIds: number[] = [parseInt(organizationId, 10)];

					// Build the request data
					const requestData: any = {
						description: trimmedDescription,
						rule: trimmedRule,
						organizationIds,
						searchIn,
					};

					try {
						// Use the new API method
						const responseData = await triageRulesApi.updateTriageRule(this, credentials, triageRuleId, requestData);

						// Check if the response indicates success
						if (responseData.success) {
							returnData.push({
								json: responseData.result as any,
								pairedItem: i,
							});
						} else {
							// Handle API error responses
							returnData.push({
								json: {
									success: false,
									error: true,
									message: 'Failed to update triage rule',
									errors: responseData.errors || [],
									statusCode: responseData.statusCode || 400,
									result: responseData.result || null
								},
								pairedItem: i,
							});
						}
					} catch (error: any) {
						// Handle validation errors and other exceptions
						if (error.response?.data) {
							const errorData = error.response.data;
							returnData.push({
								json: {
									success: false,
									error: true,
									message: errorData.message || 'Failed to update triage rule',
									errors: errorData.errors || [error.message || 'Unknown validation error'],
									statusCode: errorData.statusCode || error.response.status,
									result: errorData.result || null
								},
								pairedItem: i,
							});
						} else {
							// Handle other types of errors (like validation errors in the message)
							returnData.push({
								json: {
									success: false,
									error: true,
									message: 'Failed to update triage rule',
									errors: [error.message || 'Unknown error occurred during rule update'],
									statusCode: error.statusCode || 500,
									result: null
								},
								pairedItem: i,
							});
						}
					}
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
					await triageRulesApi.deleteTriageRule(this, credentials, triageRuleId);

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
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Validate required fields
					if (!tagName) {
						throw new NodeOperationError(this.getNode(), 'Tag name cannot be empty', {
							itemIndex: i,
						});
					}

					// Handle organization resource locator from additional fields
					let organizationId: string = '0'; // Default to all organizations

					if (additionalFields.tagOrganizationId) {
						const tagOrganizationResource = additionalFields.tagOrganizationId;
						let orgIdString: string;

						if (tagOrganizationResource.mode === 'list' || tagOrganizationResource.mode === 'id') {
							orgIdString = tagOrganizationResource.value;
						} else if (tagOrganizationResource.mode === 'name') {
							try {
								orgIdString = await findOrganizationByName(this, credentials, tagOrganizationResource.value);
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
							organizationId = requireValidId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Convert to number for API compatibility
					const tagOrganizationId = parseInt(organizationId, 10);

					// Use the new API method
					const responseData = await triageRulesApi.createTriageTag(this, credentials, tagName, tagOrganizationId);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'getRuleTags': {
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

						// Validate and convert organization ID
						try {
							organizationId = requireValidId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Get searchTerm from additionalFields
					const searchTerm = additionalFields.searchTerm || undefined;

					// Use the new API method
					const responseData = await triageRulesApi.getTriageTags(this, credentials, organizationId, searchTerm);

					const entities = responseData.result || [];

					// Process entities (NO PAGINATION in this API endpoint)
					processApiResponseEntities(entities, returnData, i);
					break;
				}

				case 'validate': {
					const rule = this.getNodeParameter('rule', i) as string;
					const engine = this.getNodeParameter('engine', i) as string;

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
						engine,
					};

					try {
						// Use the new API method
						const responseData = await triageRulesApi.validateTriageRule(this, credentials, requestData);

						returnData.push({
							json: {
								valid: responseData.success,
								errors: responseData.errors || [],
								message: responseData.success ? 'Rule is valid' : 'Rule validation failed',
								statusCode: responseData.statusCode,
								result: responseData.result
							},
							pairedItem: i,
						});
					} catch (error: any) {
						// Handle validation errors that come as API error responses
						if (error.response?.data) {
							const errorData = error.response.data;
							returnData.push({
								json: {
									valid: false,
									errors: errorData.errors || [error.message || 'Unknown validation error'],
									message: 'Rule validation failed',
									statusCode: errorData.statusCode || error.response.status,
									result: errorData.result || null
								},
								pairedItem: i,
							});
						} else {
							// Handle other types of errors
							returnData.push({
								json: {
									valid: false,
									errors: [error.message || 'Unknown error occurred during validation'],
									message: 'Rule validation failed',
									statusCode: error.statusCode || 500,
									result: null
								},
								pairedItem: i,
							});
						}
					}
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
							const validatedOrgId = requireValidId(orgIdString, 'Organization ID');
							filter.organizationIds = [parseInt(validatedOrgId, 10)];
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
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
					const responseData = await triageRulesApi.assignTriageTask(this, credentials, requestData);

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
