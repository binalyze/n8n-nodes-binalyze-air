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
import { api as notificationsApi } from '../api/notifications/notifications';

export const NotificationsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['notifications'],
			},
		},
		options: [
			{
				name: 'Delete All Notifications',
				value: 'deleteAll',
				description: 'Delete all notifications of current user',
				action: 'Delete all notifications',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many notifications',
				action: 'Get many notifications',
			},
			{
				name: 'Mark All as Read',
				value: 'markAllAsRead',
				description: 'Mark all notifications as read',
				action: 'Mark all notifications as read',
			},
			{
				name: 'Mark as Read by ID',
				value: 'markAsReadById',
				description: 'Mark a specific notification as read',
				action: 'Mark notification as read by ID',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Notification',
		name: 'notificationId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a notification...',
		displayOptions: {
			show: {
				resource: ['notifications'],
				operation: ['markAsReadById'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a notification...',
				typeOptions: {
					searchListMethod: 'getNotifications',
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
							errorMessage: 'Not a valid notification ID (must contain only letters, numbers, hyphens, and underscores)',
						},
					},
				],
				placeholder: 'Enter notification ID',
			},
		],
		required: true,
		description: 'The notification to operate on',
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
				resource: ['notifications'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter By Read Status',
				name: 'read',
				type: 'options',
				default: '',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Read',
						value: 'true',
					},
					{
						name: 'Unread',
						value: 'false',
					},
				],
				description: 'Filter notifications by read status',
			},
			{
				displayName: 'Filter By Type',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'Enter notification type',
				description: 'Filter notifications by type',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Page number to retrieve',
			},
		],
	},

	// Return All
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['notifications'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
];

// ===== HELPER FUNCTIONS =====

export function extractNotificationId(notification: any): string {
	return extractEntityId(notification, 'notification');
}

export function isValidNotification(notification: any): boolean {
	return isValidEntity(notification, ['title', 'message']);
}

export async function fetchAllNotifications(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: AirCredentials,
	searchFilter?: string,
	pageSize: number = 100
): Promise<any[]> {
	try {
		const queryParams: Record<string, string | number> = {
			pageSize,
		};

		if (searchFilter) {
			queryParams['filter[searchTerm]'] = searchFilter;
		}

		const response = await notificationsApi.getNotifications(context, credentials, queryParams);
		return response.result.entities || [];
	} catch (error) {
		throw catchAndFormatError(error, 'fetch all notifications');
	}
}

export function buildNotificationQueryParams(additionalFields: any): Record<string, string | number> {
	const queryParams: Record<string, string | number> = {};

	if (additionalFields.read !== undefined && additionalFields.read !== '') {
		queryParams['filter[read]'] = additionalFields.read;
	}

	if (additionalFields.type) {
		queryParams['filter[type]'] = additionalFields.type;
	}

	if (additionalFields.limit) {
		queryParams.pageSize = additionalFields.limit;
	}

	if (additionalFields.page) {
		queryParams.page = additionalFields.page;
	}

	return queryParams;
}

// ===== LIST SEARCH METHODS =====

export async function getNotifications(this: ILoadOptionsFunctions, searchTerm?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Fetch notifications with search filter
		const notifications = await fetchAllNotifications(this, credentials, searchTerm);

		return createListSearchResults(
			notifications,
			isValidNotification,
			(notification) => ({
				name: `${notification.title} - ${notification.message.substring(0, 50)}${notification.message.length > 50 ? '...' : ''}`,
				value: extractNotificationId(notification),
			}),
			searchTerm
		);
	} catch (error) {
		throw catchAndFormatError(error, 'list search notifications');
	}
}

export async function getNotificationsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);

		// Fetch notifications
		const notifications = await fetchAllNotifications(this, credentials);

		return createLoadOptions(
			notifications,
			isValidNotification,
			(notification) => ({
				name: `${notification.title} - ${notification.message.substring(0, 50)}${notification.message.length > 50 ? '...' : ''}`,
				value: extractNotificationId(notification),
			})
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load notifications options');
	}
}

// ===== EXECUTION METHOD =====

export async function executeNotifications(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const operation = this.getNodeParameter('operation', 0) as string;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const credentials = await getAirCredentials(this);

			switch (operation) {
				case 'getAll': {
					// Get additional fields for filtering
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as any;
					const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;

					// Build query parameters from additional fields
					const queryParams = buildNotificationQueryParams(additionalFields);

					// Handle pagination
					if (!returnAll && !additionalFields.limit) {
						queryParams.pageSize = 100; // default limit
					}

					// Get notifications
					const response = await notificationsApi.getNotifications(this, credentials, queryParams);
					const notifications = response.result.entities || [];
					const paginationInfo = extractPaginationInfo(response.result);

					// Process results
					processApiResponseEntities(
						notifications,
						returnData,
						itemIndex,
						{
							includePagination: !returnAll,
							paginationData: paginationInfo,
						}
					);
					break;
				}

				case 'deleteAll': {
					// Delete all notifications
					const response = await notificationsApi.deleteAllNotifications(this, credentials);

					returnData.push({
						json: {
							success: response.success,
							statusCode: response.statusCode,
							message: 'All notifications deleted successfully',
						},
						pairedItem: { item: itemIndex },
					});
					break;
				}

				case 'markAllAsRead': {
					// Mark all notifications as read
					const response = await notificationsApi.markAllAsRead(this, credentials);

					returnData.push({
						json: {
							success: response.success,
							statusCode: response.statusCode,
							message: 'All notifications marked as read successfully',
						},
						pairedItem: { item: itemIndex },
					});
					break;
				}

				case 'markAsReadById': {
					// Get notification ID from resource locator
					const notificationId = this.getNodeParameter('notificationId', itemIndex) as any;
					let id: string;

					if (typeof notificationId === 'string') {
						id = notificationId;
					} else if (notificationId.mode === 'list') {
						id = notificationId.value;
					} else if (notificationId.mode === 'id') {
						id = notificationId.value;
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid notification ID format', { itemIndex });
					}

					// Validate the ID
					id = normalizeAndValidateId(id, 'Notification ID');

					// Mark notification as read by ID
					const response = await notificationsApi.markAsReadById(this, credentials, id);

					returnData.push({
						json: response.result as any,
						pairedItem: { item: itemIndex },
					});
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
			}

		} catch (error) {
			handleExecuteError(this, error, itemIndex, returnData);
		}
	}

	return [returnData];
}
