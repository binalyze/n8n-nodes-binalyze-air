/**
 * Organizations API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving organization information.
 *
 * The module includes:
 * - Organization interface: Represents a single organization in the system
 * - OrganizationsResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Organizations API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirCredentialsApi.credentials';

export interface Organization {
  _id: number;
  name: string;
  totalEndpoints: number;
  owner?: string;
  shareableDeploymentEnabled: boolean;
  deploymentToken: string;
  isDefault: boolean;
  updatedAt: string;
  createdAt: string;
  tags?: string[];
}

export interface OrganizationsResponse {
  success: boolean;
  result: {
    entities: Organization[];
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

export interface OrganizationContact {
  name: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email: string;
}

// Interface for create organization request
export interface CreateOrganizationRequest {
  name: string;
  shareableDeploymentEnabled: boolean;
  contact: OrganizationContact;
  note?: string;
}

export const api = {
  async getOrganizations(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    options?: {
      pageNumber?: number;
      pageSize?: number;
      searchTerm?: string;
      nameFilter?: string;
      sortBy?: string;
      sortType?: string;
    }
  ): Promise<OrganizationsResponse> {
    try {
      const queryParams: Record<string, string | number> = {};

      if (options?.pageNumber) {
        queryParams.pageNumber = options.pageNumber;
      }

      if (options?.pageSize) {
        queryParams.pageSize = options.pageSize;
      }

      if (options?.searchTerm) {
        queryParams['filter[searchTerm]'] = options.searchTerm;
      }

      if (options?.nameFilter) {
        queryParams['filter[name]'] = options.nameFilter;
      }

      if (options?.sortBy) {
        queryParams.sortBy = options.sortBy;
      }

      if (options?.sortType) {
        queryParams.sortType = options.sortType;
      }

      const requestOptions: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/organizations`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      // Add query parameters if any exist
      if (Object.keys(queryParams).length > 0) {
        requestOptions.qs = queryParams;
      }

      const response = await context.helpers.httpRequest(requestOptions);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch organizations: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getAllOrganizations(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    searchFilter?: string,
    pageSize: number = 100
  ): Promise<Organization[]> {
    try {
      const allOrganizations: Organization[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const queryParams: Record<string, string | number> = {
          pageNumber: currentPage,
          pageSize,
        };

        if (searchFilter) {
          queryParams['filter[searchTerm]'] = searchFilter;
        }

        const options: IHttpRequestOptions = {
          method: 'GET',
          url: `${credentials.instanceUrl}/api/public/organizations`,
          qs: queryParams,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credentials.token}`
          },
          json: true
        };

        const responseData = await context.helpers.httpRequest(options);

        if (!responseData.success) {
          throw new Error(`API request failed: ${responseData.errors?.join(', ') || 'Unknown error'}`);
        }

        const organizations = responseData.result?.entities || [];
        allOrganizations.push(...organizations);

        // Check if there are more pages using the actual API pagination structure
        const result = responseData.result;
        if (result && result.currentPage && result.totalPageCount && result.currentPage < result.totalPageCount) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }

      return allOrganizations;
    } catch (error) {
      throw new Error(`Failed to fetch all organizations: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateOrganizationRequest
  ): Promise<{ success: boolean; result: Organization; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/organizations`,
        body: data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async updateOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number,
    data: Partial<CreateOrganizationRequest>
  ): Promise<{ success: boolean; result: Organization; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'PATCH',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}`,
        body: data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to update organization: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async getOrganizationById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number
  ): Promise<{ success: boolean; result: Organization & { note?: string; contact?: OrganizationContact; statistics?: { endpoint: { total: number; managed: number }; case: { total: number; open: number; closed: number; archived: number } } }; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch organization with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async checkOrganizationNameExists(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    name: string
  ): Promise<{ success: boolean; result: boolean; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/organizations/check`,
        qs: { name },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to check organization name: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async getShareableDeploymentInfo(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    deploymentToken: string
  ): Promise<{
    success: boolean;
    result: {
      organizationId: number;
      consoleAddress: string;
      agentVersion: string;
    };
    statusCode: number;
    errors: string[]
  }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/organizations/shareable-deployment-info/${deploymentToken}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch shareable deployment info: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async updateOrganizationShareableDeployment(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number,
    status: boolean
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}/shareable-deployment`,
        body: { status },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to update organization ${id} shareable deployment: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async updateOrganizationDeploymentToken(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number,
    deploymentToken: string
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}/deployment-token`,
        body: { deploymentToken },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to update organization ${id} deployment token: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async deleteOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'DELETE',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete organization with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async addTagsToOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number,
    tags: string[]
  ): Promise<{ success: boolean; result: Organization; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'PATCH',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}/tags`,
        body: { tags },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to add tags to organization with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  async deleteTagsFromOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number,
    tags: string[]
  ): Promise<{ success: boolean; result: Organization; statusCode: number; errors: string[] }> {
    try {
      const options: IHttpRequestOptions = {
        method: 'DELETE',
        url: `${credentials.instanceUrl}/api/public/organizations/${id}/tags`,
        body: { tags },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete tags from organization with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
