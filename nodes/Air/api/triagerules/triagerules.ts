/**
 * Triage Rules API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing triage rules and triage rule tags.
 *
 * The module includes:
 * - TriageRule interface: Represents a single triage rule in the system
 * - TriageTag interface: Represents a triage rule tag
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Triage Rules and Tags API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

// ===== TRIAGE RULE INTERFACES =====

export interface TriageRule {
  _id: string;
  description: string;
  searchIn: string;
  engine: string;
  organizationIds: string[];
  createdAt: string;
  createdBy: string;
  deletable: boolean;
}

export interface TriageRulesResponse {
  success: boolean;
  result: {
    entities: TriageRule[];
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

export interface CreateTriageRuleRequest {
  description: string;
  rule: string;
  searchIn?: string;
  engine: string;
  organizationIds: number[];
  tagIds?: string[];
}

export interface CreateTriageRuleResponse {
  success: boolean;
  result: TriageRule & {
    rule: string;
    type: string;
  };
  statusCode: number;
  errors: string[];
}

export interface UpdateTriageRuleRequest {
  description: string;
  rule: string;
  searchIn: string;
  organizationIds: (string | number)[];
}

export interface UpdateTriageRuleResponse {
  success: boolean;
  result: TriageRule & {
    rule: string;
    type: string;
  };
  statusCode: number;
  errors: string[];
}

export interface DeleteTriageRuleResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetTriageRuleResponse {
  success: boolean;
  result: TriageRule & {
    rule: string;
    type: string;
  };
  statusCode: number;
  errors: string[];
}

export interface ValidateTriageRuleRequest {
  rule: string;
  engine: string;
}

export interface ValidateTriageRuleResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface AssignTriageTaskRequest {
  caseId: string;
  triageRuleIds: string[];
  taskConfig: {
    choice: string;
  };
  mitreAttack: {
    enabled: boolean;
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

export interface AssignTriageTaskResponse {
  success: boolean;
  result: Array<{
    _id: string;
    name: string;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

// ===== TRIAGE TAG INTERFACES =====

export interface TriageTag {
  _id: string;
  name: string;
  count?: number;
}

export interface TriageTagsResponse {
  success: boolean;
  result: TriageTag[];
  statusCode: number;
  errors: string[];
}

export interface CreateTriageTagResponse {
  success: boolean;
  result: TriageTag;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== TRIAGE RULE METHODS =====

  async getTriageRules(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<TriageRulesResponse> {
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    // Build the query string parameters
    const qs: Record<string, string | number> = {
      'filter[organizationIds]': orgIds
    };

    // Add additional query parameters if provided
    if (queryParams) {
      Object.assign(qs, queryParams);
    }

    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/triages/rules',
      qs
    );

    return await makeApiRequestWithErrorHandling<TriageRulesResponse>(context, requestOptions, 'fetch triage rules');
  },

  async createTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateTriageRuleRequest
  ): Promise<CreateTriageRuleResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/triages/rules'
    );
    requestOptions.body = data;

    // Add custom status code handling for validation endpoint
    // Status code 660 is a custom code used by the API for validation failures
    requestOptions.ignoreHttpStatusErrors = true;

    return await makeApiRequestWithErrorHandling<CreateTriageRuleResponse>(context, requestOptions, 'create triage rule');
  },

  async updateTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateTriageRuleRequest
  ): Promise<UpdateTriageRuleResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'PUT',
      `/api/public/triages/rules/${id}`
    );
    requestOptions.body = data;

    // Add custom status code handling for validation endpoint
    // Status code 660 is a custom code used by the API for validation failures
    requestOptions.ignoreHttpStatusErrors = true;

    return await makeApiRequestWithErrorHandling<UpdateTriageRuleResponse>(context, requestOptions, `update triage rule with ID ${id}`);
  },

  async deleteTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteTriageRuleResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'DELETE',
      `/api/public/triages/rules/${id}`
    );

    return await makeApiRequestWithErrorHandling<DeleteTriageRuleResponse>(context, requestOptions, `delete triage rule with ID ${id}`);
  },

  async getTriageRuleById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetTriageRuleResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/triages/rules/${id}`
    );

    return await makeApiRequestWithErrorHandling<GetTriageRuleResponse>(context, requestOptions, `fetch triage rule with ID ${id}`);
  },

  async validateTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: ValidateTriageRuleRequest
  ): Promise<ValidateTriageRuleResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/triages/rules/validate'
    );
    requestOptions.body = data;

    // Add custom status code handling for validation endpoint
    // Status code 660 is a custom code used by the API for validation failures
    requestOptions.ignoreHttpStatusErrors = true;

    return await makeApiRequestWithErrorHandling<ValidateTriageRuleResponse>(context, requestOptions, 'validate triage rule');
  },

  async assignTriageTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignTriageTaskRequest
  ): Promise<AssignTriageTaskResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/triages/triage'
    );
    requestOptions.body = data;

    return await makeApiRequestWithErrorHandling<AssignTriageTaskResponse>(context, requestOptions, 'assign triage task');
  },

  // ===== TRIAGE TAG METHODS =====

  async createTriageTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    name: string,
    organizationId: string | number = 0
  ): Promise<CreateTriageTagResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/triages/tags'
    );
    requestOptions.body = {
      name,
      organizationId
    };

    return await makeApiRequestWithErrorHandling<CreateTriageTagResponse>(context, requestOptions, 'create triage tag');
  },

  async getTriageTags(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: string = '0',
    searchTerm?: string
  ): Promise<TriageTagsResponse> {
    let queryParams: any = {
      'filter[organizationId]': organizationId,
      'filter[withCount]': true
    };

    if (searchTerm) {
      queryParams['filter[searchTerm]'] = searchTerm;
    }

    let requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/triages/tags',
      queryParams
    );

    return await makeApiRequestWithErrorHandling<TriageTagsResponse>(context, requestOptions, 'fetch triage tags');
  }
};
