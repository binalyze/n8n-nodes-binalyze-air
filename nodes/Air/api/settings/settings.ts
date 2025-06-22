//TODO(emre): Reimplement this when the API is fixed
/**
 * Settings API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing system settings.
 *
 * The module includes:
 * - UpdateBannerRequest interface: Represents the request to update banner message
 * - UpdateBannerResponse interface: Represents the API response for banner update
 * - api object: Contains methods to interact with the Settings API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== SETTINGS INTERFACES =====

export interface UpdateBannerRequest {
  message: string;
  enabled: boolean;
}

export interface UpdateBannerResponse {
  success: boolean;
  result: {
    message: string;
    enabled: boolean;
    updatedAt: string;
  };
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  async updateBannerMessage(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: UpdateBannerRequest
  ): Promise<UpdateBannerResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        '/api/public/settings/banner'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'update banner message');
      return response;
    } catch (error) {
      throw new Error(`Failed to update banner message: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
