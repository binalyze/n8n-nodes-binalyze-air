/**
 * Cloud Forensics API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing cloud forensics operations including cloud accounts and event subscriptions.
 *
 * The module includes:
 * - CloudAccount interface: Represents a cloud account in the system
 * - EventSubscription interface: Represents an event subscription
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Cloud Forensics API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== CLOUD ACCOUNT INTERFACES =====

export interface CloudAccount {
  _id: string;
  name: string;
  cloudVendor: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  subscriptionId?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  organizationId: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CloudAccountsResponse {
  success: boolean;
  result: {
    entities: CloudAccount[];
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

export interface CreateCloudAccountRequest {
  name: string;
  cloudVendor: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  subscriptionId?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  organizationId?: number;
}

export interface CreateCloudAccountResponse {
  success: boolean;
  result: CloudAccount;
  statusCode: number;
  errors: string[];
}

export interface UpdateCloudAccountRequest {
  name?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  subscriptionId?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}

export interface UpdateCloudAccountResponse {
  success: boolean;
  result: CloudAccount;
  statusCode: number;
  errors: string[];
}

export interface DeleteCloudAccountResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetCloudAccountResponse {
  success: boolean;
  result: CloudAccount;
  statusCode: number;
  errors: string[];
}

// ===== EVENT SUBSCRIPTION INTERFACES =====

export interface EventSubscription {
  _id: string;
  name: string;
  cloudVendor: string;
  eventType: string;
  enabled: boolean;
  organizationId: number;
  configuration: Record<string, any>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EventSubscriptionsResponse {
  success: boolean;
  result: {
    entities: EventSubscription[];
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

export interface CreateEventSubscriptionRequest {
  name: string;
  cloudVendor: string;
  eventType: string;
  enabled?: boolean;
  organizationId?: number;
  configuration?: Record<string, any>;
}

export interface CreateEventSubscriptionResponse {
  success: boolean;
  result: EventSubscription;
  statusCode: number;
  errors: string[];
}

export interface UpdateEventSubscriptionRequest {
  name?: string;
  eventType?: string;
  enabled?: boolean;
  configuration?: Record<string, any>;
}

export interface UpdateEventSubscriptionResponse {
  success: boolean;
  result: EventSubscription;
  statusCode: number;
  errors: string[];
}

export interface DeleteEventSubscriptionResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface GetEventSubscriptionResponse {
  success: boolean;
  result: EventSubscription;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== CLOUD ACCOUNT METHODS =====

  async getCloudAccounts(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<CloudAccountsResponse> {
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
        '/api/public/cloud-forensics/accounts',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch cloud accounts');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch cloud accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createCloudAccount(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateCloudAccountRequest
  ): Promise<CreateCloudAccountResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/cloud-forensics/accounts'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create cloud account');
      return response;
    } catch (error) {
      throw new Error(`Failed to create cloud account: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateCloudAccount(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateCloudAccountRequest
  ): Promise<UpdateCloudAccountResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/cloud-forensics/accounts/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update cloud account with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update cloud account: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteCloudAccount(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteCloudAccountResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/cloud-forensics/accounts/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete cloud account with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete cloud account: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCloudAccountById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetCloudAccountResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/cloud-forensics/accounts/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch cloud account with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch cloud account with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // ===== EVENT SUBSCRIPTION METHODS =====

  async getEventSubscriptions(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<EventSubscriptionsResponse> {
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
        '/api/public/event-subscription',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch event subscriptions');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch event subscriptions: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async createEventSubscription(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateEventSubscriptionRequest
  ): Promise<CreateEventSubscriptionResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/event-subscription'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create event subscription');
      return response;
    } catch (error) {
      throw new Error(`Failed to create event subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateEventSubscription(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string,
    data: UpdateEventSubscriptionRequest
  ): Promise<UpdateEventSubscriptionResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        `/api/public/event-subscription/${id}`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update event subscription with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update event subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteEventSubscription(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<DeleteEventSubscriptionResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/event-subscription/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete event subscription with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete event subscription: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getEventSubscriptionById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetEventSubscriptionResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/event-subscription/${id}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `fetch event subscription with ID ${id}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch event subscription with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
