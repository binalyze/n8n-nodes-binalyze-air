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

import { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { AirCredentials } from '../../../../../credentials/AirCredentialsApi.credentials';

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
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/notes`,
        body: { value: noteValue },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
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
      const options: IHttpRequestOptions = {
        method: 'PATCH',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/notes/${noteId}`,
        body: { value: noteValue },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
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
      const options: IHttpRequestOptions = {
        method: 'DELETE',
        url: `${credentials.instanceUrl}/api/public/cases/${caseId}/notes/${noteId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}`
        },
        json: true
      };

      const response = await context.helpers.httpRequest(options);
      return response;
    } catch (error) {
      throw new Error(`Failed to delete note ${noteId} from case ${caseId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
