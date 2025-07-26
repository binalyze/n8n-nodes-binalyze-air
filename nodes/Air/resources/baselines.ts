import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getAirCredentials,
	validateApiResponse,
	extractEntityId,
	isValidEntity,
	handleExecuteError,
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import {
	api as baselinesApi,
	BaselineAcquisitionRequest,
	BaselineComparisonRequest,
	BaselineResponse
} from '../api/baseline/baseline';

export const BaselinesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['baselines'],
			},
		},
		options: [
			{
				name: 'Acquire Baseline',
				value: 'acquireBaseline',
				description: 'Acquire baseline for endpoints',
				action: 'Acquire a baseline',
			},
			{
				name: 'Compare Baseline',
				value: 'compareBaseline',
				description: 'Compare baseline with task results',
				action: 'Compare a baseline',
			},
			{
				name: 'Get Comparison Report',
				value: 'getComparisonReport',
				description: 'Get baseline comparison report',
				action: 'Get comparison report',
			},
		],
		default: 'acquireBaseline',
	},
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select organization...',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['acquireBaseline'],
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
							errorMessage: 'Organization ID must be a number',
						},
					},
				],
				placeholder: 'Enter organization ID',
			},
		],
		required: true,
		description: 'The organization to use for baseline acquisition',
	},
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['acquireBaseline'],
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
		description: 'The case for baseline acquisition',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		default: '',
		placeholder: 'Enter endpoint ID',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['compareBaseline', 'getComparisonReport'],
			},
		},
		required: true,
		description: 'The ID of the endpoint',
	},
	{
		displayName: 'Task IDs',
		name: 'taskIds',
		type: 'string',
		default: '',
		placeholder: 'Enter task IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['compareBaseline'],
			},
		},
		required: true,
		description: 'Comma-separated list of task IDs to compare against baseline',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		placeholder: 'Enter task ID',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['getComparisonReport'],
			},
		},
		required: true,
		description: 'The ID of the task for the comparison report',
	},
	{
		displayName: 'Endpoint Filters (Required)',
		name: 'endpointFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['acquireBaseline'],
			},
		},
		required: true,
		description: 'At least one filter must be defined to target specific endpoints',
		options: [
			{
				displayName: 'Exclude Specific Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated endpoint IDs',
				description: 'Exclude specific endpoint IDs (comma-separated)',
			},
			{
				displayName: 'Filter By Endpoint Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Enter endpoint name',
				description: 'Filter endpoints by name',
			},
			{
				displayName: 'Filter By Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				placeholder: 'Enter group full path',
				description: 'Filter endpoints by group full path',
			},
			{
				displayName: 'Filter By Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				placeholder: 'Enter group ID',
				description: 'Filter endpoints by group ID',
			},
			{
				displayName: 'Filter By IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				placeholder: 'Enter IP address',
				description: 'Filter endpoints by IP address',
			},
			{
				displayName: 'Filter By Isolation Status',
				name: 'isolationStatus',
				type: 'multiOptions',
				default: [],
				placeholder: 'Select isolation status',
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
				description: 'Filter endpoints by isolation status',
			},
			{
				displayName: 'Filter By Issue',
				name: 'issue',
				type: 'string',
				default: '',
				placeholder: 'Enter issue',
				description: 'Filter endpoints by issue',
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
				description: 'Filter endpoints by management status',
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
				description: 'Filter endpoints by online status',
			},
			{
				displayName: 'Filter By Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated organization IDs',
				description: 'Filter endpoints by organization IDs (comma-separated)',
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
						value: 'darwin',
					},
				],
				description: 'Filter endpoints by platform',
			},
			{
				displayName: 'Filter By Policy',
				name: 'policy',
				type: 'string',
				default: '',
				placeholder: 'Enter policy',
				description: 'Filter endpoints by policy',
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				placeholder: 'Enter search term',
				description: 'Filter endpoints by search term',
			},
			{
				displayName: 'Filter By Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated tags',
				description: 'Filter endpoints by tags (comma-separated)',
			},
			{
				displayName: 'Filter By Version',
				name: 'version',
				type: 'string',
				default: '',
				placeholder: 'Enter version',
				description: 'Filter endpoints by version',
			},
			{
				displayName: 'Include Specific Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'Enter comma-separated endpoint IDs',
				description: 'Include specific endpoint IDs (comma-separated)',
			},
		],
	},
];

/**
 * Extract baseline ID from baseline object
 */
export function extractBaselineId(baseline: any): string {
	return extractEntityId(baseline, 'baseline');
}

/**
 * Validate that a baseline object has the required fields
 */
export function isValidBaseline(baseline: any): boolean {
	return isValidEntity(baseline, ['name']);
}

/**
 * Execute baseline operations
 */
export async function executeBaselines(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	try {
		// Get credentials
		const credentials = await getAirCredentials(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any;

				switch (operation) {
					case 'acquireBaseline':
						responseData = await executeAcquireBaseline.call(this, credentials, i);
						break;

					case 'compareBaseline':
						responseData = await executeCompareBaseline.call(this, credentials, i);
						break;

					case 'getComparisonReport':
						responseData = await executeGetComparisonReport.call(this, credentials, i);
						break;

					default:
						throw new Error(`The operation "${operation}" is not supported`);
				}

				// Add the response data to return data
				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

			} catch (error) {
				handleExecuteError(this, error, i, returnData);
			}
		}

		return [returnData];

	} catch (error) {
		const formattedError = catchAndFormatError(error, 'executeBaselines');
		throw formattedError;
	}
}

/**
 * Execute acquire baseline operation
 */
async function executeAcquireBaseline(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<BaselineResponse> {
	const organizationId = this.getNodeParameter('organizationId', itemIndex) as any;
	const caseId = this.getNodeParameter('caseId', itemIndex) as any;
	const endpointFilters = this.getNodeParameter('endpointFilters', itemIndex, {}) as any;

	// Validate required parameters
	const organizationIdValue = normalizeAndValidateId(organizationId.value || organizationId, 'Organization ID');
	const caseIdValue = normalizeAndValidateId(caseId.value || caseId, 'Case ID');

	// Validate that at least one endpoint filter is provided
	const hasFilter = Boolean(
		endpointFilters.searchTerm ||
		endpointFilters.name ||
		endpointFilters.ipAddress ||
		(endpointFilters.platform && endpointFilters.platform.length > 0) ||
		(endpointFilters.onlineStatus && endpointFilters.onlineStatus.length > 0) ||
		(endpointFilters.managedStatus && endpointFilters.managedStatus.length > 0) ||
		endpointFilters.tags ||
		endpointFilters.groupId ||
		endpointFilters.groupFullPath ||
		(endpointFilters.isolationStatus && endpointFilters.isolationStatus.length > 0) ||
		endpointFilters.issue ||
		endpointFilters.policy ||
		endpointFilters.version ||
		endpointFilters.organizationIds ||
		endpointFilters.includedEndpointIds ||
		endpointFilters.excludedEndpointIds ||
		organizationIdValue !== '0' // Organization selection counts as a filter
	);

	if (!hasFilter) {
		throw new NodeOperationError(this.getNode(), 'At least one endpoint filter must be provided for baseline acquisition', { itemIndex });
	}

	// Build filter object
	const filter: any = {};

	if (endpointFilters.searchTerm) filter.searchTerm = endpointFilters.searchTerm;
	if (endpointFilters.name) filter.name = endpointFilters.name;
	if (endpointFilters.ipAddress) filter.ipAddress = endpointFilters.ipAddress;
	if (endpointFilters.groupId) filter.groupId = endpointFilters.groupId;
	if (endpointFilters.groupFullPath) filter.groupFullPath = endpointFilters.groupFullPath;
	if (endpointFilters.managedStatus && endpointFilters.managedStatus.length > 0) {
		filter.managedStatus = endpointFilters.managedStatus;
	}
	if (endpointFilters.isolationStatus && endpointFilters.isolationStatus.length > 0) {
		filter.isolationStatus = endpointFilters.isolationStatus;
	}
	if (endpointFilters.platform && endpointFilters.platform.length > 0) {
		filter.platform = endpointFilters.platform;
	}
	if (endpointFilters.issue) filter.issue = endpointFilters.issue;
	if (endpointFilters.onlineStatus && endpointFilters.onlineStatus.length > 0) {
		filter.onlineStatus = endpointFilters.onlineStatus;
	}
	if (endpointFilters.tags) {
		filter.tags = endpointFilters.tags.split(',').map((tag: string) => tag.trim());
	}
	if (endpointFilters.version) filter.version = endpointFilters.version;
	if (endpointFilters.policy) filter.policy = endpointFilters.policy;
	if (endpointFilters.includedEndpointIds) {
		filter.includedEndpointIds = endpointFilters.includedEndpointIds.split(',').map((id: string) => id.trim());
	}
	if (endpointFilters.excludedEndpointIds) {
		filter.excludedEndpointIds = endpointFilters.excludedEndpointIds.split(',').map((id: string) => id.trim());
	}

	// Set organizationIds from the selected organization
	// Always use the selected organization's ID as the only item in the array
	filter.organizationIds = [Number(organizationIdValue)];

	// Build request
	const request: BaselineAcquisitionRequest = {
		caseId: caseIdValue,
		filter,
	};

	// Make API call
	const response = await baselinesApi.acquireBaseline(this, credentials, request);

	// Validate response
	validateApiResponse(response, 'Acquire baseline');

	return response;
}

/**
 * Execute compare baseline operation
 */
async function executeCompareBaseline(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<BaselineResponse> {
	const endpointId = this.getNodeParameter('endpointId', itemIndex) as string;
	const taskIdsString = this.getNodeParameter('taskIds', itemIndex) as string;

	// Validate required parameters
	normalizeAndValidateId(endpointId, 'Endpoint ID');

	if (!taskIdsString || taskIdsString.trim() === '') {
		throw new Error('Task IDs cannot be empty');
	}

	// Parse task IDs
	const taskIds = taskIdsString.split(',').map((id: string) => id.trim()).filter(id => id !== '');

	if (taskIds.length === 0) {
		throw new Error('At least one valid task ID must be provided');
	}

	// Build request
	const request: BaselineComparisonRequest = {
		endpointId,
		taskIds,
	};

	// Make API call
	const response = await baselinesApi.compareBaseline(this, credentials, request);

	// Validate response
	validateApiResponse(response, 'Compare baseline');

	return response;
}

/**
 * Execute get comparison report operation
 */
async function executeGetComparisonReport(
	this: IExecuteFunctions,
	credentials: AirCredentials,
	itemIndex: number
): Promise<{ success: boolean; message: string }> {
	const endpointId = this.getNodeParameter('endpointId', itemIndex) as string;
	const taskId = this.getNodeParameter('taskId', itemIndex) as string;

	// Validate required parameters
	normalizeAndValidateId(endpointId, 'Endpoint ID');
	normalizeAndValidateId(taskId, 'Task ID');

	// Make API call
	await baselinesApi.getComparisonReport(this, credentials, endpointId, taskId);

	return {
		success: true,
		message: `Comparison report retrieved successfully for endpoint ${endpointId} and task ${taskId}`,
	};
}
