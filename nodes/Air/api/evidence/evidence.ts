/**
 * Evidence API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing evidence files and downloads.
 *
 * The module includes:
 * - Evidence interfaces for API operations
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Evidence API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== EVIDENCE INTERFACES =====

export interface DownloadPpcFileRequest {
  taskId: string;
  filter?: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface DownloadTaskReportRequest {
  taskId: string;
  format?: string;
  filter?: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface GetPpcFileInfoRequest {
  taskId: string;
  filter?: {
    searchTerm?: string;
    name?: string;
    ipAddress?: string;
    groupId?: string;
    groupFullPath?: string;
    managedStatus?: string[];
    isolationStatus?: string[];
    platform?: string[];
    issue?: string;
    onlineStatus?: string[];
    tags?: string[];
    version?: string;
    policy?: string;
    includedEndpointIds?: string[];
    excludedEndpointIds?: string[];
    organizationIds?: (string | number)[];
  };
}

export interface EvidenceFileInfo {
  _id: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  taskId: string;
  createdAt: string;
  organizationId: number;
}

export interface DownloadPpcFileResponse {
  success: boolean;
  result: {
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    expiresAt: string;
  };
  statusCode: number;
  errors: string[];
}

export interface DownloadTaskReportResponse {
  success: boolean;
  result: {
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    format: string;
    expiresAt: string;
  };
  statusCode: number;
  errors: string[];
}

export interface GetPpcFileInfoResponse {
  success: boolean;
  result: EvidenceFileInfo;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== EVIDENCE FILE METHODS =====

  async downloadPpcFile(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: DownloadPpcFileRequest
  ): Promise<DownloadPpcFileResponse> {
    try {
      const options = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/evidence/download/ppc'
      );

      // Add query parameters
      const qs: Record<string, string | number> = {
        taskId: data.taskId
      };

      // Add filter parameters if provided
      if (data.filter) {
        if (data.filter.organizationIds) {
          const orgIds = Array.isArray(data.filter.organizationIds)
            ? data.filter.organizationIds.join(',')
            : data.filter.organizationIds;
          qs['filter[organizationIds]'] = orgIds;
        }
        if (data.filter.searchTerm) qs['filter[searchTerm]'] = data.filter.searchTerm;
        if (data.filter.name) qs['filter[name]'] = data.filter.name;
        if (data.filter.ipAddress) qs['filter[ipAddress]'] = data.filter.ipAddress;
        if (data.filter.groupId) qs['filter[groupId]'] = data.filter.groupId;
        if (data.filter.groupFullPath) qs['filter[groupFullPath]'] = data.filter.groupFullPath;
        if (data.filter.managedStatus) qs['filter[managedStatus]'] = data.filter.managedStatus.join(',');
        if (data.filter.isolationStatus) qs['filter[isolationStatus]'] = data.filter.isolationStatus.join(',');
        if (data.filter.platform) qs['filter[platform]'] = data.filter.platform.join(',');
        if (data.filter.issue) qs['filter[issue]'] = data.filter.issue;
        if (data.filter.onlineStatus) qs['filter[onlineStatus]'] = data.filter.onlineStatus.join(',');
        if (data.filter.tags) qs['filter[tags]'] = data.filter.tags.join(',');
        if (data.filter.version) qs['filter[version]'] = data.filter.version;
        if (data.filter.policy) qs['filter[policy]'] = data.filter.policy;
        if (data.filter.includedEndpointIds) qs['filter[includedEndpointIds]'] = data.filter.includedEndpointIds.join(',');
        if (data.filter.excludedEndpointIds) qs['filter[excludedEndpointIds]'] = data.filter.excludedEndpointIds.join(',');
      }

      options.qs = qs;

      const responseData = await context.helpers.httpRequest(options);
      validateApiResponse(responseData, 'Download PPC file');

      return responseData as DownloadPpcFileResponse;
    } catch (error) {
      throw new Error(`Failed to download PPC file: ${error.message}`);
    }
  },

  async downloadTaskReport(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: DownloadTaskReportRequest
  ): Promise<DownloadTaskReportResponse> {
    try {
      const options = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/evidence/download/report'
      );

      // Add query parameters
      const qs: Record<string, string | number> = {
        taskId: data.taskId
      };

      if (data.format) {
        qs.format = data.format;
      }

      // Add filter parameters if provided
      if (data.filter) {
        if (data.filter.organizationIds) {
          const orgIds = Array.isArray(data.filter.organizationIds)
            ? data.filter.organizationIds.join(',')
            : data.filter.organizationIds;
          qs['filter[organizationIds]'] = orgIds;
        }
        if (data.filter.searchTerm) qs['filter[searchTerm]'] = data.filter.searchTerm;
        if (data.filter.name) qs['filter[name]'] = data.filter.name;
        if (data.filter.ipAddress) qs['filter[ipAddress]'] = data.filter.ipAddress;
        if (data.filter.groupId) qs['filter[groupId]'] = data.filter.groupId;
        if (data.filter.groupFullPath) qs['filter[groupFullPath]'] = data.filter.groupFullPath;
        if (data.filter.managedStatus) qs['filter[managedStatus]'] = data.filter.managedStatus.join(',');
        if (data.filter.isolationStatus) qs['filter[isolationStatus]'] = data.filter.isolationStatus.join(',');
        if (data.filter.platform) qs['filter[platform]'] = data.filter.platform.join(',');
        if (data.filter.issue) qs['filter[issue]'] = data.filter.issue;
        if (data.filter.onlineStatus) qs['filter[onlineStatus]'] = data.filter.onlineStatus.join(',');
        if (data.filter.tags) qs['filter[tags]'] = data.filter.tags.join(',');
        if (data.filter.version) qs['filter[version]'] = data.filter.version;
        if (data.filter.policy) qs['filter[policy]'] = data.filter.policy;
        if (data.filter.includedEndpointIds) qs['filter[includedEndpointIds]'] = data.filter.includedEndpointIds.join(',');
        if (data.filter.excludedEndpointIds) qs['filter[excludedEndpointIds]'] = data.filter.excludedEndpointIds.join(',');
      }

      options.qs = qs;

      const responseData = await context.helpers.httpRequest(options);
      validateApiResponse(responseData, 'Download task report');

      return responseData as DownloadTaskReportResponse;
    } catch (error) {
      throw new Error(`Failed to download task report: ${error.message}`);
    }
  },

  async getPpcFileInfo(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: GetPpcFileInfoRequest
  ): Promise<GetPpcFileInfoResponse> {
    try {
      const options = buildRequestOptions(
        credentials,
        'GET',
        '/api/public/evidence/ppc/info'
      );

      // Add query parameters
      const qs: Record<string, string | number> = {
        taskId: data.taskId
      };

      // Add filter parameters if provided
      if (data.filter) {
        if (data.filter.organizationIds) {
          const orgIds = Array.isArray(data.filter.organizationIds)
            ? data.filter.organizationIds.join(',')
            : data.filter.organizationIds;
          qs['filter[organizationIds]'] = orgIds;
        }
        if (data.filter.searchTerm) qs['filter[searchTerm]'] = data.filter.searchTerm;
        if (data.filter.name) qs['filter[name]'] = data.filter.name;
        if (data.filter.ipAddress) qs['filter[ipAddress]'] = data.filter.ipAddress;
        if (data.filter.groupId) qs['filter[groupId]'] = data.filter.groupId;
        if (data.filter.groupFullPath) qs['filter[groupFullPath]'] = data.filter.groupFullPath;
        if (data.filter.managedStatus) qs['filter[managedStatus]'] = data.filter.managedStatus.join(',');
        if (data.filter.isolationStatus) qs['filter[isolationStatus]'] = data.filter.isolationStatus.join(',');
        if (data.filter.platform) qs['filter[platform]'] = data.filter.platform.join(',');
        if (data.filter.issue) qs['filter[issue]'] = data.filter.issue;
        if (data.filter.onlineStatus) qs['filter[onlineStatus]'] = data.filter.onlineStatus.join(',');
        if (data.filter.tags) qs['filter[tags]'] = data.filter.tags.join(',');
        if (data.filter.version) qs['filter[version]'] = data.filter.version;
        if (data.filter.policy) qs['filter[policy]'] = data.filter.policy;
        if (data.filter.includedEndpointIds) qs['filter[includedEndpointIds]'] = data.filter.includedEndpointIds.join(',');
        if (data.filter.excludedEndpointIds) qs['filter[excludedEndpointIds]'] = data.filter.excludedEndpointIds.join(',');
      }

      options.qs = qs;

      const responseData = await context.helpers.httpRequest(options);
      validateApiResponse(responseData, 'Get PPC file info');

      return responseData as GetPpcFileInfoResponse;
    } catch (error) {
      throw new Error(`Failed to get PPC file info: ${error.message}`);
    }
  },
};
