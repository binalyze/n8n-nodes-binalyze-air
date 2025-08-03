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
	validateApiResponse,
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

import { api as tasksApi, Task } from '../api/tasks/tasks';
import { api as taskAssignmentsApi } from '../api/tasks/assignments/assignments';
import { findOrganizationByName } from './organizations';

export const TasksOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tasks'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific task',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Get Task Assignments',
				value: 'getTaskAssignments',
				description: 'Retrieve assignments for a specific task',
				action: 'Get task assignments',
			},
			{
				name: 'Wait for Completion',
				value: 'waitForCompletion',
				description: 'Wait for a task to complete with polling',
				action: 'Wait for task completion',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		placeholder: 'Enter task ID',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['get', 'getTaskAssignments', 'waitForCompletion'],
			},
		},
		required: true,
		description: 'The ID of the task',
	},
	{
		displayName: 'Timeout (Seconds)',
		name: 'timeout',
		type: 'number',
		default: 300,
		placeholder: '300',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['waitForCompletion'],
			},
		},
		required: true,
		description: 'Maximum time to wait for completion in seconds. Set to 0 to wait indefinitely.',
		typeOptions: {
			minValue: 0,
		},
	},
	{
		displayName: 'Organization',
		name: 'organizationIds',
		type: 'resourceLocator',
		default: { mode: 'id', value: '0' },
		placeholder: 'Select organization(s)...',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
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
							regex: '^[0-9,\\s]+$',
							errorMessage: 'Organization IDs must be comma-separated numbers. Use "0" for all organizations.',
						},
					},
				],
				placeholder: 'Enter organization IDs (comma-separated) or "0" for all',
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Enter organization name',
			},
		],
		required: true,
		description: 'Organization(s) to filter tasks. Use "0" for all organizations, specific IDs for multiple organizations, or search by name for a single organization.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter By Execution Type',
				name: 'executionType',
				type: 'multiOptions',
				default: [],
				description: 'Filter tasks by execution type',
				options: [
					{
						name: 'Now',
						value: 'now',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
			},
			{
				displayName: 'Filter By Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter tasks by name (supports partial matches)',
			},
			{
				displayName: 'Filter By Source',
				name: 'source',
				type: 'multiOptions',
				default: [],
				description: 'Filter tasks by source',
				options: [
					{
						name: 'API',
						value: 'api',
					},
					{
						name: 'Scheduler',
						value: 'scheduler',
					},
					{
						name: 'System',
						value: 'system',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Webhook',
						value: 'webhook',
					},
				],
			},
			{
				displayName: 'Filter By Status',
				name: 'status',
				type: 'multiOptions',
				default: [],
				description: 'Filter tasks by status',
				options: [
					{
						name: 'Assigned',
						value: 'assigned',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Failed',
						value: 'failed',
					},
					{
						name: 'Processing',
						value: 'processing',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
			},
			{
				displayName: 'Filter By Type',
				name: 'type',
				type: 'multiOptions',
				default: [],
				description: 'Filter tasks by type',
				options: [
					{
						name: 'Acquire Image',
						value: 'acquire-image',
					},
					{
						name: 'Acquisition',
						value: 'acquisition',
					},
					{
						name: 'Agent Deployment',
						value: 'agent-deployment',
					},
					{
						name: 'Auto Tagging',
						value: 'auto-tagging',
					},
					{
						name: 'Baseline Acquisition',
						value: 'baseline-acquisition',
					},
					{
						name: 'Baseline Comparison',
						value: 'baseline-comparison',
					},
					{
						name: 'Calculate Hash',
						value: 'calculate-hash',
					},
					{
						name: 'Interact Shell',
						value: 'interact-shell',
					},
					{
						name: 'Investigation',
						value: 'investigation',
					},
					{
						name: 'Isolation',
						value: 'isolation',
					},
					{
						name: 'Log Retrieval',
						value: 'log-retrieval',
					},
					{
						name: 'Migration',
						value: 'migration',
					},
					{
						name: 'Offline Acquisition',
						value: 'offline-acquisition',
					},
					{
						name: 'Offline Triage',
						value: 'offline-triage',
					},
					{
						name: 'Purge Local Data',
						value: 'purge-local-data',
					},
					{
						name: 'Reboot',
						value: 'reboot',
					},
					{
						name: 'Retry Upload',
						value: 'retry-upload',
					},
					{
						name: 'Shutdown',
						value: 'shutdown',
					},
					{
						name: 'Triage',
						value: 'triage',
					},
					{
						name: 'Uninstall',
						value: 'uninstall',
					},
					{
						name: 'Version Update',
						value: 'version-update',
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

/**
 * Extract task ID from task object with comprehensive field checking
 */
export function extractTaskId(task: any): string {
	return extractEntityId(task, 'task');
}

/**
 * Extract task assignment ID from task assignment object
 */
export function extractTaskAssignmentId(assignment: any): string {
	return extractEntityId(assignment, 'assignment');
}

/**
 * Validate that a task has a valid ID and name
 */
export function isValidTask(task: any): boolean {
	return isValidEntity(task, ['name']);
}

/**
 * Validate that a task assignment has a valid ID and name.
 */
export function isValidTaskAssignment(assignment: any): boolean {
	return isValidEntity(assignment, ['name']);
}

// List search method for resource locator
export async function getTasks(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	try {
		const credentials = await getAirCredentials(this);

		// Get all tasks with default organization filter and search term
		const options: any = {};
		if (filter) {
			options.searchTerm = filter;
		}

		const response = await tasksApi.getTasks(this, credentials, '0', options);
		validateApiResponse(response);

		const allTasks = response.result?.entities || [];

		return createListSearchResults(
			allTasks,
			isValidTask,
			(task: Task) => ({
				name: task.name || `Task ${task._id}`,
				value: extractTaskId(task),
				url: task.type || '',
			}),
			filter
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load tasks');
	}
}

// Load options method for dropdowns (legacy support)
export async function getTasksOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await getAirCredentials(this);

		// Get all tasks with default organization filter
		const response = await tasksApi.getTasks(this, credentials, '0');
		validateApiResponse(response);

		const allTasks = response.result?.entities || [];

		return createLoadOptions(
			allTasks,
			isValidTask,
			(task: Task) => {
				const taskId = extractTaskId(task);
				const name = task.name || `Task ${taskId || 'Unknown'}`;

				return {
					name,
					value: taskId,
				};
			}
		);
	} catch (error) {
		throw catchAndFormatError(error, 'load tasks');
	}
}

// Execute function for tasks
export async function executeTasks(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const credentials = await getAirCredentials(this);

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = this.getNodeParameter('operation', i) as string;

			switch (operation) {
				case 'getAll': {
					const organizationResource = this.getNodeParameter('organizationIds', i) as any;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;
					let organizationIds: string;

					if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
						organizationIds = String(organizationResource.value);
					} else if (organizationResource.mode === 'name') {
						try {
							const orgId = await findOrganizationByName(this, credentials, organizationResource.value);
							organizationIds = orgId;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
						}
					} else {
						throw new NodeOperationError(this.getNode(), 'Invalid organization selection mode', {
							itemIndex: i,
						});
					}

					// Parse organization IDs
					const orgIds = organizationIds.trim();
					if (!orgIds) {
						throw new NodeOperationError(this.getNode(), 'Organization IDs cannot be empty', {
							itemIndex: i,
						});
					}

					// Build options object from additionalFields
					const options: any = {};

					if (additionalFields.pageNumber) {
						options.pageNumber = additionalFields.pageNumber;
					}

					if (additionalFields.pageSize) {
						options.pageSize = additionalFields.pageSize;
					}

					if (additionalFields.name) {
						options.name = additionalFields.name;
					}

					if (additionalFields.type) {
						options.type = additionalFields.type;
					}

					if (additionalFields.source) {
						options.source = additionalFields.source;
					}

					if (additionalFields.status) {
						options.status = additionalFields.status;
					}

					if (additionalFields.executionType) {
						options.executionType = additionalFields.executionType;
					}

					const response = await tasksApi.getTasks(this, credentials, orgIds, Object.keys(options).length > 0 ? options : undefined);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractPaginationInfo(response.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'get': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						normalizeAndValidateId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await tasksApi.getTaskById(this, credentials, taskId);

					// Custom validation for single entity response
					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to get task: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					if (!response.result) {
						throw new NodeOperationError(this.getNode(), 'Task not found', {
							itemIndex: i,
						});
					}

					returnData.push({
						json: response.result as any,
						pairedItem: i,
					});
					break;
				}

				case 'getTaskAssignments': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						normalizeAndValidateId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await taskAssignmentsApi.getTaskAssignments(this, credentials, taskId);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractPaginationInfo(response.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntities(entities, returnData, i, {
						includePagination: true,
						paginationData: paginationInfo,
						excludeFields: ['sortables', 'filters'], // Exclude for simplified pagination
					});
					break;
				}

				case 'waitForCompletion': {
					const taskId = this.getNodeParameter('taskId', i) as string;
					const timeout = this.getNodeParameter('timeout', i) as number;

					// Validate task ID
					try {
						normalizeAndValidateId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					// Set polling interval based on timeout
					const pollingInterval = timeout === 0 ? 300000 : 60000; // 5 minutes if indefinite, otherwise 1 minute
					const startTime = Date.now();
					let taskCompleted = false;

					// Polling loop
					while (!taskCompleted) {
						try {
							const response = await tasksApi.getTaskById(this, credentials, taskId);

							if (!response.success) {
								const errorMessage = response.errors?.join(', ') || 'Failed to get task status';
								throw new NodeOperationError(this.getNode(), errorMessage, {
									itemIndex: i,
								});
							}

							if (!response.result) {
								throw new NodeOperationError(this.getNode(), 'Task not found', {
									itemIndex: i,
								});
							}

							const task = response.result;

							// Check if task is completed
							if (task.status === 'completed') {
								taskCompleted = true;
								returnData.push({
									json: {
										success: true,
										message: 'Task completed successfully',
										status: task.status,
										task: task,
									},
									pairedItem: i,
								});
								break;
							}

							// Check if task failed or was cancelled
							if (task.status === 'cancelled') {
								returnData.push({
									json: {
										success: false,
										message: 'Task was cancelled',
										status: task.status,
										error: 'Task was cancelled before completion',
										task: task,
									},
									pairedItem: i,
								});
								break;
							}

							if (task.status === 'failed') {
								returnData.push({
									json: {
										success: false,
										message: 'Task failed',
										status: task.status,
										error: 'Task failed during execution',
										task: task,
									},
									pairedItem: i,
								});
								break;
							}

							// Check timeout (skip if timeout is 0 for indefinite wait)
							if (timeout > 0) {
								const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
								if (elapsedTime >= timeout) {
									returnData.push({
										json: {
											success: false,
											message: `Task did not complete within ${timeout} seconds`,
											status: task.status,
											error: `Timeout exceeded. Task is still in status: ${task.status}`,
											task: task,
										},
										pairedItem: i,
									});
									break;
								}
							}

							// Wait before next poll
							await new Promise(resolve => setTimeout(resolve, pollingInterval));

						} catch (error) {
							// Re-throw the error to be handled by the outer try-catch
							throw error;
						}
					}
					break;
				}

				default: {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
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
