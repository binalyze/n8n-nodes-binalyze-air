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
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assetId: string;
  caseId?: string;
  type: string;
}

export interface AssetTasksResponse {
  success: boolean;
  result: AssetTask[];
  statusCode: number;
  errors: string[];
}

export interface AssignTaskRequest {
  caseId: string;
  taskConfig: {
    choice: string;
  };
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface AssignTaskResponse {
  success: boolean;
  result: Array<{
    _id: string;
    name: string;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

export interface AddTagsRequest {
  tags: string[];
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
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
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface TagsOperationResponse {
  success: boolean;
  result: {
    affectedAssets: number;
    message: string;
  };
  statusCode: number;
  errors: string[];
}

export interface UninstallAssetsRequest {
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface PurgeAssetsRequest {
  filter: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface UninstallAssetsResponse {
  success: boolean;
  result: {
    affectedAssets: number;
    message: string;
  };
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
    id: string
  ): Promise<AssetTasksResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'GET', `/api/public/assets/${id}/tasks`);
    return makeApiRequestWithErrorHandling<AssetTasksResponse>(context, options, `fetch tasks for asset ${id}`);
  },

  async assignAssetTasks(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignTaskRequest
  ): Promise<AssignTaskResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'POST', '/api/public/assets/assign');
    options.body = data;
    return makeApiRequestWithErrorHandling<AssignTaskResponse>(context, options, 'assign asset tasks');
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

  async uninstallAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: UninstallAssetsRequest
  ): Promise<UninstallAssetsResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'DELETE', '/api/public/assets/uninstall');
    options.body = data;
    return makeApiRequestWithErrorHandling<UninstallAssetsResponse>(context, options, 'uninstall assets');
  },

  async purgeAndUninstallAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: PurgeAssetsRequest
  ): Promise<UninstallAssetsResponse> {
    const options = buildRequestOptionsWithErrorHandling(credentials, 'DELETE', '/api/public/assets/purge');
    options.body = data;
    return makeApiRequestWithErrorHandling<UninstallAssetsResponse>(context, options, 'purge and uninstall assets');
  }
};
