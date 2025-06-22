/**
 * Acquisitions API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing acquisition profiles and evidence collection tasks.
 *
 * The module includes:
 * - AcquisitionProfile interface: Represents a single acquisition profile in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Acquisitions API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== ACQUISITION PROFILE INTERFACES =====

export interface AcquisitionProfile {
  _id: string;
  name: string;
  description?: string;
  organizationId: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isDefault?: boolean;
  settings?: {
    artifacts?: string[];
    evidence?: string[];
    [key: string]: any;
  };
}

export interface AcquisitionProfilesResponse {
  success: boolean;
  result: {
    entities: AcquisitionProfile[];
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

export interface CreateAcquisitionProfileRequest {
  name: string;
  description?: string;
  organizationId: number;
  settings?: {
    artifacts?: string[];
    evidence?: string[];
    [key: string]: any;
  };
}

export interface CreateAcquisitionProfileResponse {
  success: boolean;
  result: AcquisitionProfile;
  statusCode: number;
  errors: string[];
}

export interface UpdateAcquisitionProfileRequest {
  name: string;
  description?: string;
  settings?: {
    artifacts?: string[];
    evidence?: string[];
    [key: string]: any;
  };
}

export interface UpdateAcquisitionProfileResponse {
  success: boolean;
  result: AcquisitionProfile;
  statusCode: number;
  errors: string[];
}

export interface DeleteAcquisitionProfileResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetAcquisitionProfileResponse {
  success: boolean;
  result: AcquisitionProfile;
  statusCode: number;
  errors: string[];
}

export interface AssignEvidenceAcquisitionTaskRequest {
  caseId: string;
  acquisitionProfileId: string;
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

export interface AssignImageAcquisitionTaskRequest {
  caseId: string;
  acquisitionProfileId: string;
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

export interface CreateOffNetworkAcquisitionTaskRequest {
  caseId: string;
  acquisitionProfileId: string;
  organizationId: number;
  name: string;
  description?: string;
}

export interface AssignAcquisitionTaskResponse {
  success: boolean;
  result: Array<{
    _id: string;
    name: string;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

export interface CreateOffNetworkTaskResponse {
  success: boolean;
  result: {
    _id: string;
    name: string;
    organizationId: number;
    caseId: string;
    acquisitionProfileId: string;
  };
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== ACQUISITION PROFILE METHODS =====

  async getAcquisitionProfiles(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<AcquisitionProfilesResponse> {
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
        '/api/public/acquisitions/profiles',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Get Acquisition Profiles');

      return response;
    } catch (error) {
      throw new Error(`Failed to get acquisition profiles: ${error.message}`);
    }
  },

  async createAcquisitionProfile(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateAcquisitionProfileRequest
  ): Promise<CreateAcquisitionProfileResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/acquisitions/profiles'
      );

      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Create Acquisition Profile');

      return response;
    } catch (error) {
      throw new Error(`Failed to create acquisition profile: ${error.message}`);
    }
  },

  async updateAcquisitionProfile(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateAcquisitionProfileRequest
  ): Promise<UpdateAcquisitionProfileResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/acquisitions/profiles/${id}`
      );

      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Update Acquisition Profile');

      return response;
    } catch (error) {
      throw new Error(`Failed to update acquisition profile: ${error.message}`);
    }
  },

  async deleteAcquisitionProfile(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteAcquisitionProfileResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/acquisitions/profiles/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Delete Acquisition Profile');

      return response;
    } catch (error) {
      throw new Error(`Failed to delete acquisition profile: ${error.message}`);
    }
  },

  async getAcquisitionProfileById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetAcquisitionProfileResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/acquisitions/profiles/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Get Acquisition Profile');

      return response;
    } catch (error) {
      throw new Error(`Failed to get acquisition profile: ${error.message}`);
    }
  },

  async assignEvidenceAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignEvidenceAcquisitionTaskRequest
  ): Promise<AssignAcquisitionTaskResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/acquisitions/acquire'
      );

      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Assign Evidence Acquisition Task');

      return response;
    } catch (error) {
      throw new Error(`Failed to assign evidence acquisition task: ${error.message}`);
    }
  },

  async assignImageAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignImageAcquisitionTaskRequest
  ): Promise<AssignAcquisitionTaskResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/acquisitions/acquire/image'
      );

      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Assign Image Acquisition Task');

      return response;
    } catch (error) {
      throw new Error(`Failed to assign image acquisition task: ${error.message}`);
    }
  },

  async createOffNetworkAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateOffNetworkAcquisitionTaskRequest
  ): Promise<CreateOffNetworkTaskResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/acquisitions/acquire/off-network'
      );

      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'Create Off-Network Acquisition Task');

      return response;
    } catch (error) {
      throw new Error(`Failed to create off-network acquisition task: ${error.message}`);
    }
  },
};
