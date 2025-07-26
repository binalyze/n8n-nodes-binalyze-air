import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	INodeProperties,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

import {
	getAirCredentials,
	handleExecuteError,
	createListSearchResults,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as interactApi } from '../api/interact/interact';
import { findOrganizationByName } from './organizations';
import { api as casesApi } from '../api/cases/cases';
import { api as assetsApi } from '../api/assets/assets';

// Helper function to check if a case is valid
function isValidCase(entity: any): boolean {
	return entity && entity._id && typeof entity._id === 'string';
}

// Helper function to extract case ID
function extractCaseId(entity: any): string {
	if (!entity) return '';
	return entity._id || '';
}

// Helper function to check if an asset is valid
function isValidAsset(entity: any): boolean {
	return entity && entity._id && typeof entity._id === 'string';
}

// Helper function to extract asset ID
function extractAssetId(entity: any): string {
	if (!entity) return '';
	return entity._id || '';
}

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
				name: 'Close Session',
				value: 'closeSession',
				description: 'Close an InterACT session',
				action: 'Close a session',
			},
			{
				name: 'Create InterACT Session',
				value: 'createSession',
				description: 'Create a new InterACT shell session for an asset',
				action: 'Create an interact session',
			},
			{
				name: 'Execute Async Command',
				value: 'executeAsyncCommand',
				description: 'Execute an asynchronous command in an InterACT session',
				action: 'Execute an async command',
			},
			{
				name: 'Execute Command',
				value: 'executeCommand',
				description: 'Execute a command in an InterACT session',
				action: 'Execute a command',
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
			{
				name: 'Wait for Session to Be Live',
				value: 'waitForSession',
				description: 'Wait for an InterACT session to become live by polling with pwd command',
				action: 'Wait for session to be live',
			},
		],
		default: 'createSession',
	},

	// Organization field for createSession
	{
		displayName: 'Organization',
		name: 'organizationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an organization...',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['createSession'],
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
							errorMessage: 'Not a valid organization ID (must be a positive number)',
						},
					},
				],
				placeholder: 'Enter Organization ID',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'The organization that the asset belongs to',
	},

	// Case field for createSession (optional)
	{
		displayName: 'Case',
		name: 'caseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a case...',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['createSession'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a case...',
				typeOptions: {
					searchListMethod: 'getCasesByOrganization',
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
		description: 'The case to associate with the InterACT session (optional)',
	},

	// Asset field for createSession
	{
		displayName: 'Asset',
		name: 'assetId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select an asset...',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['createSession'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an asset...',
				typeOptions: {
					searchListMethod: 'getAssetsByOrganizationForInteract',
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
							errorMessage: 'Not a valid asset ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter asset ID',
			},
		],
		required: true,
		description: 'The asset to create the InterACT session for',
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
				operation: ['executeCommand', 'executeAsyncCommand', 'closeSession', 'getCommandMessage', 'interruptCommand', 'waitForSession'],
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

	// Response Type field
	{
		displayName: 'Response Type',
		name: 'responseType',
		type: 'options',
		default: 'json',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['executeCommand', 'executeAsyncCommand'],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
				description: 'Return response as JSON',
			},
			{
				name: 'Text',
				value: 'text',
				description: 'Return response as plain text',
			},
		],
		description: 'The format of the command response',
	},

	// Timeout field for waitForSession
	{
		displayName: 'Timeout (Seconds)',
		name: 'timeout',
		type: 'number',
		default: 60,
		placeholder: 'Enter timeout in seconds',
		displayOptions: {
			show: {
				resource: ['interact'],
				operation: ['waitForSession'],
			},
		},
		required: true,
		description: 'Maximum time to wait for the session to become live (in seconds)',
		typeOptions: {
			minValue: 10,
			maxValue: 600,
		},
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
					case 'createSession':
						responseData = await handleCreateInterACTSession(this, credentials, i);
						break;
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
					case 'waitForSession':
						responseData = await handleWaitForSession(this, credentials, i);
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
async function handleCreateInterACTSession(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const organizationIdParam = context.getNodeParameter('organizationId', itemIndex) as any;
	const caseIdParam = context.getNodeParameter('caseId', itemIndex, '') as any;
	const assetIdParam = context.getNodeParameter('assetId', itemIndex) as any;

	// Handle organization ID - not used in the request but needed for validation
	if (typeof organizationIdParam === 'object' && organizationIdParam.mode === 'name') {
		const orgResult = await findOrganizationByName(context, credentials, organizationIdParam.value);
		if (!orgResult) {
			throw new NodeOperationError(context.getNode(), 'Organization not found');
		}
	}

	// Handle case ID
	let caseId: string | null = null;
	if (caseIdParam) {
		if (typeof caseIdParam === 'object' && caseIdParam.value) {
			caseId = caseIdParam.value;
		} else if (typeof caseIdParam === 'string' && caseIdParam) {
			caseId = caseIdParam;
		}
	}

	// Handle asset ID
	let assetId: string;
	if (typeof assetIdParam === 'object' && assetIdParam.value) {
		assetId = assetIdParam.value;
	} else if (typeof assetIdParam === 'string') {
		assetId = assetIdParam;
	} else {
		throw new NodeOperationError(context.getNode(), 'Asset ID is required');
	}

	// Create the request body
	const data = {
		assetId: assetId,
		caseId: caseId,
		taskConfig: {
			choice: 'use-policy'
		}
	};

	const response = await interactApi.createInterACTSession(context, credentials, data);

	// Extract session ID from the response
	if (response.result && response.result.data) {
		const result = response.result;
		return {
			sessionId: result.data.sessionId,
			assetId: result.assetId || assetId,
			taskId: result.id,
			type: result.type,
			loginUrl: result.loginUrl,
			shellUrl: result.shellUrl,
			reportUrl: result.reportUrl
		};
	} else {
		throw new NodeOperationError(context.getNode(), 'Failed to create InterACT session');
	}
}

async function handleExecuteCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const command = context.getNodeParameter('command', itemIndex) as string;
	const responseType = context.getNodeParameter('responseType', itemIndex) as string;

	const data: any = {
		command,
		accept: responseType, // Map responseType to accept for the API
	};

	const response = await interactApi.executeCommand(context, credentials, sessionId, data);
	return response.result;
}

async function handleExecuteAsyncCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const command = context.getNodeParameter('command', itemIndex) as string;
	const responseType = context.getNodeParameter('responseType', itemIndex) as string;

	const data: any = {
		command,
		accept: responseType, // Map responseType to accept for the API
	};

	const response = await interactApi.executeAsyncCommand(context, credentials, sessionId, data);
	return response.result;
}

async function handleInterruptCommand(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const messageId = context.getNodeParameter('messageId', itemIndex) as string;

	const response = await interactApi.interruptCommand(context, credentials, sessionId, messageId);

	// Handle the case where result is null (which is the successful response)
	if (response.success && response.result === null) {
		return {
			success: true,
			messageId: messageId,
			sessionId: sessionId,
			status: 'interrupted',
			message: 'Command interrupted successfully'
		};
	}

	// If result is not null, return it
	return response.result || {
		success: response.success,
		messageId: messageId,
		sessionId: sessionId,
		status: 'interrupted',
		message: 'Command interrupted'
	};
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

async function handleWaitForSession(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
	const timeout = context.getNodeParameter('timeout', itemIndex) as number;

	const startTime = Date.now();
	const endTime = startTime + timeout * 1000;
	const pollInterval = 10000; // 10 seconds

	while (Date.now() < endTime) {
		try {
			// Execute pwd command to check if session is live
			const data = {
				command: 'pwd',
				accept: 'json',
			};

			const response = await interactApi.executeCommand(context, credentials, sessionId, data);
			
			// Based on the actual response structure, the result should have these properties directly
			// The actual response structure is: { messageId, session, exitCode, cwd, body }
			const result = response.result as any;

			// Check if we got a successful response
			if (result && 'exitCode' in result && result.exitCode === 0 && result.body) {
				// Session is live, return the response data
				return {
					sessionId: sessionId,
					status: 'live',
					message: 'Session is ready',
					workingDirectory: result.cwd || result.body,
					messageId: result.messageId,
					exitCode: result.exitCode,
					body: result.body
				};
			}
		} catch (error) {
			// Session might not be ready yet, continue polling
			// Log the error for debugging but don't throw
			console.log(`Session ${sessionId} not ready yet: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Wait for the poll interval before trying again
		const remainingTime = endTime - Date.now();
		if (remainingTime > pollInterval) {
			await new Promise(resolve => setTimeout(resolve, pollInterval));
		} else if (remainingTime > 0) {
			// Wait for the remaining time if it's less than poll interval
			await new Promise(resolve => setTimeout(resolve, remainingTime));
		}
	}

	// Timeout reached
	throw new NodeOperationError(context.getNode(), `Session ${sessionId} did not become live within ${timeout} seconds`);
}

// Context-aware search functions for resource locators

/**
 * Get cases by organization for InterACT (context-aware)
 */
export async function getCasesByOrganization(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Try to get the organization from the current node parameters
		let organizationId = '0'; // Default to all organizations
		try {
			const currentParams = this.getCurrentNodeParameters();
			if (currentParams && currentParams.organizationId) {
				const orgResource = currentParams.organizationId as any;
				if (typeof orgResource === 'object') {
					if (orgResource.mode === 'id' || orgResource.mode === 'list') {
						organizationId = orgResource.value || '0';
					}
					// Skip name resolution for ILoadOptionsFunctions context
				} else if (typeof orgResource === 'string') {
					organizationId = orgResource;
				}
			}
		} catch (error) {
			// If we can't get the current parameters, fall back to default
		}

		// Get cases for the organization
		const additionalParams: any = {};
		if (searchTerm) {
			additionalParams.searchTerm = searchTerm;
		}

		const response = await casesApi.getCases(this, credentials, organizationId, additionalParams);
		const cases = response.result?.entities || [];

		return createListSearchResults(
			cases,
			isValidCase,
			(caseItem) => ({
				name: caseItem.name || `Case ${caseItem._id}`,
				value: extractCaseId(caseItem),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'loading cases');
	}
}

/**
 * Get assets by organization for InterACT (context-aware)
 */
export async function getAssetsByOrganizationForInteract(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Try to get the organization from the current node parameters
		let organizationId = '0'; // Default to all organizations
		try {
			const currentParams = this.getCurrentNodeParameters();
			if (currentParams && currentParams.organizationId) {
				const orgResource = currentParams.organizationId as any;
				if (typeof orgResource === 'object') {
					if (orgResource.mode === 'id' || orgResource.mode === 'list') {
						organizationId = orgResource.value || '0';
					}
					// Skip name resolution for ILoadOptionsFunctions context
				} else if (typeof orgResource === 'string') {
					organizationId = orgResource;
				}
			}
		} catch (error) {
			// If we can't get the current parameters, fall back to default
		}

		// Get assets for the organization
		const queryParams: any = {
			// Only show online, managed assets for InterACT
			'filter[onlineStatus]': 'online',
			'filter[managedStatus]': 'managed',
		};

		if (searchTerm) {
			queryParams['filter[searchTerm]'] = searchTerm;
		}

		const response = await assetsApi.getAssets(this, credentials, organizationId, queryParams);
		const assets = response.result?.entities || [];

		return createListSearchResults(
			assets,
			isValidAsset,
			(asset) => ({
				name: `${asset.name} (${asset.ipAddress || 'No IP'})`,
				value: extractAssetId(asset),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'loading assets');
	}
}
