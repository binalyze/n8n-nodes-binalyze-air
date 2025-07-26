import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../../utils/helpers';

export interface UserProfile {
  name: string;
  surname: string;
  department: string;
}

export interface UserRole {
  _id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  createdBy: string;
  tag: string;
  privilegeTypes: string[];
}

export interface User {
  _id: string;
  email: string;
  username: string;
  organizationIds: string;
  strategy: string;
  profile: UserProfile;
  tfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
}

export interface OrganizationUsersResponse {
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
  async getOrganizationUsers(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: number | string,
    options?: {
      pageNumber?: number;
      pageSize?: number;
      sortBy?: string;
      sortType?: string;
    }
  ): Promise<OrganizationUsersResponse> {
    const queryParams: Record<string, string | number> = {};

    if (options?.pageNumber) {
      queryParams.pageNumber = options.pageNumber;
    }

    if (options?.pageSize) {
      queryParams.pageSize = options.pageSize;
    }

    if (options?.sortBy) {
      queryParams.sortBy = options.sortBy;
    }

    if (options?.sortType) {
      queryParams.sortType = options.sortType;
    }

    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/organizations/${organizationId}/users`,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );

    const response = await makeApiRequestWithErrorHandling<OrganizationUsersResponse>(context, requestOptions, `fetch users for organization ${organizationId}`);
    return response;
  },

  async assignUsersToOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: number | string,
    userIds: string[]
  ): Promise<{
    success: boolean;
    result: null;
    statusCode: number;
    errors: string[];
  }> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      `/api/public/organizations/${organizationId}/assign-users`
    );
    requestOptions.body = { userIds };

    const response = await makeApiRequestWithErrorHandling<{ success: boolean; result: null; statusCode: number; errors: string[]; }>(context, requestOptions, `assign users to organization ${organizationId}`);
    return response;
  },

  async removeUserFromOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: number | string,
    userIds: string[]
  ): Promise<{
    success: boolean;
    result: null;
    statusCode: number;
    errors: string[];
  }> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'DELETE',
      `/api/public/organizations/${organizationId}/remove-users`
    );
    requestOptions.body = { userIds };

    const response = await makeApiRequestWithErrorHandling<{ success: boolean; result: null; statusCode: number; errors: string[]; }>(context, requestOptions, `remove users from organization ${organizationId}`);
    return response;
  }
};
