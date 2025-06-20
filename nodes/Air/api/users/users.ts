/**
 * Users API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving user information.
 *
 * The module includes:
 * - User interface: Represents a single user in the system
 * - UsersResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Users API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/Air/AirCredentialsApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

export interface User {
  _id: string;
  email: string;
  username: string;
  organizationIds: string | 'ALL';
  strategy: string;
  profile: {
    name: string;
    surname: string;
    department: string;
  };
  tfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  success: boolean;
  result: User;
  statusCode: number;
  errors: string[];
}

export interface UsersResponse {
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
  async getUsers(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    additionalParams?: {
      includeNotInOrganization?: boolean;
      pageNumber?: number;
      pageSize?: number;
      roles?: string;
      sortBy?: string;
      sortType?: string;
      searchTerm?: string;
    }
  ): Promise<UsersResponse> {
    try {
      const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

      const queryParams: Record<string, any> = {
        'filter[organizationIds]': orgIds
      };

      // Add additional parameters if provided
      if (additionalParams) {
        if (additionalParams.includeNotInOrganization !== undefined) {
          queryParams['filter[includeNotInOrganization]'] = additionalParams.includeNotInOrganization;
        }
        if (additionalParams.pageNumber) {
          queryParams.pageNumber = additionalParams.pageNumber;
        }
        if (additionalParams.pageSize) {
          queryParams.pageSize = additionalParams.pageSize;
        }
        if (additionalParams.roles) {
          queryParams['filter[roles]'] = additionalParams.roles;
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

      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/user-management/users',
        queryParams
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch users');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getUserById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<UserResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/user-management/users/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch user with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch user with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
