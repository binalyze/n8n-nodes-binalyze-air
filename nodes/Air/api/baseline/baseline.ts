/**
 * Baseline API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for acquiring baseline information.
 *
 * The module includes:
 * - BaselineFilter interface: Represents filter criteria for baseline acquisition
 * - BaselineAcquisitionRequest interface: Represents the request payload
 * - BaselineComparisonRequest interface: Represents the request payload for comparison
 * - BaselineResult interface: Represents the result of a baseline acquisition
 * - BaselineResponse interface: Represents the API response structure
 * - api object: Contains methods to interact with the Baseline API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

export interface BaselineFilter {
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

export interface BaselineAcquisitionRequest {
  caseId: string;
  filter: BaselineFilter;
}

export interface BaselineComparisonRequest {
  endpointId: string;
  taskIds: string[];
}

export interface BaselineResult {
  _id: string;
  name: string;
  organizationId: number;
}

export interface BaselineResponse {
  success: boolean;
  result: BaselineResult[];
  statusCode: number;
  errors: string[];
}

export const api = {
  async acquireBaseline(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    request: BaselineAcquisitionRequest
  ): Promise<BaselineResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/baseline/acquire'
    );
    requestOptions.body = request;

    const response = await makeApiRequestWithErrorHandling<BaselineResponse>(context, requestOptions, 'acquire baseline');
    return response;
  },

  async compareBaseline(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    request: BaselineComparisonRequest
  ): Promise<BaselineResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/baseline/compare'
    );
    requestOptions.body = request;

    const response = await makeApiRequestWithErrorHandling<BaselineResponse>(context, requestOptions, 'compare baseline');
    return response;
  },

  async getComparisonReport(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    endpointId: string,
    taskId: string
  ): Promise<void> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/baseline/comparison/report/${endpointId}/${taskId}`
    );

    const response = await makeApiRequestWithErrorHandling(context, requestOptions, 'get comparison report');

    // The endpoint doesn't return a response body, but we can check the status
    if (!response || typeof response !== 'object') {
      return;
    }
  }
};
