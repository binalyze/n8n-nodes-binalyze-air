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
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'PUT',
      '/api/public/settings/banner'
    );
    requestOptions.body = data;

    const response = await makeApiRequestWithErrorHandling<UpdateBannerResponse>(context, requestOptions, 'update banner message');
    return response;
  },
};
