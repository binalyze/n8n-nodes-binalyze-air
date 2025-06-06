import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirCredentialsApi.credentials';

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
    organizationId: number | string
  ): Promise<OrganizationUsersResponse> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/organizations/${organizationId}/users`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch users for organization ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/organizations/${organizationId}/assign-users`,
        body: { userIds },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to assign users to organization ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async removeUserFromOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: number | string,
    userId: string
  ): Promise<{
    success: boolean;
    result: null;
    statusCode: number;
    errors: string[];
  }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'DELETE',
        url: `${credentials.instanceUrl}/api/public/organizations/${organizationId}/remove-user/${userId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to remove user ${userId} from organization ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
