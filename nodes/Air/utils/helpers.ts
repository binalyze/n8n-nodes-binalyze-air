import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	INodePropertyOptions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import { AirCredentials } from '../../../credentials/AirApi.credentials';

export interface PaginationInfo {
	totalEntityCount: number;
	pageSize: number;
	currentPage: number;
	totalPageCount: number;
}

export interface ApiResponse {
	success: boolean;
	result?: {
		entities?: any[];
		// Pagination properties are directly in result, not in a separate pagination object
		totalEntityCount?: number;
		currentPage?: number;
		pageSize?: number;
		previousPage?: number;
		totalPageCount?: number;
		nextPage?: number;
		sortables?: string[];
		filters?: any[];
	} | any[]; // result can also be a direct array of entities
	errors?: string[];
}

/**
 * Get and validate AIR credentials
 */
export async function getAirCredentials(
	context: IExecuteFunctions | ILoadOptionsFunctions
): Promise<AirCredentials> {
	const credentials = await context.getCredentials('airApi');

	if (!credentials) {
		throw new Error('No credentials provided for Binalyze AIR');
	}

	const instanceUrl = credentials.instanceUrl as string;
	const token = credentials.token as string;

	if (!instanceUrl || !token) {
		throw new Error('Missing instanceUrl or token in Binalyze AIR credentials');
	}

	// Normalize instanceUrl by removing trailing slashes
	const normalizedInstanceUrl = instanceUrl.replace(/\/+$/, '');

	return {
		instanceUrl: normalizedInstanceUrl,
		token,
	};
}

/**
 * Build standard HTTP request options for AIR API
 */
export function buildRequestOptions(
	credentials: AirCredentials,
	method: IHttpRequestMethods,
	endpoint: string,
	queryParams?: Record<string, string | number>
): IHttpRequestOptions {
	const options: IHttpRequestOptions = {
		method,
		url: `${credentials.instanceUrl}${endpoint}`,
		headers: {
			'Authorization': `Bearer ${credentials.token}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
	};

	// Use n8n's built-in query parameter handling
	if (queryParams && Object.keys(queryParams).length > 0) {
		options.qs = queryParams;
	}

	return options;
}

/**
 * Handle API response and throw appropriate errors
 */
export function validateApiResponse(responseData: ApiResponse, context?: string): void {
	if (!responseData.success) {
		const errorMessage = responseData.errors?.join(', ') || 'API request failed';
		const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
		throw new Error(fullMessage);
	}
}

/**
 * Internal function to handle HTTP error responses and convert them to proper n8n errors
 * Supports both standard HTTP error responses and AIR API error responses
 */
function handleApiError(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	error: any,
	operation: string,
	itemIndex?: number
): never {
	let errorMessage = 'Unknown error occurred';
	let statusCode = 500;
	let errors: string[] = [];
	let httpDetails: string[] = [];

	// Handle HTTP response errors
	if (error.response?.data) {
		const responseData = error.response.data;
		statusCode = error.response.status || statusCode;

		// Add HTTP details for better debugging
		httpDetails.push(`HTTP Status: ${statusCode}`);
		if (error.response.statusText) {
			httpDetails.push(`Status Text: ${error.response.statusText}`);
		}

		// Handle standard HTTP error format (like the user's example)
		if (responseData.message) {
			if (Array.isArray(responseData.message)) {
				errors = responseData.message;
				errorMessage = errors.join(', ');
			} else {
				errorMessage = responseData.message;
				errors = [errorMessage];
			}
		}
		// Handle AIR API error format
		else if (responseData.errors && Array.isArray(responseData.errors)) {
			errors = responseData.errors;
			errorMessage = errors.join(', ');
		}
		// Handle other error formats
		else if (responseData.error) {
			errorMessage = responseData.error;
			errors = [errorMessage];

			// Add the error field to httpDetails if it's different from message
			if (responseData.error !== errorMessage) {
				httpDetails.push(`Error Type: ${responseData.error}`);
			}
		}
		// Fallback for unknown response format
		else {
			errorMessage = `API request failed with status ${statusCode}`;
			errors = [errorMessage];
		}

		// Add raw response data for debugging if it contains useful info
		if (responseData.statusCode) {
			httpDetails.push(`API Status Code: ${responseData.statusCode}`);
		}

		// Include the actual HTTP response details in error description
		httpDetails.push(`Response Body: ${JSON.stringify(responseData, null, 2)}`);
	}
	// Handle network errors or other non-HTTP errors
	else if (error.message) {
		errorMessage = error.message;
		errors = [errorMessage];
		httpDetails.push(`Network/Connection Error: ${error.message}`);
	}

	// Create a descriptive error message with context
	const fullMessage = `Failed to ${operation}: ${errorMessage}`;

	// Combine error details with HTTP details for description
	const allDetails = [...errors];
	if (httpDetails.length > 0) {
		allDetails.push('', 'HTTP Response Details:', ...httpDetails);
	}

	// Create appropriate n8n error based on context
	if (context && 'getNode' in context && itemIndex !== undefined) {
		// This is an execution context with an item index
		throw new NodeOperationError(context.getNode(), fullMessage, {
			itemIndex,
			description: allDetails.join('\n'),
		});
	} else if (context && 'getNode' in context) {
		// This is an execution context without item index
		throw new NodeOperationError(context.getNode(), fullMessage, {
			description: allDetails.join('\n'),
		});
	} else {
		// This is likely a load options context, use regular Error
		const detailedError = new Error(fullMessage);
		// Add the details as a property for debugging
		(detailedError as any).details = allDetails.join('\n');
		throw detailedError;
	}
}

/**
 * Simplified API request function that handles all error scenarios internally
 * This is the main function to use for all API calls - handles both HTTP errors and API response errors
 */
export async function makeApiRequestWithErrorHandling<T>(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	requestOptions: IHttpRequestOptions,
	operation: string,
	itemIndex?: number
): Promise<T> {
	try {
		const response = await context.helpers.httpRequest(requestOptions);

		// Check for HTTP error status codes first (when ignoreHttpStatusErrors is true)
		if (response && typeof response === 'object' && response.statusCode && response.statusCode >= 400) {
			// Create a mock error object to pass to handleApiError for consistent handling
			const httpError = {
				response: {
					status: response.statusCode,
					statusText: response.error || 'HTTP Error',
					data: response
				}
			};
			handleApiError(context, httpError, operation, itemIndex);
		}

		// Handle standard AIR API response format
		if (response && typeof response === 'object' && 'success' in response) {
			if (!response.success) {
				const errors = response.errors || ['API request failed'];
				const errorMessage = errors.join(', ');
				const fullMessage = `Failed to ${operation}: ${errorMessage}`;

				// Include response details for debugging
				const responseDetails = [
					'',
					'API Response Details:',
					`Success: ${response.success}`,
					`Response Body: ${JSON.stringify(response, null, 2)}`
				];

				if (context && 'getNode' in context && itemIndex !== undefined) {
					throw new NodeOperationError(context.getNode(), fullMessage, {
						itemIndex,
						description: [...errors, ...responseDetails].join('\n'),
					});
				} else if (context && 'getNode' in context) {
					throw new NodeOperationError(context.getNode(), fullMessage, {
						description: [...errors, ...responseDetails].join('\n'),
					});
				} else {
					throw new Error(fullMessage);
				}
			}
		}
		// Handle unexpected response format
		else if (!response) {
			const errorMessage = `Failed to ${operation}: No response data received`;
			if (context && 'getNode' in context && itemIndex !== undefined) {
				throw new NodeOperationError(context.getNode(), errorMessage, { itemIndex });
			} else if (context && 'getNode' in context) {
				throw new NodeOperationError(context.getNode(), errorMessage);
			} else {
				throw new Error(errorMessage);
			}
		}

		return response;
	} catch (error) {
		// Only handle if it's not already a NodeOperationError (from above)
		if (error instanceof NodeOperationError) {
			throw error;
		}
		handleApiError(context, error, operation, itemIndex);
	}
}

/**
 * Enhanced buildRequestOptions with improved error handling
 */
export function buildRequestOptionsWithErrorHandling(
	credentials: AirCredentials,
	method: IHttpRequestMethods,
	endpoint: string,
	queryParams?: Record<string, string | number>
): IHttpRequestOptions {
	const options: IHttpRequestOptions = {
		method,
		url: `${credentials.instanceUrl}${endpoint}`,
		headers: {
			'Authorization': `Bearer ${credentials.token}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
		// Allow handling of HTTP error status codes manually
		ignoreHttpStatusErrors: true,
	};

	// Use n8n's built-in query parameter handling
	if (queryParams && Object.keys(queryParams).length > 0) {
		options.qs = queryParams;
	}

	return options;
}

/**
 * Generic function to extract entity ID from entity object using _id field only
 */
export function extractEntityId(entity: any, entityType: string = 'entity'): string {
	const entityId = entity._id || entity.id;

	if (entityId === undefined || entityId === null || entityId === '') {
		throw new Error(
			`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} has no valid _id. ID value: ${entityId}, ID type: ${typeof entityId}. ` +
			`Available fields: ${Object.keys(entity).join(', ')}`
		);
	}

	return String(entityId);
}

/**
 * Validate and normalize an ID value that can be a number, string, or GUID
 * Returns null if the ID is invalid, otherwise returns the normalized string representation
 */
function normalizeId(id: any): string | null {
	// Handle null, undefined, or empty values
	if (id === null || id === undefined) {
		return null;
	}

	// Convert to string and trim if it's a string
	const stringId = String(id).trim();

	// Check if the resulting string is empty
	if (stringId === '') {
		return null;
	}

	// Check if it's a valid number (including 0 and negative numbers for some IDs)
	const numericId = Number(stringId);
	if (!isNaN(numericId)) {
		return stringId;
	}

	// Check if it's a valid GUID/UUID pattern (basic validation)
	const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (guidPattern.test(stringId)) {
		return stringId;
	}

	// Check if it's a valid alphanumeric ID (letters, numbers, hyphens, underscores)
	const alphanumericPattern = /^[a-zA-Z0-9-_]+$/;
	if (alphanumericPattern.test(stringId)) {
		return stringId;
	}

	// If none of the above patterns match, consider it invalid
	return null;
}

/**
 * Validate that an ID is not empty/null and return normalized string
 * Throws an error if the ID is invalid
 */
export function normalizeAndValidateId(id: any, fieldName: string = 'ID'): string {
	const normalizedId = normalizeId(id);

	if (normalizedId === null) {
		throw new Error(`${fieldName} cannot be empty or invalid. Received: ${id} (type: ${typeof id})`);
	}

	return normalizedId;
}

/**
 * Generic function to validate that an entity has a valid ID and required fields
 */
export function isValidEntity(entity: any, requiredFields: string[] = ['name']): boolean {
	if (!entity) return false;

	try {
		extractEntityId(entity);
		return requiredFields.every(field => !!entity[field]);
	} catch {
		return false;
	}
}

/**
 * Validate and extract organization ID from resource locator
 * Handles all three modes: list, id, and name
 */
export async function validateAndExtractOrganizationId(
	context: IExecuteFunctions,
	credentials: AirCredentials,
	organizationResource: any,
	itemIndex: number,
	findOrganizationByNameFn: (context: IExecuteFunctions, credentials: AirCredentials, name: string) => Promise<string>
): Promise<string> {
	let organizationId: string;

	if (organizationResource.mode === 'list' || organizationResource.mode === 'id') {
		organizationId = organizationResource.value;

		// Check for invalid selections (empty values or search hints)
		if (!organizationId || String(organizationId).trim() === '' || organizationId === '__search_hint__') {
			throw new NodeOperationError(context.getNode(), 'Please select a valid organization from the list or enter a valid organization ID', {
				itemIndex,
			});
		}
	} else if (organizationResource.mode === 'name') {
		const organizationName = organizationResource.value;
		if (!organizationName || String(organizationName).trim() === '') {
			throw new NodeOperationError(context.getNode(), 'Please enter a valid organization name', {
				itemIndex,
			});
		}

		try {
			organizationId = await findOrganizationByNameFn(context, credentials, organizationName);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error.message, { itemIndex });
		}
	} else {
		throw new NodeOperationError(context.getNode(), 'Invalid organization selection mode', {
			itemIndex,
		});
	}

	// Validate organization ID
	try {
		organizationId = normalizeAndValidateId(organizationId, 'Organization ID');
	} catch (error) {
		throw new NodeOperationError(context.getNode(), error.message, {
			itemIndex,
		});
	}

	return organizationId;
}

/**
 * Generic function to create list search results for n8n resource locators
 */
export function createListSearchResults(
	entities: any[],
	validationFn: (entity: any) => boolean,
	mapFn: (entity: any) => INodeListSearchItems,
	filter?: string
): INodeListSearchResult {
	const results: INodeListSearchItems[] = entities
		.filter(validationFn)
		.map(mapFn)
		// Apply client-side filtering for better search results
		.filter((item: any) =>
			!filter ||
			item.name.toLowerCase().includes(filter.toLowerCase()) ||
			item.value === filter
		)
		.sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results };
}

/**
 * Generic function to create load options for n8n dropdowns
 */
export function createLoadOptions(
	entities: any[],
	validationFn: (entity: any) => boolean,
	mapFn: (entity: any) => INodePropertyOptions
): INodePropertyOptions[] {
	return entities
		.filter(validationFn)
		.map(mapFn);
}

/**
 * Generic function to handle execute operation errors with consistent error handling
 */
export function handleExecuteError(
	context: IExecuteFunctions,
	error: any,
	itemIndex: number,
	returnData: INodeExecutionData[]
): void {
	if (context.continueOnFail()) {
		// Ensure we have a proper error message even if error is null/undefined
		let errorMessage = 'Unknown error occurred';
		let errorDetails: any = undefined;

		if (error) {
			if (error instanceof Error) {
				errorMessage = error.message;
				if (error instanceof NodeOperationError) {
					errorDetails = {
						type: 'NodeOperationError',
						cause: error.cause,
					};
				}
			} else if (typeof error === 'string') {
				errorMessage = error;
			} else if (typeof error === 'object') {
				errorMessage = error.message || error.error || JSON.stringify(error);
			}
		}

		returnData.push({
			json: {
				error: errorMessage,
				errorDetails: errorDetails,
			},
			pairedItem: itemIndex,
		});
	} else {
		// If error is null/undefined, create a proper error object
		if (!error) {
			throw new NodeOperationError(context.getNode(), 'An unknown error occurred', {
				itemIndex,
			});
		}

		throw error instanceof NodeOperationError ? error : new NodeOperationError(context.getNode(), error as Error, {
			itemIndex,
		});
	}
}

/**
 * Extract entities from API response, handling both paginated and non-paginated responses
 */
export function extractEntitiesFromResponse(responseData: ApiResponse): any[] {
	if (!responseData.result) {
		return [];
	}

	// If result is an array, return it directly (non-paginated response)
	if (Array.isArray(responseData.result)) {
		return responseData.result;
	}

	// If result is an object with entities property, return the entities (paginated response)
	if (responseData.result.entities && Array.isArray(responseData.result.entities)) {
		return responseData.result.entities;
	}

	// If result is an object but no entities property, return empty array
	return [];
}

/**
 * Check if the API response has pagination info
 */
export function hasResponsePagination(responseData: ApiResponse): boolean {
	if (!responseData.result || Array.isArray(responseData.result)) {
		return false;
	}

	return responseData.result.totalEntityCount !== undefined;
}

/**
 * Extract pagination information from API response or result object
 */
export function extractPaginationInfo(source: ApiResponse | any): PaginationInfo | null {
	let result: any;

	// Handle ApiResponse vs direct result object
	if (source && typeof source === 'object' && 'success' in source) {
		// It's an ApiResponse
		result = source.result;
	} else {
		// It's a direct result object
		result = source;
	}

	if (!result || Array.isArray(result)) {
		return null;
	}

	// Check if pagination properties exist in the result
	if (result.totalEntityCount !== undefined) {
		return {
			totalEntityCount: result.totalEntityCount,
			pageSize: result.pageSize,
			currentPage: result.currentPage,
			totalPageCount: result.totalPageCount,
		};
	}

	return null;
}

/**
 * Process API response entities with optional pagination info inclusion
 */
export function processApiResponseEntities(
	entities: any[],
	returnData: INodeExecutionData[],
	itemIndex: number,
	options?: {
		includePagination?: boolean;
		paginationData?: PaginationInfo | null;
		excludeFields?: string[]; // Fields to exclude from pagination data
	}
): void {
	entities.forEach((entity: any) => {
		const jsonData = { ...entity };

		// Include pagination info in the entity's JSON if requested and available
		if (options?.includePagination && options.paginationData) {
			let paginationToInclude = { ...options.paginationData };

			// Remove specified fields from pagination data if requested
			if (options.excludeFields) {
				options.excludeFields.forEach(field => {
					delete (paginationToInclude as any)[field];
				});
			}

			jsonData._pagination = paginationToInclude;
		}

		returnData.push({
			json: jsonData,
			pairedItem: itemIndex,
		});
	});
}

/**
 * Generic function to catch and format errors for load/search functions
 */
export function catchAndFormatError(error: any, operation: string): Error {
	const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
	return new Error(`Failed to ${operation}: ${errorMessage}`);
}
