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
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

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
    try {
      const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

      // Build the query string parameters
      const qs: Record<string, string | number> = {
        'filter[organizationIds]': orgIds
      };

      // Add additional query parameters if provided
      if (queryParams) {
        Object.assign(qs, queryParams);
      }

      const options = buildRequestOptions(credentials, 'GET', '/api/public/assets', qs);
      const responseData = await context.helpers.httpRequest!(options) as AssetsResponse;

      validateApiResponse(responseData, 'Getting assets');
      return responseData;
    } catch (error) {
      throw new Error(`Failed to get assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAssetById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetAssetResponse> {
    try {
      const options = buildRequestOptions(credentials, 'GET', `/api/public/assets/${id}`);
      const responseData = await context.helpers.httpRequest!(options) as GetAssetResponse;

      if (!responseData.success) {
        const errorMessage = responseData.errors?.join(', ') || 'API request failed';
        throw new Error(`Getting asset by ID: ${errorMessage}`);
      }
      return responseData;
    } catch (error) {
      throw new Error(`Failed to get asset by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAssetTasksById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<AssetTasksResponse> {
    try {
      const options = buildRequestOptions(credentials, 'GET', `/api/public/assets/${id}/tasks`);
      const responseData = await context.helpers.httpRequest!(options) as AssetTasksResponse;

      validateApiResponse(responseData, 'Getting asset tasks by ID');
      return responseData;
    } catch (error) {
      throw new Error(`Failed to get asset tasks by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async assignTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignTaskRequest
  ): Promise<AssignTaskResponse> {
    try {
      const options = buildRequestOptions(credentials, 'POST', '/api/public/assets/assign');
      options.body = data;

      const responseData = await context.helpers.httpRequest!(options) as AssignTaskResponse;

      validateApiResponse(responseData, 'Assigning task to assets');
      return responseData;
    } catch (error) {
      throw new Error(`Failed to assign task to assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async addTagsToAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AddTagsRequest
  ): Promise<TagsOperationResponse> {
    try {
      const options = buildRequestOptions(credentials, 'POST', '/api/public/assets/tags');
      options.body = data;

      const responseData = await context.helpers.httpRequest!(options) as TagsOperationResponse;

      if (!responseData.success) {
        const errorMessage = responseData.errors?.join(', ') || 'API request failed';
        throw new Error(`Adding tags to assets: ${errorMessage}`);
      }
      return responseData;
    } catch (error) {
      throw new Error(`Failed to add tags to assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async removeTagsFromAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: RemoveTagsRequest
  ): Promise<TagsOperationResponse> {
    try {
      const options = buildRequestOptions(credentials, 'DELETE', '/api/public/assets/tags');
      options.body = data;

      const responseData = await context.helpers.httpRequest!(options) as TagsOperationResponse;

      if (!responseData.success) {
        const errorMessage = responseData.errors?.join(', ') || 'API request failed';
        throw new Error(`Removing tags from assets: ${errorMessage}`);
      }
      return responseData;
    } catch (error) {
      throw new Error(`Failed to remove tags from assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async uninstallAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: UninstallAssetsRequest
  ): Promise<UninstallAssetsResponse> {
    try {
      const options = buildRequestOptions(credentials, 'DELETE', '/api/public/assets/uninstall');
      options.body = data;

      const responseData = await context.helpers.httpRequest!(options) as UninstallAssetsResponse;

      if (!responseData.success) {
        const errorMessage = responseData.errors?.join(', ') || 'API request failed';
        throw new Error(`Uninstalling assets: ${errorMessage}`);
      }
      return responseData;
    } catch (error) {
      throw new Error(`Failed to uninstall assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async purgeAndUninstallAssets(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: PurgeAssetsRequest
  ): Promise<UninstallAssetsResponse> {
    try {
      const options = buildRequestOptions(credentials, 'DELETE', '/api/public/assets/purge');
      options.body = data;

      const responseData = await context.helpers.httpRequest!(options) as UninstallAssetsResponse;

      if (!responseData.success) {
        const errorMessage = responseData.errors?.join(', ') || 'API request failed';
        throw new Error(`Purging and uninstalling assets: ${errorMessage}`);
      }
      return responseData;
    } catch (error) {
      throw new Error(`Failed to purge and uninstall assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
