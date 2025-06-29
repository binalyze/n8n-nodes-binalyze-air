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
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const qs: Record<string, string | number> = {
      'filter[organizationIds]': orgIds
    };

    if (queryParams) {
      Object.assign(qs, queryParams);
    }

    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/apitokens',
      qs
    );

    return makeApiRequestWithErrorHandling<ApiTokensResponse>(context, requestOptions, 'fetch API tokens');
  },

  async createApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateApiTokenRequest
  ): Promise<CreateApiTokenResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/apitokens'
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<CreateApiTokenResponse>(context, requestOptions, 'create API token');
  },

  async updateApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateApiTokenRequest
  ): Promise<UpdateApiTokenResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'PUT',
      `/api/public/apitokens/${id}`
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<UpdateApiTokenResponse>(context, requestOptions, `update API token with ID ${id}`);
  },

  async deleteApiToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteApiTokenResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'DELETE',
      `/api/public/apitokens/${id}`
    );

    return makeApiRequestWithErrorHandling<DeleteApiTokenResponse>(context, requestOptions, `delete API token with ID ${id}`);
  },

  async getApiTokenById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetApiTokenResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/apitokens/${id}`
    );

    return makeApiRequestWithErrorHandling<GetApiTokenResponse>(context, requestOptions, `fetch API token with ID ${id}`);
  }
};
