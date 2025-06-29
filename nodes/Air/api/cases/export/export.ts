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

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirApi.credentials';
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../../utils/helpers';

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
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      '/api/public/cases/export',
      { 'filter[organizationIds]': orgIds }
    );

    return await makeApiRequestWithErrorHandling<ExportCasesResponse>(
      context,
      requestOptions,
      'export cases'
    );
  },

  async exportCaseNotes(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string
  ): Promise<ExportCaseNotesResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/cases/${caseId}/notes/export`
    );

    return await makeApiRequestWithErrorHandling<ExportCaseNotesResponse>(
      context,
      requestOptions,
      `export case notes for case ${caseId}`
    );
  },

  async exportCaseEndpoints(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    organizationIds: string | string[] = '0'
  ): Promise<ExportCaseEndpointsResponse> {
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/cases/${caseId}/endpoints/export`,
      { 'filter[organizationIds]': orgIds }
    );

    return await makeApiRequestWithErrorHandling<ExportCaseEndpointsResponse>(
      context,
      requestOptions,
      `export case endpoints for case ${caseId}`
    );
  },

  async exportCaseActivities(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string
  ): Promise<ExportCaseActivitiesResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/cases/${caseId}/activities/export`
    );

    return await makeApiRequestWithErrorHandling<ExportCaseActivitiesResponse>(
      context,
      requestOptions,
      `export case activities for case ${caseId}`
    );
  }
};
