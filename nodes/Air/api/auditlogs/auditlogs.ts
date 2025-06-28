/**
 * Audit Logs API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing audit logs.
 *
 * The module includes:
 * - AuditLog interface: Represents a single audit log entry in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Audit Logs API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== AUDIT LOG INTERFACES =====

export interface AuditLog {
  _id: string;
  timestamp: string;
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLogsResponse {
  success: boolean;
  result: {
    entities: AuditLog[];
    filters: Array<{
      name: string;
      type: string;
      options: string[];
      filterUrl: string | null;
    }>;
    sortables: string[];
    totalEntityCount: number;
    currentPage: number;
    pageSize: number;
    previousPage: number;
    totalPageCount: number;
    nextPage: number;
  };
  statusCode: number;
  errors: string[];
}

export interface ExportAuditLogsRequest {
  filter?: {
    organizationIds?: (string | number)[];
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
  };
  format?: 'csv' | 'json';
}

export interface ExportAuditLogsResponse {
  success: boolean;
  result: {
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  };
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {

  /**
   * Get audit logs
   */
  async getAuditLogs(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    queryParams?: Record<string, string | number>
  ): Promise<AuditLogsResponse> {
    try {
      // Build the query string parameters
      const qs: Record<string, string | number> = {};

      // Add additional query parameters if provided
      if (queryParams) {
        Object.assign(qs, queryParams);
      }

      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/audit-logs',
        qs
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'fetch audit logs');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch audit logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: ExportAuditLogsRequest
  ): Promise<ExportAuditLogsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/audit-logs/export'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'export audit logs');
      return response;
    } catch (error) {
      throw new Error(`Failed to export audit logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
