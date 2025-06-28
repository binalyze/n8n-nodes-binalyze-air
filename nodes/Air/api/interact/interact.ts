/**
 * InterACT API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing InterACT operations including shell commands, session management, and task assignments.
 *
 * The module includes:
 * - InterACTSession interface: Represents an InterACT session
 * - InterACTCommand interface: Represents a command execution
 * - InterACTMessage interface: Represents a command message
 * - Various response interfaces for API operations
 * - api object: Contains methods to interact with the InterACT API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../credentials/AirApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../utils/helpers';

// ===== INTERACT SESSION INTERFACES =====

export interface InterACTSession {
  _id: string;
  sessionId: string;
  endpointId: string;
  status: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastActivity: string;
}

export interface InterACTCommand {
  _id: string;
  sessionId: string;
  command: string;
  status: string;
  result?: string;
  output?: string;
  error?: string;
  executedAt: string;
  completedAt?: string;
}

export interface InterACTMessage {
  _id: string;
  messageId: string;
  sessionId: string;
  type: string;
  content: string;
  timestamp: string;
  status: string;
}

// ===== COMMAND EXECUTION INTERFACES =====

export interface ExecuteCommandRequest {
  command: string;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface ExecuteCommandResponse {
  success: boolean;
  result: {
    messageId: string;
    command: string;
    status: string;
    output?: string;
    error?: string;
  };
  statusCode: number;
  errors: string[];
}

export interface ExecuteAsyncCommandRequest {
  command: string;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface ExecuteAsyncCommandResponse {
  success: boolean;
  result: {
    messageId: string;
    command: string;
    status: string;
    jobId: string;
  };
  statusCode: number;
  errors: string[];
}

export interface InterruptCommandResponse {
  success: boolean;
  result: {
    messageId: string;
    status: string;
    message: string;
  };
  statusCode: number;
  errors: string[];
}

export interface CloseSessionResponse {
  success: boolean;
  result: {
    sessionId: string;
    status: string;
    message: string;
  };
  statusCode: number;
  errors: string[];
}

export interface GetCommandMessageResponse {
  success: boolean;
  result: InterACTMessage & {
    output?: string;
    error?: string;
    exitCode?: number;
  };
  statusCode: number;
  errors: string[];
}

// ===== TASK ASSIGNMENT INTERFACES =====

export interface AssignInterACTTaskRequest {
  sessionType: string;
  commands?: string[];
  timeout?: number;
  filter: {
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

export interface AssignInterACTTaskResponse {
  success: boolean;
  result: Array<{
    _id: string;
    name: string;
    sessionId: string;
    endpointId: string;
    organizationId: number;
  }>;
  statusCode: number;
  errors: string[];
}

// ===== API METHODS =====

export const api = {
  // ===== SHELL COMMAND METHODS =====

  async executeCommand(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    data: ExecuteCommandRequest
  ): Promise<ExecuteCommandResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/interact/shell/sessions/${sessionId}/execute-command`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `execute command in session ${sessionId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async executeAsyncCommand(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    data: ExecuteAsyncCommandRequest
  ): Promise<ExecuteAsyncCommandResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/interact/shell/sessions/${sessionId}/execute-async-command`
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `execute async command in session ${sessionId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to execute async command: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async interruptCommand(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    messageId: string
  ): Promise<InterruptCommandResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/interact/shell/sessions/${sessionId}/messages/${messageId}/interrupt-command`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `interrupt command ${messageId} in session ${sessionId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to interrupt command: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async closeSession(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string
  ): Promise<CloseSessionResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/interact/shell/sessions/${sessionId}/close`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `close session ${sessionId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to close session: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async getCommandMessage(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    messageId: string
  ): Promise<GetCommandMessageResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'GET',
        `/api/public/interact/shell/sessions/${sessionId}/messages/${messageId}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `get command message ${messageId} from session ${sessionId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get command message: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // ===== TASK ASSIGNMENT METHODS =====

  async assignInterACTTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignInterACTTaskRequest
  ): Promise<AssignInterACTTaskResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        '/api/public/interact/shell/assign-task'
      );
      requestOptions.body = data;

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, 'assign InterACT shell task');
      return response;
    } catch (error) {
      throw new Error(`Failed to assign InterACT task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
