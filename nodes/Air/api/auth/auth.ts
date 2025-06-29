/**
 * Auth API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for authentication and session management.
 *
 * The module includes:
 * - AuthCheckResponse interface: Represents the response from auth check endpoint
 * - api object: Contains methods to interact with the Auth API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

// ===== AUTH INTERFACES =====

export interface AuthCheckResponse {
  success: boolean;
  result: {
    authenticated: boolean;
    user?: {
      _id: string;
      username: string;
      email: string;
      role: string;
      organizationId: number;
      organizationName: string;
      permissions: string[];
      lastLoginAt?: string;
      createdAt?: string;
    };
    session?: {
      _id: string;
      expiresAt: string;
      issuedAt: string;
    };
  };
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== AUTH METHODS =====

  async checkAuth(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<AuthCheckResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/auth/check'
    );

    const response = await makeApiRequestWithErrorHandling<AuthCheckResponse>(context, requestOptions, 'check authentication');
    return response;
  }
};
