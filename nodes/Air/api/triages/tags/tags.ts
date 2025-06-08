/**
 * Triage Tags API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving triage rule tags.
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirCredentialsApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../../utils/helpers';

export interface TriageTag {
  _id: string;
  name: string;
  count?: number;
}

export interface TriageTagsResponse {
  success: boolean;
  result: TriageTag[];
  statusCode: number;
  errors: string[];
}

export interface CreateTriageTagResponse {
  success: boolean;
  result: TriageTag;
  statusCode: number;
  errors: string[];
}

export const api = {
  async createTriageTag(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    name: string,
    organizationId: string | number = 0
  ): Promise<CreateTriageTagResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/triages/tags'
      );
      requestOptions.body = {
        name,
        organizationId
      };

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'create triage tag');
      return response;
    } catch (error) {
      throw new Error(`Failed to create triage tag: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getTriageTags(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationId: string = '0',
    withCount: boolean = true,
    searchTerm?: string
  ): Promise<TriageTagsResponse> {
    try {
      const queryParams: any = {
        'filter[organizationId]': organizationId,
        'filter[withCount]': withCount
      };

      if (searchTerm) {
        queryParams['filter[searchTerm]'] = searchTerm;
      }

      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/triages/tags',
        queryParams
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch triage tags');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch triage tags: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
