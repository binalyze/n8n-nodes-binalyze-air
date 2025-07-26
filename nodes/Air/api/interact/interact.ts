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
import { buildRequestOptionsWithErrorHandling, makeApiRequestWithErrorHandling } from '../../utils/helpers';

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
    command?: string;
    status?: string;
    output?: string;
    error?: string;
    // Additional properties from actual API response
    session?: {
      id: string;
    };
    exitCode?: number;
    cwd?: string;
    body?: string;
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

export interface CreateInterACTSessionRequest {
  assetId: string;
  caseId?: string | null;
  taskConfig: {
    choice: string;
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
    loginUrl?: string;
    shellUrl?: string;
    reportUrl?: string;
  }>;
  statusCode: number;
  errors: string[];
}

export interface CreateInterACTSessionResponse {
  success: boolean;
  result: {
    id: string;
    type: string;
    data: {
      sessionId: string;
      idleTimeout: number;
      config: any;
      privileges: string[];
    };
    assetId: string;
    loginUrl: string;
    shellUrl: string;
    reportUrl: string;
  };
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
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      `/api/public/interact/shell/sessions/${sessionId}/execute-command`
    );
    requestOptions.body = data;

    const response = await makeApiRequestWithErrorHandling<ExecuteCommandResponse>(context, requestOptions, `execute command in session ${sessionId}`);
    return response;
  },

  async executeAsyncCommand(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    data: ExecuteAsyncCommandRequest
  ): Promise<ExecuteAsyncCommandResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      `/api/public/interact/shell/sessions/${sessionId}/execute-async-command`
    );
    requestOptions.body = data;

    const response = await makeApiRequestWithErrorHandling<ExecuteAsyncCommandResponse>(context, requestOptions, `execute async command in session ${sessionId}`);
    return response;
  },

  async interruptCommand(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    messageId: string
  ): Promise<InterruptCommandResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      `/api/public/interact/shell/sessions/${sessionId}/messages/${messageId}/interrupt-command`
    );

    const response = await makeApiRequestWithErrorHandling<any>(context, requestOptions, `interrupt command ${messageId} in session ${sessionId}`);

    // The API returns result: null on success, so we need to handle this case
    if (response && response.success === true && response.result === null) {
      return {
        success: true,
        result: {
          messageId: messageId,
          status: 'interrupted',
          message: 'Command interrupted successfully'
        },
        statusCode: response.statusCode || 200,
        errors: response.errors || []
      };
    }

    // If the response has a non-null result, return it as is
    return response as InterruptCommandResponse;
  },

  async closeSession(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string
  ): Promise<CloseSessionResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      `/api/public/interact/shell/sessions/${sessionId}/close`
    );

    // The close session endpoint returns void/empty response, so we need to handle it differently
    try {
      await context.helpers.httpRequest(requestOptions);

      // If the request succeeds (no exception), return a success response
      return {
        success: true,
        result: {
          sessionId: sessionId,
          status: 'closed',
          message: 'Session closed successfully'
        },
        statusCode: 200,
        errors: []
      };
    } catch (error) {
      // If there's an error, wrap it in our standard error format
      const errorMessage = error instanceof Error ? error.message : 'Failed to close session';
      throw new Error(`Failed to close session ${sessionId}: ${errorMessage}`);
    }
  },

  async getCommandMessage(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    sessionId: string,
    messageId: string
  ): Promise<GetCommandMessageResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'GET',
      `/api/public/interact/shell/sessions/${sessionId}/messages/${messageId}`
    );

    const response = await makeApiRequestWithErrorHandling<GetCommandMessageResponse>(context, requestOptions, `get command message ${messageId} from session ${sessionId}`);
    return response;
  },

  // ===== TASK ASSIGNMENT METHODS =====

  async assignInterACTTask(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: AssignInterACTTaskRequest
  ): Promise<AssignInterACTTaskResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/interact/shell/assign-task'
    );
    requestOptions.body = data;

    const response = await makeApiRequestWithErrorHandling<AssignInterACTTaskResponse>(context, requestOptions, 'assign InterACT shell task');
    return response;
  },

  async createInterACTSession(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    data: CreateInterACTSessionRequest
  ): Promise<CreateInterACTSessionResponse> {
    const requestOptions = buildRequestOptionsWithErrorHandling(
      credentials,
      'POST',
      '/api/public/interact/shell/assign-task'
    );
    requestOptions.body = data;

    const response = await makeApiRequestWithErrorHandling<CreateInterACTSessionResponse>(context, requestOptions, 'create InterACT session');
    return response;
  }
};
