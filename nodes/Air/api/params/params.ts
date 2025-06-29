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
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/params/drone/analyzers'
    );

    return await makeApiRequestWithErrorHandling<DroneAnalyzersResponse>(context, requestOptions, 'fetch drone analyzers');
  },

  async getAcquisitionArtifacts(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<AcquisitionArtifactsResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/params/acquisition/artifacts'
    );

    return await makeApiRequestWithErrorHandling<AcquisitionArtifactsResponse>(context, requestOptions, 'fetch acquisition artifacts');
  },

  async getAcquisitionEvidence(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<AcquisitionEvidenceResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/params/acquisition/evidences'
    );

    return await makeApiRequestWithErrorHandling<AcquisitionEvidenceResponse>(context, requestOptions, 'fetch acquisition evidence');
  },

  async getEDiscoveryPatterns(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<EDiscoveryPatternsResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/params/acquisition/e-discovery-patterns'
    );

    return await makeApiRequestWithErrorHandling<EDiscoveryPatternsResponse>(context, requestOptions, 'fetch e-discovery patterns');
  },

  async getMitreAttackTechniques(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<MitreAttackResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/params/mitre-attack/tactics'
    );

    return await makeApiRequestWithErrorHandling<MitreAttackResponse>(context, requestOptions, 'fetch MITRE ATT&CK techniques');
  }
};
