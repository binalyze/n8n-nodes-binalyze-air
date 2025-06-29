/**
 * Cases API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving case information.
 *
 * The module includes:
 * - Case interface: Represents a single case in the system
 * - CasesResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Cases API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

export interface Case {
  _id: string;
  name: string;
  notes: any[];
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  organizationId: number;
  status: 'open' | 'closed' | 'archived';
  startedOn: string;
  visibility: string;
  source: string;
  totalDays: number;
  totalEndpoints: number;
  assignedUserIds: string[];
  closedOn?: string;
}

export interface CasesResponse {
  success: boolean;
  result: {
    entities: Case[];
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

export interface CaseActivity {
  _id: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  performedBy: string;
  data: any;
  organizationIds: number[];
  description: string;
}

export interface CaseActivitiesResponse {
  success: boolean;
  result: {
    entities: CaseActivity[];
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

export interface CaseEndpoint {
  platform: string;
  tags: string[];
  isolationStatus: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: number;
  ipAddress: string;
  name: string;
  groupId: string;
  groupFullPath: string;
  os: string;
  isServer: boolean;
  isManaged: boolean;
  lastSeen: string;
  version: string;
  versionNo: number;
  registeredAt: string;
  securityToken: string;
  onlineStatus: string;
  issues: string[];
  label: string | null;
  waitingForVersionUpdateFix: boolean;
}

export interface CaseEndpointsResponse {
  success: boolean;
  result: {
    entities: CaseEndpoint[];
    filters: Array<{
      name: string;
      type: string;
      options: any[];
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

export interface CaseTask {
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
  duration: number | null;
  caseIds: string[];
  isComparable: boolean;
  createdAt: string;
  updatedAt: string;
  response: any | null;
}

export interface CaseTasksResponse {
  success: boolean;
  result: {
    entities: CaseTask[];
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

export interface UserProfile {
  name: string;
  surname: string;
  department: string;
}

export interface Role {
  _id: string;
  name: string;
  createdBy: string;
  tag: string;
  privilegeTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  email: string;
  username: string;
  organizationIds: number[] | string;
  strategy: string;
  profile: UserProfile;
  tfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
}

export interface CaseUsersResponse {
  success: boolean;
  result: {
    entities: User[];
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

export const api = {
  async getCases(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    additionalParams?: {
      pageNumber?: number;
      pageSize?: number;
      status?: string;
      ownerUserId?: string;
      sortBy?: string;
      sortType?: string;
      searchTerm?: string;
    }
  ): Promise<CasesResponse> {
    try {
      const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

      const queryParams: Record<string, any> = {
        'filter[organizationIds]': orgIds
      };

      // Add additional parameters if provided
      if (additionalParams) {
        if (additionalParams.pageNumber) {
          queryParams.pageNumber = additionalParams.pageNumber;
        }
        if (additionalParams.pageSize) {
          queryParams.pageSize = additionalParams.pageSize;
        }
        if (additionalParams.status) {
          queryParams['filter[status]'] = additionalParams.status;
        }
        if (additionalParams.ownerUserId) {
          queryParams['filter[ownerUserId]'] = additionalParams.ownerUserId;
        }
        if (additionalParams.sortBy) {
          queryParams.sortBy = additionalParams.sortBy;
        }
        if (additionalParams.sortType) {
          queryParams.sortType = additionalParams.sortType;
        }
        if (additionalParams.searchTerm) {
          queryParams['filter[searchTerm]'] = additionalParams.searchTerm;
        }
      }

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        '/api/public/cases',
        queryParams
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'fetch cases');
    } catch (error) {
      throw new Error(`Failed to fetch cases: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseData: {
      organizationId: number;
      name: string;
      ownerUserId: string;
      visibility: string;
      assignedUserIds: string[];
    }
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        '/api/public/cases'
      );
      requestOptions.body = caseData;

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'create case');
    } catch (error) {
      throw new Error(`Failed to create case: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    updateData: Partial<{
      name: string;
      ownerUserId: string;
      visibility: string;
      status: 'open' | 'closed' | 'archived';
      notes: any[];
      assignedUserIds: string[];
    }>
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/cases/${id}`
      );
      requestOptions.body = updateData;

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `update case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to update case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/cases/${id}`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to fetch case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async closeCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/cases/${id}/close`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `close case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to close case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async openCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/cases/${id}/open`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `open case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to open case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async archiveCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/cases/${id}/archive`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `archive case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to archive case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async changeOwner(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    newOwnerId: string
  ): Promise<{ success: boolean; result: Case; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/cases/${id}/change-owner`
      );
      requestOptions.body = { ownerUserId: newOwnerId };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `change owner for case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to change owner for case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async checkCaseName(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    name: string
  ): Promise<{ success: boolean; result: boolean; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        '/api/public/cases/check',
        { name }
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'check case name');
    } catch (error) {
      throw new Error(`Failed to check case name: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCaseActivities(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<CaseActivitiesResponse> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/cases/${id}/activities`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch activities for case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to fetch activities for case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCaseEndpoints(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    organizationIds: string | number = 0
  ): Promise<CaseEndpointsResponse> {
    try {
      const orgIds = String(organizationIds);
      const queryParams = {
        'filter[organizationIds]': orgIds
      };

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/cases/${id}/endpoints`,
        queryParams
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch endpoints for case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to fetch endpoints for case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCaseTasksById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    organizationIds: string | number = 0
  ): Promise<CaseTasksResponse> {
    try {
      const orgIds = String(organizationIds);
      const queryParams = {
        'filter[organizationIds]': orgIds
      };

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/cases/${id}/tasks`,
        queryParams
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch tasks for case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to fetch tasks for case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCaseUsers(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    organizationIds: string = '0'
  ): Promise<CaseUsersResponse> {
    try {
      const queryParams = {
        'filter[organizationIds]': organizationIds
      };

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/cases/${caseId}/users`,
        queryParams
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch users for case with ID ${caseId}`);
    } catch (error) {
      throw new Error(`Failed to fetch users for case with ID ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async removeEndpointsFromCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
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
      organizationIds?: number[];
    }
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        `/api/public/cases/${id}/remove-endpoints`
      );
      requestOptions.body = { filter };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `remove endpoints from case with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to remove endpoints from case with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async removeTaskAssignmentFromCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    taskAssignmentId: string
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        `/api/public/cases/${caseId}/remove-task-assignment`
      );
      requestOptions.body = { taskAssignmentId };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `remove task assignment from case with ID ${caseId}`);
    } catch (error) {
      throw new Error(`Failed to remove task assignment from case with ID ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async importTaskAssignmentsToCase(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    taskAssignmentIds: string[]
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        `/api/public/cases/${caseId}/import-task-assignments`
      );
      requestOptions.body = { taskAssignmentIds };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `import task assignments to case with ID ${caseId}`);
    } catch (error) {
      throw new Error(`Failed to import task assignments to case with ID ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
