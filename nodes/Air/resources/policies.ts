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
import { api as policiesApi } from '../api/policies/policies';
import { findOrganizationByName } from './organizations';

export const PoliciesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['policies'],
			},
		},
		options: [
			{
				name: 'Create Policy',
				value: 'create',
				description: 'Create a new policy',
				action: 'Create a policy',
			},
			{
				name: 'Delete Policy',
				value: 'delete',
				description: 'Delete a policy',
				action: 'Delete a policy',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific policy',
				action: 'Get a policy',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many policies',
				action: 'Get many policies',
			},
			{
				name: 'Get Policy Match Stats',
				value: 'getMatchStats',
				description: 'Get policy match statistics by filter',
				action: 'Get policy match stats',
			},
			{
				name: 'Update Policies Priorities',
				value: 'updatePriorities',
				description: 'Update priorities of multiple policies',
				action: 'Update policies priorities',
			},
			{
				name: 'Update Policy',
				value: 'update',
				description: 'Update a policy',
				action: 'Update a policy',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Policy',
		name: 'policyId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a policy...',
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['get', 'update', 'delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a policy...',
				typeOptions: {
					searchListMethod: 'getPolicies',
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
							errorMessage: 'Not a valid policy ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter policy ID',
			},
		],
		required: true,
		description: 'The policy to operate on',
	},
	{
		displayName: 'Policy Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'Enter policy name',
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Name of the policy',
	},
	{
		displayName: 'Policy Description',
		name: 'description',
		type: 'string',
		default: '',
		placeholder: 'Enter policy description',
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Description of the policy',
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'number',
		default: 1,
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['create', 'update'],
			},
		},
		required: true,
		description: 'Priority of the policy (higher numbers have higher priority)',
		typeOptions: {
			minValue: 1,
		},
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['create', 'update'],
			},
		},
		description: 'Whether the policy is enabled',
	},
	{
		displayName: 'Policy Priorities',
		name: 'policyPriorities',
		type: 'string',
		default: '',
		placeholder: 'Enter policy priorities as JSON (e.g., [{"_id": "policy1", "priority": 1}])',
		displayOptions: {
			show: {
				resource: ['policies'],
				operation: ['updatePriorities'],
			},
		},
		required: true,
		description: 'JSON array of policy priorities with _id and priority fields',
		typeOptions: {
			rows: 4,
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
				resource: ['policies'],
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
				description: 'Organization for this policy. Use "0" for all organizations.',
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
				displayName: 'Rules',
				name: 'rules',
				type: 'string',
				default: '',
				placeholder: 'Enter policy rules as JSON array',
				description: 'JSON array of policy rules',
				typeOptions: {
					rows: 4,
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
				resource: ['policies'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter By Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Filter policies by description',
			},
			{
				displayName: 'Filter By Enabled Status',
				name: 'enabled',
				type: 'options',
				default: '',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Enabled',
						value: 'true',
					},
					{
						name: 'Disabled',
						value: 'false',
					},
				],
			},
			{
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter policies by name',
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter policies',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter policies by. Use "0" to retrieve policies that are visible to all organizations.',
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
				resource: ['policies'],
				operation: ['getMatchStats'],
			},
		},
		options: [
			{
				displayName: 'Filter By Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Comma-separated list of endpoint IDs to exclude from the filter',
			},
			{
				displayName: 'Filter By Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter By Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter By Included Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint IDs (comma-separated)',
				description: 'Comma-separated list of endpoint IDs to include in the filter',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter By Issue',
				name: 'issue',
				type: 'string',
				default: '',
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
						value: 'not-isolated',
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
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by endpoint name',
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
						name: 'Linux',
						value: 'linux',
					},
					{
						name: 'macOS',
						value: 'macos',
					},
				],
			},
			{
				displayName: 'Filter By Policy',
				name: 'policy',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter endpoints',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter tags (comma-separated)',
				description: 'Comma-separated list of tags to filter by',
			},
			{
				displayName: 'Filter By Version',
				name: 'version',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter policies by. Use "0" to include all organizations.',
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

export function extractPolicyId(policy: any): string {
	return extractEntityId(policy, 'Policy');
}

export function isValidPolicy(policy: any): boolean {
	return isValidEntity(policy, ['_id', 'name']);
}

export async function fetchAllPolicies(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationIds: string = '0',
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		// Build query parameters with page size
		const queryParams: Record<string, string | number> = {
			'filter[pageSize]': pageSize,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const response = await policiesApi.getPolicies(context, credentials, organizationIds, queryParams);
		return response.result?.entities || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch policies for options');
	}
}

export function buildPolicyQueryParams(organizationIds: string, additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	// Always include organizationIds
	queryParams['filter[organizationIds]'] = organizationIds;

	// Add pagination parameters
	if (additionalFields.pageNumber) {
		queryParams['filter[currentPage]'] = additionalFields.pageNumber;
	}

	if (additionalFields.pageSize) {
		queryParams['filter[pageSize]'] = additionalFields.pageSize;
	}

	// Add search and filter parameters
	if (additionalFields.searchTerm) {
		queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	}

	if (additionalFields.name) {
		queryParams['filter[name]'] = additionalFields.name;
	}

	if (additionalFields.description) {
		queryParams['filter[description]'] = additionalFields.description;
	}

	if (additionalFields.enabled !== undefined && additionalFields.enabled !== '') {
		queryParams['filter[enabled]'] = additionalFields.enabled;
	}

	return queryParams;
}

// ===== LIST SEARCH METHODS =====

export async function getPolicies(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Set a reasonable page size for search
		const policies = await fetchAllPolicies(this, credentials, '0', searchTerm, 50);

		return createListSearchResults(
			policies,
			isValidPolicy,
			(policy) => ({
				name: policy.name,
				value: extractPolicyId(policy),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'search policies');
	}
}

// ===== LOAD OPTIONS METHODS =====

export async function getPoliciesOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);
		const policies = await fetchAllPolicies(this, credentials);

		return createLoadOptions(
			policies,
			isValidPolicy,
			(policy) => ({
				name: policy.name,
				value: extractPolicyId(policy),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load policy options');
	}
}

// ===== EXECUTE FUNCTION =====

export async function executePolicies(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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
					const queryParams = buildPolicyQueryParams(organizationId, additionalFields);

					// Use the API method with query parameters
					const responseData = await policiesApi.getPolicies(this, credentials, organizationId, queryParams);

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
					const policyResource = this.getNodeParameter('policyId', i) as any;
					let policyId: string;

					if (policyResource.mode === 'list' || policyResource.mode === 'id') {
						policyId = policyResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid policy selection mode', {
							itemIndex: i,
						});
					}

					// Validate policy ID
					try {
						policyId = normalizeAndValidateId(policyId, 'Policy ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Use the API method
					const responseData = await policiesApi.getPolicyById(this, credentials, policyId);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'create': {
					const name = this.getNodeParameter('name', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const priority = this.getNodeParameter('priority', i) as number;
					const enabled = this.getNodeParameter('enabled', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Validate required fields
					const trimmedName = name.trim();
					if (!trimmedName) {
						throw new NodeOperationError(this.getNode(), 'Policy name cannot be empty or whitespace', {
							itemIndex: i,
						});
					}

					const trimmedDescription = description.trim();
					if (!trimmedDescription) {
						throw new NodeOperationError(this.getNode(), 'Description cannot be empty or whitespace', {
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
							organizationId = normalizeAndValidateId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Convert to array for API compatibility
					const organizationIds: number[] = [parseInt(organizationId, 10)];

					// Handle rules if provided
					let rules: any[] | undefined;
					if (additionalFields.rules) {
						try {
							rules = JSON.parse(additionalFields.rules);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON format for rules', {
								itemIndex: i,
							});
						}
					}

					// Build the request data
					const requestData: any = {
						name: trimmedName,
						description: trimmedDescription,
						priority,
						enabled,
						organizationIds,
					};

					// Add rules if provided
					if (rules) {
						requestData.rules = rules;
					}

					// Use the API method
					const responseData = await policiesApi.createPolicy(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'update': {
					const policyResource = this.getNodeParameter('policyId', i) as any;
					const name = this.getNodeParameter('name', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const priority = this.getNodeParameter('priority', i) as number;
					const enabled = this.getNodeParameter('enabled', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					let policyId: string;

					if (policyResource.mode === 'list' || policyResource.mode === 'id') {
						policyId = policyResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid policy selection mode', {
							itemIndex: i,
						});
					}

					// Validate policy ID
					try {
						policyId = normalizeAndValidateId(policyId, 'Policy ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Validate required fields
					const trimmedName = name.trim();
					if (!trimmedName) {
						throw new NodeOperationError(this.getNode(), 'Policy name cannot be empty or whitespace', {
							itemIndex: i,
						});
					}

					const trimmedDescription = description.trim();
					if (!trimmedDescription) {
						throw new NodeOperationError(this.getNode(), 'Description cannot be empty or whitespace', {
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
							organizationId = normalizeAndValidateId(orgIdString, 'Organization ID');
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Convert to array for API compatibility
					const organizationIds: number[] = [parseInt(organizationId, 10)];

					// Handle rules if provided
					let rules: any[] | undefined;
					if (additionalFields.rules) {
						try {
							rules = JSON.parse(additionalFields.rules);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON format for rules', {
								itemIndex: i,
							});
						}
					}

					// Build the request data
					const requestData: any = {
						name: trimmedName,
						description: trimmedDescription,
						priority,
						enabled,
						organizationIds,
					};

					// Add rules if provided
					if (rules) {
						requestData.rules = rules;
					}

					// Use the API method
					const responseData = await policiesApi.updatePolicy(this, credentials, policyId, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'delete': {
					const policyResource = this.getNodeParameter('policyId', i) as any;

					let policyId: string;

					if (policyResource.mode === 'list' || policyResource.mode === 'id') {
						policyId = policyResource.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid policy selection mode', {
							itemIndex: i,
						});
					}

					// Validate policy ID
					try {
						policyId = normalizeAndValidateId(policyId, 'Policy ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Use the API method
					await policiesApi.deletePolicy(this, credentials, policyId);

					returnData.push({
						json: {
							success: true,
							deleted: true,
							id: policyId,
							message: 'Policy deleted successfully'
						},
						pairedItem: i,
					});
					break;
				}

				case 'updatePriorities': {
					const policyPriorities = this.getNodeParameter('policyPriorities', i) as string;

					// Validate and parse policy priorities JSON
					let policies: Array<{ _id: string; priority: number }>;
					try {
						policies = JSON.parse(policyPriorities);
						if (!Array.isArray(policies)) {
							throw new Error('Policy priorities must be an array');
						}

						// Validate each policy object
						for (const policy of policies) {
							if (!policy._id || typeof policy.priority !== 'number') {
								throw new Error('Each policy must have _id (string) and priority (number) fields');
							}
						}
					} catch (error) {
						throw new NodeOperationError(this.getNode(),
							`Invalid JSON format for policy priorities: ${error.message}`, {
							itemIndex: i,
						});
					}

					// Build the request data
					const requestData = {
						policies,
					};

					// Use the API method
					const responseData = await policiesApi.updatePoliciesPriorities(this, credentials, requestData);

					returnData.push({
						json: responseData.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'getMatchStats': {
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

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
							const validatedOrgId = normalizeAndValidateId(orgIdString, 'Organization ID');
							filter.organizationIds = [parseInt(validatedOrgId, 10)];
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, {
								itemIndex: i,
							});
						}
					}

					// Build the request data
					const requestData = {
						filter,
					};

					// Use the API method
					const responseData = await policiesApi.getPolicyMatchStats(this, credentials, requestData);

					const entities = responseData.result || [];

					// Process entities (NO PAGINATION in this API endpoint)
					processApiResponseEntities(entities, returnData, i);
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
