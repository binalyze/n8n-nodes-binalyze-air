/**
 * Triages API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving triage rules information.
 *
 * The module includes:
 * - TriageRule interface: Represents a single triage rule in the system
 * - TriageRulesResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Triage Rules API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirCredentialsApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

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
  searchIn: string;
  engine: string;
  organizationIds: (string | number)[];
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

export const api = {
  async getTriageRules(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<TriageRulesResponse> {
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
        '/api/public/triages/rules',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch triage rules');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch triage rules: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateTriageRuleRequest
  ): Promise<CreateTriageRuleResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/triages/rules'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create triage rule');
      return response;
    } catch (error) {
      throw new Error(`Failed to create triage rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateTriageRuleRequest
  ): Promise<UpdateTriageRuleResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/triages/rules/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update triage rule with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update triage rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteTriageRuleResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/triages/rules/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete triage rule with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete triage rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getTriageRuleById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetTriageRuleResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/triages/rules/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch triage rule with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch triage rule with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async validateTriageRule(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: ValidateTriageRuleRequest
  ): Promise<ValidateTriageRuleResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/triages/rules/validate'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'validate triage rule');
      return response;
    } catch (error) {
      throw new Error(`Failed to validate triage rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async assignTriageTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignTriageTaskRequest
  ): Promise<AssignTriageTaskResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/triages/triage'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'assign triage task');
      return response;
    } catch (error) {
      throw new Error(`Failed to assign triage task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
