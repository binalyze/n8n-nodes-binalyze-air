/**
 * Shared API Types and Interfaces
 *
 * This module contains common interfaces and types used across all Binalyze AIR API modules.
 * These generic interfaces provide consistent response structures for all API operations.
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../utils/helpers';

// ===== BASE API RESPONSE INTERFACES =====

/**
 * Generic base response interface for all AIR API endpoints
 * @template T - The type of the result data
 */
export interface BaseApiResponse<T = any> {
  success: boolean;
  result: T;
  statusCode: number;
  errors: string[];
}

/**
 * Generic paginated response interface for endpoints that return paginated data
 * @template T - The type of the entities in the paginated result
 */
export interface PaginatedApiResponse<T> extends BaseApiResponse<{
  entities: T[];
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
}> {}

// ===== COMMON UTILITY TYPES =====

/**
 * Common response for operations that don't return specific data
 */
export type EmptyApiResponse = BaseApiResponse<null>;

/**
 * Common response for operations that return a simple success status
 */
export type SuccessApiResponse = BaseApiResponse<{ success: boolean }>;

// ===== SHARED HTTP HELPER FUNCTIONS =====

/**
 * Builds HTTP request options for AIR API calls
 * @template T - The type of the request body data
 * @param credentials - AIR API credentials
 * @param method - HTTP method
 * @param endpoint - API endpoint path
 * @param data - Request body data (for POST/PUT requests)
 * @param queryParams - Query string parameters
 * @returns Configured request options
 */
export function buildHttpRequest<T = any>(
  credentials: AirCredentials,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: T,
  queryParams?: Record<string, string | number>
) {
  const requestOptions = buildRequestOptionsWithErrorHandling(
    credentials,
    method,
    endpoint,
    queryParams
  );

  if (data && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = data;
  }

  return requestOptions;
}

/**
 * Executes an HTTP request to the AIR API with error handling
 * @template T - The type of the request body data
 * @template R - The type of the response data
 * @param context - n8n execution context
 * @param credentials - AIR API credentials
 * @param method - HTTP method
 * @param endpoint - API endpoint path
 * @param operationName - Name of the operation for error messages
 * @param data - Request body data (for POST/PUT requests)
 * @param queryParams - Query string parameters
 * @returns Promise resolving to the API response
 */
export async function executeHttpRequest<T, R>(
  context: IExecuteFunctions | ILoadOptionsFunctions,
  credentials: AirCredentials,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  operationName: string,
  data?: T,
  queryParams?: Record<string, string | number>
): Promise<R> {
  const requestOptions = buildHttpRequest(credentials, method, endpoint, data, queryParams);
  return await makeApiRequestWithErrorHandling<R>(context, requestOptions, operationName);
}
