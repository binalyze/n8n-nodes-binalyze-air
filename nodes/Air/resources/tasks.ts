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
	extractSimplifiedPaginationInfo,
	processApiResponseEntitiesWithSimplifiedPagination,
	requireValidId,
	catchAndFormatError,
} from './helpers';

import { api as tasksApi, Task } from '../api/tasks/tasks';
import { api as taskAssignmentsApi } from '../api/tasks/assignments/assignments';

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
				name: 'Cancel Task',
				value: 'cancelTask',
				description: 'Cancel a specific task',
				action: 'Cancel a task',
			},
			{
				name: 'Cancel Task Assignment',
				value: 'cancelTaskAssignment',
				description: 'Cancel a specific task assignment',
				action: 'Cancel a task assignment',
			},
			{
				name: 'Delete Task',
				value: 'deleteTask',
				description: 'Delete a specific task',
				action: 'Delete a task',
			},
			{
				name: 'Delete Task Assignment',
				value: 'deleteTaskAssignment',
				description: 'Delete a specific task assignment',
				action: 'Delete a task assignment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Get Task',
				value: 'get',
				description: 'Retrieve a specific task',
				action: 'Get a task',
			},
			{
				name: 'Get Task Assignments',
				value: 'getTaskAssignments',
				description: 'Retrieve assignments for a specific task',
				action: 'Get task assignments',
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
				operation: ['get', 'cancelTask', 'deleteTask', 'getTaskAssignments'],
			},
		},
		required: true,
		description: 'The ID of the task',
	},
	{
		displayName: 'Task Assignment ID',
		name: 'taskAssignmentId',
		type: 'string',
		default: '',
		placeholder: 'Enter task assignment ID',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['cancelTaskAssignment', 'deleteTaskAssignment'],
			},
		},
		required: true,
		description: 'The ID of the task assignment',
	},
	{
		displayName: 'Organization IDs',
		name: 'organizationIds',
		type: 'string',
		default: '0',
		placeholder: 'Enter organization IDs (comma-separated)',
		displayOptions: {
			show: {
				resource: ['tasks'],
				operation: ['getAll'],
			},
		},
		description: 'Comma-separated list of organization IDs to filter tasks. Use "0" for all organizations.',
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

		// Get all tasks with default organization filter
		const response = await tasksApi.getTasks(this, credentials, '0');
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
					const organizationIds = this.getNodeParameter('organizationIds', i) as string;

					// Parse organization IDs
					const orgIds = organizationIds.trim();
					if (!orgIds) {
						throw new NodeOperationError(this.getNode(), 'Organization IDs cannot be empty', {
							itemIndex: i,
						});
					}

					const response = await tasksApi.getTasks(this, credentials, orgIds);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractSimplifiedPaginationInfo(response.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);
					break;
				}

				case 'get': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						requireValidId(taskId, 'Task ID');
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

				case 'cancelTask': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						requireValidId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await tasksApi.cancelTaskById(this, credentials, taskId);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to cancel task: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							taskId,
							cancelled: true,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'deleteTask': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						requireValidId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await tasksApi.deleteTaskById(this, credentials, taskId);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to delete task: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							taskId,
							deleted: true,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'getTaskAssignments': {
					const taskId = this.getNodeParameter('taskId', i) as string;

					// Validate task ID
					try {
						requireValidId(taskId, 'Task ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await taskAssignmentsApi.getTaskAssignments(this, credentials, taskId);
					validateApiResponse(response);

					const entities = response.result?.entities || [];
					const paginationInfo = extractSimplifiedPaginationInfo(response.result);

					// Process entities with simplified pagination attached to each entity
					processApiResponseEntitiesWithSimplifiedPagination(entities, paginationInfo, returnData, i);
					break;
				}

				case 'cancelTaskAssignment': {
					const taskAssignmentId = this.getNodeParameter('taskAssignmentId', i) as string;

					// Validate task assignment ID
					try {
						requireValidId(taskAssignmentId, 'Task Assignment ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await taskAssignmentsApi.cancelTaskAssignment(this, credentials, taskAssignmentId);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to cancel task assignment: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							taskAssignmentId,
							cancelled: true,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
					break;
				}

				case 'deleteTaskAssignment': {
					const taskAssignmentId = this.getNodeParameter('taskAssignmentId', i) as string;

					// Validate task assignment ID
					try {
						requireValidId(taskAssignmentId, 'Task Assignment ID');
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error.message, {
							itemIndex: i,
						});
					}

					const response = await taskAssignmentsApi.deleteTaskAssignment(this, credentials, taskAssignmentId);

					if (!response.success) {
						const errorMessage = response.errors?.join(', ') || 'API request failed';
						throw new NodeOperationError(this.getNode(), `Failed to delete task assignment: ${errorMessage}`, {
							itemIndex: i,
						});
					}

					returnData.push({
						json: {
							taskAssignmentId,
							deleted: true,
							success: response.success,
							statusCode: response.statusCode,
						},
						pairedItem: i,
					});
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
