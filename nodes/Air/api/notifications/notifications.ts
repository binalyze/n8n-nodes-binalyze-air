/**
 * Notifications API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing user notifications.
 *
 * The module includes:
 * - Notification interface: Represents a single notification in the system
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the Notifications API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== NOTIFICATION INTERFACES =====

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  organizationId: number;
}

export interface NotificationsResponse {
  success: boolean;
  result: {
    entities: Notification[];
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

export interface DeleteAllNotificationsResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface MarkAllAsReadResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  result: Notification;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== NOTIFICATION METHODS =====

  async getNotifications(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    queryParams?: Record<string, string | number>
  ): Promise<NotificationsResponse> {
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
        '/api/public/notifications',
        qs
      );

      const responseData = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(responseData, 'Get notifications');

      return responseData as NotificationsResponse;
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteAllNotifications(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<DeleteAllNotificationsResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        '/api/public/notifications'
      );

      const responseData = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(responseData, 'Delete all notifications');

      return responseData as DeleteAllNotificationsResponse;
    } catch (error) {
      throw new Error(`Failed to delete all notifications: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async markAllAsRead(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials
  ): Promise<MarkAllAsReadResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PUT',
        '/api/public/notifications/read'
      );

      const responseData = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(responseData, 'Mark all notifications as read');

      return responseData as MarkAllAsReadResponse;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async markAsReadById(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    id: string
  ): Promise<MarkAsReadResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PATCH',
        `/api/public/notifications/${id}/read`
      );

      const responseData = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(responseData, 'Mark notification as read');

      return responseData as MarkAsReadResponse;
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
