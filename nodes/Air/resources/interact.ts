import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	handleExecuteError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as interactApi } from '../api/interact/interact';
import { findOrganizationByName } from './organizations';

export const InterACTOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['interact'],
			},
		},
		options: [
			{
				name: 'Assign InterACT Task',
				value: 'assignTask',
				description: 'Assign an InterACT shell task to endpoints',
				action: 'Assign an InterACT task',
			},
			{
				name: 'Close Session',
				value: 'closeSession',
				description: 'Close an InterACT session',
				action: 'Close a session',
			},
			{
				name: 'Execute Command',
				value: 'executeCommand',
				description: 'Execute a command in an InterACT session',
				action: 'Execute a command',
			},
			{
				name: 'Execute Async Command',
				value: 'executeAsyncCommand',
				description: 'Execute an asynchronous command in an InterACT session',
				action: 'Execute an async command',
			},
			{
				name: 'Get Command Message',
				value: 'getCommandMessage',
				description: 'Get the result of a command execution',
				action: 'Get a command message',
			},
			{
				name: 'Interrupt Command',
				value: 'interruptCommand',
				description: 'Interrupt a running command',
				action: 'Interrupt a command',
			},
		],
		default: 'executeCommand',
	},

	// Session ID field
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '',
		placeholder: 'Enter session ID',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['executeCommand', 'executeAsyncCommand', 'closeSession', 'getCommandMessage', 'interruptCommand'],
			},
		},
		required: true,
		description: 'The InterACT session ID',
	},

	// Message ID field
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		placeholder: 'Enter message ID',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['getCommandMessage', 'interruptCommand'],
			},
		},
		required: true,
		description: 'The command message ID',
	},

	// Command field
	{
		displayName: 'Command',
		name: 'command',
		type: 'string',
		default: '',
		placeholder: 'Enter command to execute',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['executeCommand', 'executeAsyncCommand'],
			},
		},
		required: true,
		description: 'The command to execute in the InterACT session',
	},

	// Session Type field for task assignment
	{
		displayName: 'Session Type',
		name: 'sessionType',
		type: 'options',
		default: 'shell',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['assignTask'],
			},
		},
		options: [
			{
				name: 'Shell',
				value: 'shell',
			},
			{
				name: 'PowerShell',
				value: 'powershell',
			},
			{
				name: 'Command Prompt',
				value: 'cmd',
			},
		],
		required: true,
		description: 'The type of InterACT session to create',
	},

	// Additional Fields for command execution
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['executeCommand', 'executeAsyncCommand'],
			},
		},
		options: [
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Command execution timeout in seconds',
				typeOptions: {
					minValue: 1,
					maxValue: 3600,
				},
			},
			{
				displayName: 'Working Directory',
				name: 'workingDirectory',
				type: 'string',
				default: '',
				description: 'Working directory for command execution',
			},
			{
				displayName: 'Environment Variables',
				name: 'environment',
				type: 'json',
				default: '{}',
				description: 'Environment variables for command execution (JSON format)',
			},
		],
	},

	// Filter fields for task assignment
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['assignTask'],
			},
		},
		options: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter endpoints',
			},
			{
				displayName: 'Asset Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter by asset name',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'Filter by IP address',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				description: 'Filter by group ID',
			},
			{
				displayName: 'Group Full Path',
				name: 'groupFullPath',
				type: 'string',
				default: '',
				description: 'Filter by group full path',
			},
			{
				displayName: 'Managed Status',
				name: 'managedStatus',
				type: 'multiOptions',
				default: ['managed'],
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
				displayName: 'Platform',
				name: 'platform',
				type: 'multiOptions',
				default: [],
				description: 'Filter by platform',
				options: [
					{
						name: 'Linux',
						value: 'linux',
					},
					{
						name: 'macOS',
						value: 'macos',
					},
					{
						name: 'Windows',
						value: 'windows',
					},
				],
			},
			{
				displayName: 'Online Status',
				name: 'onlineStatus',
				type: 'multiOptions',
				default: ['online'],
				description: 'Filter by online status',
				options: [
					{
						name: 'Offline',
						value: 'offline',
					},
					{
						name: 'Online',
						value: 'online',
					},
				],
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
				description: 'Filter by agent version',
			},
			{
				displayName: 'Policy',
				name: 'policy',
				type: 'string',
				default: '',
				description: 'Filter by policy',
			},
			{
				displayName: 'Included Endpoint IDs',
				name: 'includedEndpointIds',
				type: 'string',
				default: '',
				description: 'Specific endpoint IDs to include (comma-separated)',
			},
			{
				displayName: 'Excluded Endpoint IDs',
				name: 'excludedEndpointIds',
				type: 'string',
				default: '',
				description: 'Specific endpoint IDs to exclude (comma-separated)',
			},
			{
				displayName: 'Organization',
				name: 'organizationIds',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter by. Use "0" for all organizations.',
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

	// Additional Fields for task assignment
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['assignTask'],
			},
		},
		options: [
			{
				displayName: 'Commands',
				name: 'commands',
				type: 'string',
				default: '',
				description: 'Commands to execute in the session (comma-separated)',
			},
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Session timeout in seconds',
				typeOptions: {
					minValue: 1,
					maxValue: 3600,
				},
			},
		],
	},
];

// Main execution function
export async function executeInterACT(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const operation = this.getNodeParameter('operation', 0) as string;

	try {
		const credentials = await getAirCredentials(this);

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				switch (operation) {
					case 'executeCommand':
						responseData = await handleExecuteCommand(this, credentials, i);
						break;
					case 'executeAsyncCommand':
						responseData = await handleExecuteAsyncCommand(this, credentials, i);
						break;
					case 'interruptCommand':
						responseData = await handleInterruptCommand(this, credentials, i);
						break;
					case 'closeSession':
						responseData = await handleCloseSession(this, credentials, i);
						break;
					case 'getCommandMessage':
						responseData = await handleGetCommandMessage(this, credentials, i);
						break;
					case 'assignTask':
						responseData = await handleAssignInterACTTask(this, credentials, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `The operation '${operation}' is not supported`);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } }
				);
				returnData.push(...executionData);

			} catch (error) {
				handleExecuteError(this, error, i, returnData);
			}
		}
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Failed to execute InterACT operation: ${error instanceof Error ? error.message : String(error)}`);
	}

	return [returnData];
}

// Individual operation handlers
async function handleExecuteCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const command = context.getNodeParameter('command', itemIndex) as string;
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex) as any;

	const data: any = {
		command,
	};

	if (additionalFields.timeout) {
		data.timeout = additionalFields.timeout;
	}

	if (additionalFields.workingDirectory) {
		data.workingDirectory = additionalFields.workingDirectory;
	}

	if (additionalFields.environment) {
		try {
			data.environment = JSON.parse(additionalFields.environment);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON in environment field');
		}
	}

	const response = await interactApi.executeCommand(context, credentials, sessionId, data);
	return response.result;
}

async function handleExecuteAsyncCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const command = context.getNodeParameter('command', itemIndex) as string;
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex) as any;

	const data: any = {
		command,
	};

	if (additionalFields.timeout) {
		data.timeout = additionalFields.timeout;
	}

	if (additionalFields.workingDirectory) {
		data.workingDirectory = additionalFields.workingDirectory;
	}

	if (additionalFields.environment) {
		try {
			data.environment = JSON.parse(additionalFields.environment);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Invalid JSON in environment field');
		}
	}

	const response = await interactApi.executeAsyncCommand(context, credentials, sessionId, data);
	return response.result;
}

async function handleInterruptCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const messageId = context.getNodeParameter('messageId', itemIndex) as string;

	const response = await interactApi.interruptCommand(context, credentials, sessionId, messageId);
	return response.result;
}

async function handleCloseSession(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;

	const response = await interactApi.closeSession(context, credentials, sessionId);
	return response.result;
}

async function handleGetCommandMessage(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const messageId = context.getNodeParameter('messageId', itemIndex) as string;

	const response = await interactApi.getCommandMessage(context, credentials, sessionId, messageId);
	return response.result;
}

async function handleAssignInterACTTask(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionType = context.getNodeParameter('sessionType', itemIndex) as string;
	const filter = context.getNodeParameter('filter', itemIndex) as any;
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex) as any;

	const data: any = {
		sessionType,
		filter: {},
	};

	// Build filter object
	if (filter.searchTerm) data.filter.searchTerm = filter.searchTerm;
	if (filter.name) data.filter.name = filter.name;
	if (filter.ipAddress) data.filter.ipAddress = filter.ipAddress;
	if (filter.groupId) data.filter.groupId = filter.groupId;
	if (filter.groupFullPath) data.filter.groupFullPath = filter.groupFullPath;
	if (filter.managedStatus) data.filter.managedStatus = filter.managedStatus;
	if (filter.isolationStatus) data.filter.isolationStatus = filter.isolationStatus;
	if (filter.platform) data.filter.platform = filter.platform;
	if (filter.onlineStatus) data.filter.onlineStatus = filter.onlineStatus;
	if (filter.version) data.filter.version = filter.version;
	if (filter.policy) data.filter.policy = filter.policy;

	if (filter.tags) {
		data.filter.tags = filter.tags.split(',').map((tag: string) => tag.trim());
	}

	if (filter.includedEndpointIds) {
		data.filter.includedEndpointIds = filter.includedEndpointIds.split(',').map((id: string) => id.trim());
	}

	if (filter.excludedEndpointIds) {
		data.filter.excludedEndpointIds = filter.excludedEndpointIds.split(',').map((id: string) => id.trim());
	}

	// Handle organization
	if (filter.organizationIds) {
		let organizationId = filter.organizationIds;
		if (typeof organizationId === 'object' && organizationId.mode === 'name') {
			const orgResult = await findOrganizationByName(context, credentials, organizationId.value);
			organizationId = orgResult ? [parseInt(orgResult)] : [0];
		} else if (typeof organizationId === 'object') {
			organizationId = [parseInt(organizationId.value) || 0];
		} else {
			organizationId = [parseInt(organizationId) || 0];
		}
		data.filter.organizationIds = organizationId;
	}

	// Add additional fields
	if (additionalFields.commands) {
		data.commands = additionalFields.commands.split(',').map((cmd: string) => cmd.trim());
	}

	if (additionalFields.timeout) {
		data.timeout = additionalFields.timeout;
	}

	const response = await interactApi.assignInterACTTask(context, credentials, data);
	return response.result;
}
