/**
 * Case Notes API Module
 *
 * This module provides interfaces and functions to interact with the Binalyze AIR API
 * for managing case notes.
 *
 * The module includes:
 * - Note interface: Represents a case note in the system
 * - Note response interfaces: Represent the API response structures
 * - api object: Contains methods to interact with the Case Notes API endpoints
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/Air/AirCredentialsApi.credentials';
import { buildRequestOptions, validateApiResponse } from '../../../utils/helpers';

export interface Note {
  _id: string;
  value: string;
  writtenAt: string;
  writtenBy: string;
}

export interface AddNoteResponse {
  success: boolean;
  result: Note;
  statusCode: number;
  errors: string[];
}

export interface UpdateNoteResponse {
  success: boolean;
  result: Note;
  statusCode: number;
  errors: string[];
}

export interface DeleteNoteResponse {
  success: boolean;
  result: null;
  statusCode: number;
  errors: string[];
}

export const api = {
  async addNote(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    noteValue: string
  ): Promise<AddNoteResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'POST',
        `/api/public/cases/${caseId}/notes`
      );
      requestOptions.body = { value: noteValue };

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `add note to case ${caseId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to add note to case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async updateNote(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    noteId: string,
    noteValue: string
  ): Promise<UpdateNoteResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'PATCH',
        `/api/public/cases/${caseId}/notes/${noteId}`
      );
      requestOptions.body = { value: noteValue };

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `update note ${noteId} in case ${caseId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to update note ${noteId} in case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async deleteNote(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentials: AirCredentials,
    caseId: string,
    noteId: string
  ): Promise<DeleteNoteResponse> {
    try {
      const requestOptions = buildRequestOptions(
        credentials,
        'DELETE',
        `/api/public/cases/${caseId}/notes/${noteId}`
      );

      const response = await context.helpers.httpRequest(requestOptions);
      validateApiResponse(response, `delete note ${noteId} from case ${caseId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete note ${noteId} from case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
