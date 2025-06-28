import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	extractEntityId,
	isValidEntity,
	createListSearchResults,
	handleExecuteError,
	normalizeAndValidateId,
	catchAndFormatError,
} from '../utils/helpers';

import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { api as cloudForensicsApi } from '../api/cloudforensics/cloudforensics';

export const CloudForensicsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cloudforensics'],
			},
		},
		options: [
			{
				name: 'Create Cloud Account',
				value: 'createCloudAccount',
				description: 'Create a new cloud account',
				action: 'Create a cloud account',
			},
			{
				name: 'Delete Cloud Account',
				value: 'deleteCloudAccount',
				description: 'Delete a cloud account',
				action: 'Delete a cloud account',
			},
			{
				name: 'Get Cloud Account',
				value: 'getCloudAccount',
				description: 'Retrieve a specific cloud account',
				action: 'Get a cloud account',
			},
			{
				name: 'Get Many Cloud Accounts',
				value: 'getAllCloudAccounts',
				description: 'Retrieve many cloud accounts',
				action: 'Get many cloud accounts',
			},
			{
				name: 'Update Cloud Account',
				value: 'updateCloudAccount',
				description: 'Update a cloud account',
				action: 'Update a cloud account',
			},
		],
		default: 'getAllCloudAccounts',
	},
	{
		displayName: 'Cloud Account',
		name: 'cloudAccountId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a cloud account...',
		displayOptions: {
			show: {
				resource: ['cloudforensics'],
				operation: ['getCloudAccount', 'updateCloudAccount', 'deleteCloudAccount'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a cloud account...',
				typeOptions: {
					searchListMethod: 'getCloudAccounts',
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
							errorMessage: 'Not a valid cloud account ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter cloud account ID',
			},
		],
		required: true,
		description: 'The cloud account to operate on',
	},
	{
		displayName: 'Cloud Vendor',
		name: 'cloudVendor',
		type: 'options',
		default: 'aws',
		displayOptions: {
			show: {
				resource: ['cloudforensics'],
				operation: ['createCloudAccount'],
			},
		},
		options: [
			{
				name: 'Amazon AWS',
				value: 'aws',
			},
			{
				name: 'Microsoft Azure',
				value: 'azure',
			},
			{
				name: 'Google Cloud Platform',
				value: 'gcp',
			},
		],
		required: true,
		description: 'The cloud vendor platform',
	},
	{
		displayName: 'Account Name',
		name: 'accountName',
		type: 'string',
		default: '',
		placeholder: 'Enter account name',
		displayOptions: {
			show: {
				resource: ['cloudforensics'],
				operation: ['createCloudAccount', 'updateCloudAccount'],
			},
		},
		required: true,
		description: 'Name for the cloud account',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['cloudforensics'],
				operation: ['getAllCloudAccounts'],
			},
		},
		options: [
			{
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter cloud accounts by name',
			},
			{
				displayName: 'Filter By Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter cloud accounts',
			},
			{
				displayName: 'Organization',
				name: 'organizationId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '0' },
				placeholder: 'Select an organization...',
				description: 'Organization to filter cloud accounts by. Use "0" to retrieve accounts that are visible to all organizations.',
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
];

// Helper functions for entity validation and ID extraction
export function extractCloudAccountId(cloudAccount: any): string {
	return extractEntityId(cloudAccount, 'cloud account');
}

export function isValidCloudAccount(cloudAccount: any): boolean {
	return isValidEntity(cloudAccount);
}

export async function fetchAllCloudAccounts(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	organizationId: string = '0',
	searchFilter?: string
): Promise<any[]> {
	try {
		const queryParams: Record<string, string | number> = {};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const response = await cloudForensicsApi.getCloudAccounts(context, credentials, organizationId, queryParams);
		return response.result.entities || [];
	} catch (error) {
		throw new NodeOperationError(context.getNode(), `Failed to fetch cloud accounts: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export async function getCloudAccounts(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Get organization ID from node parameters if available
		let organizationId = '0';
		try {
			const additionalFields = this.getNodeParameter('additionalFields', 0, {}) as any;
			if (additionalFields.organizationId) {
				organizationId = normalizeAndValidateId(additionalFields.organizationId.value || additionalFields.organizationId, 'Organization ID');
			}
		} catch (error) {
			// Ignore error and use default organization
		}

		const cloudAccounts = await fetchAllCloudAccounts(this, credentials, organizationId, searchTerm);

		return createListSearchResults(
			cloudAccounts,
			isValidCloudAccount,
			(account: any) => ({
				name: `${account.name} (${account.cloudVendor})`,
				value: extractCloudAccountId(account),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'fetch cloud accounts for selection');
	}
}

export async function executeCloudForensics(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	try {
		const items = this.getInputData();
		const credentials = await getAirCredentials(this);
		const operation = this.getNodeParameter('operation', 0);
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				let result: any;

				switch (operation) {
					case 'createCloudAccount':
						result = await handleCreateCloudAccount(this, credentials, i);
						break;
					case 'updateCloudAccount':
						result = await handleUpdateCloudAccount(this, credentials, i);
						break;
					case 'deleteCloudAccount':
						result = await handleDeleteCloudAccount(this, credentials, i);
						break;
					case 'getCloudAccount':
						result = await handleGetCloudAccount(this, credentials, i);
						break;
					case 'getAllCloudAccounts':
						result = await handleGetAllCloudAccounts(this, credentials, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
							description: `The operation "${operation}" is not supported by the Cloud Forensics resource`
						});
				}

				const resultData = Array.isArray(result) ? result : [result];
				resultData.forEach((item: any) => {
					returnData.push({
						json: item,
						pairedItem: { item: i },
					});
				});

			} catch (error) {
				handleExecuteError(this, error, i, returnData);
			}
		}

		return [returnData];

	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Cloud Forensics operation failed: ${error instanceof Error ? error.message : String(error)}`);
	}
}

// Cloud Account operation handlers
async function handleCreateCloudAccount(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const cloudVendor = context.getNodeParameter('cloudVendor', itemIndex) as string;
	const accountName = context.getNodeParameter('accountName', itemIndex) as string;

	const data: any = {
		name: accountName,
		cloudVendor,
		organizationId: 0,
	};

	const response = await cloudForensicsApi.createCloudAccount(context, credentials, data);
	return response.result;
}

async function handleUpdateCloudAccount(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const cloudAccountResource = context.getNodeParameter('cloudAccountId', itemIndex) as any;
	const cloudAccountId = normalizeAndValidateId(cloudAccountResource.value || cloudAccountResource, 'Cloud Account ID');
	const accountName = context.getNodeParameter('accountName', itemIndex) as string;

	const data: any = { name: accountName };

	const response = await cloudForensicsApi.updateCloudAccount(context, credentials, cloudAccountId, data);
	return response.result;
}

async function handleDeleteCloudAccount(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const cloudAccountResource = context.getNodeParameter('cloudAccountId', itemIndex) as any;
	const cloudAccountId = normalizeAndValidateId(cloudAccountResource.value || cloudAccountResource, 'Cloud Account ID');

	await cloudForensicsApi.deleteCloudAccount(context, credentials, cloudAccountId);
	return { success: true, message: `Cloud account ${cloudAccountId} deleted successfully` };
}

async function handleGetCloudAccount(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const cloudAccountResource = context.getNodeParameter('cloudAccountId', itemIndex) as any;
	const cloudAccountId = normalizeAndValidateId(cloudAccountResource.value || cloudAccountResource, 'Cloud Account ID');

	const response = await cloudForensicsApi.getCloudAccountById(context, credentials, cloudAccountId);
	return response.result;
}

async function handleGetAllCloudAccounts(context: IExecuteFunctions, credentials: AirCredentials, itemIndex: number): Promise<any> {
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as any;

	let organizationId = '0';
	if (additionalFields.organizationId) {
		organizationId = normalizeAndValidateId(additionalFields.organizationId.value || additionalFields.organizationId, 'Organization ID');
	}

	const queryParams: Record<string, string | number> = {};

	// Add filters
	if (additionalFields.searchTerm) queryParams['filter[searchTerm]'] = additionalFields.searchTerm;
	if (additionalFields.name) queryParams['filter[name]'] = additionalFields.name;

	// Add pagination
	if (additionalFields.pageNumber) queryParams.page = additionalFields.pageNumber;
	if (additionalFields.pageSize) queryParams.size = additionalFields.pageSize;

	const response = await cloudForensicsApi.getCloudAccounts(context, credentials, organizationId, queryParams);

	// Extract entities and return them
	const entities = response.result.entities || [];
	return entities;
}
