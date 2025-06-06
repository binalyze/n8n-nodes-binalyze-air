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

import { AirCredentials } from '../../../credentials/AirCredentialsApi.credentials';

export interface PaginationInfo {
	totalEntityCount: number;
	currentPage: number;
	pageSize: number;
	previousPage: number;
	totalPageCount: number;
	nextPage: number;
	sortables?: string[];
	filters?: any[];
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
	const credentials = await context.getCredentials('airCredentialsApi');

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
 * Generic function to extract entity ID from entity object with comprehensive field checking
 */
export function extractEntityId(entity: any, entityType: string = 'entity'): string {
	const entityId = entity._id ?? entity.id ?? entity[`${entityType}Id`] ?? entity.Id;

	if (entityId === undefined || entityId === null || entityId === '' || entityId === 0) {
		throw new Error(
			`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} has no valid ID. ID value: ${entityId}, ID type: ${typeof entityId}. ` +
			`Available fields: ${Object.keys(entity).join(', ')}`
		);
	}

	return String(entityId);
}

/**
 * Validate and normalize an ID value that can be a number, string, or GUID
 * Returns null if the ID is invalid, otherwise returns the normalized string representation
 */
export function validateAndNormalizeId(id: any): string | null {
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
export function requireValidId(id: any, fieldName: string = 'ID'): string {
	const normalizedId = validateAndNormalizeId(id);

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
		returnData.push({
			json: {
				error: error instanceof Error ? error.message : 'Unknown error occurred',
				errorDetails: error instanceof NodeOperationError ? {
					type: 'NodeOperationError',
					cause: error.cause,
				} : undefined,
			},
			pairedItem: itemIndex,
		});
	} else {
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
			currentPage: result.currentPage,
			pageSize: result.pageSize,
			previousPage: result.previousPage,
			totalPageCount: result.totalPageCount,
			nextPage: result.nextPage,
			sortables: result.sortables,
			filters: result.filters,
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
