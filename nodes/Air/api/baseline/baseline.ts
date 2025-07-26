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
  taskName?: string;
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
  ): Promise<{ success: boolean; message: string; reportJson?: any }> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/baseline/comparison/report/${endpointId}/${taskId}`
    );

    // Override to handle HTML response
    requestOptions.json = false;
    requestOptions.headers!['Accept'] = 'text/html';

    try {
      const response = await context.helpers.httpRequest(requestOptions);

      // Check if we got an HTML response
      if (typeof response === 'string' && response.includes('<html')) {
        // Extract the base64 encoded JSON from the script tag
        const scriptMatch = response.match(/<script\s+id="dronejson"\s+type="text\/plain">\s*([^<]+)\s*<\/script>/);

        if (scriptMatch && scriptMatch[1]) {
          try {
            // Decode the base64 string
            const base64String = scriptMatch[1].trim();
            const decodedString = Buffer.from(base64String, 'base64').toString('utf-8');
            const reportJson = JSON.parse(decodedString);

            return {
              success: true,
              message: `Comparison report retrieved successfully for endpoint ${endpointId} and task ${taskId}`,
              reportJson
            };
          } catch (decodeError) {
            throw new Error(`Failed to decode comparison report: ${decodeError.message}`);
          }
        } else {
          throw new Error('Could not find comparison report data in the HTML response');
        }
      } else {
        throw new Error('Expected HTML response but received different format');
      }
    } catch (error) {
      // Re-throw with context
      if (error.response?.status === 404) {
        throw new Error(`Comparison report not found for endpoint ${endpointId} and task ${taskId}`);
      }
      throw error;
    }
  }
};
