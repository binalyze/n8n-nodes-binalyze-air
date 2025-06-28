/**
 * Auto Asset Tags API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing auto asset tags.
 *
 * The module includes:
 * - AutoAssetTag interface: Represents a single auto asset tag in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Auto Asset Tags API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== AUTO ASSET TAG INTERFACES =====

export interface AutoAssetTag {
  _id: string;
  tag: string;
  query: string;
  organizationIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletable: boolean;
  count?: number;
}

export interface AutoAssetTagsResponse {
  success: boolean;
  result: {
    entities: AutoAssetTag[];
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

export interface CreateAutoAssetTagRequest {
  tag: string;
  query: string;
  organizationIds: number[];
}

export interface CreateAutoAssetTagResponse {
  success: boolean;
  result: AutoAssetTag;
  statusCode: number;
  errors: string[];
}

export interface UpdateAutoAssetTagRequest {
  tag: string;
  query: string;
  organizationIds: number[];
}

export interface UpdateAutoAssetTagResponse {
  success: boolean;
  result: AutoAssetTag;
  statusCode: number;
  errors: string[];
}

export interface DeleteAutoAssetTagResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetAutoAssetTagResponse {
  success: boolean;
  result: AutoAssetTag;
  statusCode: number;
  errors: string[];
}

export interface StartTaggingRequest {
  autoAssetTagId: string;
  filter?: {
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

export interface StartTaggingResponse {
  success: boolean;
  result: Array<{
    _id: string;
    name: string;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {

  /**
   * Get auto asset tags
   */
  async getAutoAssetTags(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<AutoAssetTagsResponse> {
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

      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/auto-asset-tag',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch auto asset tags');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch auto asset tags: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Create auto asset tag
   */
  async createAutoAssetTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateAutoAssetTagRequest
  ): Promise<CreateAutoAssetTagResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/auto-asset-tag'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create auto asset tag');
      return response;
    } catch (error) {
      throw new Error(`Failed to create auto asset tag: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Update auto asset tag
   */
  async updateAutoAssetTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateAutoAssetTagRequest
  ): Promise<UpdateAutoAssetTagResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/auto-asset-tag/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update auto asset tag with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update auto asset tag: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Delete auto asset tag
   */
  async deleteAutoAssetTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteAutoAssetTagResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/auto-asset-tag/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete auto asset tag with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete auto asset tag: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Get auto asset tag by ID
   */
  async getAutoAssetTagById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetAutoAssetTagResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/auto-asset-tag/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch auto asset tag with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch auto asset tag with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Start tagging process
   */
  async startTagging(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: StartTaggingRequest
  ): Promise<StartTaggingResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/auto-asset-tag/start-tagging'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'start tagging process');
      return response;
    } catch (error) {
      throw new Error(`Failed to start tagging process: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
