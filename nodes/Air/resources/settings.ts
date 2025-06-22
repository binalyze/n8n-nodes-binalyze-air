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

import { api as settingsApi } from '../api/settings/settings';

export const SettingsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['settings'],
			},
		},
		options: [
			{
				name: 'Update Banner Message',
				value: 'updateBanner',
				description: 'Update the system banner message',
				action: 'Update banner message',
			},
		],
		default: 'updateBanner',
	},
	{
		displayName: 'Banner Message',
		name: 'bannerMessage',
		type: 'string',
		default: '',
		placeholder: 'Enter banner message',
		displayOptions: {
			show: {
				resource: ['settings'],
				operation: ['updateBanner'],
			},
		},
		required: true,
		description: 'The banner message to display in the system',
		typeOptions: {
			rows: 3,
		},
	},
	{
		displayName: 'Enable Banner',
		name: 'bannerEnabled',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['settings'],
				operation: ['updateBanner'],
			},
		},
		description: 'Whether to enable or disable the banner message',
	},
];

export const SettingsProperties: INodeProperties[] = [...SettingsOperations];

export async function executeSettings(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			switch (operation) {
				case 'updateBanner': {
					const bannerMessage = this.getNodeParameter('bannerMessage', i) as string;
					const bannerEnabled = this.getNodeParameter('bannerEnabled', i) as boolean;

					const updateData = {
						message: bannerMessage,
						enabled: bannerEnabled,
					};

					const response = await settingsApi.updateBannerMessage(this, credentials, updateData);

					returnData.push({
						json: response.result,
						pairedItem: i,
					});
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex: i,
					});
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
