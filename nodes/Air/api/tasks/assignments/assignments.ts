/**
 * Task Assignments API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving task assignment information.
 *
 * The module includes:
 * - TaskAssignment interface: Represents a single task assignment in the system
 * - TaskAssignmentsResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Task Assignments API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../../utils/helpers';

export interface TaskAssignment {
  _id: string;
  taskId: string;
  name: string;
  type: string;
  endpointId: string;
  endpointName: string;
  organizationId: number;
  status: string;
  recurrence: null | any;
  progress: number;
  duration: null | number;
  caseIds: string[];
  createdAt: string;
  updatedAt: string;
  response: null | any;
}

export interface CaseOption {
  label: string;
  value: string;
}

export interface TaskAssignmentsResponse {
  success: boolean;
  result: {
    entities: TaskAssignment[];
    filters: Array<{
      name: string;
      type: string;
      options: string[] | CaseOption[];
      filterUrl: string | null;
    }>;
    sortables: string[];
    totalEntityCount: number;
    currentPage: number;
    pageSize: number;
    previousPage: number;
    totalPageCount: number;
    nextPage: number;
  };
  statusCode: number;
  errors: string[];
}

export interface CancelTaskAssignmentResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface DeleteTaskAssignmentResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export const api = {
  async getTaskAssignments(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    taskId: string
  ): Promise<TaskAssignmentsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/tasks/${taskId}/assignments`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch task assignments for task ${taskId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch task assignments: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async cancelTaskAssignment(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    assignmentId: string
  ): Promise<CancelTaskAssignmentResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/tasks/assignments/${assignmentId}/cancel`
      );
      requestOptions.body = {};

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `cancel task assignment ${assignmentId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to cancel task assignment: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteTaskAssignment(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    assignmentId: string
  ): Promise<DeleteTaskAssignmentResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/tasks/assignments/${assignmentId}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete task assignment ${assignmentId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete task assignment: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
