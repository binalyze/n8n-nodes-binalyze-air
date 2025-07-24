/**
 * Acquisitions API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing acquisition profiles and evidence collection tasks.
 *
 * The module includes:
 * - AcquisitionProfile interface: Represents a single acquisition profile in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Acquisitions API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { BaseApiResponse, PaginatedApiResponse, EmptyApiResponse, executeHttpRequest } from '../api';

// ===== ACQUISITION INTERFACES =====

export interface AcquisitionSettings {
  artifacts?: string[];
  evidence?: string[];
  customSettings?: Record<string, string | number | boolean>;
}

export interface AcquisitionEndpointFilter {
  searchTerm?: string;
  name?: string;
  ipAddress?: string;
  groupId?: string;
  groupFullPath?: string;
  label?: string;
  lastSeenAfter?: string;
  lastSeenBefore?: string;
  managedStatus?: string[];
  isolationStatus?: string[];
  platform?: string[];
  issue?: string[];
  onlineStatus?: string[];
  tags?: string[];
  version?: string;
  policy?: string;
  includedEndpointIds?: string[];
  excludedEndpointIds?: string[];
  organizationIds: number[];
  connectionRouteId?: number;
  caseId?: string;
  awsRegions?: string[];
  azureRegions?: string[];
  agentInstalled?: boolean;
  isServer?: boolean;
  assetType?: string;
  vendorIds?: string[];
  vendorDeviceIds?: string[];
}

export interface TaskConfig {
  choice: 'useCustomOptions' | 'useDefaultOptions';
  saveTo?: Record<string, any>;
  cpu?: { usageLimit: number };
  bandwidth?: { limit: number };
  diskSpace?: { limit: number };
  compression?: { enabled: boolean };
  sendTo?: Record<string, any>;
  triageLocalDrivesOnly?: Record<string, any>;
  locard?: Record<string, any>;
}

export interface DroneConfig {
  autoPilot: boolean;
  enabled: boolean;
  mitreEnabled: boolean;
  analyzers: string[];
  keywords: string[];
  minScore: number;
}

export interface EventLogRecordsConfig {
  startDate: string | null;
  endDate: string | null;
  maxEventCount: number;
}

export interface TaskSchedulerConfig {
  when: 'now' | 'scheduled';
  timezoneType?: 'asset' | 'custom';
  timezone?: string;
  startDate?: number;
  isRepeat?: boolean;
  recurrence?: string;
  repeatEvery?: number;
  repeatOnWeek?: string[];
  repeatOnMonth?: number;
  endRepeatType?: string;
  endDate?: number;
  limit?: number;
}

export interface AcquisitionProfile {
  _id: string;
  name: string;
  description?: string;
  organizationId: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isDefault?: boolean;
  settings?: AcquisitionSettings;
}

// ===== REQUEST INTERFACES =====

export interface CreateAcquisitionProfileRequest {
  name: string;
  description?: string;
  organizationId: number;
  settings?: AcquisitionSettings;
}

export interface UpdateAcquisitionProfileRequest {
  name: string;
  description?: string;
  settings?: AcquisitionSettings;
}

export interface AssignEvidenceTaskRequest {
  taskName?: string;
  caseId: string;
  acquisitionProfileId: string;
  taskConfig: TaskConfig;
  filter: AcquisitionEndpointFilter;
  droneConfig: DroneConfig;
  eventLogRecordsConfig: EventLogRecordsConfig;
  schedulerConfig?: TaskSchedulerConfig;
}

export interface AssignImageTaskRequest {
  taskName?: string;
  caseId: string;
  taskConfig: TaskConfig;
  filter: AcquisitionEndpointFilter;
  diskImageOptions: Record<string, any>;
  schedulerConfig?: TaskSchedulerConfig;
}

export interface CreateOffNetworkTaskRequest {
  caseId: string;
  acquisitionProfileId: string;
  organizationId: number;
  name: string;
  description?: string;
}

// ===== RESPONSE TYPE ALIASES =====

export type AcquisitionProfilesResponse = PaginatedApiResponse<AcquisitionProfile>;
export type CreateAcquisitionProfileResponse = BaseApiResponse<AcquisitionProfile>;
export type UpdateAcquisitionProfileResponse = BaseApiResponse<AcquisitionProfile>;
export type GetAcquisitionProfileResponse = BaseApiResponse<AcquisitionProfile>;
export type DeleteAcquisitionProfileResponse = EmptyApiResponse;

export type AssignAcquisitionTaskResponse = BaseApiResponse<Array<{
  _id: string;
  name: string;
  organizationId: number;
}>>;

export type CreateOffNetworkTaskResponse = BaseApiResponse<{
  _id: string;
  name: string;
  organizationId: number;
  caseId: string;
  acquisitionProfileId: string;
}>;



// ===== API METHODS =====

export const api = {
  // ===== ACQUISITION PROFILE METHODS =====

  async getAcquisitionProfiles(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    organizationIds: string | string[] = '0',
    queryParams?: Record<string, string | number>
  ): Promise<AcquisitionProfilesResponse> {
    const orgIds = Array.isArray(organizationIds) ? organizationIds.join(',') : organizationIds;

    const qs: Record<string, string | number> = {
      'filter[organizationIds]': orgIds,
      ...queryParams
    };

    return await executeHttpRequest<undefined, AcquisitionProfilesResponse>(
      context,
      credentials,
      'GET',
      '/api/public/acquisitions/profiles',
      'Get Acquisition Profiles',
      undefined,
      qs
    );
  },

  async createAcquisitionProfile(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateAcquisitionProfileRequest
  ): Promise<CreateAcquisitionProfileResponse> {
    return await executeHttpRequest<CreateAcquisitionProfileRequest, CreateAcquisitionProfileResponse>(
      context,
      credentials,
      'POST',
      '/api/public/acquisitions/profiles',
      'Create Acquisition Profile',
      data
    );
  },


  async getAcquisitionProfileById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<GetAcquisitionProfileResponse> {
    return await executeHttpRequest<undefined, GetAcquisitionProfileResponse>(
      context,
      credentials,
      'GET',
      `/api/public/acquisitions/profiles/${id}`,
      'Get Acquisition Profile'
    );
  },

  // ===== TASK ASSIGNMENT METHODS =====

  async assignEvidenceAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignEvidenceTaskRequest
  ): Promise<AssignAcquisitionTaskResponse> {
    return await executeHttpRequest<AssignEvidenceTaskRequest, AssignAcquisitionTaskResponse>(
      context,
      credentials,
      'POST',
      '/api/public/acquisitions/acquire',
      'Assign Evidence Acquisition Task',
      data
    );
  },

  async assignImageAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignImageTaskRequest
  ): Promise<AssignAcquisitionTaskResponse> {
    return await executeHttpRequest<AssignImageTaskRequest, AssignAcquisitionTaskResponse>(
      context,
      credentials,
      'POST',
      '/api/public/acquisitions/acquire/image',
      'Assign Image Acquisition Task',
      data
    );
  },

  async createOffNetworkAcquisitionTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateOffNetworkTaskRequest
  ): Promise<CreateOffNetworkTaskResponse> {
    return await executeHttpRequest<CreateOffNetworkTaskRequest, CreateOffNetworkTaskResponse>(
      context,
      credentials,
      'POST',
      '/api/public/acquisitions/acquire/off-network',
      'Create Off-Network Acquisition Task',
      data
    );
  },
};
