import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
	INodeProperties,
} from 'n8n-workflow';

import {
	getAirCredentials,
	handleExecuteError,
	catchAndFormatError,
} from '../utils/helpers';

import { api as authApi } from '../api/auth/auth';

export const AuthOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auth'],
			},
		},
		options: [
			{
				name: 'Check Authentication',
				value: 'check',
				description: 'Check current authentication status',
				action: 'Check authentication status',
			},
		],
		default: 'check',
	},
];

// ===== EXECUTE FUNCTION =====

export async function executeAuth(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			switch (operation) {
				case 'check': {
					try {
						const responseData = await authApi.checkAuth(this, credentials);

						returnData.push({
							json: responseData.result as any,
							pairedItem: i,
						});
					} catch (error: any) {
						throw catchAndFormatError(error, 'check authentication');
					}
					break;
				}

				default: {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`, {
						itemIndex: i,
					});
				}
			}
		} catch (error) {
			handleExecuteError(this, error, i, returnData);
		}
	}

	return [returnData];
}
