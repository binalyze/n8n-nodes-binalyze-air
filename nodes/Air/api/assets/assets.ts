/**
 * Assets API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing endpoint assets and their operations.
 *
 * The module includes:
 * - Asset interface: Represents a single asset in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Assets API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

// ===== ASSET INTERFACES =====

export interface Asset {
  _id: string;
  name: string;
  ipAddress: string;
  platform: string;
  version: string;
  onlineStatus: string;
  managedStatus: string;
  isolationStatus: string;
  groupId?: string;
  groupFullPath?: string;
  policy?: string;
  tags?: string[];
  organizationId: number;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetsResponse {
  success: boolean;
  result: {
    entities: Asset[];
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

export interface GetAssetResponse {
  success: boolean;
  result: Asset;
  statusCode: number;
  errors: string[];
}

export interface AssetTask {
  _id: string;
  taskId: string;
  name: string;
  type: string;
  endpointId: string;
  endpointName: string;
  organizationId: number;
  status: string;
  recurrence: string | null;
  progress: number;
  durations: {
    processing?: number;
  } | null;
  duration: number | null;
  caseIds: string[];
  metadata: {
    purged: boolean;
    hasCaseDb: boolean;
    hasCasePpc: boolean;
    hasDroneData: boolean;
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  response: {
    errorMessage: string | null;
    caseDirectory: string | null;
    matchCount: string | null;
    result: any;
  } | null;
}

export interface AssetTasksResponse {
  success: boolean;
  result: {
    entities: AssetTask[];
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

// Updated interfaces based on platform code
export interface AddTagsRequest {
  tags: string[];
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    label?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string[];
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds: number[]; // Required field
    connectionRouteId?: number;
    hasConnectionRoute?: boolean;
    caseId?: string;
    awsRegions?: string[];
    azureRegions?: string[];
    agentInstalled?: boolean;
    isServer?: boolean;
  };
}

export interface RemoveTagsRequest {
  tags: string[];
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    label?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string[];
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: number[];
    connectionRouteId?: number;
    hasConnectionRoute?: boolean;
    caseId?: string;
    awsRegions?: string[];
    azureRegions?: string[];
    agentInstalled?: boolean;
    isServer?: boolean;
  };
}

export interface TagsOperationResponse {
  success: boolean;
  result: any; // The actual response doesn't have a specific structure
  statusCode: number;
  errors: string[];
}

// ===== DEVICE ACTION INTERFACES =====

export interface DeviceActionFilter {
  searchTerm?: string;
  name?: string;
  ipAddress?: string;
  label?: string;
  managedStatus?: string[];
  isolationStatus?: string[];
  platform?: string[];
  tags?: string[];
  includedEndpointIds?: string[];
  organizationIds: number[]; // Required field
  caseId?: string;
  isServer?: boolean;
}

export interface RebootRequest {
  filter: DeviceActionFilter;
}

export interface ShutdownRequest {
  filter: DeviceActionFilter;
}

export interface IsolationRequest {
  enabled: boolean;
  filter: DeviceActionFilter;
}

export interface DeviceActionTask {
  _id: string;
  taskId: string;
  name: string;
  type: string;
  endpointId: string;
  endpointName: string;
  organizationId: number;
  status: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface DeviceActionResponse {
  success: boolean;
  result: DeviceActionTask[];
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  async getAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<AssetsResponse> {
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const qs: Record<string, string | number> = {
      'filter[organizationIds]': orgIds
    };

    if (queryParams) {
      Object.assign(qs, queryParams);
    }

    const options = buildRequestOptionsWithErrorHandling(credentials, 'GET', '/api/public/assets', qs);
    return makeApiRequestWithErrorHandling<AssetsResponse>(context, options, 'fetch assets');
  },

  async getAssetById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetAssetResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'GET', `/api/public/assets/${id}`);
    return makeApiRequestWithErrorHandling<GetAssetResponse>(context, options, `fetch asset with ID ${id}`);
  },

  async getAssetTasks(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    queryParams?: Record<string, string | number | string[]>
  ): Promise<AssetTasksResponse> {
    const qs: Record<string, string | number> = {};

    if (queryParams) {
      // Handle array parameters for filters
      Object.entries(queryParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Convert array to comma-separated string for query params
          qs[key] = value.join(',');
        } else {
          qs[key] = value;
        }
      });
    }

    const options = buildRequestOptionsWithErrorHandling(credentials, 'GET', `/api/public/assets/${id}/tasks`, qs);
    return makeApiRequestWithErrorHandling<AssetTasksResponse>(context, options, `fetch tasks for asset ${id}`);
  },

  async addTagsToAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AddTagsRequest
  ): Promise<TagsOperationResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'POST', '/api/public/assets/tags');
    options.body = data;
    return makeApiRequestWithErrorHandling<TagsOperationResponse>(context, options, 'add tags to assets');
  },

  async removeTagsFromAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: RemoveTagsRequest
  ): Promise<TagsOperationResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'DELETE', '/api/public/assets/tags');
    options.body = data;
    return makeApiRequestWithErrorHandling<TagsOperationResponse>(context, options, 'remove tags from assets');
  },

  async rebootAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: RebootRequest
  ): Promise<DeviceActionResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'POST', '/api/public/assets/tasks/reboot');
    options.body = data;
    return makeApiRequestWithErrorHandling<DeviceActionResponse>(context, options, 'reboot assets');
  },

  async shutdownAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: ShutdownRequest
  ): Promise<DeviceActionResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'POST', '/api/public/assets/tasks/shutdown');
    options.body = data;
    return makeApiRequestWithErrorHandling<DeviceActionResponse>(context, options, 'shutdown assets');
  },

  async setIsolationOnAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: IsolationRequest
  ): Promise<DeviceActionResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'POST', '/api/public/assets/tasks/isolation');
    options.body = data;
    return makeApiRequestWithErrorHandling<DeviceActionResponse>(context, options, 'set isolation on assets');
  }
};
