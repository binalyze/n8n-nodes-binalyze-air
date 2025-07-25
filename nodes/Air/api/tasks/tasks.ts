/**
 * Tasks API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving tasks information.
 *
 * The module includes:
 * - Task interface: Represents a single task in the system
 * - TasksResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Tasks API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

export interface Task {
  _id: string;
  source: string;
  totalAssignedEndpoints: number;
  totalCompletedEndpoints: number;
  totalFailedEndpoints: number;
  totalCancelledEndpoints: number;
  isScheduled: boolean;
  name: string;
  type: string;
  organizationId: number;
  status: string;
  createdBy: string;
  baseTaskId: string | null;
  startDate: string | null;
  recurrence: string | null;
  createdAt: string;
  updatedAt: string;
  data?: {
    profileId?: string;
    profileName?: string;
    windows?: {
      evidenceTypes?: string[];
      custom?: any[];
      networkCapture?: {
        enabled: boolean;
        duration: number;
        pcap?: {
          enabled: boolean;
        };
        networkFlow?: {
          enabled: boolean;
        };
      };
    };
    linux?: {
      evidenceTypes?: string[];
      custom?: any[];
    };
    config?: {
      choice?: string;
      saveTo?: {
        windows?: {
          location: string;
          path: string;
          useMostFreeVolume: boolean;
          volume: string;
          tmp: string;
        };
        linux?: {
          location: string;
          path: string;
          useMostFreeVolume: boolean;
          volume: string;
          tmp: string;
        };
      };
      cpu?: {
        limit: number;
      };
      compression?: {
        enabled: boolean;
        encryption?: {
          enabled: boolean;
          password: string;
        };
      };
    };
    drone?: {
      minScore: number;
      autoPilot: boolean;
      enabled: boolean;
      analyzers: string[];
      keywords: string[];
    };
  };
}

export interface TasksResponse {
  success: boolean;
  result: {
    entities: Task[];
    filters: Array<{
      name: string;
      type: string;
      options: string[];
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

export interface TaskResponse {
  success: boolean;
  result: Task;
  statusCode: number;
  errors: string[];
}

export const api = {
  async getTasks(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    options?: {
      pageNumber?: number;
      pageSize?: number;
      name?: string;
      type?: string[];
      source?: string[];
      status?: string[];
      executionType?: string[];
      createdByFilter?: string;
      sortBy?: string;
      sortType?: string;
      // Legacy parameters for backward compatibility
      searchTerm?: string;
      statusFilter?: string;
      typeFilter?: string;
      scheduledOnly?: boolean;
    }
  ): Promise<TasksResponse> {
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const queryParams: Record<string, string | number> = {
      'filter[organizationIds]': orgIds
    };

      // Add pagination parameters
      if (options?.pageNumber) {
        queryParams.pageNumber = options.pageNumber;
      }

      if (options?.pageSize) {
        queryParams.pageSize = options.pageSize;
      }

      // Add name filter (replaces searchTerm)
      if (options?.name || options?.searchTerm) {
        queryParams['filter[name]'] = options.name || options.searchTerm || '';
      }

      // Add type filter (supports multiple values)
      if (options?.type && options.type.length > 0) {
        queryParams['filter[type]'] = options.type.join(',');
      } else if (options?.typeFilter) {
        // Legacy support
        queryParams['filter[type]'] = options.typeFilter;
      }

      // Add source filter (supports multiple values)
      if (options?.source && options.source.length > 0) {
        queryParams['filter[source]'] = options.source.join(',');
      }

      // Add status filter (supports multiple values)
      if (options?.status && options.status.length > 0) {
        queryParams['filter[status]'] = options.status.join(',');
      } else if (options?.statusFilter) {
        // Legacy support
        queryParams['filter[status]'] = options.statusFilter;
      }

      // Add execution type filter (supports multiple values)
      if (options?.executionType && options.executionType.length > 0) {
        queryParams['filter[executionType]'] = options.executionType.join(',');
      }

      // Add created by filter
      if (options?.createdByFilter) {
        queryParams['filter[createdBy]'] = options.createdByFilter;
      }

      // Legacy scheduled only filter
      if (options?.scheduledOnly) {
        queryParams['filter[isScheduled]'] = 'true';
      }

      // Add sorting parameters
      if (options?.sortBy) {
        queryParams.sortBy = options.sortBy;
      }

      if (options?.sortType) {
        queryParams.sortType = options.sortType;
      }

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        '/api/public/tasks',
        queryParams
      );

      const response = await makeApiRequestWithErrorHandling<TasksResponse>(context, requestOptions, 'fetch tasks');
      return response;
  },

  async getTaskById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<TaskResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/tasks/${id}`
    );

    const response = await makeApiRequestWithErrorHandling<TaskResponse>(context, requestOptions, `fetch task with ID ${id}`);
    return response;
  },
};
