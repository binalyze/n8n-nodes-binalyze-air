/**
 * Params API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for retrieving system configuration parameters and data.
 *
 * The module includes:
 * - Various parameter interfaces for different types of configuration data
 * - Response interfaces for API operations
 * - api object: Contains methods to interact with the Params API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== ANALYZER INTERFACES =====

export interface DroneAnalyzer {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  enabled?: boolean;
}

export interface DroneAnalyzersResponse {
  success: boolean;
  result: DroneAnalyzer[];
  statusCode: number;
  errors: string[];
}

// ===== ARTIFACT INTERFACES =====

export interface AcquisitionArtifact {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  platform?: string[];
  enabled?: boolean;
}

export interface AcquisitionArtifactsResponse {
  success: boolean;
  result: AcquisitionArtifact[];
  statusCode: number;
  errors: string[];
}

// ===== EVIDENCE INTERFACES =====

export interface AcquisitionEvidence {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  category?: string;
  enabled?: boolean;
}

export interface AcquisitionEvidenceResponse {
  success: boolean;
  result: AcquisitionEvidence[];
  statusCode: number;
  errors: string[];
}

// ===== E-DISCOVERY INTERFACES =====

export interface EDiscoveryPattern {
  _id: string;
  name: string;
  pattern?: string;
  description?: string;
  category?: string;
  enabled?: boolean;
}

export interface EDiscoveryPatternsResponse {
  success: boolean;
  result: EDiscoveryPattern[];
  statusCode: number;
  errors: string[];
}

// ===== MITRE ATT&CK INTERFACES =====

export interface MitreAttackTechnique {
  _id: string;
  techniqueId: string;
  name: string;
  description?: string;
  tactic?: string;
  platform?: string[];
  enabled?: boolean;
}

export interface MitreAttackResponse {
  success: boolean;
  result: MitreAttackTechnique[];
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  async getDroneAnalyzers(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<DroneAnalyzersResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/params/drone/analyzers'
      );

      const response = await context.helpers.httpRequest(requestOptions);
			validateApiResponse(response, 'fetch drone analyzers');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch drone analyzers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getAcquisitionArtifacts(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<AcquisitionArtifactsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/params/acquisition/artifacts'
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch acquisition artifacts');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch acquisition artifacts: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getAcquisitionEvidence(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<AcquisitionEvidenceResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/params/acquisition/evidences'
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch acquisition evidence');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch acquisition evidence: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getEDiscoveryPatterns(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<EDiscoveryPatternsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/params/acquisition/e-discovery-patterns'
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch e-discovery patterns');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch e-discovery patterns: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getMitreAttackTechniques(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<MitreAttackResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/params/mitre-attack/tactics'
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch MITRE ATT&CK techniques');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch MITRE ATT&CK techniques: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
