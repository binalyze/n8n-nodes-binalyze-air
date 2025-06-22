/**
 * Policies API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing security policies.
 *
 * The module includes:
 * - Policy interface: Represents a single policy in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Policies API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== POLICY INTERFACES =====

export interface Policy {
  _id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  organizationIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletable: boolean;
}

export interface PoliciesResponse {
  success: boolean;
  result: {
    entities: Policy[];
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

export interface CreatePolicyRequest {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  organizationIds: number[];
  rules?: any[];
}

export interface CreatePolicyResponse {
  success: boolean;
  result: Policy;
  statusCode: number;
  errors: string[];
}

export interface UpdatePolicyRequest {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  organizationIds: number[];
  rules?: any[];
}

export interface UpdatePolicyResponse {
  success: boolean;
  result: Policy;
  statusCode: number;
  errors: string[];
}

export interface DeletePolicyResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetPolicyResponse {
  success: boolean;
  result: Policy;
  statusCode: number;
  errors: string[];
}

export interface UpdatePoliciesPrioritiesRequest {
  policies: Array<{
    _id: string;
    priority: number;
  }>;
}

export interface UpdatePoliciesPrioritiesResponse {
  success: boolean;
  result: Policy[];
  statusCode: number;
  errors: string[];
}

export interface GetPolicyMatchStatsRequest {
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

export interface GetPolicyMatchStatsResponse {
  success: boolean;
  result: Array<{
    policyId: string;
    policyName: string;
    matchCount: number;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {

  async getPolicies(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<PoliciesResponse> {
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
        '/api/public/policies',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch policies');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch policies: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createPolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreatePolicyRequest
  ): Promise<CreatePolicyResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/policies'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create policy');
      return response;
    } catch (error) {
      throw new Error(`Failed to create policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updatePolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdatePolicyRequest
  ): Promise<UpdatePolicyResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/policies/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update policy with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deletePolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeletePolicyResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/policies/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete policy with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getPolicyById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetPolicyResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/policies/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch policy with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch policy with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updatePoliciesPriorities(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: UpdatePoliciesPrioritiesRequest
  ): Promise<UpdatePoliciesPrioritiesResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        '/api/public/policies/priorities'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'update policies priorities');
      return response;
    } catch (error) {
      throw new Error(`Failed to update policies priorities: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getPolicyMatchStats(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: GetPolicyMatchStatsRequest
  ): Promise<GetPolicyMatchStatsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/policies/stats'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'get policy match stats');
      return response;
    } catch (error) {
      throw new Error(`Failed to get policy match stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
