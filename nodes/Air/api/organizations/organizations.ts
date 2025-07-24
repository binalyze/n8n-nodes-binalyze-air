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

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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

      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        '/api/public/organizations',
        Object.keys(queryParams).length > 0 ? queryParams : undefined
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'fetch organizations');
    } catch (error) {
      throw new Error(`Failed to fetch organizations: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getAllOrganizations(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    nameFilter?: string,
    pageSize: number = 100
  ): Promise<Organization[]> {
    try {
      const allOrganizations: Organization[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      let iterationCount = 0;
      const maxIterations = 50; // Safety limit to prevent infinite loops

      while (hasMorePages && iterationCount < maxIterations) {
        iterationCount++;

        const queryParams: Record<string, string | number> = {
          pageNumber: currentPage,
          pageSize,
        };

        if (nameFilter) {
          queryParams['filter[name]'] = nameFilter;
        }

        const requestOptions = buildRequestOptionsWithErrorHandling(
          credentials,
          'GET',
          '/api/public/organizations',
          queryParams
        );

        const responseData = await makeApiRequestWithErrorHandling<OrganizationsResponse>(
          context,
          requestOptions,
          `fetch organizations page ${currentPage}`
        );

        const result = responseData.result;
        const organizations = result?.entities || [];

        // Add organizations to our collection
        allOrganizations.push(...organizations);

        // Check if there are more pages to fetch
        // Use multiple conditions to ensure we have proper pagination handling
        if (result && result.currentPage && result.totalPageCount) {
          if (result.currentPage < result.totalPageCount) {
            currentPage++;
            // Double-check: if this page returned no results, stop
            if (organizations.length === 0) {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        } else {
          // If pagination info is missing, check if we got any results
          if (organizations.length === 0) {
            hasMorePages = false;
          } else if (organizations.length < pageSize) {
            // If we got fewer results than the page size, this is likely the last page
            hasMorePages = false;
          } else {
            // Continue to next page but add safety check
            currentPage++;
            if (currentPage > 100) { // Safety limit
              hasMorePages = false;
            }
          }
        }
      }

      if (iterationCount >= maxIterations) {
        // Stopped pagination after max iterations for safety
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        '/api/public/organizations'
      );
      requestOptions.body = data;

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'create organization');
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/organizations/${id}`
      );
      requestOptions.body = data;

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `update organization ${id}`);
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/organizations/${id}`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `fetch organization with ID ${id}`);
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        '/api/public/organizations/check',
        { name }
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'check organization name');
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'GET',
        `/api/public/organizations/shareable-deployment-info/${deploymentToken}`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, 'fetch shareable deployment info');
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'POST',
        `/api/public/organizations/${id}/shareable-deployment`
      );
      requestOptions.body = { status };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `update organization ${id} shareable deployment`);
    } catch (error) {
      throw new Error(`Failed to update organization ${id} shareable deployment: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteOrganization(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: number
  ): Promise<{ success: boolean; result: null; statusCode: number; errors: string[] }> {
    try {
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'DELETE',
        `/api/public/organizations/${id}`
      );

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `delete organization with ID ${id}`);
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'PATCH',
        `/api/public/organizations/${id}/tags`
      );
      requestOptions.body = { tags };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `add tags to organization with ID ${id}`);
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
      const requestOptions = buildRequestOptionsWithErrorHandling(
        credentials,
        'DELETE',
        `/api/public/organizations/${id}/tags`
      );
      requestOptions.body = { tags };

      return await makeApiRequestWithErrorHandling<any>(context, requestOptions, `delete tags from organization with ID ${id}`);
    } catch (error) {
      throw new Error(`Failed to delete tags from organization with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
