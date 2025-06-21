import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	validateApiResponse,
	extractEntityId,
	isValidEntity,
	handleExecuteError,
	requireValidId,
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
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		default: '',
		placeholder: 'Enter case ID',
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['acquireBaseline'],
			},
		},
		required: true,
		description: 'The ID of the case for baseline acquisition',
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
		displayName: 'Filter Options',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['baselines'],
				operation: ['acquireBaseline'],
			},
		},
		options: [
			{
				displayName: 'Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of endpoint IDs to exclude',
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
				description: 'Comma-separated list of endpoint IDs to include',
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
				displayName: 'Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of organization IDs',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				description: 'Filter by platform',
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
				description: 'Filter by tags (comma-separated)',
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
	const caseId = this.getNodeParameter('caseId', itemIndex) as string;
	const filterOptions = this.getNodeParameter('filter', itemIndex, {}) as any;

	// Validate required parameters
	requireValidId(caseId, 'Case ID');

	// Build filter object
	const filter: any = {};

	if (filterOptions.searchTerm) filter.searchTerm = filterOptions.searchTerm;
	if (filterOptions.name) filter.name = filterOptions.name;
	if (filterOptions.ipAddress) filter.ipAddress = filterOptions.ipAddress;
	if (filterOptions.groupId) filter.groupId = filterOptions.groupId;
	if (filterOptions.groupFullPath) filter.groupFullPath = filterOptions.groupFullPath;
	if (filterOptions.managedStatus && filterOptions.managedStatus.length > 0) {
		filter.managedStatus = filterOptions.managedStatus;
	}
	if (filterOptions.isolationStatus && filterOptions.isolationStatus.length > 0) {
		filter.isolationStatus = filterOptions.isolationStatus;
	}
	if (filterOptions.platform && filterOptions.platform.length > 0) {
		filter.platform = filterOptions.platform;
	}
	if (filterOptions.issue) filter.issue = filterOptions.issue;
	if (filterOptions.onlineStatus && filterOptions.onlineStatus.length > 0) {
		filter.onlineStatus = filterOptions.onlineStatus;
	}
	if (filterOptions.tags) {
		filter.tags = filterOptions.tags.split(',').map((tag: string) => tag.trim());
	}
	if (filterOptions.version) filter.version = filterOptions.version;
	if (filterOptions.policy) filter.policy = filterOptions.policy;
	if (filterOptions.includedEndpointIds) {
		filter.includedEndpointIds = filterOptions.includedEndpointIds.split(',').map((id: string) => id.trim());
	}
	if (filterOptions.excludedEndpointIds) {
		filter.excludedEndpointIds = filterOptions.excludedEndpointIds.split(',').map((id: string) => id.trim());
	}
	if (filterOptions.organizationIds) {
		filter.organizationIds = filterOptions.organizationIds.split(',').map((id: string) => Number(id.trim()));
	}

	// Build request
	const request: BaselineAcquisitionRequest = {
		caseId,
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
	requireValidId(endpointId, 'Endpoint ID');

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
	requireValidId(endpointId, 'Endpoint ID');
	requireValidId(taskId, 'Task ID');

	// Make API call
	await baselinesApi.getComparisonReport(this, credentials, endpointId, taskId);

	return {
		success: true,
		message: `Comparison report retrieved successfully for endpoint ${endpointId} and task ${taskId}`,
	};
}
