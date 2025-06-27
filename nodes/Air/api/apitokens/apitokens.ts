/**
 * API Tokens API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing API tokens.
 *
 * The module includes:
 * - ApiToken interface: Represents a single API token in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the API Tokens API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== API TOKEN INTERFACES =====

export interface ApiToken {
  _id: string;
  name: string;
  token?: string;
  organizationId: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface ApiTokensResponse {
  success: boolean;
  result: {
    entities: ApiToken[];
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

export interface CreateApiTokenRequest {
  name: string;
  organizationId?: number;
  expiresAt?: string;
  description?: string;
}

export interface CreateApiTokenResponse {
  success: boolean;
  result: ApiToken & {
    token: string;
  };
  statusCode: number;
  errors: string[];
}

export interface UpdateApiTokenRequest {
  name: string;
  expiresAt?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateApiTokenResponse {
  success: boolean;
  result: ApiToken;
  statusCode: number;
  errors: string[];
}

export interface DeleteApiTokenResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetApiTokenResponse {
  success: boolean;
  result: ApiToken;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  async getApiTokens(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<ApiTokensResponse> {
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
        '/api/public/api-tokens',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch API tokens');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch API tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateApiTokenRequest
  ): Promise<CreateApiTokenResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/api-tokens'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create API token');
      return response;
    } catch (error) {
      throw new Error(`Failed to create API token: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateApiTokenRequest
  ): Promise<UpdateApiTokenResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/api-tokens/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update API token with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update API token: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteApiTokenResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/api-tokens/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete API token with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete API token: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getApiTokenById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetApiTokenResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/api-tokens/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch API token with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch API token with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
