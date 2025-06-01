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

/**
 * Simplified pagination info interface without sortables and filters
 */
export interface SimplifiedPaginationInfo {
	totalEntityCount: number;
	currentPage: number;
	pageSize: number;
	previousPage: number;
	totalPageCount: number;
	nextPage: number;
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
	};
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
	let url = `${credentials.instanceUrl}${endpoint}`;

	if (queryParams && Object.keys(queryParams).length > 0) {
		const queryString = Object.entries(queryParams)
			.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
			.join('&');
		url += `?${queryString}`;
	}

	return {
		method,
		url,
		headers: {
			'Authorization': `Bearer ${credentials.token}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
	};
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
 * Generic function to process API response entities with pagination
 */
export function processApiResponseEntities(
	entities: any[],
	pagination: any,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		returnData.push({
			json: {
				...entity,
				...(pagination && { _pagination: pagination }),
			},
			pairedItem: itemIndex,
		});
	});
}

/**
 * Process API response entities without adding pagination to each entity
 * This is the preferred method for most cases where pagination shouldn't pollute individual entities
 */
export function processApiResponseEntitiesClean(
	entities: any[],
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		returnData.push({
			json: entity,
			pairedItem: itemIndex,
		});
	});
}

/**
 * Create a single pagination info item that can be added to the response
 * This allows pagination information to be available without attaching it to each entity
 */
export function createPaginationInfoItem(
	paginationData: any,
	itemIndex: number
): INodeExecutionData {
	return {
		json: {
			_pagination: {
				...paginationData
			}
		},
		pairedItem: itemIndex,
	};
}

/**
 * Extract pagination information from API result object
 */
export function extractPaginationInfo(result: any): PaginationInfo | null {
	if (!result) return null;

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
 * Extract simplified pagination information from API result object (without sortables and filters)
 */
export function extractSimplifiedPaginationInfo(result: any): SimplifiedPaginationInfo | null {
	if (!result) return null;

	// Check if pagination properties exist in the result
	if (result.totalEntityCount !== undefined) {
		return {
			totalEntityCount: result.totalEntityCount,
			currentPage: result.currentPage,
			pageSize: result.pageSize,
			previousPage: result.previousPage,
			totalPageCount: result.totalPageCount,
			nextPage: result.nextPage,
		};
	}

	return null;
}

/**
 * Process API response entities with simplified pagination info included in each entity's JSON
 * This approach includes simplified pagination info (without sortables/filters) within each entity
 */
export function processApiResponseEntitiesWithSimplifiedPagination(
	entities: any[],
	paginationData: SimplifiedPaginationInfo | null,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		const jsonData = { ...entity };

		// Include simplified pagination info in the entity's JSON if available
		if (paginationData) {
			jsonData._pagination = paginationData;
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

/**
 * Process API response entities and attach pagination metadata to the execution context
 * This avoids mixing pagination info with actual entities in the results array
 */
export function processApiResponseEntitiesWithMetadata(
	entities: any[],
	paginationData: PaginationInfo | null,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		const executionData: INodeExecutionData = {
			json: entity,
			pairedItem: itemIndex,
		};

		// Note: In n8n, metadata is typically used for specific internal purposes
		// For pagination info, consider alternative approaches like:
		// 1. Including it in the json object with a special key
		// 2. Using a separate output for pagination info
		// 3. Simply omitting it if not essential for workflow logic

		returnData.push(executionData);
	});
}

/**
 * Process API response entities with pagination info included in each entity's JSON
 * This approach includes pagination info within each entity for downstream access
 */
export function processApiResponseEntitiesWithPaginationInJson(
	entities: any[],
	paginationData: PaginationInfo | null,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	entities.forEach((entity: any) => {
		const jsonData = { ...entity };

		// Include pagination info in the entity's JSON if available
		if (paginationData) {
			jsonData._pagination = paginationData;
		}

		returnData.push({
			json: jsonData,
			pairedItem: itemIndex,
		});
	});
}

/**
 * Process API response entities with pagination info as the first separate item
 * This approach clearly separates pagination metadata from entities
 */
export function processApiResponseEntitiesWithPaginationFirst(
	entities: any[],
	paginationData: PaginationInfo | null,
	returnData: INodeExecutionData[],
	itemIndex: number
): void {
	// Add pagination info as the first item if available
	if (paginationData) {
		returnData.push({
			json: {
				_type: 'pagination_metadata',
				...paginationData
			},
			pairedItem: itemIndex,
		});
	}

	// Then add all entities
	entities.forEach((entity: any) => {
		returnData.push({
			json: entity,
			pairedItem: itemIndex,
		});
	});
}
