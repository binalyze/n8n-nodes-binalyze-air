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
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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
      '/api/public/policies',
      qs
    );

    return makeApiRequestWithErrorHandling<PoliciesResponse>(context, requestOptions, 'fetch policies');
  },

  async createPolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreatePolicyRequest
  ): Promise<CreatePolicyResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/policies'
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<CreatePolicyResponse>(context, requestOptions, 'create policy');
  },

  async updatePolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdatePolicyRequest
  ): Promise<UpdatePolicyResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'PUT',
      `/api/public/policies/${id}`
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<UpdatePolicyResponse>(context, requestOptions, `update policy with ID ${id}`);
  },

  async deletePolicy(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeletePolicyResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'DELETE',
      `/api/public/policies/${id}`
    );

    return makeApiRequestWithErrorHandling<DeletePolicyResponse>(context, requestOptions, `delete policy with ID ${id}`);
  },

  async getPolicyById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetPolicyResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/policies/${id}`
    );

    return makeApiRequestWithErrorHandling<GetPolicyResponse>(context, requestOptions, `fetch policy with ID ${id}`);
  },

  async updatePoliciesPriorities(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: UpdatePoliciesPrioritiesRequest
  ): Promise<UpdatePoliciesPrioritiesResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'PUT',
      '/api/public/policies/priorities'
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<UpdatePoliciesPrioritiesResponse>(context, requestOptions, 'update policies priorities');
  },

  async getPolicyMatchStats(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: GetPolicyMatchStatsRequest
  ): Promise<GetPolicyMatchStatsResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/policies/stats'
    );
    requestOptions.body = data;

    return makeApiRequestWithErrorHandling<GetPolicyMatchStatsResponse>(context, requestOptions, 'get policy match stats');
  }
};
