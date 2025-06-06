/**
 * Triage Tags API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving triage rule tags.
 */

import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirCredentialsApi.credentials';

export interface TriageTag {
  _id: string;
  name: string;
  count?: number;
}

export interface TriageTagsResponse {
  success: boolean;
  result: {
    entities: TriageTag[];
    totalEntityCount: number;
  };
  statusCode: number;
  errors: string[];
}

export const api = {
  async createTriageTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    name: string,
    organizationId: string | number = 0
  ): Promise<boolean> {
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/triages/tags`,
        body: {
          name,
          organizationId
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      throw new Error(`Failed to create triage tag: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getTriageTags(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: string | string[] = '0',
    withCount: boolean = true
  ): Promise<TriageTagsResponse> {
    try {
      const orgId = Array.isArray(organizationId) ? organizationId.join(',') : organizationId;

      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/triages/tags`,
        qs: {
          'filter[organizationId]': orgId,
          'filter[withCount]': withCount
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch triage tags: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
