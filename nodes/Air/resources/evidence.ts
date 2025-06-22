import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	handleExecuteError,
	normalizeAndValidateId,
} from '../utils/helpers';
import { api as evidenceApi } from '../api/evidence/evidence';

export const EvidenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['evidence'],
			},
		},
		options: [
			{
				name: 'Download PPC File',
				value: 'downloadPpc',
				description: 'Download endpoint PPC file',
				action: 'Download PPC file',
			},
			{
				name: 'Download Task Report',
				value: 'downloadReport',
				description: 'Download endpoint task report',
				action: 'Download task report',
			},
			{
				name: 'Get PPC File Info',
				value: 'getPpcInfo',
				description: 'Get endpoint PPC file information',
				action: 'Get PPC file information',
			},
		],
		default: 'downloadPpc',
	},

	// Task ID field (required for all operations)
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		placeholder: 'Enter task ID',
		displayOptions: {
			show: {
				resource: ['evidence'],
			},
		},
		required: true,
		description: 'The ID of the task to retrieve evidence for',
		typeOptions: {
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[a-zA-Z0-9-_]+$',
						errorMessage: 'Not a valid task ID (must contain only letters, numbers, hyphens, and underscores)',
					},
				},
			],
		},
	},

	// Report format field (only for download report operation)
	{
		displayName: 'Report Format',
		name: 'format',
		type: 'options',
		default: 'pdf',
		displayOptions: {
			show: {
				resource: ['evidence'],
				operation: ['downloadReport'],
			},
		},
		options: [
			{
				name: 'PDF',
				value: 'pdf',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
		description: 'Format of the task report to download',
	},

	// Additional Fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['evidence'],
			},
		},
		options: [
			{
				displayName: 'Filter By Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'endpoint-ID-1,endpoint-ID-2',
			},
			{
				displayName: 'Filter By Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				placeholder: 'Enter group full path',
			},
			{
				displayName: 'Filter By Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				placeholder: 'Enter group ID',
			},
			{
				displayName: 'Filter By Included Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				placeholder: 'endpoint-ID-1,endpoint-ID-2',
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
						value: 'not-isolated',
					},
					{
						name: 'Isolating',
						value: 'isolating',
					},
					{
						name: 'Lifting Isolation',
						value: 'lifting-isolation',
					},
				],
			},
			{
				displayName: 'Filter By Issue',
				name: 'issue',
				type: 'string',
				default: '',
				placeholder: 'Enter issue',
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
				placeholder: 'Enter name',
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
				displayName: 'Filter By Organization IDs',
				name: 'organizationIds',
				type: 'string',
				default: '',
				placeholder: '1,2,3',
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
				placeholder: 'Enter policy',
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
				displayName: 'Filter By Version',
				name: 'version',
				type: 'string',
				default: '',
				placeholder: 'Enter version',
			},
		],
	},
];

// ===== HELPER FUNCTIONS =====

export function buildEvidenceFilterParams(additionalFields: any): any {
	const filter: any = {};

	if (additionalFields.organizationIds) {
		const orgIds = additionalFields.organizationIds.split(',').map((id: string) => id.trim());
		filter.organizationIds = orgIds;
	}

	if (additionalFields.searchTerm) filter.searchTerm = additionalFields.searchTerm;
	if (additionalFields.name) filter.name = additionalFields.name;
	if (additionalFields.ipAddress) filter.ipAddress = additionalFields.ipAddress;
	if (additionalFields.groupId) filter.groupId = additionalFields.groupId;
	if (additionalFields.groupFullPath) filter.groupFullPath = additionalFields.groupFullPath;
	if (additionalFields.managedStatus?.length) filter.managedStatus = additionalFields.managedStatus;
	if (additionalFields.isolationStatus?.length) filter.isolationStatus = additionalFields.isolationStatus;
	if (additionalFields.platform?.length) filter.platform = additionalFields.platform;
	if (additionalFields.issue) filter.issue = additionalFields.issue;
	if (additionalFields.onlineStatus?.length) filter.onlineStatus = additionalFields.onlineStatus;
	if (additionalFields.tags) {
		const tags = additionalFields.tags.split(',').map((tag: string) => tag.trim());
		filter.tags = tags;
	}
	if (additionalFields.version) filter.version = additionalFields.version;
	if (additionalFields.policy) filter.policy = additionalFields.policy;
	if (additionalFields.includedEndpointIds) {
		const ids = additionalFields.includedEndpointIds.split(',').map((id: string) => id.trim());
		filter.includedEndpointIds = ids;
	}
	if (additionalFields.excludedEndpointIds) {
		const ids = additionalFields.excludedEndpointIds.split(',').map((id: string) => id.trim());
		filter.excludedEndpointIds = ids;
	}

	return Object.keys(filter).length ? filter : undefined;
}

// ===== MAIN EXECUTE FUNCTION =====

export async function executeEvidence(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const operation = this.getNodeParameter('operation', 0) as string;

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const taskId = normalizeAndValidateId(this.getNodeParameter('taskId', i), 'Task ID');
			const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

			// Build filter parameters
			const filter = buildEvidenceFilterParams(additionalFields);

			if (operation === 'downloadPpc') {
				// Download PPC File
				const requestData = {
					taskId,
					...(filter && { filter }),
				};

				responseData = await evidenceApi.downloadPpcFile(this, credentials, requestData);

				returnData.push({
					json: responseData.result,
					pairedItem: { item: i },
				});

			} else if (operation === 'downloadReport') {
				// Download Task Report
				const format = this.getNodeParameter('format', i, 'pdf') as string;

				const requestData = {
					taskId,
					format,
					...(filter && { filter }),
				};

				responseData = await evidenceApi.downloadTaskReport(this, credentials, requestData);

				returnData.push({
					json: responseData.result,
					pairedItem: { item: i },
				});

			} else if (operation === 'getPpcInfo') {
				// Get PPC File Info
				const requestData = {
					taskId,
					...(filter && { filter }),
				};

				responseData = await evidenceApi.getPpcFileInfo(this, credentials, requestData);

				returnData.push({
					json: responseData.result as any,
					pairedItem: { item: i },
				});

			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`, {
					itemIndex: i,
				});
			}

		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
