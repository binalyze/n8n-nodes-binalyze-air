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

import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirCredentialsApi.credentials';

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
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/baseline/acquire`,
        body: request,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to acquire baseline: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async compareBaseline(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    request: BaselineComparisonRequest
  ): Promise<BaselineResponse> {
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/baseline/compare`,
        body: request,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to compare baseline: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getComparisonReport(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    endpointId: string,
    taskId: string
  ): Promise<void> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/baseline/comparison/report/${endpointId}/${taskId}`,
        headers: {
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);

      // The endpoint doesn't return a response body, but we can check the status
      if (!response || typeof response !== 'object') {
        return;
      }
    } catch (error) {
      throw new Error(`Failed to get comparison report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
