/**
 * Cases Export API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for exporting case information.
 *
 * The module includes:
 * - Export response interfaces: Represent the API response structures
 * - api object: Contains methods to interact with the Cases Export API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirCredentialsApi.credentials';

export interface ExportCasesResponse {
  success: boolean;
  statusCode: number;
  errors: string[];
}

export interface ExportCaseNotesResponse {
    success: boolean;
    statusCode: number;
    errors: string[];
}

export interface ExportCaseEndpointsResponse {
    success: boolean;
    statusCode: number;
    errors: string[];
}

export interface ExportCaseActivitiesResponse {
    success: boolean;
    statusCode: number;
    errors: string[];
}

export const api = {
  async exportCases(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0'
  ): Promise<ExportCasesResponse> {
    try {
      const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/cases/export`,
        qs: {
          'filter[organizationIds]': orgIds
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
      throw new Error(`Failed to export cases: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async exportCaseNotes(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string
  ): Promise<ExportCaseNotesResponse> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/notes/export`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to export case notes for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async exportCaseEndpoints(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    organizationIds: string | string[] = '0'
  ): Promise<ExportCaseEndpointsResponse> {
    try {
      const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/endpoints/export`,
        qs: {
          'filter[organizationIds]': orgIds
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
      throw new Error(`Failed to export case endpoints for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async exportCaseActivities(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string
  ): Promise<ExportCaseActivitiesResponse> {
    try {
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/activities/export`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to export case activities for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
